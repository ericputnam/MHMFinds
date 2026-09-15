/**
 * Affiliate placement kill switch — E55 (Rio, 2026-09-15).
 *
 * Why this exists: the affiliate program has produced $0 of commissions on
 * 1,211 tracked clicks since 2026-01-26 (`AffiliateEarning` has 0 rows; the
 * Impact sync runs healthy and creates nothing). The pre-committed E13 rule
 * was "hold all placements to 2026-09-15, then cut on EPC" — EPC is $0.00 on
 * 67 clicks/30d, so the two sibling-of-`.mv-ads` blocks are switched off here
 * without deleting the components, the API routes, or the click tracking.
 *
 * Placements (`AffiliateClickContext['sourceType']`):
 *   grid          AffiliateCard cells inside the ModGrid `.mv-ads` container
 *                 (homepage, /games/[game]). Left ON by default: those cells
 *                 are CHILDREN of the grid's `.mv-ads` element on the site's
 *                 largest earning page, so removing them shortens the grid
 *                 and can shift Mediavine's in-content injection gaps. That
 *                 flip needs a homepage page-RPM before-snapshot and a 7-day
 *                 watch (charter non-negotiable 1) — it is a separate call.
 *   mod_page      "Complete the Look" block on /mods/[id] — sibling of the
 *                 sidebar `.mv-ads` wrapper, above `aside#secondary`. OFF.
 *   interstitial  same block on /go/[modId] — sibling of the content-hub
 *                 `.mv-ads` wrapper. OFF.
 *   sidebar       reserved in the click schema; no live mount. OFF.
 *
 * Override (values live in `.env.local` / Vercel only, never in git):
 *   NEXT_PUBLIC_AFFILIATE_PLACEMENTS  comma-separated list of the placements
 *                                     that should render, e.g. "grid" or
 *                                     "grid,mod_page,interstitial". "none"
 *                                     (or "") turns every placement off.
 *                                     Unset → the defaults above.
 *
 * Rollback of E55 is one line: change `mod_page`/`interstitial` back to
 * `true` in DEFAULT_PLACEMENTS (or set the env var to
 * "grid,mod_page,interstitial" and redeploy).
 *
 * Next.js inlines `NEXT_PUBLIC_*` into client bundles ONLY when the variable
 * is referenced literally as `process.env.NEXT_PUBLIC_…` (the membership flag
 * shipped dark for 22h on 2026-09-07 because it was read via a computed key —
 * see lib/membership.ts). The default path below MUST stay a literal read;
 * the injected `value` argument exists only for tests.
 *
 * Pure module: no Prisma, no fetch, safe to import from client components.
 */

import type { AffiliateClickContext } from '@/lib/affiliateClick';

export type AffiliatePlacement = AffiliateClickContext['sourceType'];

export const AFFILIATE_PLACEMENTS_FLAG = 'NEXT_PUBLIC_AFFILIATE_PLACEMENTS';

export const ALL_AFFILIATE_PLACEMENTS: readonly AffiliatePlacement[] = [
  'grid',
  'mod_page',
  'interstitial',
  'sidebar',
] as const;

/** E55 defaults — see the header comment before changing any of these. */
export const DEFAULT_PLACEMENTS: Readonly<Record<AffiliatePlacement, boolean>> = {
  grid: true,
  mod_page: false,
  interstitial: false,
  sidebar: false,
};

function isPlacement(value: string): value is AffiliatePlacement {
  return (ALL_AFFILIATE_PLACEMENTS as readonly string[]).includes(value);
}

/**
 * Parse the override value. `undefined` → defaults. Anything else is an
 * explicit allow-list: unknown tokens are ignored, "none"/"" → nothing on.
 */
export function parseAffiliatePlacements(
  value: string | undefined,
): Readonly<Record<AffiliatePlacement, boolean>> {
  if (value === undefined) return DEFAULT_PLACEMENTS;
  const enabled = new Set(
    value
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s !== 'none')
      .filter(isPlacement),
  );
  const out = {} as Record<AffiliatePlacement, boolean>;
  for (const p of ALL_AFFILIATE_PLACEMENTS) out[p] = enabled.has(p);
  return out;
}

/**
 * Should this placement render (and fetch its offers)?
 *
 * No-arg call reads the literal `process.env.NEXT_PUBLIC_AFFILIATE_PLACEMENTS`
 * so the browser bundle sees the same answer as the server.
 */
export function isAffiliatePlacementEnabled(
  placement: AffiliatePlacement,
  value?: string | undefined,
): boolean {
  const raw =
    arguments.length >= 2 ? value : process.env.NEXT_PUBLIC_AFFILIATE_PLACEMENTS;
  return parseAffiliatePlacements(raw)[placement] === true;
}
