#!/usr/bin/env npx tsx
/**
 * Nightly RPM Optimization Runner
 *
 * The autoresearch "main loop" — standalone script invoked by cron at 2:30 AM EST.
 * Adapts Karpathy's autoresearch pattern to ad optimization:
 *   [1] COLLECT DATA → [2] EVALUATE EXPERIMENTS → [3] DECIDE →
 *   [4] ANALYZE → [5] PROPOSE NEXT → [6] AUTO-EXECUTE → [7] REPORT
 *
 * Usage:
 *   npx tsx scripts/nightly-rpm-optimization.ts           # Full run
 *   npx tsx scripts/nightly-rpm-optimization.ts --dry-run  # Preview only, no changes
 *   npx tsx scripts/nightly-rpm-optimization.ts --report   # Generate report only
 *   npx tsx scripts/nightly-rpm-optimization.ts --evaluate # Evaluate experiments only
 */

import './lib/setup-env';

import { experimentManager, EvaluationResult } from '@/lib/services/experimentManager';
import { optimizationCatalog } from '@/lib/services/optimizationCatalog';
import { notificationService } from '@/lib/services/notificationService';
import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const REPORT_ONLY = args.includes('--report');
const EVALUATE_ONLY = args.includes('--evaluate');

// Paths
const AUDIT_LOG_PATH = path.resolve(__dirname, 'agents/rpm-audit-log.json');

// Main loop steps
interface StepResult {
  step: string;
  success: boolean;
  details: string;
  duration: number;
}

/**
 * Step 1: Collect Data
 * Triggers Mediavine sync and GA4 sync via existing orchestrator
 */
