# PRD-14: Agent Run History

## Overview
Build a history page showing all past agent runs with filtering, search, and detailed logs. Allows reviewing past performance and debugging issues.

## Priority: P1 (Analytics)
## Dependencies: PRD-10 (Admin Navigation)
## Estimated Implementation: 1.5 hours

---

## Features

### 1. Run History Table
- Paginated list of all agent runs
- Columns: Type, Status, Started, Duration, Items, Opportunities, Errors

### 2. Filtering
- Filter by job type
- Filter by status (completed/failed)
- Filter by date range

### 3. Run Details
- Click to expand run details
- View error details
- View log summary

### 4. Statistics
- Success rate by job type
- Average duration
- Total opportunities found

---

## Implementation

### File: `app/admin/monetization/history/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AgentRun {
  id: string;
  runType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number;
  opportunitiesFound: number;
  errorsEncountered: number;
  logSummary: string | null;
  errorDetails: any;
}

interface HistoryStats {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  totalOpportunities: number;
  byType: {
    type: string;
    count: number;
    successRate: number;
  }[];
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDays, setFilterDays] = useState<number>(7);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [page, filterType, filterStatus, filterDays]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        days: String(filterDays),
      });
      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const response = await fetch(`/api/monetization/history?${params}`);
      const data = await response.json();

      setRuns(data.runs || []);
      setStats(data.stats || null);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const runTypes = [
    'FULL',
    'GA4_SYNC',
    'AFFILIATE_SCAN',
    'RPM_ANALYSIS',
    'FORECAST',
    'CLEANUP',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent History</h1>
          <p className="text-slate-400">View past agent runs and performance metrics</p>
        </div>
        <button
          onClick={() => fetchHistory()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Runs</div>
            <div className="text-2xl font-bold text-white">{stats.totalRuns}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.successRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(stats.avgDuration)}
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Opportunities Found</div>
            <div className="text-2xl font-bold text-sims-pink">{stats.totalOpportunities}</div>
          </div>
        </div>
      )}

      {/* Type Stats */}
      {stats && stats.byType.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Success Rate by Job Type</h3>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {stats.byType.map(item => (
              <div
                key={item.type}
                className="flex-shrink-0 px-4 py-2 bg-slate-900 rounded-lg"
              >
                <div className="text-xs text-slate-500">{item.type.replace(/_/g, ' ')}</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{item.count}</span>
                  <span className={`text-sm ${
                    item.successRate >= 90 ? 'text-green-400' :
                    item.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {item.successRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <Filter className="h-4 w-4 text-slate-400" />

        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
        >
          <option value="all">All Types</option>
          {runTypes.map(type => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
        >
          <option value="all">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            value={filterDays}
            onChange={e => { setFilterDays(Number(e.target.value)); setPage(1); }}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-700 rounded" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No runs found</h3>
            <p className="text-slate-400">No agent runs match your filters.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-4 px-4 py-3 bg-slate-900 text-xs text-slate-400 font-medium uppercase">
              <div className="col-span-2">Job Type</div>
              <div>Status</div>
              <div>Started</div>
              <div>Duration</div>
              <div>Items</div>
              <div>Opps</div>
              <div>Errors</div>
            </div>

            {/* Table Body */}
            {runs.map(run => {
              const isExpanded = expandedId === run.id;

              return (
                <div key={run.id} className="border-t border-slate-700">
                  <div
                    className="grid grid-cols-8 gap-4 px-4 py-3 items-center hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-white font-medium">
                        {run.runType.replace(/_/g, ' ')}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      {run.status === 'COMPLETED' ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Success
                        </span>
                      ) : run.status === 'FAILED' ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="h-4 w-4" />
                          Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Clock className="h-4 w-4 animate-spin" />
                          Running
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {formatDateTime(run.startedAt)}
                    </div>
                    <div className="text-slate-300 text-sm">
                      {formatDuration(run.durationMs)}
                    </div>
                    <div className="text-slate-300 text-sm">{run.itemsProcessed}</div>
                    <div className="text-sims-pink text-sm">{run.opportunitiesFound}</div>
                    <div className={`text-sm ${run.errorsEncountered > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {run.errorsEncountered}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 py-4 bg-slate-900/50 border-t border-slate-700">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Run Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex">
                              <dt className="w-32 text-slate-500">Run ID:</dt>
                              <dd className="text-slate-300 font-mono text-xs">{run.id}</dd>
                            </div>
                            {run.completedAt && (
                              <div className="flex">
                                <dt className="w-32 text-slate-500">Completed:</dt>
                                <dd className="text-slate-300">{formatDateTime(run.completedAt)}</dd>
                              </div>
                            )}
                            {run.logSummary && (
                              <div className="flex">
                                <dt className="w-32 text-slate-500">Summary:</dt>
                                <dd className="text-slate-300">{run.logSummary}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {run.errorDetails && (
                          <div>
                            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Error Details
                            </h4>
                            <pre className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 overflow-auto max-h-32">
                              {JSON.stringify(run.errorDetails, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
```

### File: `app/api/monetization/history/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentRunType, AgentRunStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const days = parseInt(searchParams.get('days') || '7');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const where: any = {
    startedAt: { gte: cutoff },
  };

  if (type && type !== 'all') {
    where.runType = type as AgentRunType;
  }
  if (status && status !== 'all') {
    where.status = status as AgentRunStatus;
  }

  const [runs, total] = await Promise.all([
    prisma.agentRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agentRun.count({ where }),
  ]);

  // Calculate stats
  const allRuns = await prisma.agentRun.findMany({
    where: { startedAt: { gte: cutoff } },
    select: {
      runType: true,
      status: true,
      durationMs: true,
      opportunitiesFound: true,
    },
  });

  const completed = allRuns.filter(r => r.status === 'COMPLETED').length;
  const totalDuration = allRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0);
  const totalOpportunities = allRuns.reduce((sum, r) => sum + r.opportunitiesFound, 0);

  // Stats by type
  const byType = Object.values(AgentRunType).map(runType => {
    const typeRuns = allRuns.filter(r => r.runType === runType);
    const typeCompleted = typeRuns.filter(r => r.status === 'COMPLETED').length;
    return {
      type: runType,
      count: typeRuns.length,
      successRate: typeRuns.length > 0 ? (typeCompleted / typeRuns.length) * 100 : 0,
    };
  }).filter(t => t.count > 0);

  return NextResponse.json({
    runs: runs.map(r => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
      durationMs: r.completedAt && r.startedAt
        ? r.completedAt.getTime() - r.startedAt.getTime()
        : null,
    })),
    totalPages: Math.ceil(total / limit),
    stats: {
      totalRuns: allRuns.length,
      successRate: allRuns.length > 0 ? (completed / allRuns.length) * 100 : 0,
      avgDuration: allRuns.length > 0 ? totalDuration / allRuns.length : 0,
      totalOpportunities,
      byType,
    },
  });
}
```

---

## Validation Criteria

- [ ] History table displays runs
- [ ] Pagination works
- [ ] Filter by type works
- [ ] Filter by status works
- [ ] Filter by date range works
- [ ] Stats cards show correct data
- [ ] Expanded view shows error details
- [ ] API endpoint requires admin auth
- [ ] `npm run type-check` passes
