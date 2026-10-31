/**
 * Affiliate pipe read — pure arithmetic and rendering (no network, no fs).
 *
 * Why this file exists (E153, 2026-10-01): E134 reopened affiliates as
 * *repair-only* with a two-part keep rule — ≥1 Impact-recorded action on a
 * repaired link, and KILL back to E13's stance "if $0 persists 30 days after
 * the pipe is confirmed fixed". Nothing measured the second clause. The daily
 * pulse reads Impact *actions* (earnings); it never compares the clicks the
 * site records against the clicks Impact records, which is the one number
 * that says whether the pipe carries traffic at all.
 *
 * The pre-fix baseline, pulled 2026-10-01 from `partner_performance_by_program`
 * (2026-07-01→2026-09-28): GTPLAYER-US (18111) 9 Impact clicks against 110
 * on-site `AffiliateClick` rows to GTRacing offers — 8.2 %. The other
 * campaigns in the same window summed to the "133 Impact clicks" E134 quotes
 * (Redbubble 61, Canva 18, Envato 18, Logitech G 15, CapCut 12, GTPLAYER 9).
 *
 * Three-state verdict (house rule: "could not run" ≠ "is broken"):
 *   - Impact leg unreachable → `unknown`, never a verdict, nothing written
 *     about the pipe's health;
 *   - fewer than MIN_ON_SITE_CLICKS on-site clicks in the window → `not-yet`
 *     (the pace is printed, the rule is not applied);
 *   - enough clicks and Impact-recorded ÷ on-site ≥ MIN_RECORDED_SHARE →
 *     `confirmed`; the E134 30-day KILL clock starts on the day the pipe was
 *     *first* confirmed (`PIPE_RULE.confirmedOn`, 2026-10-12), never on the
 *     run date — on 10-13 the tool printed `kill_read=2026-11-12` against the
 *     10-12 verdict's 11-11, i.e. a clock re-anchored every morning advances
 *     one day per run and never reads once step 0e runs it daily (E199);
 *   - enough clicks and the share is below the floor → `leaky`: the repair
 *     did not take, go back to the validator before reading revenue.
 *
 * The share is compared on the exact fraction; the rounded value is for
 * print only (5 of 10 is exactly 1/2 and must pass).
 *
 * Impact's day boundary for the by-program report is the account time zone,
 * which this read does not know; the window therefore starts on the first
 * *full* day after the fix merged (22:37Z on 09-28 → 2026-09-29) so neither
 * leg can straddle the fix.
 */

export const PIPE_RULE = {
  id: 'E153',
  parent: 'E134',
  /** PR #214 `f47abfe` merged 2026-09-28 22:37Z (validator + GTRacing host fix) */
  fixMergedAt: '2026-09-28T22:37:00Z',
  /** first full UTC day after the fix — both legs start here */
  windowStart: '2026-09-29',
  campaignId: '18111',
  campaignName: 'GTPLAYER-US',
  partner: 'gtracing',
  /** below this many on-site clicks the share is noise, not a reading */
  minOnSiteClicks: 10,
  /** Impact-recorded ÷ on-site; the pre-fix pipe read 0.082 */
  minRecordedShare: 0.5,
  /** E134: KILL the reopening if $0 persists this many days after confirmation */
  killAfterDays: 30,
  /**
   * Day the pipe was first read `confirmed` (10 on-site / 6 Impact = 60.0 %,
   * `reports/funnel/rio-verdict-2026-10-12.md` §3). The KILL clock anchors
   * here; a later run never moves it. `null` until the first confirmation.
   */
  confirmedOn: '2026-10-12' as string | null,
  /** E134 read date = confirmedOn + killAfterDays; this tool is re-run on it */
  readOn: '2026-11-11',
  preFix: { window: '2026-07-01→2026-09-28', onSite: 110, recorded: 9 },
} as const;

export type PipeStatus = 'confirmed' | 'not-yet' | 'leaky' | 'unknown';

export interface ImpactProgramRow {
  campaignId: string;
  campaign: string;
  clicks: number;
  actions: number;
  saleAmount: number;
}

