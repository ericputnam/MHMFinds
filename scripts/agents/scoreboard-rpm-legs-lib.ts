/**
 * E424 (Rio, 2026-11-17) — the scoreboard's session-RPM decomposition, pure.
 *
 * Every Rio verdict since E255 (10-21) has reproduced the printed RPM delta by hand from
 * the identity
 *
 *     revenue = sessions × (paid impressions / session) × CPM
 *     paid impressions / session = (monetizable pv / session) × (paid impressions / monetizable pv)
 *
 * and the 11-15 verdict (E416) pre-committed an ad-side falsifier on one of those legs:
 * "if the 7d monetizable-pv share reads < 85% on any scoreboard after 11-18 with CPM
 * flat, treat it as Mediavine-side". The scoreboard printed none of these legs, so the
 * falsifier could not be read from a scoreboard at all — only from a hand pull. This
 * lib computes the legs from the daily `earnings` rows the scoreboard already fetches
 * and the scoreboard prints one line. Measurement only: no sessions, no revenue and no
 * ad surface change. No network, no fs, no env.
 *
 * Three-state verdict, never two: a window with a zero-session or zero-pageview day is
 * Mediavine's lag state (11-03 posted revenue with 0 sessions on 11-05, E342), so the
 * legs are not a reading and the falsifier returns `unknown` rather than `ok`/`fired`.
 */

export interface RpmLegsRow {
  /** Mediavine date, `YYYY/MM/DD` or `YYYY-MM-DD`. */
  date: string;
  revenue: number;
  pageviews: number;
  monetizable_pageviews: number;
  sessions: number;
  paid_impressions: number;
}

export interface RpmLegsWindow {
  start: string;
  end: string;
  /** Rows the window received. */
  days: number;
  /** Rows with sessions = 0 or pageviews = 0 (Mediavine lag state). */
  incompleteDays: number;
  revenue: number;
  sessions: number;
  pageviews: number;
  monetizablePageviews: number;
  paidImpressions: number;
  /** revenue / sessions × 1000 */
  sessionRpm: number;
  /** paid impressions / session */
  impPerSession: number;
  /** revenue / paid impressions × 1000 */
  cpm: number;
  /** monetizable pageviews / pageviews (0–1) */
  monPvShare: number;
  /** min daily monetizable-pv share over the complete days (0–1) */
  minDailyMonPvShare: number;
  /** pageviews / session */
  pvPerSession: number;
  /** monetizable pageviews / session */
  monPvPerSession: number;
  /** paid impressions / monetizable pageview */
  impPerMonPv: number;
}

export type FalsifierStatus = 'ok' | 'fired' | 'unknown';

export interface RpmLegs {
  cur: RpmLegsWindow;
  prev: RpmLegsWindow;
  /** Relative deltas cur vs prev, as fractions (0.055 = +5.5%). NaN when prev is 0. */
  delta: {
    sessionRpm: number;
    impPerSession: number;
    cpm: number;
    monPvShare: number;
    pvPerSession: number;
    monPvPerSession: number;
    impPerMonPv: number;
  };
  falsifier: { status: FalsifierStatus; reason: string };
}

/**
 * E416 ad-side falsifier (pre-committed 2026-11-15, `rio-verdict-2026-11-15.md` §(d)3).
 * `minShare`: the 7d monetizable-pv share below which the step of 11-03/11-06 has
 * reverted. `cpmFlatBand`: "CPM flat" = |Δ CPM| ≤ this fraction WoW (ratio of sums over
 * 7 days; 10-21→11-15 verdicts saw 7d CPM move −3.8%, +1.8%, +4.1%, +5.9% — a rate move
 * is a different diagnosis, so the band sits inside those). `expectedDays`: a window
 * shorter than this is not a 7d read.
 */
export const E416_FALSIFIER = Object.freeze({ minShare: 0.85, cpmFlatBand: 0.03, expectedDays: 7 });

const isoDate = (d: string) => String(d).slice(0, 10).replace(/\//g, '-');
const safeDiv = (a: number, b: number) => (b ? a / b : 0);
const rel = (cur: number, prev: number) => (prev ? cur / prev - 1 : NaN);

export function isCompleteRow(r: RpmLegsRow): boolean {
  return Number(r.sessions) > 0 && Number(r.pageviews) > 0;
}

export function summarizeWindow(rows: RpmLegsRow[]): RpmLegsWindow {
  const sorted = [...rows].sort((a, b) => isoDate(a.date).localeCompare(isoDate(b.date)));
  const complete = sorted.filter(isCompleteRow);
  const sum = (k: keyof RpmLegsRow) => complete.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const revenue = sum('revenue');
  const sessions = sum('sessions');
  const pageviews = sum('pageviews');
  const monetizablePageviews = sum('monetizable_pageviews');
  const paidImpressions = sum('paid_impressions');
  const dailyShares = complete.map((r) => safeDiv(Number(r.monetizable_pageviews), Number(r.pageviews)));
  return {
    start: sorted.length ? isoDate(sorted[0].date) : '',
    end: sorted.length ? isoDate(sorted[sorted.length - 1].date) : '',
    days: sorted.length,
    incompleteDays: sorted.length - complete.length,
    revenue,
    sessions,
    pageviews,
    monetizablePageviews,
    paidImpressions,
    sessionRpm: safeDiv(revenue, sessions) * 1000,
    impPerSession: safeDiv(paidImpressions, sessions),
    cpm: safeDiv(revenue, paidImpressions) * 1000,
    monPvShare: safeDiv(monetizablePageviews, pageviews),
    minDailyMonPvShare: dailyShares.length ? Math.min(...dailyShares) : 0,
    pvPerSession: safeDiv(pageviews, sessions),
    monPvPerSession: safeDiv(monetizablePageviews, sessions),
    impPerMonPv: safeDiv(paidImpressions, monetizablePageviews),
  };
}

/**
 * Split one contiguous run of daily rows into the current window (the last `days`
 * dated rows ending on `end`) and the previous window (the `days` rows before it).
 * Rows outside either window are dropped; rows are matched by date, never by position,
 * so a missing day shows up as `days < expectedDays`, not as a shifted window.
 */
export function splitWindows(rows: RpmLegsRow[], end: string, days = E416_FALSIFIER.expectedDays): { cur: RpmLegsRow[]; prev: RpmLegsRow[] } {
  const endIso = isoDate(end);
  const dateOf = (iso: string, minus: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - minus);
    return d.toISOString().slice(0, 10);
  };
  const curStart = dateOf(endIso, days - 1);
  const prevEnd = dateOf(endIso, days);
  const prevStart = dateOf(endIso, 2 * days - 1);
  const byDate = new Map(rows.map((r) => [isoDate(r.date), r]));
  const pick = (from: string, to: string) =>
    Array.from(byDate.entries()).filter(([d]) => d >= from && d <= to).map(([, r]) => r);
  return { cur: pick(curStart, endIso), prev: pick(prevStart, prevEnd) };
}

