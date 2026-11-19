/**
 * The row set behind /sitemap-mods.xml, fetched in pages (E431, Pip, 2026-11-19).
 *
 * Prisma Accelerate caps a single query response at 5 MB. Selecting id plus
 * three dates for ~17.4k SFW verified mods fit (~1.7 MB); adding `thumbnail`
 * and `title` for the image sitemap did not — `next build` failed prerendering
 * the route with P6009 "response size 5.61MB". Paging keeps every response
 * under 1 MB and keeps the route insensitive to catalog growth.
 *
 * Selection mirrors scripts/agents/indexnow-submit.ts (isNSFW=false,
 * isVerified=true). `updatedAt` is never selected — see lib/seo/modLastmod.ts.
 */

import { prisma } from '../prisma';

/** Rows per Accelerate request; ~320 B each → ~0.65 MB a page, 9 pages today. */
export const SITEMAP_MODS_PAGE_SIZE = 2000;

export type SitemapModRow = {
  id: string;
  createdAt: Date;
  lastScraped: Date | null;
  publishedAt: Date | null;
  thumbnail: string | null;
  title: string;
};

export const SITEMAP_MODS_WHERE = { isNSFW: false, isVerified: true } as const;

export const SITEMAP_MODS_SELECT = {
  id: true,
  createdAt: true,
  lastScraped: true,
  publishedAt: true,
  thumbnail: true,
  title: true,
} as const;

/** Stable paging needs a total order: createdAt desc, then id. */
export const SITEMAP_MODS_ORDER_BY = [{ createdAt: 'desc' as const }, { id: 'asc' as const }];

/**
 * Every indexable mod, newest first. Reads page after page until a page
 * comes back short. Throws on a DB error: the route is prerendered at build
 * time, and a build that cannot read the catalog must fail, not ship an
 * empty sitemap.
 */
export async function listSitemapMods(
  pageSize: number = SITEMAP_MODS_PAGE_SIZE,
): Promise<SitemapModRow[]> {
  const out: SitemapModRow[] = [];
  for (let skip = 0; ; skip += pageSize) {
    const page = await prisma.mod.findMany({
      where: SITEMAP_MODS_WHERE,
      select: SITEMAP_MODS_SELECT,
      orderBy: SITEMAP_MODS_ORDER_BY,
      skip,
      take: pageSize,
    });
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}
