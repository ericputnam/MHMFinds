# PRD-13: Opportunity Queue Management

## Overview
Build a comprehensive queue management interface for reviewing, approving, and rejecting monetization opportunities. Supports individual actions and bulk operations.

## Priority: P0 (Core Feature)
## Dependencies: PRD-10 (Admin Navigation), MON-002 (Action Queue Service)
## Estimated Implementation: 3 hours

---

## Features

### 1. Queue Overview
- List all pending opportunities
- Sort by priority, estimated impact, date
- Filter by opportunity type

### 2. Individual Actions
- View opportunity details
- Approve with one click
- Reject with optional reason
- View associated actions

### 3. Bulk Operations
- Select multiple opportunities
- Bulk approve selected
- Bulk reject selected
- Select all / deselect all

### 4. Opportunity Details Modal
- Full opportunity information
- Associated actions list
- Revenue impact estimation
- Reasoning and confidence

---

## Implementation

### File: `app/admin/monetization/queue/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Search,
} from 'lucide-react';

interface Action {
  id: string;
  actionType: string;
  actionData: any;
  status: string;
}

interface Opportunity {
  id: string;
  opportunityType: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  confidence: number;
  pageUrl: string | null;
  modId: string | null;
  category: string | null;
  estimatedRevenueImpact: number | null;
  estimatedRpmIncrease: number | null;
  createdAt: string;
  expiresAt: string | null;
  actions: Action[];
}

interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  implemented: number;
  expired: number;
  totalEstimatedImpact: number;
}

type SortField = 'priority' | 'estimatedRevenueImpact' | 'createdAt' | 'confidence';
type SortOrder = 'asc' | 'desc';

