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
 *
 * E227 (2026-10-17): the sessions line is also read EX the Singapore Direct segment (E216's
 * `SG_DIRECT_RULE`, imported — never restated). The revenue / RPM legs stay on Mediavine's own
 * numbers; the ex-segment read is GA4-on-GA4 (site − segment), so no number is subtracted across
 * bases. See `sessionsExSegment` / `sessionsExSegmentLine`.
 */
import { SG_DIRECT_RULE } from './direct-bot-lib';

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

// ---------------------------------------------------------------------------------------------
// E227 — sessions ex the Singapore Direct segment (Rio, 2026-10-17).
//
// Why: on 10-12 / 10-13 / 10-14 / 10-15 the guardrail's sessions line read +20.2% / +5.3% / +14.9% /
// +14.0% while the whole of the excess was the E216 stream (country=Singapore, sessionSource=(direct);
// 1 user = 1 session = 1 pageview, 99% on two screen resolutions, ~$0). Rio had been subtracting
// "excess over 250/day" by hand (1.93% of 28d sessions); Pip's classifier reads the WHOLE segment
// (4.10%), because the quiet-day trickle has the same fingerprint. The guardrail now prints both the
// raw line and the ex-segment line, with the segment's share, every morning.
//
// What it does NOT do: change `status`. Red/yellow are still graded on Mediavine's revenue / RPM /
// sessions (Mediavine counts what it counts), and the GA4 pull may be unavailable — an unavailable
// read prints "unavailable" and never becomes a verdict. Wiring the ex-segment ratio into the
// red-traffic leg is a later, separate change once this line has printed beside the raw one for a week.
// ---------------------------------------------------------------------------------------------

/** The segment rule the sessions line subtracts — E216's constant, re-exported so callers and tests reach the same object. */
export const SESSIONS_SEGMENT_RULE = SG_DIRECT_RULE;

/**
 * GA4 Data API `dimensionFilter` for the segment, built from the imported rule. Identical in shape to
 * `direct-bot-read.ts`'s `segmentFilter` so the two scripts cannot drift apart on what "the segment" is.
 */
export function segmentDimensionFilter(): Record<string, unknown> {
  return {
    andGroup: {
      expressions: [
        { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: SESSIONS_SEGMENT_RULE.country } } },
        { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: SESSIONS_SEGMENT_RULE.source } } },
      ],
    },
  };
}

/** Sessions by YYYY-MM-DD. A date absent from `site` is "not pulled", not zero; absent from `segment` IS zero (no rows = no segment that day). */
export type SessionsByDate = Record<string, number>;

export interface SessionsExSegment {
  rule: { experiment: string; country: string; source: string };
  day: string;
  /** Same-weekday controls that were present in the GA4 site pull (the mean is over these). */
  priorDays: string[];
  raw: { actual: number; expected: number };
  segment: { actual: number; expected: number; shareActual: number | null; shareExpected: number | null };
  exSegment: { actual: number; expected: number };
}

const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/**
 * Pure: the judged day and its same-weekday controls, raw and ex the segment, all on the GA4 basis.
 * Returns null (could-not-run) when the judged day is missing from `site` or fewer than 2 controls are
 * present — the caller prints "unavailable", never a number. With an empty `segment` the ex-segment
 * numbers equal the raw ones exactly (zero rows → unchanged), which the unit test pins.
 */
export function sessionsExSegment(day: string, priorDays: string[], site: SessionsByDate, segment: SessionsByDate): SessionsExSegment | null {
  if (!(day in site)) return null;
  const controls = priorDays.filter((d) => d in site);
  if (controls.length < 2) return null;
  const seg = (d: string) => segment[d] ?? 0;
  const rawActual = site[day];
  const rawExpected = meanOf(controls.map((d) => site[d]));
  const segActual = seg(day);
  const segExpected = meanOf(controls.map(seg));
  return {
    rule: { experiment: SESSIONS_SEGMENT_RULE.experiment, country: SESSIONS_SEGMENT_RULE.country, source: SESSIONS_SEGMENT_RULE.source },
    day,
    priorDays: controls,
    raw: { actual: rawActual, expected: rawExpected },
    segment: {
      actual: segActual, expected: segExpected,
      shareActual: rawActual > 0 ? segActual / rawActual : null,
      shareExpected: rawExpected > 0 ? segExpected / rawExpected : null,
    },
    exSegment: { actual: rawActual - segActual, expected: rawExpected - segExpected },
  };
}

const pctDelta = (a: number, b: number) => (b ? `${a / b - 1 >= 0 ? '+' : ''}${((a / b - 1) * 100).toFixed(1)}%` : 'n/a');
const pctShare = (x: number | null) => (x == null ? '—' : `${(x * 100).toFixed(2)}%`);

