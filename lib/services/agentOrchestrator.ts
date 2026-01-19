/**
 * Agent Orchestrator
 *
 * Main controller that schedules and coordinates all monetization agent jobs.
 * Runs jobs in sequence and tracks results.
 */

import { prisma } from '@/lib/prisma';
import { ga4Connector } from '@/lib/services/ga4Connector';
import { affiliateDetector } from '@/lib/services/affiliateDetector';
import { actionQueue } from '@/lib/services/actionQueue';
import { notificationService } from '@/lib/services/notificationService';
import { AgentRunType, AgentRunStatus } from '@prisma/client';

// Job types that can be run
export type JobType =
  | 'full'
  | 'ga4_sync'
  | 'mediavine_sync'
  | 'affiliate_scan'
  | 'rpm_analysis'
  | 'forecast'
  | 'cleanup'
  | 'auto_execute'
  | 'report';

// Job result
export interface JobResult {
  job: JobType;
  success: boolean;
  duration: number;
  itemsProcessed?: number;
  opportunitiesFound?: number;
  error?: string;
}

// Report data
interface AgentReport {
  generatedAt: Date;
  lastRunTimes: Record<string, Date | null>;
  queueStats: {
    pending: number;
    approved: number;
    rejected: number;
    implemented: number;
    totalEstimatedImpact: number;
  };
  recentJobs: {
    runType: AgentRunType;
    status: AgentRunStatus;
    startedAt: Date;
    itemsProcessed: number;
    opportunitiesFound: number;
  }[];
}

/**
 * AgentOrchestrator class - coordinates all agent jobs
 */