export default function QueuePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/monetization/queue');
      const data = await response.json();
      setOpportunities(data.opportunities || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveOpportunity = async (id: string) => {
    setProcessing(prev => new Set([...prev, id]));
    try {
      await fetch('/api/monetization/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id, action: 'approve' }),
      });
      await fetchQueue();
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const rejectOpportunity = async (id: string, reason?: string) => {
    setProcessing(prev => new Set([...prev, id]));
    try {
      await fetch('/api/monetization/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id, action: 'reject', reason }),
      });
      await fetchQueue();
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const bulkApprove = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await approveOpportunity(id);
    }
  };

  const bulkReject = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await rejectOpportunity(id);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredOpportunities.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredOpportunities.map(o => o.id)));
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const opportunityTypes = [...new Set(opportunities.map(o => o.opportunityType))];

  const filteredOpportunities = opportunities
    .filter(o => filterType === 'all' || o.opportunityType === filterType)
    .sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      aVal = aVal ?? 0;
      bVal = bVal ?? 0;

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return { label: 'High', color: 'bg-red-500/20 text-red-400' };
    if (priority >= 5) return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Low', color: 'bg-green-500/20 text-green-400' };
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      AFFILIATE_OPPORTUNITY: 'bg-purple-500/20 text-purple-400',
      HIGH_TRAFFIC_NO_AFFILIATE: 'bg-blue-500/20 text-blue-400',
      UNDERPERFORMING_RPM: 'bg-orange-500/20 text-orange-400',
      HIGH_BOUNCE_RATE: 'bg-red-500/20 text-red-400',
      THIN_CONTENT: 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunity Queue</h1>
          <p className="text-slate-400">Review and approve monetization opportunities</p>
        </div>

        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400">{stats.pending} pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">
                ${stats.totalEstimatedImpact.toFixed(0)} est. impact
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Select All */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {selected.size === filteredOpportunities.length && filteredOpportunities.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-sims-pink" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </button>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
              <button
                onClick={bulkApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
              >
                <Check className="h-4 w-4" />
                Approve ({selected.size})
              </button>
              <button
                onClick={bulkReject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
              >
                <X className="h-4 w-4" />
                Reject ({selected.size})
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            >
              <option value="all">All Types</option>
              {opportunityTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            {(['priority', 'estimatedRevenueImpact', 'createdAt'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  sortField === field
                    ? 'bg-sims-pink text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {field === 'priority' ? 'Priority' :
                 field === 'estimatedRevenueImpact' ? 'Impact' : 'Date'}
                {sortField === field && (
                  sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Queue List */}
      {filteredOpportunities.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Queue is empty!</h3>
          <p className="text-slate-400">No pending opportunities to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOpportunities.map(opp => {
            const isExpanded = expandedId === opp.id;
            const isSelected = selected.has(opp.id);
            const isProcessing = processing.has(opp.id);
            const priorityBadge = getPriorityBadge(opp.priority);

            return (
              <div
                key={opp.id}
                className={`bg-slate-800/50 border rounded-xl transition-all ${
                  isSelected ? 'border-sims-pink/50' : 'border-slate-700'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(opp.id)}
                    className="text-slate-400 hover:text-white"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-sims-pink" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityBadge.color}`}>
                        {priorityBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getTypeBadge(opp.opportunityType)}`}>
                        {opp.opportunityType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {Math.round(opp.confidence * 100)}% confidence
                      </span>
                    </div>
                    <h3 className="font-medium text-white truncate">{opp.title}</h3>
                    <p className="text-sm text-slate-400 truncate">{opp.description}</p>
                  </div>

                  {/* Impact */}
                  {opp.estimatedRevenueImpact && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400">
                        +${opp.estimatedRevenueImpact.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">est. monthly</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveOpportunity(opp.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(opp.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Details</h4>
                        <dl className="space-y-2 text-sm">
                          <div className="flex">
                            <dt className="w-32 text-slate-500">ID:</dt>
                            <dd className="text-slate-300 font-mono text-xs">{opp.id}</dd>
                          </div>
                          {opp.pageUrl && (
                            <div className="flex">
                              <dt className="w-32 text-slate-500">Page:</dt>
                              <dd>
                                <a
                                  href={opp.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sims-pink hover:underline flex items-center gap-1"
                                >
                                  {opp.pageUrl.slice(0, 50)}...
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </dd>
                            </div>
                          )}
                          {opp.estimatedRpmIncrease && (
                            <div className="flex">
                              <dt className="w-32 text-slate-500">RPM Increase:</dt>
                              <dd className="text-emerald-400">+${opp.estimatedRpmIncrease.toFixed(2)}</dd>
                            </div>
                          )}
                          <div className="flex">
                            <dt className="w-32 text-slate-500">Created:</dt>
                            <dd className="text-slate-300">
                              {new Date(opp.createdAt).toLocaleString()}
                            </dd>
                          </div>
                          {opp.expiresAt && (
                            <div className="flex">
                              <dt className="w-32 text-slate-500">Expires:</dt>
                              <dd className="text-slate-300">
                                {new Date(opp.expiresAt).toLocaleString()}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">
                          Actions ({opp.actions.length})
                        </h4>
                        <div className="space-y-2">
                          {opp.actions.map(action => (
                            <div
                              key={action.id}
                              className="p-3 bg-slate-800 rounded-lg text-sm"
                            >
                              <div className="font-medium text-white">
                                {action.actionType.replace(/_/g, ' ')}
                              </div>
                              {action.actionData && (
                                <pre className="mt-1 text-xs text-slate-400 overflow-auto max-h-20">
                                  {JSON.stringify(action.actionData, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Reject Opportunity</h3>
            <p className="text-slate-400 text-sm mb-4">
              Optionally provide a reason for rejection (helps improve future detections).
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectOpportunity(showRejectModal, rejectReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Update API Route: `app/api/monetization/queue/route.ts`

Add support for rejection reason:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { actionQueue } from '@/lib/services/actionQueue';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [opportunities, stats] = await Promise.all([
    actionQueue.getPendingOpportunities(100),
    actionQueue.getQueueStats(),
  ]);

  return NextResponse.json({
    opportunities: opportunities.map(o => ({
      ...o,
      confidence: Number(o.confidence),
      estimatedRevenueImpact: o.estimatedRevenueImpact ? Number(o.estimatedRevenueImpact) : null,
      estimatedRpmIncrease: o.estimatedRpmIncrease ? Number(o.estimatedRpmIncrease) : null,
      createdAt: o.createdAt.toISOString(),
    })),
    stats,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { opportunityId, action, reason } = await request.json();

  if (!opportunityId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const userId = session.user.id || session.user.email || 'admin';

  try {
    if (action === 'approve') {
      await actionQueue.approveOpportunity(opportunityId, userId);
    } else {
      await actionQueue.rejectOpportunity(opportunityId, userId, reason);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

---

## Validation Criteria

- [ ] Queue displays all pending opportunities
- [ ] Sorting by priority/impact/date works
- [ ] Filtering by type works
- [ ] Individual approve/reject works
- [ ] Bulk select works
- [ ] Bulk approve/reject works
- [ ] Expanded details show correctly
- [ ] Reject modal captures reason
- [ ] Stats update after actions
- [ ] API endpoints require admin auth
- [ ] `npm run type-check` passes
