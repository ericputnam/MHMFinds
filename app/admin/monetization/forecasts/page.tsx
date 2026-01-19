'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

interface Forecast {
  id: string;
  forecastMonth: string;
  forecastedAdRevenue: number;
  forecastedAffiliateRevenue: number;
  forecastedTotalRevenue: number;
  actualAdRevenue: number | null;
  actualAffiliateRevenue: number | null;
  actualTotalRevenue: number | null;
  confidenceLevel: number;
  monthOverMonthGrowth: number;
  growthRate: number;
  createdAt: string;
}

interface AccuracyStats {
  totalForecasts: number;
  withActuals: number;
  averageError: number;
  accuracyPercent: number;
}

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [horizon, setHorizon] = useState(3);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const response = await fetch('/api/monetization/forecasts');
      const data = await response.json();
      setForecasts(data.forecasts || []);
      setAccuracy(data.accuracy || null);
    } catch (error) {
      console.error('Failed to fetch forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateForecasts = async () => {
    setGenerating(true);
    try {
      await fetch('/api/monetization/forecasts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: horizon }),
      });
      await fetchForecasts();
    } catch (error) {
      console.error('Failed to generate forecasts:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatMonth = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 1) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (growth < -1) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 1) return 'text-green-400';
    if (growth < -1) return 'text-red-400';
    return 'text-slate-400';
  };

  const calculateError = (forecasted: number, actual: number) => {
    if (actual === 0) return 0;
    return Math.abs((forecasted - actual) / actual) * 100;
  };

  // Separate future and past forecasts
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const futureForecasts = forecasts.filter(
    f => new Date(f.forecastMonth) >= currentMonth
  );
  const pastForecasts = forecasts.filter(
    f => new Date(f.forecastMonth) < currentMonth
  );

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
          <h1 className="text-2xl font-bold text-white">Revenue Forecasts</h1>
          <p className="text-slate-400">Predictions and accuracy tracking</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Horizon:</label>
            <select
              value={horizon}
              onChange={e => setHorizon(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            >
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>

          <button
            onClick={generateForecasts}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-50 rounded-lg text-white transition-colors"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate Forecasts
          </button>
        </div>
      </div>

      {/* Accuracy Stats */}
      {accuracy && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm text-slate-400">Total Forecasts</span>
            </div>
            <div className="text-2xl font-bold text-white">{accuracy.totalForecasts}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm text-slate-400">With Actuals</span>
            </div>
            <div className="text-2xl font-bold text-white">{accuracy.withActuals}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <span className="text-sm text-slate-400">Avg Error</span>
            </div>
            <div className="text-2xl font-bold text-white">{accuracy.averageError.toFixed(1)}%</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-slate-400">Accuracy</span>
            </div>
            <div className={`text-2xl font-bold ${
              accuracy.accuracyPercent >= 90 ? 'text-green-400' :
              accuracy.accuracyPercent >= 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {accuracy.accuracyPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Future Forecasts */}
      {futureForecasts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sims-pink" />
            Upcoming Predictions
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {futureForecasts.map(forecast => (
              <div
                key={forecast.id}
                className="bg-slate-900/50 border border-slate-700 rounded-xl p-4"
              >
                <div className="text-sm text-slate-400 mb-2">
                  {formatMonth(forecast.forecastMonth)}
                </div>

                <div className="text-2xl font-bold text-white mb-3">
                  {formatCurrency(forecast.forecastedTotalRevenue)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ad Revenue</span>
                    <span className="text-slate-300">
                      {formatCurrency(forecast.forecastedAdRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Affiliate</span>
                    <span className="text-slate-300">
                      {formatCurrency(forecast.forecastedAffiliateRevenue)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getGrowthIcon(forecast.monthOverMonthGrowth)}
                    <span className={`text-sm ${getGrowthColor(forecast.monthOverMonthGrowth)}`}>
                      {forecast.monthOverMonthGrowth > 0 ? '+' : ''}
                      {forecast.monthOverMonthGrowth.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        forecast.confidenceLevel >= 0.8 ? 'bg-green-400' :
                        forecast.confidenceLevel >= 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-xs text-slate-500">
                      {(forecast.confidenceLevel * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Forecasts (Accuracy Check) */}
      {pastForecasts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Forecast Accuracy
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase">
                  <th className="pb-3">Month</th>
                  <th className="pb-3">Forecasted</th>
                  <th className="pb-3">Actual</th>
                  <th className="pb-3">Difference</th>
                  <th className="pb-3">Error %</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pastForecasts.map(forecast => {
                  const hasActual = forecast.actualTotalRevenue !== null;
                  const error = hasActual
                    ? calculateError(forecast.forecastedTotalRevenue, forecast.actualTotalRevenue!)
                    : null;
                  const diff = hasActual
                    ? forecast.actualTotalRevenue! - forecast.forecastedTotalRevenue
                    : null;

                  return (
                    <tr key={forecast.id} className="border-t border-slate-700">
                      <td className="py-3 text-white">
                        {formatMonth(forecast.forecastMonth)}
                      </td>
                      <td className="py-3 text-slate-300">
                        {formatCurrency(forecast.forecastedTotalRevenue)}
                      </td>
                      <td className="py-3">
                        {hasActual ? (
                          <span className="text-white">
                            {formatCurrency(forecast.actualTotalRevenue!)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3">
                        {diff !== null ? (
                          <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="py-3">
                        {error !== null ? (
                          <span className={
                            error <= 5 ? 'text-green-400' :
                            error <= 15 ? 'text-yellow-400' : 'text-red-400'
                          }>
                            {error.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="py-3">
                        {hasActual ? (
                          error !== null && error <= 15 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Accurate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              <AlertCircle className="h-3 w-3" />
                              Off Target
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                            Awaiting Data
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data */}
      {forecasts.length === 0 && (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Forecasts Yet</h3>
          <p className="text-slate-400 mb-4">
            Generate your first revenue forecast to see predictions.
          </p>
          <button
            onClick={generateForecasts}
            className="px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 rounded-lg text-white transition-colors"
          >
            Generate Forecasts
          </button>
        </div>
      )}
    </div>
  );
}
