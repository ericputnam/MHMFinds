'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Eye,
  Search,
  Download,
  MousePointer,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  Activity,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalSearches: number;
    totalDownloadClicks: number;
    totalAdViews: number;
    totalAdClicks: number;
    averageTimeOnPage: number;
    averageScrollDepth: number;
  };
  topSearchQueries: Array<{
    query: string;
    count: number;
  }>;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topMods: Array<{
    id: string;
    title: string;
    thumbnail?: string;
    analyticsCount: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
  }>;
  browserBreakdown: Array<{
    browser: string;
    count: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-400 text-lg">Failed to load analytics</div>
        <button
          onClick={fetchAnalytics}
          className="bg-sims-pink hover:bg-sims-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const { overview } = analytics;

  return (
    <div className="space-y-8">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Track user engagement and behavior</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === p
                  ? 'bg-sims-pink text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-blue/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-blue/10 p-3 rounded-lg">
              <Eye className="h-6 w-6 text-sims-blue" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {overview.totalPageViews.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-400">Page Views</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-green/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-green/10 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-sims-green" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {overview.uniqueVisitors.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-400">Unique Visitors</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Search className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {overview.totalSearches.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-400">Searches</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-pink/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-pink/10 p-3 rounded-lg">
              <Download className="h-6 w-6 text-sims-pink" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {overview.totalDownloadClicks.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-400">Download Clicks</p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">
                {formatTime(overview.averageTimeOnPage)}
              </h4>
              <p className="text-sm text-slate-400">Avg. Time on Page</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">{overview.averageScrollDepth}%</h4>
              <p className="text-sm text-slate-400">Avg. Scroll Depth</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <MousePointer className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">
                {overview.totalAdViews.toLocaleString()}
              </h4>
              <p className="text-sm text-slate-400">Ad Impressions</p>
              <p className="text-xs text-slate-500">
                {overview.totalAdClicks} clicks (
                {overview.totalAdViews > 0
                  ? ((overview.totalAdClicks / overview.totalAdViews) * 100).toFixed(1)
                  : 0}
                % CTR)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Queries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-500" />
            Top Search Queries
          </h2>
          <div className="space-y-3">
            {analytics.topSearchQueries.length > 0 ? (
              analytics.topSearchQueries.map((query, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-sm">#{index + 1}</span>
                    <span className="text-white font-medium">{query.query}</span>
                  </div>
                  <span className="text-slate-400 text-sm">{query.count} searches</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">No search data yet</p>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-sims-blue" />
            Device Breakdown
          </h2>
          <div className="space-y-4">
            {analytics.deviceBreakdown.map((device, index) => {
              const total = analytics.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
              const percentage = ((device.count / total) * 100).toFixed(1);

              const Icon =
                device.device === 'mobile'
                  ? Smartphone
                  : device.device === 'tablet'
                  ? Tablet
                  : Monitor;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-sims-blue" />
                      <span className="text-white capitalize">{device.device}</span>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {device.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-sims-blue to-sims-pink h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Eye className="h-5 w-5 text-sims-green" />
          Top Pages
        </h2>
        <div className="space-y-3">
          {analytics.topPages.length > 0 ? (
            analytics.topPages.map((page, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-sm">#{index + 1}</span>
                  <span className="text-white font-mono text-sm">{page.page}</span>
                </div>
                <span className="text-slate-400 text-sm">{page.views.toLocaleString()} views</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">No page data yet</p>
          )}
        </div>
      </div>

      {/* Top Mods */}
      {analytics.topMods.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sims-pink" />
            Trending Mods
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.topMods.map((mod, index) => (
              <div
                key={mod.id}
                className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {mod.thumbnail && (
                  <img
                    src={mod.thumbnail}
                    alt={mod.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{mod.title}</h3>
                  <p className="text-slate-400 text-sm">
                    {mod.analyticsCount} interactions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
