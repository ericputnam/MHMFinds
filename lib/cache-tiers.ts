/**
 * Prisma Accelerate Cache Tiers
 *
 * These cache strategies are used with Prisma Accelerate to reduce database load
 * and improve response times for frequently accessed data.
 *
 * Only works when DATABASE_URL starts with 'prisma://' (Accelerate connection)
 */

export const CACHE_TIERS = {
  // Real-time data - no cache
  NONE: undefined,

  // Hot data (mod listings, search) - 60s
  // Use for frequently changing data that can tolerate short staleness
  HOT: { ttl: 60, swr: 120 },

  // Warm data (facets, categories) - 5 min
  // Use for aggregated data that changes less frequently
  WARM: { ttl: 300, swr: 600 },

  // Cold data (creator profiles, static content) - 15 min
  // Use for data that rarely changes
  COLD: { ttl: 900, swr: 1800 },

  // Long-lived data (admin stats, analytics) - 1 hour
  // Use for expensive queries that don't need real-time accuracy
  LONG: { ttl: 3600, swr: 7200 },
} as const;

export type CacheTier = (typeof CACHE_TIERS)[keyof typeof CACHE_TIERS];

/**
 * Check if Prisma Accelerate is enabled (prisma:// or prisma+postgres:// URL)
 */
export function isAccelerateEnabled(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.startsWith('prisma://') || url.startsWith('prisma+postgres://');
}

/**
 * Get cache options for a query. Returns empty object if Accelerate is not enabled.
 * This allows the same code to work with or without Accelerate.
 *
 * Usage:
 * prisma.mod.findMany({
 *   where: { ... },
 *   ...getCacheOptions(CACHE_TIERS.HOT),
 * })
 */
export function getCacheOptions(tier: CacheTier): { cacheStrategy?: CacheTier } {
  if (!isAccelerateEnabled() || !tier) {
    return {};
  }
  return { cacheStrategy: tier };
}
