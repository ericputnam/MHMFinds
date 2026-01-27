'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Upload,
  Package,
  Clock,
  CheckCircle,
  Download,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedMods: number;
  totalDownloads: number;
}

interface Submission {
  id: string;
  modName: string;
  status: string;
  createdAt: string;
  thumbnail: string | null;
  approvedMod?: {
    id: string;
    downloadCount: number;
  };
}

export default function CreatorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    pendingSubmissions: 0,
    approvedMods: 0,
    totalDownloads: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/creator/submissions');
      const data = await response.json();

      if (data.submissions) {
        const submissions = data.submissions;

        // Calculate stats
        const totalDownloads = submissions
          .filter((s: Submission) => s.approvedMod)
          .reduce((sum: number, s: Submission) => sum + (s.approvedMod?.downloadCount || 0), 0);

        setStats({
          totalSubmissions: data.counts.total,
          pendingSubmissions: data.counts.pending,
          approvedMods: data.counts.approved,
          totalDownloads,
        });

        // Get recent 5 submissions
        setRecentSubmissions(submissions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Creator Dashboard</h1>
        <p className="text-slate-400">
          Manage your mod submissions and track their performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          icon={Package}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingSubmissions}
          icon={Clock}
          color="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          title="Live Mods"
          value={stats.approvedMods}
          icon={CheckCircle}
          color="bg-green-500/10 text-green-400"
        />
        <StatCard
          title="Total Downloads"
          value={stats.totalDownloads}
          icon={Download}
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/mods/submit">
          <div className="bg-gradient-to-r from-sims-pink to-pink-600 hover:from-pink-600 hover:to-sims-pink text-white p-6 rounded-xl transition-all hover:scale-[1.02] cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Submit New Mod</h3>
                <p className="text-white/80 text-sm">
                  Upload your latest creation
                </p>
              </div>
              <Upload className="h-8 w-8 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/admin/submissions">
          <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white p-6 rounded-xl transition-all hover:scale-[1.02] cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">View My Submissions</h3>
                <p className="text-slate-400 text-sm">
                  Track approval status
                </p>
              </div>
              <Package className="h-8 w-8 text-slate-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Submissions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
              <p className="text-slate-400 text-sm mt-1">Your latest mod submissions</p>
            </div>
            <Link
              href="/admin/submissions"
              className="flex items-center gap-2 text-sims-pink hover:text-pink-400 transition-colors text-sm font-medium"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {recentSubmissions.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No submissions yet</p>
              <Link
                href="/admin/mods/submit"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-sims-pink hover:bg-pink-600 text-white rounded-lg transition-colors text-sm"
              >
                <Upload className="h-4 w-4" />
                Submit Your First Mod
              </Link>
            </div>
          ) : (
            recentSubmissions.map((submission) => (
              <SubmissionRow key={submission.id} submission={submission} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// Submission Row Component
interface SubmissionRowProps {
  submission: Submission;
}

function SubmissionRow({ submission }: SubmissionRowProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
          {submission.thumbnail ? (
            <Image
              src={submission.thumbnail}
              alt={submission.modName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-slate-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{submission.modName}</h3>
          <p className="text-slate-500 text-sm">
            Submitted {new Date(submission.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Status & Stats */}
        <div className="flex items-center gap-4">
          {submission.approvedMod && (
            <div className="text-right">
              <p className="text-slate-400 text-xs">Downloads</p>
              <p className="text-white font-semibold">
                {submission.approvedMod.downloadCount.toLocaleString()}
              </p>
            </div>
          )}
          {getStatusBadge(submission.status)}
        </div>
      </div>
    </div>
  );
}
