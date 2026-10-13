/**
 * The one content date for a `/mods/[id]/` page: its sitemap `<lastmod>`
 * (`app/sitemap-mods.xml/route.ts`) and its JSON-LD `dateModified`
 * (`components/ModJsonLd.tsx`) both come from here, so they cannot disagree.
 * E136 (2026-09-29) + E143 (2026-09-30) + E196 (2026-10-13), Sage.
 *
 * Why not `updatedAt`: `Mod.updatedAt` is a Prisma `@updatedAt` column, so
 * every counter write (`downloadCount: { increment: 1 }` in the analytics
 * track route and the subscription service, retag scripts, facet passes)
 * bumps it. Measured 2026-09-29 on the 16,524 sitemap-eligible rows:
 * 685 "updated" in the last 24 h with 0 created, 3,377 in 7 d vs 50 created,
 * 6,070 in 28 d vs 673 created. A sitemap that claims 37 % of its 16.5K
 * URLs changed in a month on a catalog that grew 4 % is a lastmod Google
 * learns to ignore — and then the 50 genuinely new pages a week lose the
 * one crawl-priority signal a sitemap can give them. E37 (2026-09-12) made
 * the same call for the collection sitemap (`lib/sitemapLastmod.ts`); this
 * closes the class on the mod sitemap.
 *
 * The honest date is the latest of `createdAt` (the page came into
 * existence; content unchanged since), `lastScraped` (set on 2,484 rows,
 * 276 of them re-scraped more than a day after creation — a real content
 * refresh) and `publishedAt`.
 *
 * Why `publishedAt` is a floor (E196): JSON-LD `dateModified` must never
 * precede `datePublished`, and `datePublished` is `publishedAt`, so
 * `ModJsonLd` already floored at it while the sitemap did not. Measured
 * 2026-10-13 on the 16,796 sitemap-eligible rows: 7,076 have
 * `publishedAt > createdAt` (a late-January 2026 backfill, up to ~2 months
 * later) and on 6,894 of them (41 %) the two surfaces disagreed by calendar
 * day. 0 rows have a future `publishedAt`, and the floor leaves the
 * lastmod-within-28-days count at 405 → 405, so the E136 freshness signal
 * is untouched; only old entries move, and only forward.
 */

export interface ModLastmodInput {
  createdAt: Date | string;
  lastScraped?: Date | string | null;
  publishedAt?: Date | string | null;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v === null || v === undefined) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * YYYY-MM-DD of max(createdAt, lastScraped, publishedAt); a null or invalid
 * lastScraped / publishedAt is ignored, an invalid createdAt throws.
 */
export function modLastmod(m: ModLastmodInput): string {
  const created = toDate(m.createdAt);
  if (!created) throw new Error('modLastmod: createdAt is not a valid date');
  let best = created;
  for (const candidate of [toDate(m.lastScraped), toDate(m.publishedAt)]) {
    if (candidate && candidate.getTime() > best.getTime()) best = candidate;
  }
  return best.toISOString().slice(0, 10);
}
