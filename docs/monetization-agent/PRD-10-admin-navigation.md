# PRD-10: Admin Dashboard Navigation Integration

## Overview
Add monetization agent navigation to the admin sidebar and create the main monetization dashboard page that serves as the hub for all agent functions.

## Priority: P0 (Foundation)
## Dependencies: MON-001 through MON-009 (Complete)
## Estimated Implementation: 1 hour

---

## Changes Required

### 1. Update Admin Layout Navigation

**File: `app/admin/layout.tsx`**

Add monetization section to the admin nav items:

```typescript
import {
  // ... existing imports
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/monetization', label: 'Monetization', icon: DollarSign },  // NEW
  { href: '/admin/mods', label: 'Mods', icon: Package },
  // ... rest of nav items
];
```

### 2. Create Monetization Dashboard Page

**File: `app/admin/monetization/page.tsx`**

Main dashboard showing:
- Quick stats (pending approvals, estimated impact, forecasted revenue)
- Recent agent runs status
- Quick action buttons
- Links to sub-sections

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Play,
  History,
  Settings,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  queueStats: {
    pending: number;
    approved: number;
    rejected: number;
    implemented: number;
    totalEstimatedImpact: number;
  };
  recentRuns: {
    runType: string;
    status: string;
    startedAt: string;
    itemsProcessed: number;
    opportunitiesFound: number;
  }[];
  forecasts: {
    forecastMonth: string;
    forecastedTotalRevenue: number;
    actualTotalRevenue: number | null;
  }[];
}

export default function MonetizationDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/monetization/dashboard');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monetization Agent</h1>
          <p className="text-slate-400">Revenue optimization and opportunity tracking</p>
        </div>
        <Link
          href="/admin/monetization/control"
          className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 rounded-lg transition-colors"
        >
          <Play className="h-4 w-4" />
          Run Agent
        </Link>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <span className="text-sm text-slate-400">Pending Review</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.queueStats.pending}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-slate-400">Implemented</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.queueStats.implemented}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm text-slate-400">Est. Monthly Impact</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${stats.queueStats.totalEstimatedImpact.toFixed(0)}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm text-slate-400">Next Month Forecast</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${stats.forecasts?.[0]?.forecastedTotalRevenue?.toFixed(0) ?? '--'}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Link
          href="/admin/monetization/queue"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-sims-pink/20 rounded-lg w-fit mb-4">
            <AlertCircle className="h-6 w-6 text-sims-pink" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Opportunity Queue</h3>
          <p className="text-sm text-slate-400">
            Review and approve monetization opportunities detected by the agent
          </p>
          {stats && stats.queueStats.pending > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              {stats.queueStats.pending} pending
            </div>
          )}
        </Link>

        <Link
          href="/admin/monetization/forecasts"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-4">
            <TrendingUp className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Revenue Forecasts</h3>
          <p className="text-sm text-slate-400">
            View predictions, compare to actuals, and track forecast accuracy
          </p>
        </Link>

        <Link
          href="/admin/monetization/history"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-purple-500/20 rounded-lg w-fit mb-4">
            <History className="h-6 w-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Agent History</h3>
          <p className="text-sm text-slate-400">
            View past agent runs, success rates, and processing statistics
          </p>
        </Link>

        <Link
          href="/admin/monetization/control"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-green-500/20 rounded-lg w-fit mb-4">
            <Play className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Agent Control</h3>
          <p className="text-sm text-slate-400">
            Manually trigger agent jobs and monitor live execution
          </p>
        </Link>

        <Link
          href="/admin/monetization/settings"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-slate-500/20 rounded-lg w-fit mb-4">
            <Settings className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Configuration</h3>
          <p className="text-sm text-slate-400">
            API connection status, credentials setup, and agent settings
          </p>
        </Link>

        <Link
          href="/admin/monetization/learning"
          className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-6 transition-all"
        >
          <div className="p-3 bg-orange-500/20 rounded-lg w-fit mb-4">
            <BarChart3 className="h-6 w-6 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Performance Learning</h3>
          <p className="text-sm text-slate-400">
            Track action impact and compare estimated vs actual results
          </p>
        </Link>
      </div>

      {/* Recent Runs */}
      {stats && stats.recentRuns.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Agent Runs</h3>
          <div className="space-y-3">
            {stats.recentRuns.slice(0, 5).map((run, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    run.status === 'COMPLETED' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white">{run.runType}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  {run.itemsProcessed} items, {run.opportunitiesFound} opportunities
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/admin/monetization/history"
            className="block text-center mt-4 text-sm text-sims-pink hover:underline"
          >
            View all runs →
          </Link>
        </div>
      )}
    </div>
  );
}
```

### 3. Create Dashboard API Endpoint

**File: `app/api/monetization/dashboard/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actionQueue } from '@/lib/services/actionQueue';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get queue stats
  const queueStats = await actionQueue.getQueueStats();

  // Get recent runs (last 24 hours)
  const recentRuns = await prisma.agentRun.findMany({
    where: {
      startedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: {
      runType: true,
      status: true,
      startedAt: true,
      itemsProcessed: true,
      opportunitiesFound: true,
    },
  });

  // Get next 3 months of forecasts
  const forecasts = await prisma.revenueForecast.findMany({
    where: {
      forecastMonth: { gte: new Date() },
    },
    orderBy: { forecastMonth: 'asc' },
    take: 3,
    select: {
      forecastMonth: true,
      forecastedTotalRevenue: true,
      actualTotalRevenue: true,
    },
  });

  return NextResponse.json({
    queueStats,
    recentRuns: recentRuns.map(r => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
    })),
    forecasts: forecasts.map(f => ({
      forecastMonth: f.forecastMonth.toISOString(),
      forecastedTotalRevenue: Number(f.forecastedTotalRevenue),
      actualTotalRevenue: f.actualTotalRevenue ? Number(f.actualTotalRevenue) : null,
    })),
  });
}
```

---

## Validation Criteria

- [ ] Monetization nav item appears in admin sidebar
- [ ] Dashboard page loads with stats
- [ ] Quick stat cards show correct data
- [ ] Navigation cards link to sub-pages
- [ ] Recent runs display correctly
- [ ] API endpoint requires admin auth
- [ ] `npm run type-check` passes
