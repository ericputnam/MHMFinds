/**
 * Experiment Manager
 *
 * Core service managing the experiment lifecycle for the autoresearch RPM optimization loop.
 * Adapts Karpathy's autoresearch pattern (modify → run → evaluate → keep/revert)
 * to 48-72 hour ad optimization cycles.
 */

import { prisma } from '@/lib/prisma';
import { ExperimentStatus, Prisma } from '@prisma/client';
import { notificationService } from './notificationService';

// Thresholds for experiment decisions
const DECISION_THRESHOLDS = {
  keepProbability: 0.85,    // P(treatment > baseline) to auto-keep
  revertProbability: 0.15,  // P(treatment > baseline) below this → auto-revert
  minDaysForDecision: 3,    // Minimum days before making a decision
  maxDaysBeforeForce: 14,   // Force a decision after this many days
  minDataPoints: 3,         // Minimum daily data points needed
};

// Revenue safety guard rails
const SAFETY_RAILS = {
  maxRpmDropPercent: 15,        // Auto-revert if RPM drops more than 15%
  maxRevenueDropPercent: 20,    // Critical alert if revenue drops 20%+
  maxConcurrentSiteWide: 1,     // Only 1 site-wide experiment at a time
  maxConcurrentTotal: 5,        // Max 5 experiments running simultaneously
  revenueGuardLookbackDays: 7,  // Compare 7-day rolling windows
};

// Experiment proposal input
export interface ExperimentProposal {
  name: string;
  description: string;
  catalogKey: string;
  scope: 'site_wide' | 'next_app' | 'wordpress' | 'page_specific';
  targetPages?: string[];
  opportunityId?: string;
  actionId?: string;
  maxDurationDays?: number;
  rollbackData?: Prisma.InputJsonValue;
}

// Evaluation result
export interface EvaluationResult {
  decision: 'keep' | 'revert' | 'extend';
  probability: number;
  rpmLift: number;
  rpmLiftPercent: number;
  daysOfData: number;
  reason: string;
}

// Daily metric snapshot for Bayesian analysis
interface DailySnapshot {
  date: Date;
  rpm: number;
  revenue: number;
  pageviews: number;
  viewability: number;
  pagesPerSession: number;
}

/**
 * ExperimentManager class - manages the full experiment lifecycle
 */
export class ExperimentManager {
  /**
   * Propose a new experiment
   */
  async proposeExperiment(proposal: ExperimentProposal): Promise<string> {
    // Safety check: don't exceed max concurrent experiments
    const runningCount = await prisma.experiment.count({
      where: { status: { in: ['RUNNING', 'BASELINE_CAPTURE', 'EVALUATING'] } },
    });

    if (runningCount >= SAFETY_RAILS.maxConcurrentTotal) {
      throw new Error(
        `Cannot propose experiment: ${runningCount} experiments already running (max ${SAFETY_RAILS.maxConcurrentTotal})`
      );
    }

    // Safety check: only one site-wide experiment at a time
    if (proposal.scope === 'site_wide') {
      const siteWideRunning = await prisma.experiment.count({
        where: {
          status: { in: ['RUNNING', 'BASELINE_CAPTURE'] },
          scope: 'site_wide',
        },
      });

      if (siteWideRunning >= SAFETY_RAILS.maxConcurrentSiteWide) {
        throw new Error('Cannot propose site-wide experiment: another site-wide experiment is running');
      }
    }

    const experiment = await prisma.experiment.create({
      data: {
        name: proposal.name,
        description: proposal.description,
        catalogKey: proposal.catalogKey,
        scope: proposal.scope,
        targetPages: proposal.targetPages ?? [],
        opportunityId: proposal.opportunityId,
        actionId: proposal.actionId,
        maxDurationDays: proposal.maxDurationDays ?? 14,
        rollbackData: proposal.rollbackData,
        status: 'PROPOSED',
      },
    });

    return experiment.id;
  }

