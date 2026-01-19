# PRD-08: Agent Orchestrator

## Overview
Build the main orchestrator that schedules and coordinates all monetization agent jobs. This is the "brain" that runs the agent on a schedule.

## Priority: P0 (Orchestration)
## Dependencies: All previous PRDs (01-07)
## Estimated Implementation: 2 hours

---

## Orchestration Schedule

| Job | Frequency | Time | Purpose |
|-----|-----------|------|---------|
| GA4 Sync | Daily | 6:00 AM | Pull traffic data |
| Mediavine Sync | Daily | 6:30 AM | Pull revenue data |
| Affiliate Scan | Daily | 7:00 AM | Detect opportunities |
| RPM Analysis | Daily | 7:30 AM | Analyze performance |
| Forecasting | Weekly | Sunday 8:00 AM | Update projections |
| Cleanup | Weekly | Sunday 9:00 AM | Expire old items |

---

## Implementation

### File: `lib/services/agentOrchestrator.ts`

```typescript
import { prisma } from '../prisma';
import { GA4Connector } from './ga4Connector';
import { MediavineConnector } from './mediavineConnector';
import { AffiliateDetector } from './affiliateDetector';
import { RpmAnalyzer } from './rpmAnalyzer';
import { RevenueForecaster } from './revenueForecaster';
import { actionQueue } from './actionQueue';

type JobType = 'ga4_sync' | 'mediavine_sync' | 'affiliate_scan' | 'rpm_analysis' | 'forecast' | 'cleanup' | 'full';

interface JobResult {
  job: JobType;
  success: boolean;
  duration: number;
  itemsProcessed: number;
  opportunitiesFound?: number;
  error?: string;
}

interface OrchestratorReport {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  jobs: JobResult[];
  summary: {
    totalOpportunities: number;
    pendingReview: number;
    estimatedImpact: number;
  };
}

export class AgentOrchestrator {
  /**
   * Run a specific job
   */
  async runJob(jobType: JobType): Promise<JobResult> {
    const startTime = Date.now();

    // Create agent run record
    const agentRun = await prisma.agentRun.create({
      data: {
        runType: jobType,
        status: 'running',
      },
    });

    try {
      let itemsProcessed = 0;
      let opportunitiesFound = 0;

      switch (jobType) {
        case 'ga4_sync':
          const ga4 = new GA4Connector();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          itemsProcessed = await ga4.syncMetricsToDatabase(yesterday);
          break;

        case 'mediavine_sync':
          const mediavine = new MediavineConnector();
          const mvYesterday = new Date();
          mvYesterday.setDate(mvYesterday.getDate() - 1);
          const mvResult = await mediavine.syncRevenueToDatabase(mvYesterday);
          itemsProcessed = mvResult.pagesUpdated;
          break;

        case 'affiliate_scan':
          const affiliateDetector = new AffiliateDetector();
          const affiliateOpps = await affiliateDetector.scanForOpportunities();
          opportunitiesFound = await this.storeOpportunities(affiliateOpps);
          itemsProcessed = affiliateOpps.length;
          break;

        case 'rpm_analysis':
          const rpmAnalyzer = new RpmAnalyzer();
          const rpmOpps = await rpmAnalyzer.analyzeRpm();
          opportunitiesFound = await this.storeOpportunities(rpmOpps);
          itemsProcessed = rpmOpps.length;
          break;

        case 'forecast':
          const forecaster = new RevenueForecaster();
          await forecaster.updateActuals();
          const forecasts = await forecaster.generateForecast(3);
          for (const f of forecasts) {
            await forecaster.saveForecast(f);
          }
          itemsProcessed = forecasts.length;
          break;

        case 'cleanup':
          const expired = await actionQueue.expireOldOpportunities(30);
          itemsProcessed = expired;
          break;

        case 'full':
          // Run all jobs in sequence
          return this.runFullScan();
      }

      const duration = Date.now() - startTime;

      // Update agent run
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs: duration,
          itemsProcessed,
          opportunitiesFound,
          logSummary: `${jobType} completed: ${itemsProcessed} items, ${opportunitiesFound} opportunities`,
        },
      });

      return {
        job: jobType,
        success: true,
        duration,
        itemsProcessed,
        opportunitiesFound,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs: duration,
          errorDetails: { message: String(error), stack: (error as Error).stack },
        },
      });

      return {
        job: jobType,
        success: false,
        duration,
        itemsProcessed: 0,
        error: String(error),
      };
    }
  }

  /**
   * Run full agent scan (all jobs)
   */
  async runFullScan(): Promise<JobResult> {
    const startTime = Date.now();
    const jobs: JobResult[] = [];

    // Run data collection first
    console.log('Running GA4 sync...');
    jobs.push(await this.runJob('ga4_sync'));

    console.log('Running Mediavine sync...');
    jobs.push(await this.runJob('mediavine_sync'));

    // Then run analysis
    console.log('Running affiliate scan...');
    jobs.push(await this.runJob('affiliate_scan'));

    console.log('Running RPM analysis...');
    jobs.push(await this.runJob('rpm_analysis'));

    // Update forecasts
    console.log('Updating forecasts...');
    jobs.push(await this.runJob('forecast'));

    const duration = Date.now() - startTime;
    const totalOpportunities = jobs.reduce((sum, j) => sum + (j.opportunitiesFound || 0), 0);
    const failedJobs = jobs.filter(j => !j.success);

    return {
      job: 'full',
      success: failedJobs.length === 0,
      duration,
      itemsProcessed: jobs.reduce((sum, j) => sum + j.itemsProcessed, 0),
      opportunitiesFound: totalOpportunities,
      error: failedJobs.length > 0
        ? `${failedJobs.length} jobs failed: ${failedJobs.map(j => j.job).join(', ')}`
        : undefined,
    };
  }

  /**
   * Store opportunities from analysis
   */
  private async storeOpportunities(opportunities: any[]): Promise<number> {
    let created = 0;

    for (const opp of opportunities) {
      // Check for duplicate
      const existing = await prisma.monetizationOpportunity.findFirst({
        where: {
          pageUrl: opp.pageUrl,
          opportunityType: opp.opportunityType,
          status: { in: ['pending', 'approved'] },
        },
      });

      if (!existing) {
        const newOpp = await prisma.monetizationOpportunity.create({
          data: {
            opportunityType: opp.opportunityType,
            priority: opp.priority,
            confidence: opp.confidence,
            pageUrl: opp.pageUrl,
            modId: opp.modId,
            title: opp.title,
            description: opp.description,
            reasoning: opp.reasoning,
            estimatedRevenueImpact: opp.estimatedRevenueImpact,
            estimatedRpmIncrease: opp.estimatedRpmIncrease,
            status: 'pending',
          },
        });

        // Create associated actions
        for (const action of opp.suggestedActions || []) {
          await prisma.monetizationAction.create({
            data: {
              opportunityId: newOpp.id,
              actionType: action.actionType,
              title: action.title,
              description: action.description,
              actionData: action.actionData,
              status: 'pending',
            },
          });
        }

        created++;
      }
    }

    return created;
  }

  /**
   * Generate orchestrator report
   */
  async generateReport(hours: number = 24): Promise<OrchestratorReport> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get recent runs
    const runs = await prisma.agentRun.findMany({
      where: {
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get queue stats
    const queueStats = await actionQueue.getQueueStats();

    const jobs: JobResult[] = runs.map(r => ({
      job: r.runType as JobType,
      success: r.status === 'completed',
      duration: r.durationMs || 0,
      itemsProcessed: r.itemsProcessed,
      opportunitiesFound: r.opportunitiesFound,
      error: r.errorDetails ? String((r.errorDetails as any).message) : undefined,
    }));

    const totalDuration = jobs.reduce((sum, j) => sum + j.duration, 0);
    const totalOpportunities = jobs.reduce((sum, j) => sum + (j.opportunitiesFound || 0), 0);

    return {
      runId: `report-${Date.now()}`,
      startTime: since,
      endTime: new Date(),
      totalDuration,
      jobs,
      summary: {
        totalOpportunities,
        pendingReview: queueStats.pending,
        estimatedImpact: queueStats.totalEstimatedImpact,
      },
    };
  }

  /**
   * Get last run time for a job type
   */
  async getLastRunTime(jobType: JobType): Promise<Date | null> {
    const lastRun = await prisma.agentRun.findFirst({
      where: {
        runType: jobType,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
    });

    return lastRun?.completedAt || null;
  }
}
```

