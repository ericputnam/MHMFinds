'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface ConfigStatus {
  network: string;
  configured: boolean;
  requiredEnvVars: string[];
}

interface EarningsSummary {
  windowDays: number;
  totalCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  reversedCommission: number;
  totalSaleAmount: number;
  conversionCount: number;
  attributedCommission: number;
  unattributedCommission: number;
  totalClicks: number;
  overallEpc: number;
}

interface SourceTypeRow {
  sourceType: string;
  clicks: number;
  attributedCommission: number;
  conversions: number;
  epc: number;
}

interface TopOfferRow {
  offerId: string;
  name: string;
  partner: string | null;
  network: string | null;
  conversions: number;
  commission: number;
  clicks: number;
  epc: number;
}

interface SyncRun {
  id: string;
  trigger: string;
  status: string;
  networksSynced: string[];
  earningsCreated: number;
  earningsUpdated: number;
  startedAt: string;
  completedAt: string | null;
  errorDetails: Record<string, string> | null;
}

interface EarningsData {
  configStatus: ConfigStatus[];
  summary: EarningsSummary;
  byNetwork: { network: string; commission: number; conversions: number }[];
  bySourceType: SourceTypeRow[];
  topOffers: TopOfferRow[];
  recentSyncRuns: SyncRun[];
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  grid: 'Mod Grid',
  mod_page: 'Mod Detail Page',
  interstitial: 'Download Interstitial',
  sidebar: 'Sidebar',
};

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function AffiliateRevenuePanel() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates/earnings?days=${days}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setMessage({ type: 'error', text: 'Failed to load earnings data' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load earnings data' });
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/affiliates/earnings/sync', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        const skipped = result.networksSkipped?.length
          ? ` (skipped, not configured: ${result.networksSkipped.join(', ')})`
          : '';
        setMessage({
          type: 'success',
          text: `Synced ${result.networksSynced.join(', ') || 'no networks'} — ${result.earningsCreated} new, ${result.earningsUpdated} updated${skipped}`,
        });
        await fetchEarnings();
      } else {
        setMessage({
          type: 'error',
          text: `Sync failed: ${Object.values(result.errors || {}).join('; ') || result.error || 'unknown error'}`,
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Sync request failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCsvUpload = async (file: File) => {
    setImporting(true);
    setMessage(null);
    try {
      const csv = await file.text();
      const res = await fetch('/api/admin/affiliates/earnings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Imported ${result.earningsCreated} new / ${result.earningsUpdated} updated rows (${money(result.totalCommission)} commission)`,
        });
        await fetchEarnings();
      } else {
        setMessage({ type: 'error', text: `Import failed: ${result.error}` });
      }
    } catch {
      setMessage({ type: 'error', text: 'CSV import failed' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const configuredCount = data?.configStatus.filter((c) => c.configured).length ?? 0;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Commission Revenue
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Actual earnings ingested from affiliate network reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={handleSync}
            disabled={syncing || configuredCount === 0}
            title={
              configuredCount === 0
                ? 'No network API credentials configured — see setup notes below'
                : 'Pull latest commissions from configured networks'
            }
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            {importing ? 'Importing…' : 'Amazon CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-4 ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-300 border border-green-500/30'
              : 'bg-red-500/10 text-red-300 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-700/50 rounded-lg" />
            ))}
          </div>
          <div className="h-40 bg-slate-700/50 rounded-lg" />
        </div>
      ) : data ? (
        <>
          {/* Network credential status */}
          <div className="flex flex-wrap gap-2 mb-6">
            {data.configStatus.map((config) => (
              <span
                key={config.network}
                title={
                  config.network === 'amazon'
                    ? 'Amazon has no earnings API — upload the Associates earnings CSV instead'
                    : config.configured
                      ? 'API credentials configured'
                      : `Missing env vars: ${config.requiredEnvVars.join(', ')}`
                }
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                  config.configured
                    ? 'bg-green-500/10 text-green-300 border-green-500/30'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                }`}
              >
                {config.configured ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {config.network}
                {config.network === 'amazon' && ' (CSV only)'}
              </span>
            ))}
          </div>

          {/* Revenue stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Commission ({days}d)</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {money(data.summary.totalCommission)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {money(data.summary.approvedCommission)} approved ·{' '}
                {money(data.summary.pendingCommission)} pending
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Conversions</p>
              <p className="text-2xl font-bold text-white mt-1">{data.summary.conversionCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                {money(data.summary.totalSaleAmount)} in sales
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">EPC (overall)</p>
              <p className="text-2xl font-bold text-white mt-1">
                {money(data.summary.overallEpc)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{data.summary.totalClicks} clicks</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Attribution</p>
              <p className="text-2xl font-bold text-white mt-1">
                {data.summary.totalCommission > 0
                  ? `${Math.round((data.summary.attributedCommission / data.summary.totalCommission) * 100)}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {money(data.summary.unattributedCommission)} unattributed
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* EPC by placement */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> EPC by Placement
              </h3>
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-700">
                      <th className="px-4 py-2">Placement</th>
                      <th className="px-4 py-2 text-right">Clicks</th>
                      <th className="px-4 py-2 text-right">Conv.</th>
                      <th className="px-4 py-2 text-right">Commission</th>
                      <th className="px-4 py-2 text-right">EPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySourceType.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No clicks in this window
                        </td>
                      </tr>
                    ) : (
                      data.bySourceType.map((row) => (
                        <tr key={row.sourceType} className="border-b border-slate-800 last:border-0">
                          <td className="px-4 py-2 text-white">
                            {SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">{row.clicks}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{row.conversions}</td>
                          <td className="px-4 py-2 text-right text-green-400">
                            {money(row.attributedCommission)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-white">
                            {money(row.epc)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                EPC uses click-attributed commission only. Conversions from clicks before subid
                tracking was deployed appear as unattributed.
              </p>
            </div>

            {/* By network + sync health */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Networks &amp; Sync Health
              </h3>
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-3">
                {data.byNetwork.length === 0 ? (
                  <p className="text-sm text-slate-500">No earnings recorded yet.</p>
                ) : (
                  data.byNetwork.map((row) => (
                    <div key={row.network} className="flex justify-between text-sm">
                      <span className="text-white capitalize">{row.network}</span>
                      <span className="text-slate-300">
                        {row.conversions} conv. ·{' '}
                        <span className="text-green-400">{money(row.commission)}</span>
                      </span>
                    </div>
                  ))
                )}
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Recent syncs</p>
                  {data.recentSyncRuns.length === 0 ? (
                    <p className="text-sm text-slate-500">Never synced.</p>
                  ) : (
                    data.recentSyncRuns.map((run) => (
                      <div key={run.id} className="flex justify-between text-xs py-1">
                        <span className="text-slate-400">
                          {new Date(run.startedAt).toLocaleString()} ({run.trigger})
                        </span>
                        <span
                          className={
                            run.status === 'completed'
                              ? 'text-green-400'
                              : run.status === 'failed'
                                ? 'text-red-400'
                                : 'text-yellow-400'
                          }
                          title={run.errorDetails ? JSON.stringify(run.errorDetails) : undefined}
                        >
                          {run.status} · +{run.earningsCreated}/{run.earningsUpdated} upd
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top earning offers */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Top-Earning Offers</h3>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-700">
                    <th className="px-4 py-2">Offer</th>
                    <th className="px-4 py-2">Partner</th>
                    <th className="px-4 py-2">Network</th>
                    <th className="px-4 py-2 text-right">Clicks</th>
                    <th className="px-4 py-2 text-right">Conv.</th>
                    <th className="px-4 py-2 text-right">Commission</th>
                    <th className="px-4 py-2 text-right">EPC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOffers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                        No attributed earnings yet. Once a network sync (or Amazon CSV import)
                        brings in conversions with subids, offers appear here.
                      </td>
                    </tr>
                  ) : (
                    data.topOffers.map((offer) => (
                      <tr key={offer.offerId} className="border-b border-slate-800 last:border-0">
                        <td className="px-4 py-2 text-white max-w-xs truncate">{offer.name}</td>
                        <td className="px-4 py-2 text-slate-300">{offer.partner || '—'}</td>
                        <td className="px-4 py-2 text-slate-300 capitalize">
                          {offer.network || '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-300">{offer.clicks}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{offer.conversions}</td>
                        <td className="px-4 py-2 text-right text-green-400">
                          {money(offer.commission)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-white">
                          {money(offer.epc)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Could not load earnings data.</p>
      )}
    </div>
  );
}
