/**
 * scripts/agents/patreon-members-lib.ts — pure aggregation over a Patreon
 * Members API page set. No network, no DB, no logging. The scoreboard
 * (`funnel-scoreboard.ts`) and the hand-run reads (`patreon-relaunch-read.ts`,
 * `patreon-churn-read.ts`) all answer the same three questions; this is the
 * one place the arithmetic lives so the E40 read (2026-09-19) and the Q4 gate
 * (2026-09-22) come off the daily scoreboard instead of a hand-run script.
 *
 * Privacy: `email` and `patreonUserId` are accepted only so the caller can
 * intersect paid patrons with the set of site accounts linked via Patreon
 * OAuth. Nothing here returns an email, name or id — only integers and
 * dollar totals.
 *
 * The join (E50, 2026-09-14): a linked site account is "paid-and-connected"
 * when its `Account.providerAccountId` (NextAuth stores the Patreon v2
 * identity `data.id` there) equals a currently-paying member's
 * `relationships.user.data.id` — the authoritative key. Email equality is kept
 * only as a fallback: Patreon's billing email and the OAuth profile email are
 * routinely different people-strings for the same person, which is why the
 * email-only join read "0 of 33" on 2026-09-13. Both counts are reported so
 * the delta stays visible.
 */

export interface PatreonMemberAttrs {
  patron_status: string | null;
  pledge_relationship_start: string | null;
  last_charge_date: string | null;
  currently_entitled_amount_cents: number | null;
  email?: string | null;
  /** `relationships.user.data.id` from `?include=user` — the Patreon user id, same namespace as `Account.providerAccountId`. */
  patreonUserId?: string | null;
}

/** One `Account` row with `provider = 'patreon'`; either key may be missing. */
export interface LinkedPatreonAccount {
  providerAccountId?: string | null;
  email?: string | null;
}

export interface PatreonMembersSummary {
  paid: number;
  free: number;
  former: number;
  grossMonthlyUsd: number;
  /** paid patrons by entitled amount, e.g. { "$1": 8, "$3": 42, "$8": 1 } */
  paidByAmount: Record<string, number>;
  /** paid joins whose pledge started inside the trailing window */
  joins7d: number;
  /** former patrons whose last successful charge fell inside the trailing window */
  cancels7d: number;
  /** paid joins since the fixed anchor, total and for the $3 perk tier */
  joinsSinceAnchor: number;
  joinsSinceAnchorAtPerkTier: number;
  /**
   * former patrons whose last successful charge fell on/after the anchor.
   * Patreon charges most patrons on the 1st, so between billing runs this
   * only sees people who joined after the anchor and left again — it is a
   * floor on cancels, not a count, until the next 1st-of-month charge run.
   */
  cancelsSinceAnchor: number;
  /** paid joins at the perk tier inside the trailing window, and per day */
  perkTierJoins7d: number;
  perkTierJoinsPerDay7d: number;
  /**
   * Of the linked site accounts passed in, how many belong to a currently
   * paying patron — by Patreon user id, falling back to email when either
   * side lacks an id. Each account counts at most once.
   */
  paidAndConnected: number;
  /** the same count by Patreon user id only (authoritative) */
  paidAndConnectedById: number;
  /** the same count by email only (the pre-2026-09-14 join; kept for the visible delta) */
  paidAndConnectedByEmail: number;
  /** linked accounts that carry a `providerAccountId` at all */
  linkedWithPatreonId: number;
  /** paying members whose API row carried a user id — 0 with paid > 0 means `include=user` did not take and the join fell back to email */
  paidWithUserId: number;
}

export const E40_ANCHOR = '2026-09-08T00:00:00Z';
export const PERK_TIER_CENTS = 300;
const WINDOW_DAYS = 7;