  /**
   * Capture baseline metrics for an experiment (7-day snapshot)
   */
  async captureBaseline(experimentId: string): Promise<void> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) throw new Error('Experiment not found');
    if (experiment.status !== 'PROPOSED') {
      throw new Error(`Cannot capture baseline: experiment status is ${experiment.status}`);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshots = await this.getMetricSnapshots(sevenDaysAgo, now, experiment.targetPages);

    if (snapshots.length < DECISION_THRESHOLDS.minDataPoints) {
      throw new Error(
        `Insufficient baseline data: ${snapshots.length} days (need ${DECISION_THRESHOLDS.minDataPoints})`
      );
    }

    const avgRpm = this.mean(snapshots.map(s => s.rpm));
    const avgViewability = this.mean(snapshots.map(s => s.viewability));
    const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenue, 0);
    const totalPageviews = snapshots.reduce((sum, s) => sum + s.pageviews, 0);
    const avgPagesPerSession = this.mean(snapshots.map(s => s.pagesPerSession));

    await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'BASELINE_CAPTURE',
        baselineStartDate: sevenDaysAgo,
        baselineEndDate: now,
        baselineRpm: avgRpm,
        baselineViewability: avgViewability,
        baselineRevenue: totalRevenue,
        baselinePageviews: totalPageviews,
        baselinePagesPerSession: avgPagesPerSession,
      },
    });
  }

  /**
   * Start an experiment (marks it as running, records start time)
   */
  async startExperiment(experimentId: string): Promise<void> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) throw new Error('Experiment not found');
    if (experiment.status !== 'BASELINE_CAPTURE' && experiment.status !== 'PROPOSED') {
      throw new Error(`Cannot start experiment: status is ${experiment.status}`);
    }

    // Revenue guard rail: check if revenue hasn't already dropped significantly
    const revenueOk = await this.checkRevenueGuardRail();
    if (!revenueOk) {
      throw new Error('Revenue guard rail triggered: 7-day revenue has dropped >20%. Not safe to start experiments.');
    }

    await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'RUNNING',
        experimentStartDate: new Date(),
      },
    });
  }

  /**
   * Evaluate a running experiment using Bayesian analysis
   */
  async evaluateExperiment(experimentId: string): Promise<EvaluationResult> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) throw new Error('Experiment not found');
    if (experiment.status !== 'RUNNING' && experiment.status !== 'EXTENDED') {
      throw new Error(`Cannot evaluate experiment: status is ${experiment.status}`);
    }

    if (!experiment.experimentStartDate) {
      throw new Error('Experiment has no start date');
    }

    const baselineRpm = Number(experiment.baselineRpm ?? 0);
    if (baselineRpm === 0) {
      throw new Error('No baseline RPM captured');
    }

    // Get treatment period metrics
    const now = new Date();
    const snapshots = await this.getMetricSnapshots(
      experiment.experimentStartDate,
      now,
      experiment.targetPages
    );

    const daysOfData = snapshots.length;

    if (daysOfData < DECISION_THRESHOLDS.minDataPoints) {
      return {
        decision: 'extend',
        probability: 0.5,
        rpmLift: 0,
        rpmLiftPercent: 0,
        daysOfData,
        reason: `Insufficient data: ${daysOfData} days (need ${DECISION_THRESHOLDS.minDataPoints})`,
      };
    }

    // Calculate treatment metrics
    const treatmentRpm = this.mean(snapshots.map(s => s.rpm));
    const treatmentViewability = this.mean(snapshots.map(s => s.viewability));
    const totalTreatmentRevenue = snapshots.reduce((sum, s) => sum + s.revenue, 0);
    const totalTreatmentPageviews = snapshots.reduce((sum, s) => sum + s.pageviews, 0);
    const treatmentPagesPerSession = this.mean(snapshots.map(s => s.pagesPerSession));

    // Bayesian analysis: P(treatment RPM > baseline RPM)
    const treatmentRpms = snapshots.map(s => s.rpm);
    const treatmentStd = this.stdDev(treatmentRpms);
    const probability = this.bayesianProbability(baselineRpm, treatmentRpm, treatmentStd, daysOfData);

    const rpmLift = treatmentRpm - baselineRpm;
    const rpmLiftPercent = baselineRpm > 0 ? (rpmLift / baselineRpm) * 100 : 0;

    // Update treatment metrics in the database
    await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        treatmentRpm,
        treatmentViewability,
        treatmentRevenue: totalTreatmentRevenue,
        treatmentPageviews: totalTreatmentPageviews,
        treatmentPagesPerSession,
        rpmLiftPercent,
        bayesianProbability: probability,
        daysOfData,
        status: 'EVALUATING',
      },
    });

    // Make decision
    let decision: 'keep' | 'revert' | 'extend';
    let reason: string;

    // Emergency revert: RPM dropped more than safety threshold
    if (rpmLiftPercent < -SAFETY_RAILS.maxRpmDropPercent && daysOfData >= 2) {
      decision = 'revert';
      reason = `Emergency revert: RPM dropped ${Math.abs(rpmLiftPercent).toFixed(1)}% (safety threshold: ${SAFETY_RAILS.maxRpmDropPercent}%)`;
    }
    // Enough data for a confident decision
    else if (daysOfData >= DECISION_THRESHOLDS.minDaysForDecision) {
      if (probability >= DECISION_THRESHOLDS.keepProbability) {
        decision = 'keep';
        reason = `High confidence positive: P=${probability.toFixed(3)}, RPM lift +${rpmLiftPercent.toFixed(1)}%`;
      } else if (probability <= DECISION_THRESHOLDS.revertProbability) {
        decision = 'revert';
        reason = `High confidence negative: P=${probability.toFixed(3)}, RPM change ${rpmLiftPercent.toFixed(1)}%`;
      } else if (daysOfData >= DECISION_THRESHOLDS.maxDaysBeforeForce) {
        // Force a decision at max duration
        decision = probability >= 0.5 ? 'keep' : 'revert';
        reason = `Forced decision at ${daysOfData} days: P=${probability.toFixed(3)}`;
      } else {
        decision = 'extend';
        reason = `Inconclusive: P=${probability.toFixed(3)} (need P>${DECISION_THRESHOLDS.keepProbability} to keep or P<${DECISION_THRESHOLDS.revertProbability} to revert)`;
      }
    } else {
      decision = 'extend';
      reason = `Need more data: ${daysOfData}/${DECISION_THRESHOLDS.minDaysForDecision} days minimum`;
    }

    return {
      decision,
      probability,
      rpmLift,
      rpmLiftPercent,
      daysOfData,
      reason,
    };
  }

  /**
   * Conclude an experiment with a decision
   */
  async concludeExperiment(
    experimentId: string,
    decision: 'keep' | 'revert' | 'cancel',
    reason: string,
    decidedBy: string = 'auto'
  ): Promise<void> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) throw new Error('Experiment not found');

    let newStatus: ExperimentStatus;

    switch (decision) {
      case 'keep':
        newStatus = 'KEPT';
        break;
      case 'revert':
        newStatus = 'REVERTED';
        // Attempt rollback if we have rollback data and an action ID
        if (experiment.actionId) {
          try {
            const execLog = await prisma.executionLog.findFirst({
              where: { actionId: experiment.actionId, success: true },
              orderBy: { executedAt: 'desc' },
            });
            if (execLog) {
              const { actionExecutor } = await import('./actionExecutor');
              await actionExecutor.rollback(execLog.id, decidedBy, reason);
            }
          } catch (rollbackError) {
            console.error('Experiment rollback failed:', rollbackError);
            // Continue with status update even if rollback fails
          }
        }
        break;
      case 'cancel':
        newStatus = 'CANCELLED';
        break;
    }

    await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: newStatus,
        decision,
        decisionReason: reason,
        decidedAt: new Date(),
        decidedBy,
        rolledBackAt: decision === 'revert' ? new Date() : undefined,
        experimentEndDate: new Date(),
      },
    });
  }

  /**
   * Extend a running experiment for more data
   */
  async extendExperiment(experimentId: string): Promise<void> {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'EXTENDED' },
    });
  }

  /**
   * Get all active experiments (running, evaluating, extended)
   */
  async getActiveExperiments() {
    return prisma.experiment.findMany({
      where: {
        status: { in: ['RUNNING', 'EVALUATING', 'EXTENDED', 'BASELINE_CAPTURE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: { select: { id: true, title: true } },
        action: { select: { id: true, actionType: true } },
      },
    });
  }

  /**
   * Get recent experiment history
   */
  async getExperimentHistory(limit = 20) {
    return prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        opportunity: { select: { id: true, title: true } },
        action: { select: { id: true, actionType: true } },
      },
    });
  }

  /**
   * Check revenue guard rail: verify 7-day revenue hasn't dropped >20%
   */
  async checkRevenueGuardRail(): Promise<boolean> {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [currentWeek, previousWeek] = await Promise.all([
      prisma.monetizationMetric.aggregate({
        where: { metricDate: { gte: sevenDaysAgo, lte: now } },
        _sum: { adRevenue: true },
      }),
      prisma.monetizationMetric.aggregate({
        where: { metricDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        _sum: { adRevenue: true },
      }),
    ]);

    const currentRevenue = Number(currentWeek._sum.adRevenue ?? 0);
    const previousRevenue = Number(previousWeek._sum.adRevenue ?? 0);

    if (previousRevenue === 0) return true; // No data to compare

    const dropPercent = ((previousRevenue - currentRevenue) / previousRevenue) * 100;
    return dropPercent < SAFETY_RAILS.maxRevenueDropPercent;
  }

  // --- Statistical Methods ---

  /**
   * Bayesian probability that treatment is better than baseline.
   * Models daily RPM as normal distribution. Uses conjugate normal-normal model.
   * Returns P(treatment_mean > baseline_mean).
   */
  private bayesianProbability(
    baselineMean: number,
    treatmentMean: number,
    treatmentStd: number,
    n: number
  ): number {
    if (treatmentStd === 0 || n === 0) {
      return treatmentMean > baselineMean ? 0.99 : 0.01;
    }

    // Standard error of the treatment mean
    const se = treatmentStd / Math.sqrt(n);

    // Z-score: how many standard errors is the treatment mean above baseline
    const z = (treatmentMean - baselineMean) / se;

    // Convert to probability using the normal CDF approximation
    return this.normalCdf(z);
  }

  /**
   * Approximation of the standard normal CDF using the error function.
   * Accurate to ~1.5e-7.
   */
  private normalCdf(x: number): number {
    // Abramowitz and Stegun approximation 7.1.26
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
  }

  // --- Data Access ---

  /**
   * Get daily metric snapshots from MonetizationMetric table
   */
  private async getMetricSnapshots(
    startDate: Date,
    endDate: Date,
    targetPages: string[]
  ): Promise<DailySnapshot[]> {
    const whereClause: Prisma.MonetizationMetricWhereInput = {
      metricDate: { gte: startDate, lte: endDate },
      pageviews: { gt: 0 },
    };

    // If targeting specific pages, filter by them
    if (targetPages.length > 0) {
      whereClause.pageUrl = { in: targetPages };
    }

    const metrics = await prisma.monetizationMetric.groupBy({
      by: ['metricDate'],
      where: whereClause,
      _sum: {
        pageviews: true,
        adRevenue: true,
        adImpressions: true,
      },
      _avg: {
        scrollDepth: true,
        bounceRate: true,
      },
      orderBy: { metricDate: 'asc' },
    });

    return metrics.map(m => {
      const pageviews = m._sum.pageviews ?? 0;
      const revenue = Number(m._sum.adRevenue ?? 0);
      const rpm = pageviews > 0 ? (revenue / pageviews) * 1000 : 0;
      // Viewability approximation from scroll depth
      const viewability = Number(m._avg.scrollDepth ?? 50);
      // Pages per session approximation (bounce rate inverse)
      const bounceRate = Number(m._avg.bounceRate ?? 50);
      const pagesPerSession = bounceRate > 0 ? 100 / bounceRate : 1.5;

      return {
        date: m.metricDate,
        rpm,
        revenue,
        pageviews,
        viewability,
        pagesPerSession,
      };
    });
  }
}

// Export singleton instance
export const experimentManager = new ExperimentManager();
