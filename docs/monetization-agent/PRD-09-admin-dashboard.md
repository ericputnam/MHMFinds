# PRD-09: Admin Dashboard

## Overview
Build an admin dashboard to review monetization opportunities, approve/reject actions, view forecasts, and monitor agent performance.

## Priority: P2 (Polish)
## Dependencies: PRD-07 (Action Queue)
## Estimated Implementation: 4 hours

---

## Dashboard Sections

### 1. Queue Review
- List pending opportunities
- Approve/reject with one click
- Filter by type, priority
- Bulk actions

### 2. Revenue Dashboard
- Current month revenue
- Forecast vs actual
- Revenue by source
- Trend charts

### 3. Agent Status
- Recent job runs
- Success/failure rates
- Next scheduled run

### 4. Performance Learning
- Action impact tracking
- Accuracy of estimates
- Best performing actions

---

## Implementation

### File: `app/admin/monetization/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface Opportunity {
  id: string;
  opportunityType: string;
  priority: string;
  confidence: number;
  title: string;
  description: string;
  reasoning: string;
  estimatedRevenueImpact: number | null;
  status: string;
  detectedAt: string;
  actions: Array<{
    id: string;
    title: string;
    actionType: string;
  }>;
}

interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  implemented: number;
  totalEstimatedImpact: number;
}

interface Forecast {
  forecastMonth: string;
  forecastedTotalRevenue: number;
  actualTotalRevenue: number | null;
  confidenceLevel: number;
}

export default function MonetizationDashboard() {
  const { data: session, status } = useSession();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Check admin access
  if (status === 'loading') return <div>Loading...</div>;
  if (!session?.user?.isAdmin) {
    redirect('/');
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, forecastRes] = await Promise.all([
        fetch('/api/monetization/queue'),
        fetch('/api/monetization/forecasts'),
      ]);

      const queueData = await queueRes.json();
      const forecastData = await forecastRes.json();

      setOpportunities(queueData.opportunities || []);
      setStats(queueData.stats || null);
      setForecasts(forecastData.forecasts || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (opportunityId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/monetization/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, action }),
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const filteredOpportunities = opportunities.filter(opp =>
    filter === 'all' || opp.priority === filter
  );

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Monetization Agent Dashboard</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-mhm-card rounded-xl p-4">
              <div className="text-sm text-slate-400">Pending Review</div>
              <div className="text-2xl font-bold text-sims-pink">{stats.pending}</div>
            </div>
            <div className="bg-mhm-card rounded-xl p-4">
              <div className="text-sm text-slate-400">Approved</div>
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            </div>
            <div className="bg-mhm-card rounded-xl p-4">
              <div className="text-sm text-slate-400">Implemented</div>
              <div className="text-2xl font-bold text-blue-400">{stats.implemented}</div>
            </div>
            <div className="bg-mhm-card rounded-xl p-4">
              <div className="text-sm text-slate-400">Est. Impact</div>
              <div className="text-2xl font-bold text-emerald-400">
                ${stats.totalEstimatedImpact.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* Forecasts */}
        {forecasts.length > 0 && (
          <div className="bg-mhm-card rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Revenue Forecast</h2>
            <div className="grid grid-cols-3 gap-4">
              {forecasts.map((f, i) => (
                <div key={i} className="border border-white/10 rounded-lg p-4">
                  <div className="text-sm text-slate-400">
                    {new Date(f.forecastMonth).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xl font-bold">
                    ${f.forecastedTotalRevenue.toFixed(0)}
                  </div>
                  {f.actualTotalRevenue && (
                    <div className="text-sm text-green-400">
                      Actual: ${f.actualTotalRevenue.toFixed(0)}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    {(f.confidenceLevel * 100).toFixed(0)}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunity Queue */}
        <div className="bg-mhm-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pending Opportunities</h2>
            <div className="flex gap-2">
              {['all', 'high', 'medium', 'low'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filter === f
                      ? 'bg-sims-pink text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No pending opportunities
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor(opp.priority)}`}>
                          {opp.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {opp.opportunityType}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(opp.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <h3 className="font-medium mb-1">{opp.title}</h3>
                      <p className="text-sm text-slate-400 mb-2">{opp.description}</p>
                      {opp.estimatedRevenueImpact && (
                        <div className="text-sm text-emerald-400">
                          Est. Impact: ${opp.estimatedRevenueImpact.toFixed(2)}/month
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-2">
                        {opp.actions.length} action(s): {opp.actions.map(a => a.actionType).join(', ')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleAction(opp.id, 'approve')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(opp.id, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## API Route for Forecasts

### File: `app/api/monetization/forecasts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forecasts = await prisma.revenueForecast.findMany({
    orderBy: { forecastMonth: 'asc' },
    take: 6,
  });

  return NextResponse.json({
    forecasts: forecasts.map(f => ({
      forecastMonth: f.forecastMonth.toISOString(),
      forecastedTotalRevenue: Number(f.forecastedTotalRevenue),
      forecastedAdRevenue: Number(f.forecastedAdRevenue),
      forecastedAffiliateRevenue: Number(f.forecastedAffiliateRevenue),
      actualTotalRevenue: f.actualTotalRevenue ? Number(f.actualTotalRevenue) : null,
      confidenceLevel: f.confidenceLevel,
      monthOverMonthGrowth: f.monthOverMonthGrowth,
    })),
  });
}
```

---

## Navigation Link

Add to admin nav in `components/Navbar.tsx` or equivalent:

```tsx
{session?.user?.isAdmin && (
  <Link href="/admin/monetization" className="...">
    Monetization
  </Link>
)}
```

---

## Validation Criteria

- [ ] Dashboard loads for admin users only
- [ ] Stats cards show correct counts
- [ ] Forecasts display with confidence
- [ ] Opportunity list shows pending items
- [ ] Filter by priority works
- [ ] Approve/reject actions work
- [ ] Page refreshes after action
- [ ] Loading states show correctly
