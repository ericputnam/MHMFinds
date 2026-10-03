/**
 * scripts/agents/revenue-guardrail-lib.ts — pure pieces of the revenue circuit breaker (E169).
 *
 * Why this exists: `vercel ls --format json` returns ONE page (20 rows). On 2026-10-03 the judged
 * day was 2026-10-01 and the window started 2026-09-28 00:00 local, but the single page reached back
 * only to 2026-10-02 06:55 — so all 114 production deploys inside the window were invisible, the
 * guardrail concluded "no deploy in window", and a RED-RPM morning became `investigate` by
 * truncation, not by fact.
 *
 * Rule encoded here: whether a deploy landed in the window is a graded fact. We page until we have
 * seen a READY production deploy older than the window start (that is also the rollback target) or
 * the API is exhausted. If neither happens (page cap, time budget, CLI error), coverage is TRUNCATED
 * and the in-window question is UNKNOWN — never "no". UNKNOWN never produces `rollback`.
 *
 * Everything in this file is pure (no CLI, no clock) so it is testable with fixtures.
 */

export interface VercelDeployment {
  uid?: string;
  url: string;
  createdAt: number;
  state?: string;
  target?: string | null;
  meta?: Record<string, string>;
}

export interface VercelPage {
  deployments: VercelDeployment[];
  /** `pagination.next` from the CLI — the cursor for the next (older) page, null when exhausted. */
  next: number | null;
}

export type CoverageState = 'COMPLETE' | 'TRUNCATED';

export interface Coverage {
  state: CoverageState;
  rows: number;
  pages: number;
  oldestMs: number | null;
  windowStartMs: number;
  /** The API said there are no older rows. */
  exhausted: boolean;
  /** Why paging stopped early, if it did (page cap, time budget, CLI error). */
  stoppedBy: string | null;
}

export const DEFAULT_MAX_PAGES = 30;

const isProdReady = (d: VercelDeployment) => d.target === 'production' && d.state === 'READY';

/**
 * Page through the deployment list (newest → oldest) until a READY production deploy older than
 * `windowStartMs` has been seen, or the API is exhausted, or `maxPages` / `fetchPage` gives out.
 * `fetchPage(null)` is the first page; `fetchPage(cursor)` the page after it. A throw from
 * `fetchPage` stops paging and is recorded — it never becomes "no deploys".
 */
export function listDeploymentsPaged(
  fetchPage: (next: number | null) => VercelPage,
  windowStartMs: number,
  maxPages: number = DEFAULT_MAX_PAGES,
): { deployments: VercelDeployment[]; coverage: Coverage } {
  const seen = new Set<string>();
  const deployments: VercelDeployment[] = [];
  let cursor: number | null = null;
  let pages = 0;
  let exhausted = false;
  let stoppedBy: string | null = null;
  for (;;) {
    if (pages >= maxPages) { stoppedBy = `page cap ${maxPages}`; break; }
    let page: VercelPage;
    try { page = fetchPage(cursor); } catch (e) { stoppedBy = `vercel ls failed: ${String((e as Error)?.message ?? e).slice(0, 80)}`; break; }
    pages++;
    for (const d of page.deployments ?? []) {
      const key = d.uid ?? d.url;
      if (seen.has(key)) continue;
      seen.add(key);
      deployments.push(d);
    }
    if (deployments.some((d) => isProdReady(d) && Number(d.createdAt) < windowStartMs)) break;
    if (page.next == null || !(page.deployments ?? []).length) { exhausted = true; break; }
    if (cursor !== null && page.next >= cursor) { stoppedBy = 'cursor did not advance'; break; }
    cursor = page.next;
  }
  return { deployments, coverage: gradeCoverage(deployments, windowStartMs, exhausted, pages, stoppedBy) };
}

/**
 * COMPLETE: the list reaches at or before the window start, or the API said there is nothing older.
 * TRUNCATED: the oldest row we hold is newer than the window start and the API was not exhausted —
 * deploys may exist inside the window that we never saw.
 */
