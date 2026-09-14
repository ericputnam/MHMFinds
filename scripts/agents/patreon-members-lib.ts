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