/**
 * E40 revert clause, traffic leg — frozen on 2026-09-12 from GA4 finalized
 * daily `patreon_click` distinct users 13, 13, 3, 6 over 09-08→09-11
 * (35 users / 4 days = 8.75). The scoreboard compares it against the **mean of
 * daily distinct users** over its own 7-day window, never against a 7-day
 * `totalUsers` ÷ 7 (which dedupes across days and reads systematically lower).
 */
export const E40_CLICK_BASELINE = {
  start: '2026-09-08',
  end: '2026-09-11',
  users: 35,
  days: 4,
  usersPerDay: 8.75,
  /** revert threshold: 50% of the baseline */
  revertBelowPerDay: 4.375,
} as const;

/** Lower-cased, trimmed; empty for null/blank. Never returned to a caller — used only for set membership. */
export function normalizeEmail(e: string | null | undefined): string {
  return (e ?? '').trim().toLowerCase();
}

/** Trimmed id string; empty for null/blank. Never returned to a caller — used only for set membership. */
export function normalizeId(id: string | number | null | undefined): string {
  return id == null ? '' : String(id).trim();
}

export function summarizePatreonMembers(
  members: PatreonMemberAttrs[],
  linkedAccounts: Array<LinkedPatreonAccount | string | null | undefined>,
  opts: { now?: Date; anchor?: string; perkTierCents?: number } = {},
): PatreonMembersSummary {
  const now = opts.now ?? new Date();
  const anchor = new Date(opts.anchor ?? E40_ANCHOR);
  const perk = opts.perkTierCents ?? PERK_TIER_CENTS;
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 864e5);

  const inWindow = (d: string | null) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return !Number.isNaN(t) && t >= windowStart.getTime() && t <= now.getTime();
  };
  const sinceAnchor = (d: string | null) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return !Number.isNaN(t) && t >= anchor.getTime();
  };

  const active = members.filter((m) => m.patron_status === 'active_patron');
  const former = members.filter((m) => m.patron_status === 'former_patron');
  const free = members.length - active.length - former.length;

  const paidByAmount: Record<string, number> = {};
  let grossCents = 0;
  for (const m of active) {
    const cents = m.currently_entitled_amount_cents ?? 0;
    grossCents += cents;
    const k = `$${(cents / 100).toFixed(0)}`;
    paidByAmount[k] = (paidByAmount[k] ?? 0) + 1;
  }

  const joins7d = active.filter((m) => inWindow(m.pledge_relationship_start)).length;
  const cancels7d = former.filter((m) => inWindow(m.last_charge_date)).length;
  const joinedSince = active.filter((m) => sinceAnchor(m.pledge_relationship_start));
  const cancelsSinceAnchor = former.filter((m) => sinceAnchor(m.last_charge_date)).length;
  const joinsSinceAnchorAtPerkTier = joinedSince.filter((m) => (m.currently_entitled_amount_cents ?? 0) === perk).length;
  const perkTierJoins7d = active.filter(
    (m) => inWindow(m.pledge_relationship_start) && (m.currently_entitled_amount_cents ?? 0) === perk,
  ).length;

  // --- paid-and-connected: id join first, email as the fallback
  const activeIds = new Set(active.map((m) => normalizeId(m.patreonUserId)).filter(Boolean));
  const activeEmails = new Set(active.map((m) => normalizeEmail(m.email)).filter(Boolean));
  const linked: LinkedPatreonAccount[] = linkedAccounts.map((a) => (typeof a === 'string' || a == null ? { email: a } : a));

  let paidAndConnectedById = 0;
  let paidAndConnectedByEmail = 0;
  let paidAndConnected = 0;
  let linkedWithPatreonId = 0;
  for (const a of linked) {
    const id = normalizeId(a.providerAccountId);
    const em = normalizeEmail(a.email);
    if (id) linkedWithPatreonId += 1;
    const byId = id !== '' && activeIds.has(id);
    const byEmail = em !== '' && activeEmails.has(em);
    if (byId) paidAndConnectedById += 1;
    if (byEmail) paidAndConnectedByEmail += 1;
    if (byId || byEmail) paidAndConnected += 1;
  }

  return {
    paid: active.length,
    free,
    former: former.length,
    grossMonthlyUsd: grossCents / 100,
    paidByAmount,
    joins7d,
    cancels7d,
    joinsSinceAnchor: joinedSince.length,
    joinsSinceAnchorAtPerkTier,
    cancelsSinceAnchor,
    perkTierJoins7d,
    perkTierJoinsPerDay7d: Math.round((perkTierJoins7d / WINDOW_DAYS) * 100) / 100,
    paidAndConnected,
    paidAndConnectedById,
    paidAndConnectedByEmail,
    linkedWithPatreonId,
    paidWithUserId: activeIds.size,
  };
}

