'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  DollarSign,
  RefreshCw,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
} from 'lucide-react';

interface ImplementedOpportunity {
  id: string;
  title: string;
  opportunityType: string;
  estimatedRevenueImpact: number | null;
  implementedAt: string;
  actions: {
    actionType: string;
    measuredImpact: number | null;
  }[];
}

interface LearningStats {
  totalImplemented: number;
  withMeasuredImpact: number;
  totalEstimatedImpact: number;
  totalMeasuredImpact: number;
  accuracyPercent: number;
}

interface ActionTypeAccuracy {
  actionType: string;
  measurementCount: number;
  avgAccuracy: number;
  avgPredictionError: number;
  totalEstimatedImpact: number;
  totalActualImpact: number;
  confidenceLevel: number;
  trend: 'improving' | 'stable' | 'declining';
  adjustmentFactor: number;
}

interface LearningInsight {
  type: 'accuracy' | 'trend' | 'recommendation' | 'warning';
  actionType?: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  metric?: number;
  trend?: 'improving' | 'stable' | 'declining';
}

interface LearningDashboard {
  overallAccuracy: number;
  totalMeasurements: number;
  actionTypeStats: ActionTypeAccuracy[];
  insights: LearningInsight[];
  recentTrend: 'improving' | 'stable' | 'declining';
  topPerformingType: string | null;
  needsAttentionType: string | null;
}

interface ImpactSummary {
  totalMeasurements: number;
  completedMeasurements: number;
  avgPredictionAccuracy: number;
  totalVerifiedImpact: number;
  byActionType: Record<string, { count: number; avgAccuracy: number; totalImpact: number }>;
}

interface RecentMeasurement {
  id: string;
  actionType: string;
  status: string;
  estimatedImpact: number;
  measuredImpact: number | null;
  predictionAccuracy: number | null;
  completedAt: string | null;
}

