/**
 * Email-borne unsubscribes → the durable suppression list (2026-10-26).
 *
 * `mailbox-unsubscribe-requests.py` reads the sending mailbox read-only and prints
 * `{hash, via, requestedAt}` for every unsubscribe that arrived by email (our
 * `List-Unsubscribe` mailto, or a reply asking to stop). This module runs it and
 * records each one with `recordUnsubscribeHash`, which is idempotent and never
 * undoes a later re-confirmation — so it is safe to run before every send.
 *
 * Every send script runs `syncUnsubscribeMailbox` before a LIVE send and refuses
 * to send if it could not run: a scan that did not complete is not "nobody asked".
 */
import { execFile } from 'child_process';
import { join } from 'path';

import {
  recordUnsubscribeHash,
  type RecordOutcome,
  type SuppressionDb,
  type SuppressionSource,
} from '../../lib/services/emailSuppression';

export const READER_SCRIPT = join(__dirname, 'mailbox-unsubscribe-requests.py');
/** First list send was 2026-09-07; nothing earlier can be a reply to us. */
export const MAILBOX_SINCE = '2026-09-01';
const READER_TIMEOUT_MS = 5 * 60 * 1000;

export interface MailboxRequest {
  hash: string;
  via: 'subject' | 'reply';
  requestedAt: string;
}

export interface ReaderOutput {
  requests: MailboxRequest[];
  counts: Record<string, unknown>;
}

export class MailboxCouldNotRun extends Error {}

const HASH_RE = /^[0-9a-f]{64}$/;
const VIA_TO_SOURCE: Record<MailboxRequest['via'], SuppressionSource> = { subject: 'mailto', reply: 'reply' };

/** Validates the reader's one JSON line. Anything unexpected is could-not-run, never "0 requests". */
export function parseReaderOutput(stdout: string): ReaderOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(stdout).trim().split('\n').pop() || '');
  } catch {
    throw new MailboxCouldNotRun('reader printed no JSON');
  }
  const o = parsed as { status?: unknown; reason?: unknown; requests?: unknown; counts?: unknown };
  if (o?.status !== 'ok') {
    throw new MailboxCouldNotRun(`reader: ${typeof o?.reason === 'string' ? o.reason : 'status not ok'}`);
  }
  if (!Array.isArray(o.requests)) throw new MailboxCouldNotRun('reader: requests missing');
  const requests: MailboxRequest[] = [];
  for (const r of o.requests as Array<Record<string, unknown>>) {
    const at = new Date(String(r?.requestedAt));
    if (!HASH_RE.test(String(r?.hash)) || (r?.via !== 'subject' && r?.via !== 'reply') || Number.isNaN(at.getTime())) {
      throw new MailboxCouldNotRun('reader: malformed request row');
    }
    requests.push({ hash: String(r.hash), via: r.via, requestedAt: at.toISOString() });
  }
  return { requests, counts: (o.counts as Record<string, unknown>) ?? {} };
}

export function runMailboxReader(opts: { since?: string; python?: string } = {}): Promise<ReaderOutput> {
  return new Promise((resolve, reject) => {
    execFile(
      opts.python ?? 'python3',
      [READER_SCRIPT, '--since', opts.since ?? MAILBOX_SINCE],
      { timeout: READER_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout) => {
        let out: ReaderOutput;
        try {
          out = parseReaderOutput(stdout);
        } catch (e) {
          // Exit 2 still prints {"status":"could-not-run","reason":…}; that reason is the useful one.
          const reason = e instanceof Error && e.message.startsWith('reader: ') ? e.message : null;
          reject(new MailboxCouldNotRun(reason ?? `reader failed to run (${err?.code ?? 'no JSON output'})`));
          return;
        }
        if (err) reject(new MailboxCouldNotRun(`reader exited non-zero (${err.code ?? 'signal'})`));
        else resolve(out);
      }
    );
  });
}

export type ApplyCounts = Record<RecordOutcome, number>;

export async function applyMailboxRequests(db: SuppressionDb, requests: readonly MailboxRequest[]): Promise<ApplyCounts> {
  const counts: ApplyCounts = { created: 0, reactivated: 0, already: 0, stale: 0 };
  for (const r of requests) {
    counts[await recordUnsubscribeHash(db, r.hash, VIA_TO_SOURCE[r.via], new Date(r.requestedAt))]++;
  }
  return counts;
}

export interface SyncResult {
  found: number;
  bySource: { mailto: number; reply: number };
  applied: ApplyCounts | null;
  readerCounts: Record<string, unknown>;
}

/**
 * Read the mailbox and (when `apply`) record every request. Throws
 * MailboxCouldNotRun when the scan did not complete — callers about to send must stop.
 */
export async function syncUnsubscribeMailbox(
  db: SuppressionDb,
  opts: { apply: boolean; since?: string; reader?: () => Promise<ReaderOutput> }
): Promise<SyncResult> {
  const out = await (opts.reader ?? (() => runMailboxReader({ since: opts.since })))();
  return {
    found: out.requests.length,
    bySource: {
      mailto: out.requests.filter((r) => r.via === 'subject').length,
      reply: out.requests.filter((r) => r.via === 'reply').length,
    },
    applied: opts.apply ? await applyMailboxRequests(db, out.requests) : null,
    readerCounts: out.counts,
  };
}

/** One printable line, counts only. */
export function describeSync(r: SyncResult): string {
  const a = r.applied
    ? ` → recorded new ${r.applied.created}, re-activated ${r.applied.reactivated}, already ${r.applied.already}, stale ${r.applied.stale}`
    : ' (not applied)';
  return `[unsubscribe-mailbox] ${r.found} email unsubscribe request(s) (mailto ${r.bySource.mailto}, reply ${r.bySource.reply})${a}`;
}