export class AgentOrchestrator {
  /**
   * Run a specific job
   */
  async runJob(jobType: JobType): Promise<JobResult> {
    const startTime = Date.now();

    try {
      switch (jobType) {
        case 'full':
          return this.runFullScan();

        case 'ga4_sync':
          return this.runGA4Sync();

        case 'mediavine_sync':
          return this.runMediavineSync();

        case 'affiliate_scan':
          return this.runAffiliateScan();

        case 'rpm_analysis':
          return this.runRpmAnalysis();

        case 'forecast':
          return this.runForecast();

        case 'cleanup':
          return this.runCleanup();

        case 'auto_execute':
          return this.runAutoExecution();

        case 'report':
          return this.runReport();

        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      return {
        job: jobType,
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run all jobs in sequence
   */
  async runFullScan(): Promise<JobResult> {
    const startTime = Date.now();
    const results: JobResult[] = [];

    // Run jobs in order
    const jobOrder: JobType[] = [
      'ga4_sync',
      'mediavine_sync',
      'affiliate_scan',
      'rpm_analysis',
      'auto_execute',
      'cleanup',
    ];

    let totalItems = 0;
    let totalOpportunities = 0;
    const errors: string[] = [];

    for (const job of jobOrder) {
      console.log(`\n  Running ${job}...`);
      const result = await this.runJob(job);
      results.push(result);

      if (result.success) {
        totalItems += result.itemsProcessed ?? 0;
        totalOpportunities += result.opportunitiesFound ?? 0;
        console.log(`    ✅ ${job} completed`);
      } else {
        errors.push(`${job}: ${result.error}`);
        console.log(`    ❌ ${job} failed: ${result.error}`);
      }
    }

    const duration = Date.now() - startTime;

    // Log the full run
    await prisma.agentRun.create({
      data: {
        runType: AgentRunType.FULL,
        status: errors.length === 0 ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        durationMs: duration,
        itemsProcessed: totalItems,
        opportunitiesFound: totalOpportunities,
        errorsEncountered: errors.length,
        logSummary: `Full scan: ${jobOrder.length} jobs, ${errors.length} errors`,
        errorDetails: errors.length > 0 ? { errors } : undefined,
      },
    });

    // Send notification on run completion
    await notificationService.notifyRunComplete({
      runType: 'FULL',
      status: errors.length === 0 ? 'COMPLETED' : 'FAILED',
      duration,
      itemsProcessed: totalItems,
      opportunitiesFound: totalOpportunities,
      errorsEncountered: errors.length,
      logSummary: `Full scan: ${jobOrder.length} jobs, ${errors.length} errors`,
    });

    return {
      job: 'full',
      success: errors.length === 0,
      duration,
      itemsProcessed: totalItems,
      opportunitiesFound: totalOpportunities,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Run GA4 sync job
   */
  private async runGA4Sync(): Promise<JobResult> {
    const startTime = Date.now();

    // Check if GA4 is configured
    if (!process.env.GA4_PROPERTY_ID || !process.env.GA4_SERVICE_ACCOUNT_KEY) {
      return {
        job: 'ga4_sync',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: 0,
        error: 'GA4 not configured - skipping',
      };
    }

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const count = await ga4Connector.syncMetricsToDatabase(yesterday);

      return {
        job: 'ga4_sync',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: count,
      };
    } catch (error) {
      return {
        job: 'ga4_sync',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run Mediavine sync job
   */
  private async runMediavineSync(): Promise<JobResult> {
    const startTime = Date.now();

    // Check if Mediavine is configured
    if (!process.env.MEDIAVINE_EMAIL || !process.env.MEDIAVINE_PASSWORD) {
      return {
        job: 'mediavine_sync',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: 0,
        error: 'Mediavine not configured - skipping',
      };
    }

    try {
      // Import dynamically to avoid circular dependency
      const { mediavineConnector } = await import('@/lib/services/mediavineConnector');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await mediavineConnector.syncRevenueToDatabase(yesterday);

      return {
        job: 'mediavine_sync',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: result.daysUpdated + result.pagesUpdated,
      };
    } catch (error) {
      return {
        job: 'mediavine_sync',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run affiliate scan job
   */
  private async runAffiliateScan(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      const count = await affiliateDetector.scanForOpportunities();

      return {
        job: 'affiliate_scan',
        success: true,
        duration: Date.now() - startTime,
        opportunitiesFound: count,
      };
    } catch (error) {
      return {
        job: 'affiliate_scan',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run RPM analysis job
   */
  private async runRpmAnalysis(): Promise<JobResult> {
    const startTime = Date.now();

    // RPM analyzer will be implemented separately
    // For now, return a placeholder
    try {
      // Import dynamically to avoid circular dependency
      const { rpmAnalyzer } = await import('@/lib/services/rpmAnalyzer');
      const count = await rpmAnalyzer.analyzeRpm();

      return {
        job: 'rpm_analysis',
        success: true,
        duration: Date.now() - startTime,
        opportunitiesFound: count,
      };
    } catch (error) {
      // If module doesn't exist yet, skip silently
      if (String(error).includes('Cannot find module')) {
        return {
          job: 'rpm_analysis',
          success: true,
          duration: Date.now() - startTime,
          itemsProcessed: 0,
        };
      }

      return {
        job: 'rpm_analysis',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run revenue forecasting job
   */
  private async runForecast(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      // Import dynamically to avoid circular dependency
      const { revenueForecaster } = await import(
        '@/lib/services/revenueForecaster'
      );
      const count = await revenueForecaster.generateForecast(3);

      return {
        job: 'forecast',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: count,
      };
    } catch (error) {
      // If module doesn't exist yet, skip silently
      if (String(error).includes('Cannot find module')) {
        return {
          job: 'forecast',
          success: true,
          duration: Date.now() - startTime,
          itemsProcessed: 0,
        };
      }

      return {
        job: 'forecast',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run auto-execution job (PRD-18)
   */
  private async runAutoExecution(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      // Import dynamically to avoid circular dependency
      const { actionExecutor } = await import('@/lib/services/actionExecutor');
      const result = await actionExecutor.executeAutoActions();

      return {
        job: 'auto_execute',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: result.executed + result.failed + result.skipped,
        opportunitiesFound: result.executed,
      };
    } catch (error) {
      return {
        job: 'auto_execute',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Run cleanup job (expire old opportunities)
   */
  private async runCleanup(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      const expired = await actionQueue.expireOldOpportunities(30);

      await prisma.agentRun.create({
        data: {
          runType: AgentRunType.CLEANUP,
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: expired,
          logSummary: `Expired ${expired} old opportunities`,
        },
      });

      return {
        job: 'cleanup',
        success: true,
        duration: Date.now() - startTime,
        itemsProcessed: expired,
      };
    } catch (error) {
      return {
        job: 'cleanup',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Generate status report
   */
  private async runReport(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      const report = await this.generateReport(24);
      console.log('\n📊 Agent Status Report');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`  Generated: ${report.generatedAt.toISOString()}`);

      console.log('\n  📋 Queue Status:');
      console.log(`    Pending:     ${report.queueStats.pending}`);
      console.log(`    Approved:    ${report.queueStats.approved}`);
      console.log(`    Rejected:    ${report.queueStats.rejected}`);
      console.log(`    Implemented: ${report.queueStats.implemented}`);
      console.log(
        `    Est. Impact: $${report.queueStats.totalEstimatedImpact.toFixed(2)}`
      );

      console.log('\n  🕐 Last Run Times:');
      for (const [jobType, time] of Object.entries(report.lastRunTimes)) {
        console.log(`    ${jobType}: ${time?.toISOString() ?? 'Never'}`);
      }

      console.log('\n  📜 Recent Jobs (last 24h):');
      for (const job of report.recentJobs) {
        const status = job.status === 'COMPLETED' ? '✅' : '❌';
        console.log(`    ${status} ${job.runType} - ${job.startedAt.toISOString()}`);
        console.log(
          `       Items: ${job.itemsProcessed} | Opportunities: ${job.opportunitiesFound}`
        );
      }

      console.log('═══════════════════════════════════════════════════════════════\n');

      return {
        job: 'report',
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        job: 'report',
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Generate a status report
   */
  async generateReport(hours = 24): Promise<AgentReport> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get queue stats
    const queueStats = await actionQueue.getQueueStats();

    // Get last run times for each job type
    const jobTypes = [
      'FULL',
      'GA4_SYNC',
      'MEDIAVINE_SYNC',
      'AFFILIATE_SCAN',
      'RPM_ANALYSIS',
      'FORECAST',
      'CLEANUP',
    ] as const;

    const lastRunTimes: Record<string, Date | null> = {};
    for (const runType of jobTypes) {
      const lastRun = await prisma.agentRun.findFirst({
        where: { runType },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      });
      lastRunTimes[runType] = lastRun?.startedAt ?? null;
    }

    // Get recent jobs
    const recentJobs = await prisma.agentRun.findMany({
      where: {
        startedAt: { gte: cutoff },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        runType: true,
        status: true,
        startedAt: true,
        itemsProcessed: true,
        opportunitiesFound: true,
      },
    });

    return {
      generatedAt: new Date(),
      lastRunTimes,
      queueStats,
      recentJobs,
    };
  }

  /**
   * Get last run time for a specific job type
   */
  async getLastRunTime(runType: AgentRunType): Promise<Date | null> {
    const lastRun = await prisma.agentRun.findFirst({
      where: { runType, status: 'COMPLETED' },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });

    return lastRun?.startedAt ?? null;
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator();
