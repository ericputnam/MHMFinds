'use client';

/**
 * Admin: creator claim review (Nova, E129).
 *
 * Lists pending creator claims created by the "Claim this page" form (E122)
 * and lets an admin promote the pending profile to the public creator slug
 * or reject it. Data and decisions come from /api/admin/creator-claims/.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, Loader2, UserCheck, XCircle } from 'lucide-react';

interface ClaimSubmission {
  id: string;
  modName: string;
  modUrl: string;
  author: string | null;
  status: string;
  createdAt: string;
}

interface Claim {
  id: string;
  handle: string;
  claimedSlug: string | null;
  slugTaken: boolean;
  createdAt: string;
  account: { username: string; displayName: string | null; isCreator: boolean };
  linkedMods: number;
  submissions: ClaimSubmission[];
}

export default function CreatorClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [anonymous, setAnonymous] = useState<ClaimSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/creator-claims/');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load claims');
      setClaims(data.claims || []);
      setAnonymous(data.anonymous || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (claim: Claim, action: 'promote' | 'reject') => {
    let payload: Record<string, string> = { action };
    if (action === 'promote') {
      if (!confirm(`Make this account the public profile for /creator/${claim.claimedSlug}/ ?`)) return;
    } else {
      const reason = prompt('Reason for rejecting this claim (kept in the audit log):');
      if (reason === null) return;
      payload = { action, reason };
    }
    try {
      setProcessing(claim.id);
      setNotice(null);
      const res = await fetch(`/api/admin/creator-claims/${claim.id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');
      setNotice(action === 'promote' ? `Promoted to ${data.page}` : 'Claim rejected');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Creator Claims</h1>
        <p className="text-slate-400">
          Accounts that used &ldquo;Claim this page&rdquo; on a creator page. Promote to make the
          profile public on that page; the claimant&apos;s mod submissions stay in{' '}
          <Link href="/admin/submissions/" className="text-sims-pink hover:underline">
            Submissions
          </Link>
          .
        </p>
      </div>

      {notice && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200">{notice}</div>
      )}

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 text-sims-pink animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading claims...</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-red-900 rounded-xl p-6 text-red-400">{error}</div>
      ) : claims.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <UserCheck className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No pending creator claims</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    {claim.claimedSlug ? (
                      <a
                        href={`/creator/${claim.claimedSlug}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-sims-pink inline-flex items-center gap-2"
                      >
                        /creator/{claim.claimedSlug}/ <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-red-400">Unreadable claim handle</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Account: <span className="text-slate-200">{claim.account.displayName || claim.account.username}</span>{' '}
                    (@{claim.account.username}) · claimed {new Date(claim.createdAt).toLocaleDateString()} ·{' '}
                    {claim.linkedMods} linked mod(s) · handle <code>{claim.handle}</code>
                  </p>
                  {claim.slugTaken && (
                    <p className="text-sm text-amber-400">
                      Another profile already holds this handle — promotion will be refused.
                    </p>
                  )}
                  {claim.submissions.length > 0 && (
                    <ul className="text-sm text-slate-300 list-disc pl-5">
                      {claim.submissions.map((s) => (
                        <li key={s.id}>
                          <a href={s.modUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {s.modName}
                          </a>{' '}
                          <span className="text-slate-500">({s.status})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex lg:flex-col gap-2 lg:w-44">
                  <button
                    type="button"
                    disabled={processing === claim.id || !claim.claimedSlug || claim.slugTaken}
                    onClick={() => review(claim, 'promote')}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium inline-flex items-center justify-center gap-2"
                  >
                    <BadgeCheck className="h-4 w-4" /> Promote
                  </button>
                  <button
                    type="button"
                    disabled={processing === claim.id || claim.linkedMods > 0}
                    onClick={() => review(claim, 'reject')}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium inline-flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && anonymous.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">
            Anonymous claim submissions ({anonymous.length})
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            Sent from a creator page while signed out, so no profile exists. Ask the submitter to sign
            in and claim again; review the mods themselves in Submissions.
          </p>
          <ul className="text-sm text-slate-300 list-disc pl-5">
            {anonymous.map((s) => (
              <li key={s.id}>
                /creator/{s.author}/ — {s.modName} <span className="text-slate-500">({s.status})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