export function rpmLegs(curRows: RpmLegsRow[], prevRows: RpmLegsRow[], f = E416_FALSIFIER): RpmLegs {
  const cur = summarizeWindow(curRows);
  const prev = summarizeWindow(prevRows);
  const delta = {
    sessionRpm: rel(cur.sessionRpm, prev.sessionRpm),
    impPerSession: rel(cur.impPerSession, prev.impPerSession),
    cpm: rel(cur.cpm, prev.cpm),
    monPvShare: rel(cur.monPvShare, prev.monPvShare),
    pvPerSession: rel(cur.pvPerSession, prev.pvPerSession),
    monPvPerSession: rel(cur.monPvPerSession, prev.monPvPerSession),
    impPerMonPv: rel(cur.impPerMonPv, prev.impPerMonPv),
  };

  let falsifier: RpmLegs['falsifier'];
  if (cur.days < f.expectedDays || cur.incompleteDays > 0 || prev.days < f.expectedDays || prev.incompleteDays > 0) {
    falsifier = {
      status: 'unknown',
      reason: `window incomplete (cur ${cur.days}d/${cur.incompleteDays} zero-session, prev ${prev.days}d/${prev.incompleteDays} zero-session) — not a reading`,
    };
  } else if (!Number.isFinite(delta.cpm)) {
    falsifier = { status: 'unknown', reason: 'prev CPM is 0 — cannot judge flat' };
  } else {
    const shareLow = cur.monPvShare < f.minShare;
    const cpmFlat = Math.abs(delta.cpm) <= f.cpmFlatBand;
    const sharePct = `${(cur.monPvShare * 100).toFixed(1)}%`;
    const cpmPct = `${delta.cpm >= 0 ? '+' : ''}${(delta.cpm * 100).toFixed(1)}%`;
    if (shareLow && cpmFlat) {
      falsifier = { status: 'fired', reason: `share ${sharePct} < ${f.minShare * 100}% with CPM ${cpmPct} (flat) — Mediavine-side, not a deploy` };
    } else if (shareLow) {
      falsifier = { status: 'ok', reason: `share ${sharePct} < ${f.minShare * 100}% but CPM ${cpmPct} is not flat (band ±${f.cpmFlatBand * 100}%) — rule not met, read CPM first` };
    } else {
      falsifier = { status: 'ok', reason: `share ${sharePct} ≥ ${f.minShare * 100}%` };
    }
  }
  return { cur, prev, delta, falsifier };
}

const fmtMoney = (n: number, dp = 2) => `$${n.toFixed(dp)}`;
const fmtRel = (v: number) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : 'n/a');
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** One scoreboard bullet: the identity's legs, the share, and the falsifier state. */
export function formatRpmLegsLine(l: RpmLegs): string {
  const { cur, prev, delta, falsifier } = l;
  const flag = falsifier.status === 'fired' ? '🔴' : falsifier.status === 'unknown' ? '🟡' : '🟢';
  return (
    `- RPM legs 7d vs prev 7d (E424): session RPM ${fmtMoney(cur.sessionRpm)} (${fmtRel(delta.sessionRpm)}) = ` +
    `imp/session ${cur.impPerSession.toFixed(2)} (${fmtRel(delta.impPerSession)}) × CPM ${fmtMoney(cur.cpm, 3)} (${fmtRel(delta.cpm)}) · ` +
    `imp/session = mon-pv/session ${cur.monPvPerSession.toFixed(2)} (${fmtRel(delta.monPvPerSession)}) × imp/mon-pv ${cur.impPerMonPv.toFixed(2)} (${fmtRel(delta.impPerMonPv)}) · ` +
    `pv/session ${cur.pvPerSession.toFixed(2)} (${fmtRel(delta.pvPerSession)}) · ` +
    `monetizable-pv share ${fmtPct(cur.monPvShare)} (prev ${fmtPct(prev.monPvShare)}, daily min ${fmtPct(cur.minDailyMonPvShare)}) · ` +
    `${flag} E416 falsifier ${falsifier.status}: ${falsifier.reason}`
  );
}
