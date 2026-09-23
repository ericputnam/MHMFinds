/**
 * Pure math for the "long-range health" metrics. Kept separate from
 * scripts/agents/funnel-scoreboard.ts (which owns the I/O) so it can be unit
 * tested without GA4/Prisma. Exact fractions in, exact fractions out —
 * rounding only happens at the print site (dashboardMath.ts's formatters),
 * per the repo's "compare exact fractions at a gate boundary" rule.
 */

/** Owned-audience adds per 1,000 sessions over the same 7d window. Null when sessions are 0/unknown — never divide by zero into a fake number. */
export function captureRatePer1kSessions(ownedAdds7d: number | null, sessions7d: number | null): number | null {
  if (ownedAdds7d == null || sessions7d == null || sessions7d <= 0) return null;
  return (ownedAdds7d / sessions7d) * 1000;
}

export interface NonPinterestShareInput {
  /** GA4 byChannel7d-style map, channel key -> sessions. */
  channels: Record<string, number>;
  /** Sessions attributed to a `(not set)` source/medium or landing page — excluded from both sides of the adjusted share, per the E-charter's bot/tag-noise carve-out. */
  notSetSessions: number;
}

export interface NonPinterestShareResult {
  /** 1 - pinterest / total, no exclusions. Always computable when `channels` is non-empty. */
  raw: number | null;
  /** 1 - pinterest / (total - bing_organic - notSet). The charter's number; null if the adjusted denominator is <= 0. */
  adjusted: number | null;
}

/**
 * Share of sessions NOT attributed to Pinterest, both raw and with Bing
 * organic + `(not set)` excluded from numerator and denominator alike (per
 * targets.json's baseline notes flagging both as suspected bot/tag noise).
 * Excluding a bucket from the numerator only would inflate "non-Pinterest"
 * with exactly the noise the charter says to discard.
 */
export function nonPinterestShare(input: NonPinterestShareInput): NonPinterestShareResult {
  const { channels, notSetSessions } = input;
  const pinterest = channels.pinterest ?? 0;
  const bing = channels.bing_organic ?? 0;
  const total = Object.values(channels).reduce((sum, n) => sum + n, 0);

  const raw = total > 0 ? 1 - pinterest / total : null;

  const adjustedTotal = total - bing - Math.max(0, notSetSessions);
  const adjusted = adjustedTotal > 0 ? 1 - pinterest / adjustedTotal : null;

  return { raw, adjusted };
}