export interface PipeInput {
  windowStart: string;
  windowEnd: string;
  /** on-site `AffiliateClick` rows in the window, keyed by `AffiliateOffer.partner` */
  onSiteByPartner: Record<string, number>;
  /** on-site rows in the window whose offer host was repaired (validated + active GTRacing) */
  onSiteRepaired: number;
  /** `partner_performance_by_program` rows for the window; null when the Impact leg could not run */
  impactRows: ImpactProgramRow[] | null;
  /** redacted reason when `impactRows` is null */
  impactError?: string;
  /** on-site clicks per day over the trailing window, for the "days until readable" estimate */
  onSitePerDay: number;
  now: Date;
  /**
   * Day of the first `confirmed` read (`PIPE_RULE.confirmedOn`). When set and
   * not after `now`, the KILL clock starts here instead of on the run date.
   */
  confirmedOn?: string | null;
  /** E306: GA4 `affiliate_click` rows (date × pagePath) for the window; null/undefined when the GA4 leg could not run. Informational — the status rules never read it. */
  ga4Rows?: Ga4AffiliateRow[] | null;
  /** redacted reason when `ga4Rows` is null */
  ga4Error?: string | null;
}

export interface PipeRead {
  status: PipeStatus;
  reason: string;
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  onSiteTotal: number;
  onSitePartner: number;
  onSiteRepaired: number;
  recorded: number | null;
  actions: number | null;
  saleAmount: number | null;
  /** exact share, 4 dp for print; null when either leg is missing or on-site is 0 */
  recordedShare: number | null;
  /** on-site clicks still needed before the rule applies */
  clicksToReadable: number;
  /** at `onSitePerDay`, days until the rule applies; null when the rate is 0 */
  daysToReadable: number | null;
  /** set only when status is `confirmed` */
  killClockStartsOn: string | null;
  killReadOn: string | null;
  impactRows: ImpactProgramRow[];
  impactError: string | null;
  /** E306: the two GA4 surfaces (grid vs blog Amazon block); null when GA4 could not run */
  ga4Leg: Ga4AffiliateLeg | null;
  ga4Error: string | null;
  generatedAt: string;
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Local-calendar `YYYY-MM-DD` of `d` (matches the other agents' `daysAgo()` arithmetic). */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key: string, days: number): string {
  const t = Date.parse(`${key}T00:00:00Z`);
  return new Date(t + days * 864e5).toISOString().slice(0, 10);
}

/**
 * Normalize Impact's `Records` array (every value arrives as a string, money
 * with 18 decimals, `campaign_id` lowercase). Unknown shapes become empty
 * rows rather than throwing — a report with no 18111 row is a real 0 on the
 * Impact leg, not a crash.
 */
export function parseImpactProgramRows(body: unknown): ImpactProgramRow[] {
  const records = (body as { Records?: unknown[] } | null)?.Records;
  if (!Array.isArray(records)) return [];
  return records.map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    return {
      campaignId: String(row.campaign_id ?? row.CampaignId ?? ''),
      campaign: String(row.Campaign ?? row.CampaignName ?? ''),
      clicks: num(row.Clicks),
      actions: num(row.Actions),
      saleAmount: num(row.Sale_Amount ?? row.Sale_zzzAmount),
    };
  });
}

