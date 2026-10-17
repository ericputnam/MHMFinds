/**
 * "Sessions to creator pages" and the /creator/* ≥95% guard, as pure math
 * (Nova, E204, 2026-10-14). The GA4 I/O lives in
 * scripts/agents/funnel-scoreboard.ts; this module only classifies rows.
 *
 * Why this exists: every /creator/* experiment since E137 (E144, E166) carried
 * a guard written as "/creator/* landings ≥95% of 558". That 558 was the
 * all-channel landing count for 09-23→09-29, and GA4 re-reads that week (on
 * 2026-10-14) as 585 sessions of which 420 (71.8%) were Direct — traffic no
 * page change can earn or lose. Direct fell to 168 in 10-07→10-13, so the
 * all-channel guard read 301/558 = 53.9% and would have "failed" any change
 * shipped that fortnight. The guard was measuring Direct noise.
 *
 * Basis now: landing sessions whose GA4 default channel group is Organic
 * Search or AI Assistant (the traffic a creator page can actually earn), and
 * graded RELATIVE TO THE SITE's own organic+AI change over the same windows,
 * so a sitewide search dip is not charged to /creator/*. Same rule as the
 * E170 lesson: gate a slice relative to its channel, never on an absolute.
 *
 *   ratio = (creator organic+AI now / CREATOR_LANDING_BASELINE.creatorOrganicAi)
 *         / (site organic+AI now    / CREATOR_LANDING_BASELINE.siteOrganicAi)
 *   pass  iff ratio ≥ 0.95, compared as exact integers (no rounding).
 *
 * This is NOT a laundering of a failed read: on the first read under it
 * (10-07→10-13) /creator/* organic+AI was 132 vs 165 (80.0%) while the site
 * was 21,662 vs 24,116 (89.8%), so the guard reads 89.1% and FAILS. Pinned in
 * __tests__/unit/funnel-creator-landings.test.ts.
 *
 * Rejected bases (kept here so nobody re-proposes them):
 *   - all channels vs 558: 71.8% Direct in the baseline week (see above).
 *   - organic+AI absolute (no site control): charges a sitewide search dip to
 *     the slice — site organic+AI fell 10.2% across the same fortnight.
 *   - the scoreboard's source/medium bucketing: it is sitewide and has no
 *     landing-page dimension; channel group is GA4's own and is stable.
 */

/** GA4 sessionDefaultChannelGroup values counted as earned traffic. */
export const EARNED_CHANNEL_GROUPS: readonly string[] = ['Organic Search', 'AI Assistant'];

/**
 * Frozen baseline: GA4 re-read 2026-10-14 of the E144 baseline week
 * (2026-09-23→2026-09-29). Never recompute this from "today".
 */
export const CREATOR_LANDING_BASELINE = {
  window: '2026-09-23→2026-09-29',
  readOn: '2026-10-14',
  /** /creator/* landings, Organic Search 136 + AI Assistant 29. */
  creatorOrganicAi: 165,
  /** /creator/* landings, all channels (the original 09-30 read said 558). */
  creatorAll: 585,
  /** Sitewide sessions, Organic Search 23,746 + AI Assistant 370. */
  siteOrganicAi: 24116,
  /** The all-channel figure every guard before E204 was written against. */
  supersededAllChannelBaseline: 558,
} as const;

/** Guard floor as an exact fraction (95/100). */
export const CREATOR_LANDING_FLOOR = { num: 95, den: 100 } as const;

export interface ChannelRow {
  channelGroup: string;
  sessions: number;
  /** GA4 sessionSource. Optional: rows without it skip the source-matched read. */
  source?: string;
}

