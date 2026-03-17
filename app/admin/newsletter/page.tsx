'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Newspaper,
  Users,
  Mail,
  Send,
  Calendar,
  Clock,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface NewsletterStats {
  totalSubscribers: number;
  waitlistEmails: number;
  sendsThisMonth: number;
  lastSend: string | null;
}

interface SendHistoryEntry {
  id: string;
  date: string;
  subject: string;
  recipients: number;
  delivered: number;
  failed: number;
  status: 'sent' | 'sending' | 'failed' | 'draft';
  sentBy: string;
}

export default function AdminNewsletterPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [history, setHistory] = useState<SendHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Modal states
  const [showTestModal, setShowTestModal] = useState(false);
  const [showBlastModal, setShowBlastModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [blastSending, setBlastSending] = useState(false);
  const [blastFeedback, setBlastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchStats();
    fetchPreview();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (session?.user?.email && !testEmail) {
      setTestEmail(session.user.email);
    }
  }, [session, testEmail]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/subscribers', { credentials: 'include' });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch newsletter stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/preview', { credentials: 'include' });
      const data = await response.json();
      setPreviewHtml(data.html || '');
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/history', { credentials: 'include' });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setTestSending(true);
    setTestFeedback(null);
    try {
      const response = await fetch('/api/admin/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setTestFeedback({ type: 'success', message: `Test email sent to ${testEmail}` });
      } else {
        setTestFeedback({ type: 'error', message: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestFeedback({ type: 'error', message: 'Failed to send test email' });
    } finally {
      setTestSending(false);
    }
  };

  const handleSendBlast = async () => {
    setBlastSending(true);
    setBlastFeedback(null);
    try {
      const response = await fetch('/api/admin/newsletter/send-blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setBlastFeedback({ type: 'success', message: `Newsletter sent to ${data.recipientCount || stats?.totalSubscribers || 0} subscribers` });
        fetchHistory();
        fetchStats();
      } else {
        setBlastFeedback({ type: 'error', message: data.error || 'Failed to send newsletter' });
      }
    } catch (error) {
      setBlastFeedback({ type: 'error', message: 'Failed to send newsletter' });
    } finally {
      setBlastSending(false);
    }
  };

  const getStatusBadge = (status: SendHistoryEntry['status']) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-medium rounded-full">
            <CheckCircle className="h-3 w-3" />Sent
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-medium rounded-full">
            <Clock className="h-3 w-3" />Sending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded-full">
            <AlertCircle className="h-3 w-3" />Failed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 text-xs font-medium rounded-full">
            <Clock className="h-3 w-3" />Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading newsletter...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-sims-pink" />
          Newsletter
        </h1>
        <p className="text-slate-400">Send weekly mod roundup emails to subscribers</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sims-pink/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-sims-pink" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalSubscribers}</h3>
            <p className="text-sm text-slate-400">Total Subscribers</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sims-blue/10 p-3 rounded-lg">
                <Mail className="h-6 w-6 text-sims-blue" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.waitlistEmails}</h3>
            <p className="text-sm text-slate-400">Waitlist Emails</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <Send className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.sendsThisMonth}</h3>
            <p className="text-sm text-slate-400">Sends This Month</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/10 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1 text-lg">
              {stats.lastSend
                ? new Date(stats.lastSend).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Never'}
            </h3>
            <p className="text-sm text-slate-400">Last Send</p>
          </div>
        </div>
      )}

      {/* Email Preview Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-sims-pink" />
            This Week&apos;s Roundup Preview
          </h2>
          <button
            onClick={fetchPreview}
            disabled={previewLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} />
            Refresh Preview
          </button>
        </div>
        {previewLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading preview...</div>
          </div>
        ) : previewHtml ? (
          <div
            className="max-h-[600px] overflow-y-auto border border-slate-700 rounded-lg bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 border border-slate-700 rounded-lg">
            <div className="text-slate-500">No preview available</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            setTestFeedback(null);
            setShowTestModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-sims-blue text-sims-blue hover:bg-sims-blue/10 rounded-lg transition-colors"
        >
          <Send className="h-4 w-4" />
          Send Test Email
        </button>
        <button
          onClick={() => {
            setBlastFeedback(null);
            setShowBlastModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 text-white rounded-lg transition-colors"
        >
          <Mail className="h-4 w-4" />
          Send to All Subscribers
        </button>
      </div>

      {/* Send History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-sims-pink" />
            Send History
          </h2>
        </div>
        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-400">Loading history...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Recipients</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivered</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Sent By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No newsletters sent yet
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-slate-300">
                          {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(entry.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{entry.subject}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{entry.recipients}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400">{entry.delivered}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={entry.failed > 0 ? 'text-red-400' : 'text-slate-500'}>{entry.failed}</span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(entry.status)}</td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{entry.sentBy}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Send Test Email</h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sims-blue transition-colors"
                />
              </div>
              {testFeedback && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  testFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {testFeedback.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {testFeedback.message}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={testSending || !testEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-sims-blue hover:bg-sims-blue/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {testSending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blast Confirmation Modal */}
      {showBlastModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Confirm Send</h3>
              <button
                onClick={() => setShowBlastModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-slate-300">
                This will send the weekly roundup to{' '}
                <span className="font-bold text-white">{stats?.totalSubscribers || 0}</span>{' '}
                subscribers. This cannot be undone.
              </p>
              {blastFeedback && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  blastFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {blastFeedback.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {blastFeedback.message}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBlastModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBlast}
                  disabled={blastSending}
                  className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {blastSending ? 'Sending...' : 'Confirm Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
