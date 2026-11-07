'use client';

import React, { useState } from 'react';
import { AlertTriangle, Download, ExternalLink, FileArchive, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { formatBytes } from '@/lib/modFiles/constants';

/** Mirrors the upload select in app/api/admin/submissions/route.ts. Never carries the storage path. */
export interface AdminHostedUpload {
  id: string;
  originalName: string;
  downloadName: string;
  kind: string;
  sizeBytes: number;
  sha256: string | null;
  status: string;
  validationError: string | null;
  containsScript: boolean;
  inspection: unknown;
  blobDeletedAt: string | null;
  createdAt: string;
}

interface InspectionSummary {
  format?: string;
  entryCount?: number;
  totalUncompressed?: number;
  packageCount?: number;
  scriptCount?: number;
  entries?: { name: string; size: number }[];
  entriesTruncated?: boolean;
  nested?: { name: string; entries: string[] }[];
  dbpfVersion?: string;
  resourceCount?: number;
}

function asSummary(value: unknown): InspectionSummary | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as InspectionSummary) : null;
}

const SHA256_RE = /^[0-9a-f]{64}$/;

/**
 * Admin review panel for a creator-hosted file. Shows what the server-side
 * checks found, the SHA-256 with a VirusTotal *lookup* link (the file itself
 * is never sent anywhere), and a short-lived link to download it for review.
 * Treat every upload as untrusted: download it and scan it, never run it here.
 */
export function HostedFileReview({ upload, onChanged }: { upload: AdminHostedUpload; onChanged?: () => void }) {
  const [busy, setBusy] = useState<'download' | 'takedown' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = asSummary(upload.inspection);
  const sha = upload.sha256 && SHA256_RE.test(upload.sha256) ? upload.sha256 : null;
  const stored = !upload.blobDeletedAt;

  const downloadForReview = async () => {
    setBusy('download');
    setError(null);
    try {
      const res = await fetch(`/api/admin/mod-uploads/${encodeURIComponent(upload.id)}/review-url/`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.url !== 'string' || !data.url.startsWith('https://')) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Could not create a review link');
      }
      const a = document.createElement('a');
      a.href = data.url;
      a.rel = 'noopener noreferrer';
      a.download = upload.downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a review link');
    } finally {
      setBusy(null);
    }
  };

  const takeDown = async () => {
    const reason = prompt('Take this file down? It stops downloading immediately and is deleted. Reason (optional):');
    if (reason === null) return;
    setBusy('takedown');
    setError(null);
    try {
      const res = await fetch(`/api/admin/mod-uploads/${encodeURIComponent(upload.id)}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : 'Takedown failed');
      }
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takedown failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FileArchive className="h-4 w-4 text-sims-pink" />
        <span className="font-semibold text-white">Hosted file</span>
        <span className="break-all text-slate-300">{upload.downloadName}</span>
        <span className="text-slate-500">
          · {upload.kind} · {formatBytes(upload.sizeBytes)} · status: {upload.status}
          {!stored && ' · bytes deleted'}
        </span>
      </div>
      {upload.originalName !== upload.downloadName && (
        <p className="mt-1 break-all text-xs text-slate-500">Uploaded as: {upload.originalName}</p>
      )}

      {upload.containsScript && (
        <p className="mt-3 flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Contains a script mod (Python). Script mods run code on players&apos; computers. Check the creator and scan
          the file before approving.
        </p>
      )}
      {upload.validationError && (
        <p className="mt-3 flex items-start gap-2 text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {upload.validationError}
        </p>
      )}

      {sha && (
        <div className="mt-3">
          <p className="text-xs text-slate-500">SHA-256</p>
          <code className="block break-all font-mono text-xs text-slate-300">{sha}</code>
          <a
            href={`https://www.virustotal.com/gui/file/${sha}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-sims-blue hover:text-sims-pink"
          >
            <ExternalLink className="h-3 w-3" /> Look up this hash on VirusTotal (the file is not uploaded)
          </a>
        </div>
      )}

      {summary && (
        <div className="mt-3 text-xs text-slate-400">
          <p>
            Format: {summary.format ?? 'unknown'}
            {summary.dbpfVersion && ` · DBPF ${summary.dbpfVersion}`}
            {typeof summary.resourceCount === 'number' && ` · ${summary.resourceCount} resources`}
            {typeof summary.entryCount === 'number' && ` · ${summary.entryCount} entries`}
            {typeof summary.packageCount === 'number' && ` · ${summary.packageCount} .package`}
            {typeof summary.scriptCount === 'number' && ` · ${summary.scriptCount} script`}
            {typeof summary.totalUncompressed === 'number' && ` · ${formatBytes(summary.totalUncompressed)} unpacked`}
          </p>
          {Array.isArray(summary.entries) && summary.entries.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-slate-300">Files inside ({summary.entries.length}{summary.entriesTruncated ? '+' : ''})</summary>
              <ul className="mt-1 max-h-48 overflow-y-auto font-mono">
                {summary.entries.map((e, i) => (
                  <li key={`${i}-${e.name}`} className="break-all">
                    {String(e.name)} <span className="text-slate-600">({formatBytes(Number(e.size) || 0)})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {Array.isArray(summary.nested) &&
            summary.nested.map((n, i) => (
              <details key={`${i}-${n.name}`} className="mt-2">
                <summary className="cursor-pointer break-all text-slate-300">Inside {String(n.name)}</summary>
                <ul className="mt-1 max-h-32 overflow-y-auto font-mono">
                  {(Array.isArray(n.entries) ? n.entries : []).map((name, j) => (
                    <li key={`${j}-${name}`} className="break-all">
                      {String(name)}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {stored && (
          <button
            type="button"
            onClick={downloadForReview}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {busy === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download for review
          </button>
        )}
        {stored && upload.status === 'approved' && (
          <button
            type="button"
            onClick={takeDown}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy === 'takedown' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Take down file
          </button>
        )}
      </div>
      {stored && (
        <p className="mt-2 text-xs text-slate-500">
          The review link lasts 5 minutes. Scan the file before you open it, and never open it on a work machine.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
