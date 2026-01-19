# PRD-11: Agent Control Panel

## Overview
Build an admin interface to manually trigger and monitor monetization agent jobs. Allows running full scans or individual jobs (GA4 sync, affiliate scan, RPM analysis, forecasting, cleanup).

## Priority: P0 (Core Feature)
## Dependencies: PRD-10 (Admin Navigation)
## Estimated Implementation: 2 hours

---

## Features

### 1. Job Launcher
- Run full agent scan (all jobs in sequence)
- Run individual jobs:
  - GA4 Sync - Pull traffic data
  - Affiliate Scan - Detect monetization opportunities
  - RPM Analysis - Analyze ad performance
  - Forecast - Generate revenue predictions
  - Cleanup - Expire old opportunities

### 2. Live Status Display
- Show currently running job
- Progress indicator
- Real-time log output
- Success/failure status

### 3. Last Run Information
- When each job type last ran
- Duration and items processed
- Any errors encountered

---

## Implementation

### File: `app/admin/monetization/control/page.tsx`

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  RefreshCw,
  Database,
  Search,
  TrendingUp,
  BarChart3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface JobInfo {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  lastRun: Date | null;
  lastStatus: 'success' | 'failed' | null;
  lastDuration: number | null;
  lastItemsProcessed: number | null;
}

interface JobStatus {
  running: boolean;
  currentJob: string | null;
  progress: string[];
  result: {
    success: boolean;
    duration: number;
    itemsProcessed?: number;
    opportunitiesFound?: number;
    error?: string;
  } | null;
}

const JOB_CONFIGS: Omit<JobInfo, 'lastRun' | 'lastStatus' | 'lastDuration' | 'lastItemsProcessed'>[] = [
  {
    type: 'full',
    label: 'Full Scan',
    description: 'Run all jobs in sequence (GA4 → Affiliate → RPM → Cleanup)',
    icon: RefreshCw,
  },
  {
    type: 'ga4_sync',
    label: 'GA4 Sync',
    description: 'Pull traffic and event data from Google Analytics 4',
    icon: Database,
  },
  {
    type: 'affiliate_scan',
    label: 'Affiliate Scan',
    description: 'Detect affiliate monetization opportunities',
    icon: Search,
  },
  {
    type: 'rpm_analysis',
    label: 'RPM Analysis',
    description: 'Analyze page RPM and find optimization opportunities',
    icon: BarChart3,
  },
  {
    type: 'forecast',
    label: 'Forecast',
    description: 'Generate revenue predictions for next 3 months',
    icon: TrendingUp,
  },
  {
    type: 'cleanup',
    label: 'Cleanup',
    description: 'Expire old opportunities (30+ days)',
    icon: Trash2,
  },
];