/** Sorted "8×$1, 42×$3" rendering for the markdown line. */
export function formatPaidByAmount(byAmount: Record<string, number>): string {
  return Object.entries(byAmount)
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([k, v]) => `${v}×${k}`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Who are the linked accounts? (E69, 2026-09-20)
// ---------------------------------------------------------------------------

/**
 * Every `Account.provider='patreon'` row sorted into exactly one class by
 * looking its Patreon user id up in the campaign's full member list (active,
 * free and former rows all carry `relationships.user.data.id`). This is the
 * "why is paid-and-connected 0" question: a linked account that is a *free*
 * member took the Connect link and got nothing; one that is *not in the
 * campaign* is a Patreon user who never followed us at all; one that is
 * *former* was a patron once. Counts only — no id or email leaves here.
 */
export interface LinkedAccountClasses {
  total: number;
  /** linked rows with no providerAccountId — cannot be classified */
  noId: number;
  activePatron: number;
  freeMember: number;
  formerPatron: number;
  /** `declined_patron` — a pledge whose payment failed */
  declinedPatron: number;
  /** id present but no member row of any status in this campaign */
  notInCampaign: number;
}

export function classifyLinkedAccounts(
  members: PatreonMemberAttrs[],
  linkedAccounts: LinkedPatreonAccount[],
): LinkedAccountClasses {
  const statusById = new Map<string, string>();
  for (const m of members) {
    const id = normalizeId(m.patreonUserId);
    if (!id) continue;
    const status = m.patron_status ?? 'free';
    // An id can appear once per campaign; if it somehow appears twice, an
    // active row wins so a paying patron is never demoted by a stale row.
    const prev = statusById.get(id);
    if (!prev || status === 'active_patron') statusById.set(id, status);
  }
  const out: LinkedAccountClasses = { total: linkedAccounts.length, noId: 0, activePatron: 0, freeMember: 0, formerPatron: 0, declinedPatron: 0, notInCampaign: 0 };
  for (const a of linkedAccounts) {
    const id = normalizeId(a.providerAccountId);
    if (!id) { out.noId += 1; continue; }
    const status = statusById.get(id);
    if (status === undefined) out.notInCampaign += 1;
    else if (status === 'active_patron') out.activePatron += 1;
    else if (status === 'former_patron') out.formerPatron += 1;
    else if (status === 'declined_patron') out.declinedPatron += 1;
    else out.freeMember += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Q4 gate (operator-queue Q4, decided 2026-09-08; read 2026-09-22)
// ---------------------------------------------------------------------------

/**
 * The rule as written on 2026-09-08, before any reading: proceed to the tier
 * renames + $10 tier only if paid joins run at ≥ 17/month pace since the
 * anchor AND ≥ 1/3 of paid patrons have connected Patreon on the site (id
 * join); revert the perk copy if cancels run > 16/month pace. Constants live
 * here so the pre-read, the read and the tests all import the same numbers.
 */
export const Q4_GATE = {
  readDate: '2026-09-22',
  anchor: E40_ANCHOR,
  joinsPerMonthMin: 17,
  connectedShareMin: 1 / 3,
  cancelsPerMonthMax: 16,
  /** mean Gregorian month, used to turn "N in D days" into a monthly pace */
  daysPerMonth: 30.44,
} as const;

export interface Q4GateInput {
  now: Date;
  anchor?: string;
  paid: number;
  joinsSinceAnchor: number;
  cancelsSinceAnchor: number;
  paidAndConnectedById: number;
}

export interface Q4GateDecision {
  daysSinceAnchor: number;
  joinsPerMonthPace: number;
  joinsLeg: boolean;
  connectedShare: number;
  connectedLeg: boolean;
  cancelsPerMonthPace: number;
  revertCopy: boolean;
  decision: 'PROCEED' | 'HOLD' | 'REVERT_COPY';
}

/** Pure. `daysSinceAnchor` is floored at 1 so a same-day read never divides by zero. */
export function q4GateDecision(i: Q4GateInput): Q4GateDecision {
  const anchor = new Date(i.anchor ?? Q4_GATE.anchor).getTime();
  const days = Math.max(1, Math.round(((i.now.getTime() - anchor) / 864e5) * 10) / 10);
  const pace = (n: number) => Math.round((n / days) * Q4_GATE.daysPerMonth * 10) / 10;
  const joinsPerMonthPace = pace(i.joinsSinceAnchor);
  const cancelsPerMonthPace = pace(i.cancelsSinceAnchor);
  // Compare the leg on the exact ratio; the rounded share is for printing only
  // (18 of 54 is exactly 1/3 and must pass, 0.333 < 0.3333… would not).
  const shareExact = i.paid > 0 ? i.paidAndConnectedById / i.paid : 0;
  const connectedShare = Math.round(shareExact * 1000) / 1000;
  const joinsLeg = joinsPerMonthPace >= Q4_GATE.joinsPerMonthMin;
  const connectedLeg = i.paid > 0 && shareExact >= Q4_GATE.connectedShareMin;
  const revertCopy = cancelsPerMonthPace > Q4_GATE.cancelsPerMonthMax;
  const decision: Q4GateDecision['decision'] = revertCopy ? 'REVERT_COPY' : joinsLeg && connectedLeg ? 'PROCEED' : 'HOLD';
  return { daysSinceAnchor: days, joinsPerMonthPace, joinsLeg, connectedShare, connectedLeg, cancelsPerMonthPace, revertCopy, decision };
}

// ---------------------------------------------------------------------------
// E40 traffic leg — mean of daily distinct users over an explicit window
// ---------------------------------------------------------------------------

/** GA4 `date` dimension values are `YYYYMMDD`; the scoreboard keys by `YYYY-MM-DD`. */
export function ga4DateKey(yyyymmdd: string): string {
  const s = String(yyyymmdd ?? '').trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

/** Inclusive list of `YYYY-MM-DD` keys from start to end (UTC arithmetic; empty if end < start or either is malformed). */
export function dateKeysInclusive(start: string, end: string): string[] {
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return [];
  const out: string[] = [];
  for (let t = s; t <= e; t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export interface MeanDailyUsers {
  /** calendar days in the window (missing days count as 0 users) */
  days: number;
  /** sum of the per-day distinct-user counts */
  users: number;
  /** users ÷ days, 2dp; 0 when the window is empty */
  perDay: number;
  window: string;
}

/**
 * Mean of daily distinct users over an inclusive `YYYY-MM-DD` window. A day
 * with no row in `byDay` contributes 0 — a quiet day is a real zero, not a
 * missing observation. Pure; this is the arithmetic on BOTH sides of the E40
 * revert clause so the gate cannot compare a 7-day dedupe against a 4-day sum.
 */
export function meanDailyUsers(byDay: Record<string, number>, start: string, end: string): MeanDailyUsers {
  const keys = dateKeysInclusive(start, end);
  const users = keys.reduce((s, k) => s + (Number(byDay[k]) || 0), 0);
  const perDay = keys.length ? Math.round((users / keys.length) * 100) / 100 : 0;
  return { days: keys.length, users, perDay, window: `${start}→${end}` };
}
