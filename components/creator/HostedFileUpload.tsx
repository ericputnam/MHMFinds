'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileArchive, Loader2, Upload, X } from 'lucide-react';
import {
  MAX_MOD_FILE_BYTES,
  MOD_FILE_ACCEPT_ATTR,
  MOD_FILE_CONTENT_TYPE,
  formatBytes,
  kindFromFilename,
} from '@/lib/modFiles/constants';

/** What the creator sees about their uploaded file. Mirrors CREATOR_UPLOAD_SELECT. */
export interface HostedUploadSummary {
  id: string;
  originalName: string;
  downloadName: string;
  kind: string;
  sizeBytes: number;
  status: string;
  validationError: string | null;
  containsScript: boolean;
}

type Phase =
  | { step: 'idle' }
  | { step: 'uploading'; name: string; percent: number }
  | { step: 'checking'; name: string }
  | { step: 'ready'; upload: HostedUploadSummary }
  | { step: 'error'; message: string };

interface Props {
  /** Called with the verified upload's id, or null when removed. */
  onChange: (uploadId: string | null) => void;
  disabled?: boolean;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

/**
 * PUT the file to the presigned link with progress (fetch has no upload
 * progress). The two headers are part of the signature: the opaque content
 * type, and create-only so a used link cannot overwrite a checked file.
 * No cookies or credentials are sent to the storage host.
 */
function putToStorage(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.withCredentials = false;
    xhr.setRequestHeader('Content-Type', MOD_FILE_CONTENT_TYPE);
    xhr.setRequestHeader('If-None-Match', '*');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else if (xhr.status === 412) reject(new Error('This upload slot was already used. Choose the file again.'));
      else if (xhr.status === 403) reject(new Error('The upload link expired. Choose the file again.'));
      else reject(new Error('The upload did not finish. Try again.'));
    };
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('The upload was cancelled.'));
    xhr.send(file);
  });
}

/**
 * "Host the file on MustHaveMods" field for the creator submission form.
 * Flow: reserve a slot (get a signed upload link) → PUT straight to the private
 * bucket → ask the server
 * to check the bytes. The submission can only reference a file that passed.
 * Renders nothing while the feature is switched off.
 */
export function HostedFileUpload({ onChange, disabled }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/creator/uploads/', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => !cancelled && setEnabled(d?.enabled === true))
      .catch(() => !cancelled && setEnabled(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  const busy = phase.step === 'uploading' || phase.step === 'checking';

  const reset = () => {
    setPhase({ step: 'idle' });
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    onChange(null);
    if (!kindFromFilename(file.name)) {
      setPhase({ step: 'error', message: 'Only .package, .ts4script or .zip files can be hosted.' });
      return;
    }
    if (file.size <= 0 || file.size > MAX_MOD_FILE_BYTES) {
      setPhase({ step: 'error', message: `Files must be under ${formatBytes(MAX_MOD_FILE_BYTES)}.` });
      return;
    }

    try {
      setPhase({ step: 'uploading', name: file.name, percent: 0 });
      const reserve = await fetch('/api/creator/uploads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      if (!reserve.ok) throw new Error(await readError(reserve, 'Could not start the upload.'));
      const { upload: slot, uploadUrl } = (await reserve.json()) as { upload: HostedUploadSummary; uploadUrl: string };
      if (typeof uploadUrl !== 'string' || !uploadUrl.startsWith('https://')) {
        throw new Error('Could not start the upload.');
      }

      await putToStorage(uploadUrl, file, (percent) => setPhase({ step: 'uploading', name: file.name, percent }));

      setPhase({ step: 'checking', name: file.name });
      const verify = await fetch(`/api/creator/uploads/${encodeURIComponent(slot.id)}/verify/`, { method: 'POST' });
      if (!verify.ok) throw new Error(await readError(verify, 'The file did not pass our checks.'));
      const { upload: checked } = (await verify.json()) as { upload: HostedUploadSummary };
      if (checked.status !== 'verified') throw new Error(checked.validationError || 'The file did not pass our checks.');

      setPhase({ step: 'ready', upload: checked });
      onChange(checked.id);
    } catch (err) {
      setPhase({ step: 'error', message: err instanceof Error ? err.message : 'Upload failed.' });
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-start gap-3">
        <FileArchive className="mt-0.5 h-5 w-5 flex-shrink-0 text-sims-pink" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Host the file on MustHaveMods (optional)</p>
          <p className="mt-1 text-xs text-slate-400">
            Upload your .package, .ts4script or .zip (up to {formatBytes(MAX_MOD_FILE_BYTES)}) and players download it
            straight from your mod page. We check every file and an admin reviews it before it goes live. Only upload
            files you made or have the right to share.
          </p>

          {phase.step === 'idle' && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> Choose file
            </button>
          )}

          {phase.step === 'uploading' && (
            <div className="mt-3">
              <p className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading {phase.name}… {phase.percent}%
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-700">
                <div className="h-full bg-sims-pink transition-all" style={{ width: `${phase.percent}%` }} />
              </div>
            </div>
          )}

          {phase.step === 'checking' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking {phase.name}…
            </p>
          )}

          {phase.step === 'ready' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {phase.upload.downloadName} · {formatBytes(phase.upload.sizeBytes)} · passed checks
              </span>
              {phase.upload.containsScript && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Contains a script mod (players will be told)
                </span>
              )}
              <button
                type="button"
                onClick={reset}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          )}

          {phase.step === 'error' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" /> {phase.message}
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-slate-300 underline hover:text-white"
              >
                Try another file
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={MOD_FILE_ACCEPT_ATTR}
            className="hidden"
            disabled={disabled || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}