export function assessPipe(i: PipeInput): PipeRead {
  const generatedAt = i.now.toISOString();
  const windowDays = Math.max(
    1,
    Math.round((Date.parse(`${i.windowEnd}T00:00:00Z`) - Date.parse(`${i.windowStart}T00:00:00Z`)) / 864e5) + 1,
  );
  const onSiteTotal = Object.values(i.onSiteByPartner).reduce((s, n) => s + n, 0);
  const onSitePartner = i.onSiteByPartner[PIPE_RULE.partner] ?? 0;
  const impactRows = i.impactRows ?? [];
  const campaignRow = i.impactRows ? impactRows.find((r) => r.campaignId === PIPE_RULE.campaignId) : undefined;
  const recorded = i.impactRows ? (campaignRow?.clicks ?? 0) : null;
  const actions = i.impactRows ? (campaignRow?.actions ?? 0) : null;
  const saleAmount = i.impactRows ? (campaignRow?.saleAmount ?? 0) : null;
  const shareExact = recorded != null && onSitePartner > 0 ? recorded / onSitePartner : null;
  const recordedShare = shareExact == null ? null : round(shareExact, 4);
  const clicksToReadable = Math.max(0, PIPE_RULE.minOnSiteClicks - onSitePartner);
  const daysToReadable = clicksToReadable === 0 ? 0 : i.onSitePerDay > 0 ? round(clicksToReadable / i.onSitePerDay, 1) : null;

  const base = {
    windowStart: i.windowStart,
    windowEnd: i.windowEnd,
    windowDays,
    onSiteTotal,
    onSitePartner,
    onSiteRepaired: i.onSiteRepaired,
    recorded,
    actions,
    saleAmount,
    recordedShare,
    clicksToReadable,
    daysToReadable,
    killClockStartsOn: null as string | null,
    killReadOn: null as string | null,
    impactRows,
    impactError: i.impactError ?? null,
    // E306: informational only — nothing below this object reads it.
    ga4Leg: i.ga4Rows ? summarizeGa4AffiliateClicks(i.ga4Rows, i.windowStart, i.windowEnd) : null,
    ga4Error: i.ga4Rows ? null : (i.ga4Error ?? 'GA4 leg not run'),
    generatedAt,
  };

  if (i.impactRows == null) {
    return {
      status: 'unknown',
      reason: `Impact leg could not run (${i.impactError ?? 'no reason given'}) — on-site clicks are known (${onSitePartner} ${PIPE_RULE.partner}), the pipe's health is not; no verdict`,
      ...base,
    };
  }
  if (onSitePartner < PIPE_RULE.minOnSiteClicks) {
    return {
      status: 'not-yet',
      reason: `${onSitePartner} on-site ${PIPE_RULE.partner} click(s) in ${windowDays} day(s), rule needs ≥ ${PIPE_RULE.minOnSiteClicks} — ${clicksToReadable} more${daysToReadable == null ? ' (no on-site clicks yet, no pace)' : ` ≈ ${daysToReadable} day(s) at ${i.onSitePerDay}/day`}; Impact so far ${recorded} click(s), ${actions} action(s)`,
      ...base,
    };
  }
  // exact comparison; `recordedShare` is rounded for print only
  if ((shareExact ?? 0) >= PIPE_RULE.minRecordedShare) {
    // Anchor on the first confirmation, never the run date: a clock that
    // re-anchors every morning never reads. A future `confirmedOn` is a typo;
    // fall back to today rather than start a clock in the future.
    const today = localDateKey(i.now);
    const startsOn = i.confirmedOn && i.confirmedOn <= today ? i.confirmedOn : today;
    return {
      status: 'confirmed',
      reason: `Impact recorded ${recorded} of ${onSitePartner} on-site ${PIPE_RULE.partner} clicks (${((shareExact ?? 0) * 100).toFixed(1)} % ≥ ${PIPE_RULE.minRecordedShare * 100} %; pre-fix ${((PIPE_RULE.preFix.recorded / PIPE_RULE.preFix.onSite) * 100).toFixed(1)} %) — pipe confirmed fixed; E134's ${PIPE_RULE.killAfterDays}-day $0 clock starts ${startsOn}`,
      ...base,
      killClockStartsOn: startsOn,
      killReadOn: addDays(startsOn, PIPE_RULE.killAfterDays),
    };
  }
  return {
    status: 'leaky',
    reason: `Impact recorded ${recorded} of ${onSitePartner} on-site ${PIPE_RULE.partner} clicks (${((shareExact ?? 0) * 100).toFixed(1)} % < ${PIPE_RULE.minRecordedShare * 100} %) — the repair did not take; re-run the validator on the active ${PIPE_RULE.partner} rows before any revenue read`,
    ...base,
  };
}

const pct = (x: number | null, dp = 1) => (x == null ? '—' : `${(x * 100).toFixed(dp)}%`);

/**
 * GA4 leg (E306, 2026-10-31). The operator's blog Amazon pack block (#391,
 * live 2026-10-27 00:45Z) fires the same `affiliate_click` event as the
 * Next.js grid, so the E134 kill read on 11-11 would otherwise fold the first
 * blog-side affiliate clicks ever recorded into Impact's $0. The two surfaces
 * are told apart by `pagePath`: the grid fires only on `/` and `/games/*`
 * (`AffiliateProductGrid` is mounted nowhere else), every other path is a
 * WordPress post carrying the block. `customEvent:source_type` / `partner`
 * would be the honest split but are not registered GA4 dimensions (Data API
 * 400 on 10-30; operator-only item in operator-queue.md) — when they are,
 * swap the classifier for the parameter and keep the shape below.
 *
 * Counts only. Earnings for the block are Amazon Associates, operator-only;
 * this leg never prints a dollar for it. A GA4 failure is `null` → the line
 * says "unavailable — <why>" with no digits (house rule: unknown never writes).
 */
export type AffiliateSurface = 'grid' | 'blog_pack_block';

export const GA4_LEG = {
  id: 'E306',
  event: 'affiliate_click',
  /** first full day the #391 block was live (merged 2026-10-27 00:45Z) */
  blockLiveFrom: '2026-10-27',
  /** the E295 launch-spike bar: the block keeps its own line if ≥ this many clicks/day on 11-11 */
  blockMinPerDay: 5,
} as const;

export function classifyAffiliateSurface(pagePath: string): AffiliateSurface {
  const p = (pagePath || '').split('?')[0].split('#')[0];
  if (p === '/' || p === '' || p === '/games' || p.startsWith('/games/')) return 'grid';
  return 'blog_pack_block';
}

