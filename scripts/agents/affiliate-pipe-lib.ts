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
 *     `confirmed`; the E134 30-day KILL clock starts on the read date;
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
  /** E134 read date; this tool is re-run on it */
  readOn: '2026-10-12',
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
    const startsOn = localDateKey(i.now);
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
  return L.join('\n');
}