async function collectData(): Promise<StepResult> {
  const start = Date.now();

  if (DRY_RUN) {
    return { step: 'collect_data', success: true, details: '[DRY RUN] Would sync Mediavine + GA4 data', duration: 0 };
  }

  try {
    const { agentOrchestrator } = await import('@/lib/services/agentOrchestrator');

    const mvResult = await agentOrchestrator.runJob('mediavine_sync');
    const ga4Result = await agentOrchestrator.runJob('ga4_sync');

    const mvStatus = mvResult.success ? 'OK' : `FAIL: ${mvResult.error}`;
    const ga4Status = ga4Result.success ? 'OK' : `FAIL: ${ga4Result.error}`;

    return {
      step: 'collect_data',
      success: mvResult.success || ga4Result.success, // At least one must succeed
      details: `Mediavine: ${mvStatus} (${mvResult.itemsProcessed ?? 0} items) | GA4: ${ga4Status} (${ga4Result.itemsProcessed ?? 0} items)`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'collect_data',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Step 2: Evaluate Active Experiments
 * Runs Bayesian evaluation on all running experiments
 */
async function evaluateExperiments(): Promise<{ stepResult: StepResult; evaluations: Array<{ name: string; result: EvaluationResult }> }> {
  const start = Date.now();
  const evaluations: Array<{ name: string; result: EvaluationResult }> = [];

  try {
    const activeExperiments = await experimentManager.getActiveExperiments();
    const runningExperiments = activeExperiments.filter(
      e => e.status === 'RUNNING' || e.status === 'EXTENDED'
    );

    if (runningExperiments.length === 0) {
      return {
        stepResult: {
          step: 'evaluate_experiments',
          success: true,
          details: 'No running experiments to evaluate',
          duration: Date.now() - start,
        },
        evaluations,
      };
    }

    for (const experiment of runningExperiments) {
      try {
        const result = await experimentManager.evaluateExperiment(experiment.id);
        evaluations.push({ name: experiment.name, result });
      } catch (error) {
        console.error(`  Failed to evaluate ${experiment.name}:`, error);
      }
    }

    return {
      stepResult: {
        step: 'evaluate_experiments',
        success: true,
        details: `Evaluated ${evaluations.length}/${runningExperiments.length} experiments`,
        duration: Date.now() - start,
      },
      evaluations,
    };
  } catch (error) {
    return {
      stepResult: {
        step: 'evaluate_experiments',
        success: false,
        details: `Error: ${String(error)}`,
        duration: Date.now() - start,
      },
      evaluations,
    };
  }
}

/**
 * Step 3: Make Decisions on Evaluated Experiments
 */
async function makeDecisions(
  evaluations: Array<{ name: string; result: EvaluationResult }>
): Promise<StepResult> {
  const start = Date.now();
  const decisions: string[] = [];

  if (DRY_RUN) {
    for (const { name, result } of evaluations) {
      decisions.push(`[DRY RUN] ${name}: would ${result.decision} (P=${result.probability.toFixed(3)}, RPM ${result.rpmLiftPercent >= 0 ? '+' : ''}${result.rpmLiftPercent.toFixed(1)}%)`);
    }
    return {
      step: 'make_decisions',
      success: true,
      details: decisions.join('\n'),
      duration: 0,
    };
  }

  try {
    const activeExperiments = await experimentManager.getActiveExperiments();

    for (const { name, result } of evaluations) {
      const experiment = activeExperiments.find(e => e.name === name);
      if (!experiment) continue;

      if (result.decision === 'keep') {
        await experimentManager.concludeExperiment(experiment.id, 'keep', result.reason, 'auto');
        optimizationCatalog.updateStatus(experiment.catalogKey, 'kept', result.rpmLift);
        decisions.push(`KEPT: ${name} (+${result.rpmLiftPercent.toFixed(1)}% RPM, P=${result.probability.toFixed(3)})`);
      } else if (result.decision === 'revert') {
        await experimentManager.concludeExperiment(experiment.id, 'revert', result.reason, 'auto');
        optimizationCatalog.updateStatus(experiment.catalogKey, 'reverted', result.rpmLift);
        decisions.push(`REVERTED: ${name} (${result.rpmLiftPercent.toFixed(1)}% RPM, P=${result.probability.toFixed(3)})`);
      } else {
        await experimentManager.extendExperiment(experiment.id);
        decisions.push(`EXTENDED: ${name} (${result.daysOfData} days, P=${result.probability.toFixed(3)}, need more data)`);
      }
    }

    return {
      step: 'make_decisions',
      success: true,
      details: decisions.length > 0 ? decisions.join('\n') : 'No decisions needed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'make_decisions',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Step 4: Run RPM Analysis
 */
async function analyzeRpm(): Promise<StepResult> {
  const start = Date.now();

  if (DRY_RUN) {
    return { step: 'analyze_rpm', success: true, details: '[DRY RUN] Would run RPM analysis', duration: 0 };
  }

  try {
    const { rpmAnalyzer } = await import('@/lib/services/rpmAnalyzer');
    const count = await rpmAnalyzer.analyzeRpm();

    return {
      step: 'analyze_rpm',
      success: true,
      details: `Found ${count} new opportunities`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'analyze_rpm',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Step 5: Propose Next Experiment
 */
async function proposeNextExperiment(): Promise<StepResult> {
  const start = Date.now();

  try {
    const candidate = optimizationCatalog.getNextCandidate();

    if (!candidate) {
      return {
        step: 'propose_next',
        success: true,
        details: 'No more candidates available (all tested or blocked)',
        duration: Date.now() - start,
      };
    }

    if (DRY_RUN) {
      return {
        step: 'propose_next',
        success: true,
        details: `[DRY RUN] Would propose: ${candidate.name} (expected RPM +$${candidate.expectedRpmImpact.min}-${candidate.expectedRpmImpact.max})`,
        duration: 0,
      };
    }

    // Only auto-propose if the candidate is auto-executable
    if (!candidate.autoExecutable) {
      return {
        step: 'propose_next',
        success: true,
        details: `Next candidate requires manual action: ${candidate.name} — ${candidate.implementationNotes}`,
        duration: Date.now() - start,
      };
    }

    const experimentId = await experimentManager.proposeExperiment({
      name: candidate.name,
      description: candidate.description,
      catalogKey: candidate.key,
      scope: candidate.scope,
      maxDurationDays: 14,
    });

    optimizationCatalog.updateStatus(candidate.key, 'in_progress');

    return {
      step: 'propose_next',
      success: true,
      details: `Proposed experiment: ${candidate.name} (id: ${experimentId})`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'propose_next',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Step 6: Auto-Execute Pending Actions
 */
async function autoExecute(): Promise<StepResult> {
  const start = Date.now();

  if (DRY_RUN) {
    return { step: 'auto_execute', success: true, details: '[DRY RUN] Would execute pending Tier 1 actions', duration: 0 };
  }

  try {
    const { actionExecutor } = await import('@/lib/services/actionExecutor');
    const result = await actionExecutor.executeAutoActions();

    return {
      step: 'auto_execute',
      success: true,
      details: `Executed: ${result.executed}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'auto_execute',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Step 7: Generate Report and Update Audit Log
 */
async function generateReport(stepResults: StepResult[], evaluations: Array<{ name: string; result: EvaluationResult }>): Promise<StepResult> {
  const start = Date.now();

  try {
    // Get current metrics from DB
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [weekMetrics, monthMetrics, activeExperiments] = await Promise.all([
      prisma.monetizationMetric.aggregate({
        where: { metricDate: { gte: sevenDaysAgo } },
        _sum: { adRevenue: true, pageviews: true },
      }),
      prisma.monetizationMetric.aggregate({
        where: { metricDate: { gte: thirtyDaysAgo } },
        _sum: { adRevenue: true, pageviews: true },
      }),
      experimentManager.getActiveExperiments(),
    ]);

    const weekRevenue = Number(weekMetrics._sum.adRevenue ?? 0);
    const weekPageviews = weekMetrics._sum.pageviews ?? 0;
    const weekRpm = weekPageviews > 0 ? (weekRevenue / weekPageviews) * 1000 : 0;

    const monthRevenue = Number(monthMetrics._sum.adRevenue ?? 0);
    const monthPageviews = monthMetrics._sum.pageviews ?? 0;
    const monthRpm = monthPageviews > 0 ? (monthRevenue / monthPageviews) * 1000 : 0;

    const catalogSummary = optimizationCatalog.getSummary();

    // Build report
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const report = [
      ``,
      `=== Nightly RPM Optimization Report - ${dateStr} ===`,
      ``,
      `Revenue: $${weekRevenue.toFixed(2)} (7d) | $${monthRevenue.toFixed(2)} (30d)`,
      `RPM: $${weekRpm.toFixed(2)} (7d avg) | $${monthRpm.toFixed(2)} (30d avg)`,
      ``,
      `--- Active Experiments (${activeExperiments.length}) ---`,
    ];

    for (const exp of activeExperiments) {
      const eval_ = evaluations.find(e => e.name === exp.name);
      if (eval_) {
        report.push(`  [${exp.status} ${eval_.result.daysOfData}d] ${exp.name}: RPM $${eval_.result.rpmLift >= 0 ? '+' : ''}${eval_.result.rpmLift.toFixed(2)} (P=${eval_.result.probability.toFixed(3)}) — ${eval_.result.reason}`);
      } else {
        report.push(`  [${exp.status}] ${exp.name}`);
      }
    }

    report.push(``, `--- Step Results ---`);
    for (const result of stepResults) {
      const icon = result.success ? 'OK' : 'FAIL';
      report.push(`  [${icon}] ${result.step}: ${result.details} (${result.duration}ms)`);
    }

    report.push(``, `--- Catalog Summary ---`);
    report.push(`  Total optimizations: ${catalogSummary.total}`);
    report.push(`  Not started: ${catalogSummary.byStatus.not_started} | In progress: ${catalogSummary.byStatus.in_progress} | Kept: ${catalogSummary.byStatus.kept} | Reverted: ${catalogSummary.byStatus.reverted}`);
    report.push(`  Expected RPM impact range: +$${catalogSummary.totalExpectedRpmImpact.min.toFixed(2)} to +$${catalogSummary.totalExpectedRpmImpact.max.toFixed(2)}`);
    report.push(``, `===================================================`);

    const reportText = report.join('\n');
    console.log(reportText);

    // Update audit log
    if (!DRY_RUN) {
      try {
        const auditLog = JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf-8'));
        auditLog.last_nightly_run = {
          date: dateStr,
          rpm_7d: weekRpm,
          rpm_30d: monthRpm,
          revenue_7d: weekRevenue,
          revenue_30d: monthRevenue,
          active_experiments: activeExperiments.length,
          catalog_status: optimizationCatalog.toJSON(),
        };
        fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(auditLog, null, 2) + '\n');
      } catch {
        console.warn('Could not update audit log');
      }
    }

    // Log to DB
    if (!DRY_RUN) {
      await prisma.agentRun.create({
        data: {
          runType: 'EXPERIMENT_EVAL' as AgentRunType,
          status: 'COMPLETED',
          completedAt: new Date(),
          durationMs: stepResults.reduce((sum, r) => sum + r.duration, 0),
          itemsProcessed: evaluations.length,
          opportunitiesFound: 0,
          logSummary: `Nightly RPM optimization: ${evaluations.length} experiments evaluated, ${activeExperiments.length} active`,
        },
      });
    }

    return {
      step: 'report',
      success: true,
      details: `Report generated. Active experiments: ${activeExperiments.length}`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'report',
      success: false,
      details: `Error: ${String(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Main entry point — the autoresearch loop
 */
async function main() {
  console.log(`\n🔄 Nightly RPM Optimization ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`   Started: ${new Date().toISOString()}\n`);

  const stepResults: StepResult[] = [];
  let evaluations: Array<{ name: string; result: EvaluationResult }> = [];

  try {
    // Load catalog state from audit log
    try {
      const auditLog = JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf-8'));
      if (auditLog.last_nightly_run?.catalog_status) {
        optimizationCatalog.loadState(auditLog.last_nightly_run.catalog_status);
      }
    } catch {
      console.warn('  Could not load catalog state from audit log, using defaults');
    }

    if (REPORT_ONLY) {
      // Skip to report
      const { stepResult, evaluations: evals } = await evaluateExperiments();
      evaluations = evals;
      const reportResult = await generateReport([], evaluations);
      stepResults.push(reportResult);
    } else if (EVALUATE_ONLY) {
      // Only evaluate experiments
      const { stepResult, evaluations: evals } = await evaluateExperiments();
      stepResults.push(stepResult);
      evaluations = evals;
      const decisionsResult = await makeDecisions(evaluations);
      stepResults.push(decisionsResult);
      const reportResult = await generateReport(stepResults, evaluations);
      stepResults.push(reportResult);
    } else {
      // Full loop
      // Step 1: Collect data
      console.log('  [1/7] Collecting data...');
      const dataResult = await collectData();
      stepResults.push(dataResult);
      console.log(`    ${dataResult.success ? 'OK' : 'FAIL'}: ${dataResult.details}`);

      // Step 2: Evaluate experiments
      console.log('  [2/7] Evaluating experiments...');
      const { stepResult: evalResult, evaluations: evals } = await evaluateExperiments();
      stepResults.push(evalResult);
      evaluations = evals;
      console.log(`    ${evalResult.success ? 'OK' : 'FAIL'}: ${evalResult.details}`);

      // Step 3: Make decisions
      console.log('  [3/7] Making decisions...');
      const decisionResult = await makeDecisions(evaluations);
      stepResults.push(decisionResult);
      console.log(`    ${decisionResult.success ? 'OK' : 'FAIL'}: ${decisionResult.details}`);

      // Step 4: Analyze RPM
      console.log('  [4/7] Analyzing RPM...');
      const analysisResult = await analyzeRpm();
      stepResults.push(analysisResult);
      console.log(`    ${analysisResult.success ? 'OK' : 'FAIL'}: ${analysisResult.details}`);

      // Step 5: Propose next experiment
      console.log('  [5/7] Proposing next experiment...');
      const proposeResult = await proposeNextExperiment();
      stepResults.push(proposeResult);
      console.log(`    ${proposeResult.success ? 'OK' : 'FAIL'}: ${proposeResult.details}`);

      // Step 6: Auto-execute
      console.log('  [6/7] Auto-executing actions...');
      const executeResult = await autoExecute();
      stepResults.push(executeResult);
      console.log(`    ${executeResult.success ? 'OK' : 'FAIL'}: ${executeResult.details}`);

      // Step 7: Generate report
      console.log('  [7/7] Generating report...');
      const reportResult = await generateReport(stepResults, evaluations);
      stepResults.push(reportResult);
    }

    const allSuccess = stepResults.every(r => r.success);
    console.log(`\n${allSuccess ? 'OK' : 'PARTIAL'}: Nightly optimization complete.`);

    // Alert on failures
    if (!allSuccess && !DRY_RUN) {
      const failedSteps = stepResults.filter(r => !r.success);
      await notificationService.notifyCriticalError(
        new Error(`Nightly RPM optimization had ${failedSteps.length} failures`),
        `Failed steps: ${failedSteps.map(s => s.step).join(', ')}`
      );
    }
  } catch (error) {
    console.error('\nFATAL ERROR in nightly optimization:', error);
    if (!DRY_RUN) {
      await notificationService.notifyCriticalError(
        error instanceof Error ? error : new Error(String(error)),
        'Nightly RPM optimization fatal error'
      );
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