export interface Ga4AffiliateRow {
  /** `YYYY-MM-DD` or GA4's `YYYYMMDD` */
  date: string;
  pagePath: string;
  eventCount: number;
}

export interface Ga4AffiliateLeg {
  windowStart: string;
  windowEnd: string;
  grid: number;
  blogPackBlock: number;
  /** days in the window on which the block was live (≥ `GA4_LEG.blockLiveFrom`) */
  blockLiveDays: number;
  /** block clicks ÷ block-live days; null before the block was live */
  blockPerDay: number | null;
  gridPerDay: number;
  /** block clicks per day, newest last, only for days ≥ `blockLiveFrom` */
  blockByDay: Record<string, number>;
  /** distinct blog paths that fired the block */
  blockPaths: number;
}

function ga4DateKey(raw: string): string {
  return /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

/** Pure: GA4 `affiliate_click` rows (date × pagePath) → the two surfaces, each with its own pace. */
export function summarizeGa4AffiliateClicks(rows: Ga4AffiliateRow[], windowStart: string, windowEnd: string): Ga4AffiliateLeg {
  let grid = 0;
  let blogPackBlock = 0;
  const blockByDay: Record<string, number> = {};
  const blockPaths = new Set<string>();
  for (const r of rows) {
    const d = ga4DateKey(String(r.date ?? ''));
    if (d < windowStart || d > windowEnd) continue;
    const n = num(r.eventCount);
    if (n <= 0) continue;
    if (classifyAffiliateSurface(r.pagePath) === 'grid') {
      grid += n;
    } else {
      blogPackBlock += n;
      blockPaths.add(r.pagePath.split('?')[0]);
      if (d >= GA4_LEG.blockLiveFrom) blockByDay[d] = (blockByDay[d] ?? 0) + n;
    }
  }
  const windowDays = Math.max(1, Math.round((Date.parse(`${windowEnd}T00:00:00Z`) - Date.parse(`${windowStart}T00:00:00Z`)) / 864e5) + 1);
  const liveStart = windowStart > GA4_LEG.blockLiveFrom ? windowStart : GA4_LEG.blockLiveFrom;
  const blockLiveDays = windowEnd < GA4_LEG.blockLiveFrom ? 0 : Math.round((Date.parse(`${windowEnd}T00:00:00Z`) - Date.parse(`${liveStart}T00:00:00Z`)) / 864e5) + 1;
  return {
    windowStart,
    windowEnd,
    grid,
    blogPackBlock,
    blockLiveDays,
    blockPerDay: blockLiveDays > 0 ? round(blogPackBlock / blockLiveDays, 2) : null,
    gridPerDay: round(grid / windowDays, 2),
    blockByDay,
    blockPaths: blockPaths.size,
  };
}

/**
 * The two lines the 11-11 read prints. Impact's leg is the E134 kill rule;
 * the Amazon block is a separate surface with its own bar and no dollar.
 * `leg === null` → one line saying unavailable, with the reason and no digits.
 */
export function ga4LegLines(leg: Ga4AffiliateLeg | null, unavailableWhy: string | null = null): string[] {
  if (!leg) return [`- GA4 \`${GA4_LEG.event}\` by surface: unavailable — ${unavailableWhy ?? 'no reason given'}`];
  const blockLine = leg.blockLiveDays > 0
    ? `${leg.blogPackBlock} click(s) on ${leg.blockPaths} post path(s) over ${leg.blockLiveDays} live day(s) = ${leg.blockPerDay}/day (bar ≥ ${GA4_LEG.blockMinPerDay}/day on ${PIPE_RULE.readOn}; earnings are Amazon Associates, operator-only — no dollar printed here)`
    : `not live in this window (block live from ${GA4_LEG.blockLiveFrom})`;
  return [
    `- GA4 \`${GA4_LEG.event}\`, grid (\`/\` + \`/games/*\`, Impact-tracked partners): ${leg.grid} click(s) over ${leg.windowStart} → ${leg.windowEnd} = ${leg.gridPerDay}/day`,
    `- GA4 \`${GA4_LEG.event}\`, blog Amazon pack block (#391, every other path): ${blockLine}`,
  ];
}

/** Markdown report. The decision rule is printed before any reading (house rule). */
export function renderPipeReadMd(read: PipeRead): string {
  const L: string[] = [];
  L.push(`# Affiliate pipe read — ${read.windowStart} → ${read.windowEnd} (${PIPE_RULE.id}, for ${PIPE_RULE.parent})`);
  L.push('');
  L.push(
    `_Generated ${read.generatedAt} by \`scripts/agents/affiliate-pipe-read.ts\`. Legs: on-site \`AffiliateClick\` rows by offer partner (production DB, read-only) and Impact \`partner_performance_by_program\` for the same dates (clicks and actions per campaign). Counts only; no click ids, IPs or user agents are read._`,
  );
  L.push('');
  L.push(
    `**Rule (pre-committed, ${PIPE_RULE.id}):** the pipe is **confirmed fixed** when, from ${PIPE_RULE.windowStart} (first full day after PR #214 merged ${PIPE_RULE.fixMergedAt}), on-site \`${PIPE_RULE.partner}\` clicks ≥ ${PIPE_RULE.minOnSiteClicks} AND Impact-recorded clicks on ${PIPE_RULE.campaignName} (${PIPE_RULE.campaignId}) ÷ on-site ≥ ${PIPE_RULE.minRecordedShare * 100} % (pre-fix ${PIPE_RULE.preFix.window}: ${PIPE_RULE.preFix.recorded}/${PIPE_RULE.preFix.onSite} = ${((PIPE_RULE.preFix.recorded / PIPE_RULE.preFix.onSite) * 100).toFixed(1)} %). Confirmation starts ${PIPE_RULE.parent}'s ${PIPE_RULE.killAfterDays}-day $0 KILL clock. Fewer clicks → not yet readable; a share under the floor → leaky (repair first); an unreachable Impact leg → unknown, never a verdict. ${PIPE_RULE.parent} reads ${PIPE_RULE.readOn}.`,
  );
  L.push('');
  L.push(`## Verdict: **${read.status.toUpperCase()}**`);
  L.push('');
  L.push(`- ${read.reason}`);
  if (read.killClockStartsOn) L.push(`- KILL clock: starts ${read.killClockStartsOn}, reads ${read.killReadOn} — KILL the reopening if Impact actions are still 0 then.`);
  L.push('');
  L.push('## Legs');
  L.push('');
  L.push('| Leg | Value |');
  L.push('|---|--:|');
  L.push(`| Window | ${read.windowStart} → ${read.windowEnd} (${read.windowDays} d) |`);
  L.push(`| On-site clicks, all partners | ${read.onSiteTotal} |`);
  L.push(`| On-site clicks, \`${PIPE_RULE.partner}\` | ${read.onSitePartner} |`);
  L.push(`| … of which to repaired (validated + active) offers | ${read.onSiteRepaired} |`);
  L.push(`| Impact clicks, ${PIPE_RULE.campaignName} | ${read.recorded ?? 'unknown'} |`);
  L.push(`| Impact actions, ${PIPE_RULE.campaignName} | ${read.actions ?? 'unknown'} |`);
  L.push(`| Impact sale amount, ${PIPE_RULE.campaignName} | ${read.saleAmount == null ? 'unknown' : `$${read.saleAmount.toFixed(2)}`} |`);
  L.push(`| Recorded ÷ on-site | ${pct(read.recordedShare)} (floor ${PIPE_RULE.minRecordedShare * 100}%) |`);
  L.push(`| Clicks until readable | ${read.clicksToReadable}${read.daysToReadable == null ? '' : ` (≈ ${read.daysToReadable} d)`} |`);
  L.push('');
  if (read.impactRows.length) {
    L.push('## Impact by campaign (same window)');
    L.push('');
    L.push('| Campaign | Id | Clicks | Actions | Sale $ |');
    L.push('|---|--:|--:|--:|--:|');
    for (const r of [...read.impactRows].sort((a, b) => b.clicks - a.clicks)) {
      L.push(`| ${r.campaign || '—'} | ${r.campaignId} | ${r.clicks} | ${r.actions} | ${r.saleAmount.toFixed(2)} |`);
    }
    L.push('');
  } else if (read.impactError) {
    L.push(`- Impact leg: COULD-NOT-RUN — ${read.impactError}`);
    L.push('');
  }
  // E306: the kill read prints Impact and the blog Amazon block as two lines, never one sum.
  L.push(`## GA4 \`${GA4_LEG.event}\` by surface (${GA4_LEG.id}; informational, not a verdict input)`);
  L.push('');
  for (const line of ga4LegLines(read.ga4Leg, read.ga4Error)) L.push(line);
  if (read.ga4Leg && Object.keys(read.ga4Leg.blockByDay).length) {
    L.push('');
    L.push('| Day | Block clicks |');
    L.push('|---|--:|');
    for (const d of Object.keys(read.ga4Leg.blockByDay).sort()) L.push(`| ${d} | ${read.ga4Leg.blockByDay[d]} |`);
  }
  L.push('');
  return L.join('\n');
}
