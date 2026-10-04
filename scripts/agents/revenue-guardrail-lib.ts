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
 * E169-b (2026-10-04): `rollback` is further bounded — see ROLLBACK_BOUNDS. A window holding more than one
 * day's worth of deploys, or a target more than 48 h before the window start, is `investigate`, not a
 * multi-day revert.
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

/** What the rollback bound (E169-b) is judged on. All three come from the same classifyWindow pass. */
export interface RollbackFacts {
  /** Production deploys (any state) inside [windowStart, windowEnd). */
  inWindowCount: number;
  /** createdAt of the rollback target (newest READY production deploy before the window), or null. */
  rollbackTargetMs: number | null;
  windowStartMs: number;
}

/**
 * E169-b (2026-10-04) — the automatic rollback only fires when "one bad deploy" is a plausible story.
 *
 * The runner's rollback target is the last READY production deploy BEFORE the judged window, and the
 * window is four local days (judged day −3 … judged day). With paging fixed (E169) that target is honest,
 * and on 2026-10-03 it was 114 production deploys / ~5 days back (`lr7rk0e3o`, 09-27 22:30 local) — for a
 * drop that two reads (E163 on 10-01, the 10-02 yellow) put on Mediavine-side fill at the quarter boundary.
 *
 * Bound, from the ledger's own rate (reports/funnel/changelog.md, after-merge rows per day, 09-21→10-03,
 * 13 days): 11, 5, 12, 7, 8, 6, 6, 17, 7, 12, 9, 8, 3 → median 8, p90 12, max 17 merges/day. Every merge
 * is two production deploys (the squash + its ledger-row commit), and the real Vercel list for 09-28→10-02
 * shows 42, 21, 29, 22, 22 production deploys/day (median 22). So:
 *   maxInWindowDeploys = 24 ≈ one day at the p90 merge rate (12 merges × 2) ≈ one median day of deploys.
 *   maxTargetAgeMs     = 48 h: the target must sit within two days before the window start. At 21–42
 *                        deploys/day the newest pre-window READY deploy is normally < 2 h old (1.5 h on
 *                        10-03); a gap over 48 h means a freeze, and reverting into a > 6-day-old build is
 *                        not a single-deploy hypothesis either.
 * Both are read by `decideAction` and printed by `boundLine` every run, so Quinn sees the numbers that
 * withheld a rollback. The constant is exported so a test guards the real value, not a copy.
 */
export const ROLLBACK_BOUNDS = { maxInWindowDeploys: 24, maxTargetAgeMs: 48 * 3_600_000 } as const;
export type RollbackBounds = { maxInWindowDeploys: number; maxTargetAgeMs: number };

/**
 * Split production deploys around the judged window [sinceMs, untilMs) and name the rollback target
 * (newest READY production deploy before the window). `inWindow` is 'unknown' — never 'no' — when
 * coverage is TRUNCATED and the rows we did see show none in the window. `facts` feeds the rollback bound.
 */
export function classifyWindow(
  deployments: VercelDeployment[],
  sinceMs: number,
  untilMs: number,
  coverage: Coverage,
): { inWindowDeps: VercelDeployment[]; afterDeps: VercelDeployment[]; inWindow: InWindow; rollbackTo: string | null; facts: RollbackFacts } {
  const prod = deployments.filter((d) => d.target === 'production');
  const inWindowDeps = prod.filter((d) => Number(d.createdAt) >= sinceMs && Number(d.createdAt) < untilMs);
  const afterDeps = prod.filter((d) => Number(d.createdAt) >= untilMs);
  const before = prod
    .filter((d) => Number(d.createdAt) < sinceMs && d.state === 'READY')
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
  const inWindow: InWindow = inWindowDeps.length ? 'yes' : coverage.state === 'COMPLETE' ? 'no' : 'unknown';
  const facts: RollbackFacts = { inWindowCount: inWindowDeps.length, rollbackTargetMs: before ? Number(before.createdAt) : null, windowStartMs: sinceMs };
  return { inWindowDeps, afterDeps, inWindow, rollbackTo: before ? `https://${before.url}` : null, facts };
}

export type Status = 'green' | 'yellow' | 'red-rpm' | 'red-traffic' | 'red-health';
export type Action = 'none' | 'watch' | 'rollback' | 'investigate';

const hours = (ms: number) => (ms / 3_600_000).toFixed(1);

/** Why the bound withholds a rollback, or null when the facts clear it. Fail closed: no facts → withheld. */
export function boundReason(facts: RollbackFacts | undefined, bounds: RollbackBounds = ROLLBACK_BOUNDS): string | null {
  if (!facts) return 'rollback bound facts missing (in-window deploy count / target age unknown)';
  if (facts.inWindowCount > bounds.maxInWindowDeploys) return `in-window deploys ${facts.inWindowCount} exceed rollback bound ${bounds.maxInWindowDeploys}`;
  if (facts.rollbackTargetMs === null) return 'rollback target time unknown';
  const age = facts.windowStartMs - facts.rollbackTargetMs;
  if (age > bounds.maxTargetAgeMs) return `rollback target too old (${hours(age)} h before window start, bound ${hours(bounds.maxTargetAgeMs).replace(/\.0$/, '')} h)`;
  return null;
}

/**
 * Rollback POLICY (E169 made detection honest; E169-b bounded the action):
 *   red-rpm + a known in-window deploy + a known READY target + in-window deploys ≤ bound + target ≤ 48 h
 *   before the window start → rollback. Any other red-rpm → investigate, with `detail` naming why.
 * `action` stays one bare word because run-funnel-daily.sh reads it with `read -r STATUS ACTION ROLLBACK_TO`;
 * the qualifier rides in `detail`. Omitting `facts` is fail-closed (investigate), never a silent rollback.
 */
export function decideAction(
  status: Status,
  inWindow: InWindow,
  rollbackTo: string | null,
  facts?: RollbackFacts,
  bounds: RollbackBounds = ROLLBACK_BOUNDS,
): { action: Action; detail: string | null } {
  if (status === 'red-rpm') {
    if (inWindow === 'unknown') return { action: 'investigate', detail: 'vercel coverage unknown' };
    if (inWindow === 'no') return { action: 'investigate', detail: 'no Vercel deploy in window (coverage complete)' };
    if (!rollbackTo) return { action: 'investigate', detail: 'in-window deploy but no READY production deploy before the window to roll back to' };
    const withheld = boundReason(facts, bounds);
    if (withheld) return { action: 'investigate', detail: withheld };
    return { action: 'rollback', detail: null };
  }
  if (status === 'red-traffic' || status === 'red-health') return { action: 'investigate', detail: null };
  if (status === 'yellow') return { action: 'watch', detail: null };
  return { action: 'none', detail: null };
}

/** One line, printed every run next to the coverage line, so the numbers behind a withheld rollback are visible. */
export function boundLine(facts: RollbackFacts | undefined, rollbackTo: string | null, bounds: RollbackBounds = ROLLBACK_BOUNDS): string {
  if (!facts) return 'rollback bound: facts unknown (no classifyWindow pass) → withheld';
  const target = rollbackTo && facts.rollbackTargetMs !== null
    ? `target ${hours(facts.windowStartMs - facts.rollbackTargetMs)} h before window start (≤${hours(bounds.maxTargetAgeMs).replace(/\.0$/, '')} h)`
    : 'target none';
  const why = boundReason(facts, bounds);
  return `rollback bound: in-window production deploys ${facts.inWindowCount} (≤${bounds.maxInWindowDeploys} to auto-rollback) · ${target} → ${why ? `withheld: ${why}` : 'eligible'}`;
}
