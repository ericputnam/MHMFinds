/**
 * scripts/agents/patreon-members-lib.ts — pure aggregation over a Patreon
 * Members API page set. No network, no DB, no logging. The scoreboard
 * (`funnel-scoreboard.ts`) and the hand-run reads (`patreon-relaunch-read.ts`,
 * `patreon-churn-read.ts`) all answer the same three questions; this is the
 * one place the arithmetic lives so the E40 read (2026-09-19) and the Q4 gate
 * (2026-09-22) come off the daily scoreboard instead of a hand-run script.
 *
 * Privacy: `email` is accepted only so the caller can intersect with the set
 * of site accounts linked via Patreon OAuth. Nothing here returns an email,
 * name or id — only integers and dollar totals.
 */

export interface PatreonMemberAttrs {
  patron_status: string | null;
  pledge_relationship_start: string | null;
  last_charge_date: string | null;
  currently_entitled_amount_cents: number | null;
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
  /** of the linked site accounts passed in, how many belong to a currently paying patron */
  paidAndConnected: number;
}

export const E40_ANCHOR = '2026-09-08T00:00:00Z';
export const PERK_TIER_CENTS = 300;
const WINDOW_DAYS = 7;

/** Lower-cased, trimmed; empty for null/blank. Never returned to a caller — used only for set membership. */
export function normalizeEmail(e: string | null | undefined): string {
  return (e ?? '').trim().toLowerCase();
}

export function summarizePatreonMembers(
  members: PatreonMemberAttrs[],
  linkedAccountEmails: Array<string | null | undefined>,
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

  const activeEmails = new Set(active.map((m) => normalizeEmail(m.email)).filter(Boolean));
  const paidAndConnected = linkedAccountEmails.filter((e) => {
    const n = normalizeEmail(e);
    return n !== '' && activeEmails.has(n);
  }).length;

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
  };
}

/** Sorted "8×$1, 42×$3" rendering for the markdown line. */
export function formatPaidByAmount(byAmount: Record<string, number>): string {
  return Object.entries(byAmount)
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([k, v]) => `${v}×${k}`)
    .join(', ');
}