---

## Main Entry Script

### File: `scripts/run-agent.ts`

```typescript
import { AgentOrchestrator } from '../lib/services/agentOrchestrator';

async function main() {
  const orchestrator = new AgentOrchestrator();
  const command = process.argv[2] || 'full';

  console.log(`\n=== MHMFinds Monetization Agent ===`);
  console.log(`Running: ${command}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const validJobs = ['full', 'ga4_sync', 'mediavine_sync', 'affiliate_scan', 'rpm_analysis', 'forecast', 'cleanup', 'report'];

  if (!validJobs.includes(command)) {
    console.log('Usage: npm run agent <job>');
    console.log('Jobs:');
    console.log('  full          - Run all jobs');
    console.log('  ga4_sync      - Sync GA4 metrics');
    console.log('  mediavine_sync - Sync Mediavine revenue');
    console.log('  affiliate_scan - Scan for affiliate opportunities');
    console.log('  rpm_analysis  - Analyze RPM performance');
    console.log('  forecast      - Generate revenue forecasts');
    console.log('  cleanup       - Expire old opportunities');
    console.log('  report        - Generate status report');
    process.exit(1);
  }

  if (command === 'report') {
    const report = await orchestrator.generateReport(24);

    console.log(`Report Period: ${report.startTime.toISOString()} - ${report.endTime.toISOString()}`);
    console.log(`Total Duration: ${(report.totalDuration / 1000).toFixed(1)}s`);
    console.log('');
    console.log('Job Results:');
    for (const job of report.jobs) {
      const status = job.success ? '✓' : '✗';
      console.log(`  ${status} ${job.job}: ${job.itemsProcessed} items, ${job.opportunitiesFound || 0} opps (${job.duration}ms)`);
      if (job.error) {
        console.log(`    Error: ${job.error}`);
      }
    }
    console.log('');
    console.log('Summary:');
    console.log(`  New Opportunities: ${report.summary.totalOpportunities}`);
    console.log(`  Pending Review: ${report.summary.pendingReview}`);
    console.log(`  Est. Impact: $${report.summary.estimatedImpact.toFixed(2)}`);
    return;
  }

  const result = await orchestrator.runJob(command as any);

  console.log(`\n=== Results ===`);
  console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Items Processed: ${result.itemsProcessed}`);
  if (result.opportunitiesFound !== undefined) {
    console.log(`Opportunities Found: ${result.opportunitiesFound}`);
  }
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "agent": "npx tsx scripts/run-agent.ts",
    "agent:full": "npx tsx scripts/run-agent.ts full",
    "agent:ga4-sync": "npx tsx scripts/run-agent.ts ga4_sync",
    "agent:mediavine-sync": "npx tsx scripts/run-agent.ts mediavine_sync",
    "agent:scan-affiliates": "npx tsx scripts/run-agent.ts affiliate_scan",
    "agent:analyze-rpm": "npx tsx scripts/run-agent.ts rpm_analysis",
    "agent:forecast": "npx tsx scripts/run-agent.ts forecast",
    "agent:cleanup": "npx tsx scripts/run-agent.ts cleanup",
    "agent:report": "npx tsx scripts/run-agent.ts report"
  }
}
```

---

## Vercel Cron Configuration

### File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/monetization-agent",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### File: `app/api/cron/monetization-agent/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '../../../../lib/services/agentOrchestrator';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orchestrator = new AgentOrchestrator();

  try {
    const result = await orchestrator.runFullScan();

    return NextResponse.json({
      success: result.success,
      duration: result.duration,
      itemsProcessed: result.itemsProcessed,
      opportunitiesFound: result.opportunitiesFound,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
```

---

## Validation Criteria

- [ ] Orchestrator runs individual jobs
- [ ] Full scan runs all jobs in sequence
- [ ] Agent runs logged to database
- [ ] Report generation works
- [ ] Vercel cron endpoint configured
- [ ] `npm run agent full` works
- [ ] `npm run agent report` shows status
