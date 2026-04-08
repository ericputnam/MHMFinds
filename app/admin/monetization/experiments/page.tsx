'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RotateCcw,
  Play,
  BookOpen,
} from 'lucide-react';

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: string;
  catalogKey: string;
  scope: string;
  daysOfData: number;
  baselineRpm: number | null;
  treatmentRpm: number | null;
  rpmLiftPercent: number | null;
  bayesianProbability: number | null;
  decision: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  experimentStartDate: string | null;
  createdAt: string;
}

interface CatalogCandidate {
  key: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  complexity: string;
  expectedRpmImpact: { min: number; max: number };
  status: string;
  confidence: number;
}

interface CatalogSummary {
  total: number;
  byStatus: Record<string, number>;
  totalExpectedRpmImpact: { min: number; max: number };
  totalExpectedRevenueImpact: { min: number; max: number };
}

interface ExperimentsData {
  active: Experiment[];
  history: Experiment[];
  catalog: CatalogSummary;
  candidates: CatalogCandidate[];
  _warning?: string;
}

export default function ExperimentsDashboard() {
  const [data, setData] = useState<ExperimentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/monetization/experiments');
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: string, experimentId: string, extra?: Record<string, string>) => {
    setActionLoading(experimentId);
    try {
      const response = await fetch('/api/monetization/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, experimentId, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.error || 'Action failed');
      } else {
        await fetchData();
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getDaysRunning = (exp: Experiment): number => {
    if (!exp.experimentStartDate) return 0;
    const start = new Date(exp.experimentStartDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RUNNING: 'bg-blue-500/20 text-blue-400',
      EVALUATING: 'bg-yellow-500/20 text-yellow-400',
      EXTENDED: 'bg-purple-500/20 text-purple-400',
      BASELINE_CAPTURE: 'bg-slate-600/30 text-slate-300',
      PROPOSED: 'bg-slate-600/30 text-slate-400',
      KEPT: 'bg-green-500/20 text-green-400',
      REVERTED: 'bg-red-500/20 text-red-400',
      CANCELLED: 'bg-slate-600/30 text-slate-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-700 text-slate-400'}`}>
        {status}
      </span>
    );
  };

  const complexityBadge = (complexity: string) => {
    const styles: Record<string, string> = {
      trivial: 'bg-green-500/20 text-green-400',
      low: 'bg-blue-500/20 text-blue-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[complexity] || 'bg-slate-700 text-slate-400'}`}>
        {complexity}
      </span>
    );
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
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const keptCount = data?.history.filter(e => e.status === 'KEPT').length ?? 0;
  const revertedCount = data?.history.filter(e => e.status === 'REVERTED').length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">RPM Optimization Experiments</h1>
        <p className="text-slate-400">Autoresearch-inspired optimization loop</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FlaskConical className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Active Experiments</span>
          </div>
          <div className="text-2xl font-bold text-white">{data?.active.length ?? 0}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Total Kept</span>
          </div>
          <div className="text-2xl font-bold text-white">{keptCount}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-sm text-slate-400">Total Reverted</span>
          </div>
          <div className="text-2xl font-bold text-white">{revertedCount}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <BookOpen className="h-5 w-5 text-pink-400" />
            </div>
            <span className="text-sm text-slate-400">Catalog Candidates</span>
          </div>
          <div className="text-2xl font-bold text-white">{data?.candidates.length ?? 0}</div>
        </div>
      </div>

      {/* Active Experiments */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-400" />
          Active Experiments
        </h2>
        {data?.active.length === 0 ? (
          <p className="text-slate-500 text-sm">No active experiments. Pick a candidate from the catalog below to start one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2 pr-4">Days</th>
                  <th className="text-right py-2 pr-4">RPM Lift</th>
                  <th className="text-right py-2 pr-4">Probability</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.active.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-700/50">
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">{exp.name}</div>
                      <div className="text-slate-500 text-xs">{exp.scope}</div>
                    </td>
                    <td className="py-3 pr-4">{statusBadge(exp.status)}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{getDaysRunning(exp)}d</td>
                    <td className="py-3 pr-4 text-right">
                      {exp.rpmLiftPercent != null ? (
                        <span className={exp.rpmLiftPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {exp.rpmLiftPercent >= 0 ? '+' : ''}{exp.rpmLiftPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {exp.bayesianProbability != null ? (
                        <span className="text-slate-300">{(exp.bayesianProbability * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {(exp.status === 'PROPOSED' || exp.status === 'BASELINE_CAPTURE') && (
                          <button
                            onClick={() => handleAction('start', exp.id)}
                            disabled={actionLoading === exp.id}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors disabled:opacity-50"
                          >
                            <Play className="h-3 w-3 inline mr-1" />Start
                          </button>
                        )}
                        {(exp.status === 'RUNNING' || exp.status === 'EVALUATING' || exp.status === 'EXTENDED') && (
                          <>
                            <button
                              onClick={() => handleAction('conclude', exp.id, { decision: 'keep', reason: 'Manual keep from dashboard' })}
                              disabled={actionLoading === exp.id}
                              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />Keep
                            </button>
                            <button
                              onClick={() => handleAction('conclude', exp.id, { decision: 'revert', reason: 'Manual revert from dashboard' })}
                              disabled={actionLoading === exp.id}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3 inline mr-1" />Revert
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Experiment History */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-400" />
          Experiment History
        </h2>
        {data?.history.length === 0 ? (
          <p className="text-slate-500 text-sm">No experiment history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2 pr-4">RPM Lift %</th>
                  <th className="text-left py-2 pr-4">Decision</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.history.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-700/50">
                    <td className="py-3 pr-4 text-white">{exp.name}</td>
                    <td className="py-3 pr-4">{statusBadge(exp.status)}</td>
                    <td className="py-3 pr-4 text-right">
                      {exp.rpmLiftPercent != null ? (
                        <span className={exp.rpmLiftPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {exp.rpmLiftPercent >= 0 ? '+' : ''}{exp.rpmLiftPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {exp.decision ? (
                        <span className={
                          exp.decision === 'keep' ? 'text-green-400' :
                          exp.decision === 'revert' ? 'text-red-400' :
                          'text-slate-400'
                        }>
                          {exp.decision}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400">
                      {exp.decidedAt
                        ? new Date(exp.decidedAt).toLocaleDateString()
                        : new Date(exp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optimization Catalog */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-pink-400" />
          Optimization Catalog
        </h2>
        <p className="text-slate-500 text-xs mb-4">
          {data?.catalog.total ?? 0} total optimizations
          {' | '}
          Expected RPM impact: +${data?.catalog.totalExpectedRpmImpact.min.toFixed(2)} - ${data?.catalog.totalExpectedRpmImpact.max.toFixed(2)}
        </p>
        {data?.candidates.length === 0 ? (
          <p className="text-slate-500 text-sm">No ready candidates. All prerequisites must be met first.</p>
        ) : (
          <div className="space-y-3">
            {data?.candidates.map(candidate => (
              <div
                key={candidate.key}
                className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-lg p-4"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{candidate.name}</span>
                    {complexityBadge(candidate.complexity)}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-400">
                      {candidate.category}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs truncate">{candidate.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-green-400 text-sm font-medium">
                    +${candidate.expectedRpmImpact.min.toFixed(2)} - ${candidate.expectedRpmImpact.max.toFixed(2)}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {(candidate.confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