export default function LearningPage() {
  const [opportunities, setOpportunities] = useState<ImplementedOpportunity[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [learning, setLearning] = useState<LearningDashboard | null>(null);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accuracy' | 'measurements'>('overview');

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    try {
      const response = await fetch('/api/monetization/learning');
      const data = await response.json();
      setOpportunities(data.opportunities || []);
      setStats(data.stats || null);
      setLearning(data.learning || null);
      setImpactSummary(data.impact?.summary || null);
      setRecentMeasurements(data.impact?.recentMeasurements || []);
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return 'text-green-400';
      case 'declining':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getInsightIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getInsightBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'critical':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="h-7 w-7 text-purple-400" />
            Agent Learning & Performance
          </h1>
          <p className="text-slate-400">Track prediction accuracy and learn from historical performance</p>
        </div>
        <button
          onClick={fetchLearningData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Target className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Accuracy</span>
          </div>
          <div className={`text-2xl font-bold ${
            (learning?.overallAccuracy ?? 0) >= 0.8 ? 'text-green-400' :
            (learning?.overallAccuracy ?? 0) >= 0.6 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {learning ? formatPercent(learning.overallAccuracy) : '--'}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Measurements</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {learning?.totalMeasurements ?? 0}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Verified Impact</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(impactSummary?.totalVerifiedImpact ?? null)}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              {getTrendIcon(learning?.recentTrend ?? 'stable')}
            </div>
            <span className="text-sm text-slate-400">Trend</span>
          </div>
          <div className={`text-2xl font-bold capitalize ${getTrendColor(learning?.recentTrend ?? 'stable')}`}>
            {learning?.recentTrend ?? 'N/A'}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Zap className="h-5 w-5 text-pink-400" />
            </div>
            <span className="text-sm text-slate-400">Top Performer</span>
          </div>
          <div className="text-lg font-bold text-white truncate">
            {learning?.topPerformingType?.replace(/_/g, ' ') ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview & Insights' },
            { id: 'accuracy', label: 'Action Type Accuracy' },
            { id: 'measurements', label: 'Recent Measurements' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'accuracy' | 'measurements')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-pink-400 border-b-2 border-pink-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Insights */}
          {learning?.insights && learning.insights.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Agent Insights
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {learning.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 ${getInsightBg(insight.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.severity)}
                      <div>
                        <h3 className="font-medium text-white">{insight.title}</h3>
                        <p className="text-sm text-slate-300 mt-1">{insight.description}</p>
                        {insight.trend && (
                          <div className="flex items-center gap-2 mt-2">
                            {getTrendIcon(insight.trend)}
                            <span className={`text-sm capitalize ${getTrendColor(insight.trend)}`}>
                              {insight.trend}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Opportunities Table */}
          {opportunities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Implemented Opportunities</h2>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-900 text-xs text-slate-400 font-medium uppercase">
                  <div className="col-span-2">Opportunity</div>
                  <div>Type</div>
                  <div>Estimated</div>
                  <div>Measured</div>
                  <div>Performance</div>
                </div>

                {opportunities.slice(0, 10).map(opp => {
                  const measured = opp.actions.reduce(
                    (sum, a) => sum + (a.measuredImpact ?? 0),
                    0
                  );
                  const estimated = opp.estimatedRevenueImpact ?? 0;
                  const performance = estimated > 0 ? (measured / estimated) * 100 : null;

                  return (
                    <div
                      key={opp.id}
                      className="grid grid-cols-6 gap-4 px-4 py-3 items-center border-t border-slate-700"
                    >
                      <div className="col-span-2">
                        <div className="font-medium text-white truncate">{opp.title}</div>
                        <div className="text-xs text-slate-500">
                          Implemented {new Date(opp.implementedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-slate-400">
                        {opp.opportunityType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-slate-300">
                        {formatCurrency(estimated)}
                      </div>
                      <div className="text-sm text-emerald-400">
                        {formatCurrency(measured > 0 ? measured : null)}
                      </div>
                      <div>
                        {performance !== null ? (
                          <div className="flex items-center gap-2">
                            {performance >= 100 ? (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                            <span className={`text-sm ${
                              performance >= 100 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {performance.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">--</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!learning?.insights || learning.insights.length === 0) && opportunities.length === 0 && (
            <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
              <Brain className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Learning Data Yet</h3>
              <p className="text-slate-400">
                Implement opportunities and let the agent learn from real performance data.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'accuracy' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Accuracy by Action Type</h2>

          {learning?.actionTypeStats && learning.actionTypeStats.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-slate-900 text-xs text-slate-400 font-medium uppercase">
                <div className="col-span-2">Action Type</div>
                <div>Samples</div>
                <div>Accuracy</div>
                <div>Confidence</div>
                <div>Adjustment</div>
                <div>Trend</div>
              </div>

              {learning.actionTypeStats.map(stat => (
                <div
                  key={stat.actionType}
                  className="grid grid-cols-7 gap-4 px-4 py-3 items-center border-t border-slate-700"
                >
                  <div className="col-span-2">
                    <div className="font-medium text-white">
                      {stat.actionType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(stat.totalActualImpact)} verified
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">
                    {stat.measurementCount}
                  </div>
                  <div className={`text-sm font-medium ${
                    stat.avgAccuracy >= 0.8 ? 'text-green-400' :
                    stat.avgAccuracy >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formatPercent(stat.avgAccuracy)}
                  </div>
                  <div className="text-sm">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${stat.confidenceLevel * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{formatPercent(stat.confidenceLevel)}</span>
                  </div>
                  <div className={`text-sm ${
                    stat.adjustmentFactor > 1 ? 'text-green-400' :
                    stat.adjustmentFactor < 1 ? 'text-red-400' : 'text-slate-300'
                  }`}>
                    {stat.adjustmentFactor.toFixed(2)}x
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(stat.trend)}
                    <span className={`text-sm capitalize ${getTrendColor(stat.trend)}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
              <BarChart3 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Accuracy Data</h3>
              <p className="text-slate-400">
                Complete some actions and wait for impact measurements to see accuracy data.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'measurements' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Recent Impact Measurements</h2>

          {recentMeasurements.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-900 text-xs text-slate-400 font-medium uppercase">
                <div>Action Type</div>
                <div>Status</div>
                <div>Estimated</div>
                <div>Measured</div>
                <div>Accuracy</div>
                <div>Completed</div>
              </div>

              {recentMeasurements.map(measurement => (
                <div
                  key={measurement.id}
                  className="grid grid-cols-6 gap-4 px-4 py-3 items-center border-t border-slate-700"
                >
                  <div className="font-medium text-white text-sm">
                    {measurement.actionType.replace(/_/g, ' ')}
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      measurement.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                      measurement.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {measurement.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {formatCurrency(measurement.estimatedImpact)}
                  </div>
                  <div className="text-sm text-emerald-400">
                    {formatCurrency(measurement.measuredImpact)}
                  </div>
                  <div className={`text-sm font-medium ${
                    (measurement.predictionAccuracy ?? 0) >= 0.8 ? 'text-green-400' :
                    (measurement.predictionAccuracy ?? 0) >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {measurement.predictionAccuracy != null
                      ? formatPercent(measurement.predictionAccuracy)
                      : '--'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {measurement.completedAt
                      ? new Date(measurement.completedAt).toLocaleDateString()
                      : '--'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
              <Target className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Measurements Yet</h3>
              <p className="text-slate-400">
                Impact measurements are created after actions are executed. Check back after some actions complete.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
