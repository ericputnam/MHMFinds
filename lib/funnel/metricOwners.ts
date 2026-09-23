/**
 * Single source of truth for "which persona owns this metric" — shared by the
 * scoreboard (scripts/agents/funnel-scoreboard.ts, which writes it into each
 * day's JSON as `owners`) and the dashboard (app/admin/funnel/page.tsx, which
 * reads it to label every tile).
 *
 * `.claude/agents/mhm-funnel/targets.json` may carry its own `owners` map
 * (another agent's job) — callers should prefer that when present and fall
 * back to DEFAULT_METRIC_OWNERS otherwise, via `resolveMetricOwners()`, so
 * there is exactly one mapping in effect at a time, never two disagreeing
 * copies.
 */

/** Every metric key currently shown on /admin/funnel that needs an owner label. */
export const DEFAULT_METRIC_OWNERS: Record<string, string> = {
  // Headline / existing KPI tiles
  revenue: 'Rio',
  sessions: 'Pip',
  rpm: 'Rio',
  ownedAdds7d: 'Cass',
  pinterestSessions7d: 'Pip',
  nonAdMonthly: 'Rio',

  // Long-range health
  returningShare7d: 'Pip',
  nonPinterestShare7d: 'Pip',
  pagesPerSession7d: 'Sage',
  engagementRate7d: 'Sage',
  favorites7d: 'Cass',
  downloadClicks7d: 'Nova',
  newMods7d: 'Nova',
  catalogTotal: 'Nova',
  captureRatePer1k: 'Cass',
  creatorsOnboarded: 'Nova',
  creatorSubmissions7d: 'Nova',

  // Team health
  runSuccess14d: 'Ops',
  opsMergeShare7d: 'Ops',
  paperOnlyMerges7d: 'Ops',
  mergesByOwner7d: 'Quinn',
};

/** Shape targets.json's optional `owners` override may take. */
export interface TargetsOwnersSource {
  owners?: Record<string, string>;
}

/**
 * Merge targets.json's `owners` (if present) over the local default so the
 * dashboard and scoreboard never carry two independent copies of the map.
 * Tolerates a missing/partial override — any key it omits falls back to the
 * default rather than disappearing.
 */
export function resolveMetricOwners(targets: TargetsOwnersSource | null | undefined): Record<string, string> {
  const override = targets?.owners;
  if (!override || typeof override !== 'object') return { ...DEFAULT_METRIC_OWNERS };
  return { ...DEFAULT_METRIC_OWNERS, ...override };
}
