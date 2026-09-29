/**
 * `<lastmod>` for a `/mods/[id]/` sitemap entry (E136, 2026-09-29, Sage).
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
 * The honest date is the later of `createdAt` (the page came into
 * existence; content unchanged since) and `lastScraped` (set on 2,484 rows,
 * 276 of them re-scraped more than a day after creation — a real content
 * refresh). `publishedAt` is the upstream creator's date, not this page's.
 */

export interface ModLastmodInput {
  createdAt: Date | string;
  lastScraped?: Date | string | null;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v === null || v === undefined) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD of max(createdAt, lastScraped); falls back to createdAt when lastScraped is null or invalid. */
export function modLastmod(m: ModLastmodInput): string {
  const created = toDate(m.createdAt);
  const scraped = toDate(m.lastScraped);
  let best = created;
  if (scraped && (!best || scraped.getTime() > best.getTime())) best = scraped;
  if (!best) throw new Error('modLastmod: createdAt is not a valid date');
  return best.toISOString().slice(0, 10);
}
