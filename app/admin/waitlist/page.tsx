'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Users, Calendar, Download, CheckCircle, Clock, Globe } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  ipAddress: string | null;
  createdAt: string;
  notified: boolean;
}

interface WaitlistStats {
  total: number;
  notified: number;
  pending: number;
  recentSignups: number;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/waitlist');
      const data = await response.json();
      setEntries(data.entries || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    setExporting(true);
    const headers = ['Email', 'Source', 'Signup Date', 'Notified', 'IP Address'];
    const rows = entries.map(entry => [
      entry.email,
      entry.source,
      new Date(entry.createdAt).toLocaleDateString(),
      entry.notified ? 'Yes' : 'No',
      entry.ipAddress || 'N/A'
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waitlist-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setExporting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="text-slate-400">Loading waitlist...</div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Waitlist</h1>
          <p className="text-slate-400">Manage member account waitlist signups</p>
        </div>
        <button onClick={exportCSV} disabled={exporting || entries.length === 0} className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sims-pink/10 p-3 rounded-lg"><Users className="h-6 w-6 text-sims-pink" /></div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.total}</h3>
            <p className="text-sm text-slate-400">Total Signups</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sims-green/10 p-3 rounded-lg"><Calendar className="h-6 w-6 text-sims-green" /></div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.recentSignups}</h3>
            <p className="text-sm text-slate-400">Last 7 Days</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/10 p-3 rounded-lg"><Clock className="h-6 w-6 text-yellow-500" /></div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.pending}</h3>
            <p className="text-sm text-slate-400">Pending Notification</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sims-blue/10 p-3 rounded-lg"><CheckCircle className="h-6 w-6 text-sims-blue" /></div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.notified}</h3>
            <p className="text-sm text-slate-400">Notified</p>
          </div>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Signup Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No waitlist signups yet</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /><span className="text-white font-medium">{entry.email}</span></div></td>
                    <td className="px-6 py-4"><span className="text-slate-300 capitalize">{entry.source}</span></td>
                    <td className="px-6 py-4"><div className="text-slate-300">{new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div><div className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div></td>
                    <td className="px-6 py-4">{entry.notified ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-sims-blue/10 text-sims-blue text-xs font-medium rounded-full"><CheckCircle className="h-3 w-3" />Notified</span> : <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-medium rounded-full"><Clock className="h-3 w-3" />Pending</span>}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-500 text-sm"><Globe className="h-3 w-3" />{entry.ipAddress || 'N/A'}</div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