/**
 * Source-matched control (Nova, E225, 2026-10-17). DIAGNOSTIC ONLY — it never
 * changes `guard`.
 *
 * Why: the site control above is 70% Bing and 1.4% ChatGPT, but /creator/* in
 * the baseline week was 47% Bing and 18% ChatGPT. When sitewide ChatGPT
 * referrals halved (337 → 154, 09-23→29 vs 10-10→16) the guard charged that
 * external drop to creator pages: 139 vs 165 read 94.2% site-relative FAIL,
 * while the source-matched expectation was 139.3 (99.8%). Per bucket on that
 * read: google 61 vs 52.0, bing 48 vs 67.5 (the one real residual — E218),
 * chatgpt 7 vs 13.3, other 23 vs 6.5.
 *
 *   expected = Σ_bucket creatorBase[b] × siteNow[b] / siteBase[b]
 *
 * The verdict basis was NOT moved to this number (it would flip a FAIL to a
 * PASS mid-read of E204/E218/E144). Whether to adopt it is Quinn's call.
 */
export type SourceBucket = 'google' | 'bing' | 'chatgpt' | 'other';
export const SOURCE_BUCKETS: readonly SourceBucket[] = ['google', 'bing', 'chatgpt', 'other'];

export function bucketSource(source: string | undefined): SourceBucket {
  const s = (source ?? '').trim().toLowerCase();
  if (s === 'google') return 'google';
  if (s === 'bing' || s === 'bing.com' || s.endsWith('.bing.com')) return 'bing';
  if (s === 'chatgpt' || s === 'chatgpt.com' || s.endsWith('.chatgpt.com')) return 'chatgpt';
  return 'other';
}

/**
 * Frozen per-bucket baseline, GA4 re-read 2026-10-17 of 2026-09-23→09-29,
 * organic+AI sessions bucketed by sessionSource. Sums equal
 * CREATOR_LANDING_BASELINE (165 / 24,116) by construction (pinned in tests).
 */
export const SOURCE_BASELINE: {
  readonly creator: Readonly<Record<SourceBucket, number>>;
  readonly site: Readonly<Record<SourceBucket, number>>;
} = {
  // google 52; bing 54 + cn.bing 23; chatgpt.com 28 (AI) + 1 (organic); rest 7
  creator: { google: 52, bing: 77, chatgpt: 29, other: 7 },
  // google 2,806; bing 16,844 + cn.bing 128; chatgpt.com 337; rest 4,001
  site: { google: 2806, bing: 16972, chatgpt: 337, other: 4001 },
};

export interface SourceMatchedRead {
  actual: number;
  expected: number;
  /** actual / expected, print only. */
  ratio: number;
  byBucket: Record<SourceBucket, { actual: number; expected: number }>;
}

function sumByBucket(rows: readonly ChannelRow[]): Record<SourceBucket, number> {
  const out: Record<SourceBucket, number> = { google: 0, bing: 0, chatgpt: 0, other: 0 };
  for (const r of rows) {
    if (!EARNED_CHANNEL_GROUPS.includes(r.channelGroup)) continue;
    out[bucketSource(r.source)] += Number(r.sessions) || 0;
  }
  return out;
}

/** null when either side lacks `source` on any earned row (could-not-run). */
export function sourceMatchedRead(
  creatorRows: readonly ChannelRow[],
  siteRows: readonly ChannelRow[],
  baseline = SOURCE_BASELINE,
): SourceMatchedRead | null {
  const earned = (rows: readonly ChannelRow[]) => rows.filter((r) => EARNED_CHANNEL_GROUPS.includes(r.channelGroup));
  const c = earned(creatorRows);
  const s = earned(siteRows);
  if (c.length === 0 || s.length === 0) return null;
  if (c.some((r) => r.source == null) || s.some((r) => r.source == null)) return null;
  const cNow = sumByBucket(c);
  const sNow = sumByBucket(s);
  const byBucket = {} as Record<SourceBucket, { actual: number; expected: number }>;
  let expected = 0;
  let actual = 0;
  for (const b of SOURCE_BUCKETS) {
    const e = baseline.site[b] > 0 ? (baseline.creator[b] * sNow[b]) / baseline.site[b] : 0;
    byBucket[b] = { actual: cNow[b], expected: e };
    expected += e;
    actual += cNow[b];
  }
  if (expected <= 0) return null;
  return { actual, expected, ratio: actual / expected, byBucket };
}