/**
 * One line, printed every run under the sessions row. `unavailableWhy` is set when the GA4 pull could
 * not run; the line then says so and carries no number (unknown is never a reading).
 */
export function sessionsExSegmentLine(x: SessionsExSegment | null, unavailableWhy: string | null = null): string {
  const tag = `sessions ex ${SESSIONS_SEGMENT_RULE.country} ${SESSIONS_SEGMENT_RULE.source} (${SESSIONS_SEGMENT_RULE.experiment}, GA4)`;
  if (!x) return `${tag}: unavailable${unavailableWhy ? ` — ${unavailableWhy}` : ''}`;
  const n = (v: number) => Math.round(v).toLocaleString('en-US');
  return `${tag}: raw ${n(x.raw.actual)} vs ${n(x.raw.expected)} (${pctDelta(x.raw.actual, x.raw.expected)}) → ex-segment ${n(x.exSegment.actual)} vs ${n(x.exSegment.expected)} (${pctDelta(x.exSegment.actual, x.exSegment.expected)}) · segment ${n(x.segment.actual)} = ${pctShare(x.segment.shareActual)} of the day (controls ${pctShare(x.segment.shareExpected)}, ${x.priorDays.length} same weekdays)`;
}

/**
 * E271 (2026-10-25, Rio): the headline session RPM moves for two reasons — the segment's share of the
 * denominator moved (mix), or the real audience earned a different rate (rate). An ex-segment RPM delta
 * at or inside this band reads as mix. It is a classification band for the verdict text, not a
 * guardrail threshold: the status rules above never read it, and the band is symmetric because a
 * mix-driven *gain* must be caught as readily as a mix-driven dip (10-21: headline RPM +2.5%, ex-segment
 * −0.3% — the segment shrank from 6.29% to 1.25% and a flat demand day read as a lift).
 */
export const EX_SEGMENT_RPM_MIX_BAND = 0.01;

export interface ExSegmentRpm {
  /** Mediavine revenue ÷ GA4 sessions ex the segment × 1000 — the judged day and the mean of its controls. */
  actual: number;
  expected: number;
  /** The raw-RPM delta that mix alone predicts, (1 − shareActual) / (1 − shareExpected) − 1; null when a share is null. */
  mixPredictedRpmDelta: number | null;
  exSegmentRpmDelta: number;
  read: 'mix' | 'rate';
}

/**
 * Pure. Revenue is Mediavine's (the basis the status rules grade on); sessions are GA4's ex the segment
 * (the only basis the segment can be subtracted on). Returns null (could-not-run) when either revenue
 * or either ex-segment session count is not positive — the caller prints "unavailable", never a number.
 */
export function exSegmentRpm(x: SessionsExSegment | null, revenueActual: number, revenueExpected: number, band: number = EX_SEGMENT_RPM_MIX_BAND): ExSegmentRpm | null {
  if (!x) return null;
  if (!(revenueActual > 0) || !(revenueExpected > 0) || !(x.exSegment.actual > 0) || !(x.exSegment.expected > 0)) return null;
  const actual = (revenueActual / x.exSegment.actual) * 1000;
  const expected = (revenueExpected / x.exSegment.expected) * 1000;
  const exSegmentRpmDelta = actual / expected - 1;
  const mixPredictedRpmDelta = x.segment.shareActual == null || x.segment.shareExpected == null
    ? null
    : (1 - x.segment.shareActual) / (1 - x.segment.shareExpected) - 1;
  // Compare without the division so a delta exactly on the band reads inside it (101/100 − 1 is 0.010000000000000009).
  return { actual, expected, mixPredictedRpmDelta, exSegmentRpmDelta, read: Math.abs(actual - expected) <= band * expected ? 'mix' : 'rate' };
}

const signedPct = (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;

/** One line, printed every run under the sessions line, so a mix-driven RPM move is never booked as demand. */
export function exSegmentRpmLine(r: ExSegmentRpm | null, unavailableWhy: string | null = null, band: number = EX_SEGMENT_RPM_MIX_BAND): string {
  const tag = `ex-segment RPM (${SESSIONS_SEGMENT_RULE.experiment}; Mediavine revenue ÷ GA4 sessions ex ${SESSIONS_SEGMENT_RULE.country} ${SESSIONS_SEGMENT_RULE.source})`;
  if (!r) return `${tag}: unavailable${unavailableWhy ? ` — ${unavailableWhy}` : ''}`;
  const mix = r.mixPredictedRpmDelta == null ? 'n/a' : signedPct(r.mixPredictedRpmDelta);
  return `${tag}: $${r.actual.toFixed(2)} vs $${r.expected.toFixed(2)} (${pctDelta(r.actual, r.expected)}) · mix alone predicts raw RPM ${mix} → ${r.read} (mix band ±${(band * 100).toFixed(0)}%)`;
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
