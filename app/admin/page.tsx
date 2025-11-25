'use client';

import React, { useState, useEffect } from 'react';
import { Package, Users, Upload, TrendingUp, Eye, Download, Star, Clock, Mail } from 'lucide-react';

interface Stats {
  totalMods: number;
  totalCreators: number;
  pendingSubmissions: number;
  totalUsers: number;
  totalDownloads: number;
  totalFavorites: number;
  averageRating: number;
  waitlistCount: number;
  recentMods: Array<{
    id: string;
    title: string;
    createdAt: string;
    downloadCount: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your content management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Mods */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-pink/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-pink/10 p-3 rounded-lg">
              <Package className="h-6 w-6 text-sims-pink" />
            </div>
            <span className="text-xs text-slate-500 font-medium">TOTAL</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalMods || 0}</h3>
          <p className="text-sm text-slate-400">Mods Published</p>
        </div>

        {/* Total Creators */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-blue/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-blue/10 p-3 rounded-lg">
              <Users className="h-6 w-6 text-sims-blue" />
            </div>
            <span className="text-xs text-slate-500 font-medium">ACTIVE</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalCreators || 0}</h3>
          <p className="text-sm text-slate-400">Content Creators</p>
        </div>

        {/* Pending Submissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Upload className="h-6 w-6 text-yellow-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">PENDING</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.pendingSubmissions || 0}</h3>
          <p className="text-sm text-slate-400">Awaiting Review</p>
        </div>

        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-sims-green/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-sims-green/10 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-sims-green" />
            </div>
            <span className="text-xs text-slate-500 font-medium">REGISTERED</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</h3>
          <p className="text-sm text-slate-400">User Accounts</p>
        </div>

        {/* Waitlist */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Mail className="h-6 w-6 text-purple-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">WAITING</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.waitlistCount || 0}</h3>
          <p className="text-sm text-slate-400">Waitlist Signups</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Download className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">{stats?.totalDownloads?.toLocaleString() || 0}</h4>
              <p className="text-sm text-slate-400">Total Downloads</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-pink-500/10 p-3 rounded-lg">
              <Star className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">{stats?.totalFavorites?.toLocaleString() || 0}</h4>
              <p className="text-sm text-slate-400">Total Favorites</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">{stats?.averageRating?.toFixed(1) || 'N/A'}</h4>
              <p className="text-sm text-slate-400">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Mods */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-sims-pink" />
          Recently Added Mods
        </h2>
        <div className="space-y-3">
          {stats?.recentMods && stats.recentMods.length > 0 ? (
            stats.recentMods.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{mod.title}</h3>
                  <p className="text-sm text-slate-400">
                    Added {new Date(mod.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Download className="h-4 w-4" />
                  <span className="text-sm">{mod.downloadCount}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">No mods found</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/admin/mods/new"
          className="bg-gradient-to-r from-sims-pink to-purple-600 rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
        >
          <Package className="h-8 w-8 text-white mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Add New Mod</h3>
          <p className="text-sm text-white/80">Manually create a new mod entry</p>
        </a>

        <a
          href="/admin/submissions"
          className="bg-gradient-to-r from-sims-blue to-cyan-600 rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
        >
          <Upload className="h-8 w-8 text-white mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Review Submissions</h3>
          <p className="text-sm text-white/80">Approve or reject pending mods</p>
        </a>

        <a
          href="/admin/creators"
          className="bg-gradient-to-r from-sims-green to-emerald-600 rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
        >
          <Users className="h-8 w-8 text-white mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Manage Creators</h3>
          <p className="text-sm text-white/80">Edit creator profiles and info</p>
        </a>
      </div>
    </div>
  );
}