export function formatSourceMatched(r: SourceMatchedRead | null | undefined): string {
  if (!r) return '';
  const parts = SOURCE_BUCKETS.map((b) => `${b} ${r.byBucket[b].actual}/${r.byBucket[b].expected.toFixed(1)}`);
  return ` · source-matched ${(r.ratio * 100).toFixed(1)}% (diagnostic; ${parts.join(', ')})`;
}

export interface CreatorLandingSummary {
  /** /creator/* landing sessions, all channels. */
  all: number;
  /** /creator/* landing sessions from EARNED_CHANNEL_GROUPS. */
  organicAi: number;
  /** /creator/* landing sessions from Direct. */
  direct: number;
  /** Sitewide organic+AI sessions over the same window (null = not read). */
  siteOrganicAi: number | null;
  /** Site-relative ratio vs the frozen baseline, for print only. */
  ratio: number | null;
  /** 'pass' | 'fail' on the exact-fraction comparison; 'unknown' when the
   *  site control or the creator rows were not read (could-not-run ≠ fail). */
  guard: 'pass' | 'fail' | 'unknown';
  /** E225 diagnostic; absent/null when source rows were not read. */
  sourceMatched?: SourceMatchedRead | null;
}

export function sumChannels(rows: readonly ChannelRow[], groups: readonly string[]): number {
  let n = 0;
  for (const r of rows) if (groups.includes(r.channelGroup)) n += Number(r.sessions) || 0;
  return n;
}

/**
 * Grade the /creator/* guard.
 *
 * Exact comparison (no floats at the boundary):
 *   (c / C0) / (s / S0) ≥ 95/100  ⇔  100 · c · S0 ≥ 95 · C0 · s
 */
export function summarizeCreatorLandings(
  creatorRows: readonly ChannelRow[],
  siteOrganicAi: number | null,
  baseline: { creatorOrganicAi: number; siteOrganicAi: number } = CREATOR_LANDING_BASELINE,
): CreatorLandingSummary {
  const all = creatorRows.reduce((n, r) => n + (Number(r.sessions) || 0), 0);
  const organicAi = sumChannels(creatorRows, EARNED_CHANNEL_GROUPS);
  const direct = sumChannels(creatorRows, ['Direct']);
  // No rows at all means the query returned nothing (Direct alone has never
  // been 0 on /creator/*), and no site control means no denominator: both are
  // could-not-run, never a verdict.
  if (creatorRows.length === 0 || siteOrganicAi == null || siteOrganicAi <= 0) {
    return { all, organicAi, direct, siteOrganicAi, ratio: null, guard: 'unknown' };
  }
  const lhs = CREATOR_LANDING_FLOOR.den * organicAi * baseline.siteOrganicAi;
  const rhs = CREATOR_LANDING_FLOOR.num * baseline.creatorOrganicAi * siteOrganicAi;
  const ratio = (organicAi / baseline.creatorOrganicAi) / (siteOrganicAi / baseline.siteOrganicAi);
  return { all, organicAi, direct, siteOrganicAi, ratio, guard: lhs >= rhs ? 'pass' : 'fail' };
}

/** One-line scoreboard cell. */
export function formatCreatorLandings(s: CreatorLandingSummary): string {
  const g = s.guard === 'unknown'
    ? 'guard unknown (site control not read)'
    : `guard ${(Number(s.ratio) * 100).toFixed(1)}% site-relative vs ${CREATOR_LANDING_BASELINE.window} ${s.guard === 'pass' ? 'PASS' : 'FAIL'} (≥95%)`;
  return `${s.organicAi} organic+AI of ${s.all} (Direct ${s.direct}) · ${g}${formatSourceMatched(s.sourceMatched)}`;
}
