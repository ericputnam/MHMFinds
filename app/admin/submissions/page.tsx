'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  Mail,
  User,
  Package,
  FileText,
  Loader2,
} from 'lucide-react';

interface ModSubmission {
  id: string;
  modUrl: string;
  modName: string;
  description: string;
  category: string;
  submitterName: string;
  submitterEmail: string;
  status: string;
  createdAt: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<ModSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/submissions?status=${filter}`);
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: ModSubmission) => {
    if (!confirm(`Convert "${submission.modName}" to a mod?`)) return;

    try {
      setProcessing(submission.id);
      const response = await fetch(`/api/admin/submissions/${submission.id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSubmissions();
        alert('Submission approved and mod created!');
      } else {
        const data = await response.json();
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve submission');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      setProcessing(id);
      await fetch(`/api/admin/submissions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchSubmissions();
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject submission');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Mod Submissions</h1>
        <p className="text-slate-400">Review and approve user-submitted mods</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
        {(['pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              filter === status
                ? 'bg-sims-pink hover:bg-sims-pink/90 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Loader2 className="h-8 w-8 text-sims-pink animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No {filter} submissions</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-white">{submission.modName}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : submission.status === 'approved'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-1 bg-sims-blue/10 text-sims-blue rounded text-xs">
                        {submission.category}
                      </span>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 leading-relaxed">{submission.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="h-4 w-4" />
                      <span>{submission.submitterName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${submission.submitterEmail}`}
                        className="hover:text-sims-pink transition-colors"
                      >
                        {submission.submitterEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                    <a
                      href={submission.modUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sims-blue hover:text-sims-pink transition-colors text-sm truncate"
                    >
                      {submission.modUrl}
                    </a>
                  </div>
                </div>

                {/* Actions */}
                {submission.status === 'pending' && (
                  <div className="flex lg:flex-col gap-3 lg:w-48">
                    <button
                      onClick={() => handleApprove(submission)}
                      disabled={processing === submission.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === submission.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(submission.id)}
                      disabled={processing === submission.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