export default function AgentControlPage() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [status, setStatus] = useState<JobStatus>({
    running: false,
    currentJob: null,
    progress: [],
    result: null,
  });
  const [loading, setLoading] = useState(true);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJobInfo();
  }, []);

  useEffect(() => {
    // Auto-scroll progress log
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [status.progress]);

  const fetchJobInfo = async () => {
    try {
      const response = await fetch('/api/monetization/agent/status');
      const data = await response.json();

      setJobs(JOB_CONFIGS.map(config => ({
        ...config,
        lastRun: data.lastRuns[config.type]?.startedAt
          ? new Date(data.lastRuns[config.type].startedAt)
          : null,
        lastStatus: data.lastRuns[config.type]?.status === 'COMPLETED' ? 'success' :
                   data.lastRuns[config.type]?.status === 'FAILED' ? 'failed' : null,
        lastDuration: data.lastRuns[config.type]?.durationMs ?? null,
        lastItemsProcessed: data.lastRuns[config.type]?.itemsProcessed ?? null,
      })));
    } catch (error) {
      console.error('Failed to fetch job info:', error);
    } finally {
      setLoading(false);
    }
  };

  const runJob = async (jobType: string) => {
    setStatus({
      running: true,
      currentJob: jobType,
      progress: [`Starting ${jobType}...`],
      result: null,
    });

    try {
      const response = await fetch('/api/monetization/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType }),
      });

      const result = await response.json();

      setStatus(prev => ({
        ...prev,
        running: false,
        progress: [...prev.progress, `Job completed: ${result.success ? 'SUCCESS' : 'FAILED'}`],
        result,
      }));

      // Refresh job info
      fetchJobInfo();
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        running: false,
        progress: [...prev.progress, `Error: ${String(error)}`],
        result: {
          success: false,
          duration: 0,
          error: String(error),
        },
      }));
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Control Panel</h1>
        <p className="text-slate-400">Manually trigger and monitor agent jobs</p>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-3 gap-4">
        {jobs.map(job => {
          const Icon = job.icon;
          const isRunning = status.running && status.currentJob === job.type;
          const isFullRunning = status.running && status.currentJob === 'full' && job.type !== 'full';

          return (
            <div
              key={job.type}
              className={`bg-slate-800/50 border rounded-xl p-5 ${
                job.type === 'full'
                  ? 'border-sims-pink/50 col-span-3'
                  : 'border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    job.type === 'full' ? 'bg-sims-pink/20' : 'bg-slate-700'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      job.type === 'full' ? 'text-sims-pink' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{job.label}</h3>
                    <p className="text-sm text-slate-400 mt-1">{job.description}</p>

                    {job.lastRun && (
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(job.lastRun)}
                        </span>
                        {job.lastStatus === 'success' && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </span>
                        )}
                        {job.lastStatus === 'failed' && (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                        {job.lastDuration && (
                          <span className="text-slate-500">
                            {formatDuration(job.lastDuration)}
                          </span>
                        )}
                        {job.lastItemsProcessed !== null && (
                          <span className="text-slate-500">
                            {job.lastItemsProcessed} items
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => runJob(job.type)}
                  disabled={status.running}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    status.running
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : job.type === 'full'
                        ? 'bg-sims-pink hover:bg-sims-pink/80 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isRunning || isFullRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Log */}
      {(status.progress.length > 0 || status.result) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Execution Log</h3>

          <div
            ref={progressRef}
            className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto"
          >
            {status.progress.map((line, i) => (
              <div key={i} className="text-slate-300">{line}</div>
            ))}
          </div>

          {status.result && (
            <div className={`mt-4 p-4 rounded-lg ${
              status.result.success
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {status.result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <span className={status.result.success ? 'text-green-400' : 'text-red-400'}>
                  {status.result.success ? 'Job completed successfully' : 'Job failed'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Duration:</span>
                  <span className="ml-2 text-white">{formatDuration(status.result.duration)}</span>
                </div>
                {status.result.itemsProcessed !== undefined && (
                  <div>
                    <span className="text-slate-500">Items:</span>
                    <span className="ml-2 text-white">{status.result.itemsProcessed}</span>
                  </div>
                )}
                {status.result.opportunitiesFound !== undefined && (
                  <div>
                    <span className="text-slate-500">Opportunities:</span>
                    <span className="ml-2 text-white">{status.result.opportunitiesFound}</span>
                  </div>
                )}
              </div>
              {status.result.error && (
                <div className="mt-2 text-sm text-red-400">
                  Error: {status.result.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### File: `app/api/monetization/agent/status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Map job types to AgentRunType enum
  const jobTypeMap: Record<string, AgentRunType> = {
    full: AgentRunType.FULL,
    ga4_sync: AgentRunType.GA4_SYNC,
    affiliate_scan: AgentRunType.AFFILIATE_SCAN,
    rpm_analysis: AgentRunType.RPM_ANALYSIS,
    forecast: AgentRunType.FORECAST,
    cleanup: AgentRunType.CLEANUP,
  };

  const lastRuns: Record<string, any> = {};

  for (const [key, runType] of Object.entries(jobTypeMap)) {
    const lastRun = await prisma.agentRun.findFirst({
      where: { runType },
      orderBy: { startedAt: 'desc' },
      select: {
        startedAt: true,
        completedAt: true,
        status: true,
        durationMs: true,
        itemsProcessed: true,
        opportunitiesFound: true,
      },
    });

    if (lastRun) {
      lastRuns[key] = {
        ...lastRun,
        startedAt: lastRun.startedAt.toISOString(),
        completedAt: lastRun.completedAt?.toISOString(),
        durationMs: lastRun.completedAt && lastRun.startedAt
          ? lastRun.completedAt.getTime() - lastRun.startedAt.getTime()
          : null,
      };
    }
  }

  return NextResponse.json({ lastRuns });
}
```

### File: `app/api/monetization/agent/run/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { agentOrchestrator, JobType } from '@/lib/services/agentOrchestrator';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobType } = await request.json();

  const validJobs: JobType[] = [
    'full',
    'ga4_sync',
    'affiliate_scan',
    'rpm_analysis',
    'forecast',
    'cleanup',
  ];

  if (!validJobs.includes(jobType)) {
    return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
  }

  try {
    const result = await agentOrchestrator.runJob(jobType);

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
      duration: 0,
      error: String(error),
    }, { status: 500 });
  }
}
```

---

## Validation Criteria

- [ ] All 6 job buttons display correctly
- [ ] Full scan runs all jobs in sequence
- [ ] Individual jobs can be triggered
- [ ] Running status disables other buttons
- [ ] Progress log shows real-time updates
- [ ] Last run info displays correctly
- [ ] Success/failure states show properly
- [ ] API endpoints require admin auth
- [ ] `npm run type-check` passes