export function gradeCoverage(
  deployments: VercelDeployment[],
  windowStartMs: number,
  exhausted: boolean,
  pages = 1,
  stoppedBy: string | null = null,
): Coverage {
  const oldestMs = deployments.length ? Math.min(...deployments.map((d) => Number(d.createdAt))) : null;
  const reaches = oldestMs !== null && oldestMs <= windowStartMs;
  return {
    state: reaches || exhausted ? 'COMPLETE' : 'TRUNCATED',
    rows: deployments.length, pages, oldestMs, windowStartMs, exhausted, stoppedBy,
  };
}

const ts = (ms: number | null) => (ms === null ? 'none' : new Date(ms).toISOString().slice(0, 16) + 'Z');

export function coverageLine(c: Coverage): string {
  const cmp = c.oldestMs !== null && c.oldestMs <= c.windowStartMs ? '≤' : '>';
  const extra = c.state === 'COMPLETE' && c.exhausted && cmp === '>' ? ', list exhausted' : c.stoppedBy ? `, stopped: ${c.stoppedBy}` : '';
  return `vercel coverage: ${c.state} (${c.rows} rows over ${c.pages} page${c.pages === 1 ? '' : 's'}, oldest ${ts(c.oldestMs)} ${cmp} window start ${ts(c.windowStartMs)}${extra})`;
}

export type InWindow = 'yes' | 'no' | 'unknown';

/**
 * Split production deploys around the judged window [sinceMs, untilMs) and name the rollback target
 * (newest READY production deploy before the window). `inWindow` is 'unknown' — never 'no' — when
 * coverage is TRUNCATED and the rows we did see show none in the window.
 */
export function classifyWindow(
  deployments: VercelDeployment[],
  sinceMs: number,
  untilMs: number,
  coverage: Coverage,
): { inWindowDeps: VercelDeployment[]; afterDeps: VercelDeployment[]; inWindow: InWindow; rollbackTo: string | null } {
  const prod = deployments.filter((d) => d.target === 'production');
  const inWindowDeps = prod.filter((d) => Number(d.createdAt) >= sinceMs && Number(d.createdAt) < untilMs);
  const afterDeps = prod.filter((d) => Number(d.createdAt) >= untilMs);
  const before = prod
    .filter((d) => Number(d.createdAt) < sinceMs && d.state === 'READY')
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
  const inWindow: InWindow = inWindowDeps.length ? 'yes' : coverage.state === 'COMPLETE' ? 'no' : 'unknown';
  return { inWindowDeps, afterDeps, inWindow, rollbackTo: before ? `https://${before.url}` : null };
}

export type Status = 'green' | 'yellow' | 'red-rpm' | 'red-traffic' | 'red-health';
export type Action = 'none' | 'watch' | 'rollback' | 'investigate';

/**
 * The rollback POLICY is unchanged (red-rpm + a known in-window deploy + a known target → rollback);
 * only detection is honest now. `action` stays one bare word because run-funnel-daily.sh reads it with
 * `read -r STATUS ACTION ROLLBACK_TO`; the qualifier rides in `detail`.
 */
export function decideAction(
  status: Status,
  inWindow: InWindow,
  rollbackTo: string | null,
): { action: Action; detail: string | null } {
  if (status === 'red-rpm') {
    if (inWindow === 'yes' && rollbackTo) return { action: 'rollback', detail: null };
    if (inWindow === 'unknown') return { action: 'investigate', detail: 'vercel coverage unknown' };
    if (inWindow === 'yes') return { action: 'investigate', detail: 'in-window deploy but no READY production deploy before the window to roll back to' };
    return { action: 'investigate', detail: 'no Vercel deploy in window (coverage complete)' };
  }
  if (status === 'red-traffic' || status === 'red-health') return { action: 'investigate', detail: null };
  if (status === 'yellow') return { action: 'watch', detail: null };
  return { action: 'none', detail: null };
}
