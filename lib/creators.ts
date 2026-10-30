/**
 * Creator pages — /creator/[slug]/ (Nova, E85, 2026-09-23)
 *
 * A public landing page per creator, built from data the catalog already
 * holds: `Mod.author` is a free-text string parsed by the scraper, so the
 * same creator appears under several spellings ("Ravasheen" 41 rows,
 * "RAVASHEEN" 12; "LittleMsSam" 27, "Littlemssam" 5, "littlemssam" 1 on
 * 2026-09-23). The page is keyed by a normalised slug so every spelling
 * lands on one URL, and the display name is the spelling with the most
 * mods.
 *
 * Why this exists: creator-name searches already reach the site — the
 * "nekoswirl" cluster alone is 69 GSC clicks/28d (to 2026-09-20) landing
 * on a single mod page — and the blog's /sims-4-cc-creators/ article is a
 * 1,314-session/28d landing page. There was no catalog surface for a
 * creator name. No file hosting, no agreements: this is the profile +
 * attribution layer recommended in reports/funnel/triage/2026-09-21-creator-hosting.md.
 *
 * Population (2026-09-23, SFW rows): 6,597 distinct slugs; 894 with >=3
 * mods, 542 with >=5, 273 with >=10. MIN_MODS_FOR_PAGE = 5 keeps thin
 * pages out of the index and yields ~540 pages.
 */

import { prisma } from './prisma';
import type { Mod } from './api';
import {
  authorSlug,
  canonicalCreatorSlug,
  creatorHref,
  creatorKey,
  creatorRedirectSlug,
  isJunkAuthorSlug,
  isNonCreatorSlug,
} from './creatorSlug';
import { pageProfileFrom } from './creatorClaim';

export { authorSlug, creatorHref, creatorKey, isJunkAuthorSlug, isNonCreatorSlug };

/** An unclaimed creator page needs at least this many SFW mods, else 404 (see creatorPageGate). */
export const MIN_MODS_FOR_PAGE = 5;

/** First page of mods rendered server-side (same size as collection pages). */
export const CREATOR_PAGE_SIZE = 48;

/**
 * One row of the creator population. Shared by /sitemap-creators.xml and
 * IndexNow --creators (E95: slug + latest) and by the /creator/ hub (E97:
 * displayName + downloads). One row type, one query — PR #167 and PR #168
 * each added their own `listCreators` on the same day and the squash of
 * both broke `main` (2026-09-24 10:03 incident); `lib-duplicate-exports`
 * now fails CI on any repeated export name.
 */
export interface CreatorListRow {
  slug: string;
  /** The most-used spelling of the author string. */
  displayName: string;
  mods: number;
  /** Sum of download clicks recorded on this site. */
  downloads: number;
  /** createdAt of the creator's newest SFW mod; null only if the DB returns none. */
  latest: Date | null;
}

/**
 * Every creator slug that gets a page, most mods first — the single source
 * of truth for "which /creator/[slug]/ URLs exist". Consumed by
 * /sitemap-creators.xml and by scripts/agents/indexnow-submit.ts --creators
 * (E95, 2026-09-24) so a search engine is never handed a URL the sitemap
 * would not list. Junk author slugs are filtered here, once. The
 * platform/aggregator names in NON_CREATOR_SLUGS are NOT filtered here —
 * their leaves still render (E85's population is unchanged until its read);
 * the hub drops them via listHubCreators().
 *
 * Throws on a DB error: each caller decides how to degrade (the sitemap
 * serves an empty urlset; the submit script exits 2 could-not-run; the hub
 * renders its shell with an empty list).
 */
export async function listCreators(): Promise<CreatorListRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{ slug: string; author: string; mods: number; downloads: number; latest: Date | null }>
  >`
    WITH per_author AS (
      -- E293: grouped by the separator-free creator key (lib/creatorSlug.ts
      -- creatorKey), so "Sixam CC" and "SixamCC" are one creator.
      SELECT regexp_replace(lower(author), '[^a-z0-9]+', '', 'g') AS ckey,
             author,
             COUNT(*)::int AS n,
             COALESCE(SUM("downloadCount"), 0)::int AS dl,
             MAX("createdAt") AS latest
      FROM mods
      WHERE author IS NOT NULL AND "isNSFW" = false
      GROUP BY 1, 2
    ),
    per_key AS (
      SELECT ckey, SUM(n)::int AS mods, SUM(dl)::int AS downloads, MAX(latest) AS latest
      FROM per_author
      GROUP BY ckey
      HAVING SUM(n) >= ${MIN_MODS_FOR_PAGE}
    ),
    names AS (
      -- Same order as findAuthorVariants: most-used spelling, ties by author.
      SELECT DISTINCT ON (ckey) ckey, author
      FROM per_author
      ORDER BY ckey, n DESC, author ASC
    ),
    slugs AS (
      -- Canonical URL: the dash-slug carrying the most mods, ties by slug
      -- (lib/creatorSlug.ts canonicalCreatorSlug — keep in lock-step).
      SELECT DISTINCT ON (ckey) ckey, slug
      FROM (
        SELECT ckey, trim(both '-' from lower(regexp_replace(author, '[^A-Za-z0-9]+', '-', 'g'))) AS slug, SUM(n) AS sn
        FROM per_author
        GROUP BY 1, 2
      ) x
      ORDER BY ckey, sn DESC, slug COLLATE "C" ASC
    )
    SELECT g.slug, n.author, s.mods, s.downloads, s.latest
    FROM per_key s
    JOIN names n USING (ckey)
    JOIN slugs g USING (ckey)
    WHERE s.ckey <> ''
    ORDER BY s.mods DESC, g.slug ASC
  `;
  return rows
    .filter((r) => !isJunkAuthorSlug(r.slug))
    .map((r) => ({
      slug: r.slug,
      displayName: r.author.trim(),
      mods: Number(r.mods),
      downloads: Number(r.downloads),
      latest: r.latest,
    }));
}

/**
 * The /creator/ hub's population (Nova, E97, 2026-09-24): listCreators()
 * minus the platform/aggregator "authors" in NON_CREATOR_SLUGS (simsfinds,
 * amazon, simfileshare, curseforge-creator, …). Crawler surface: degrades
 * to [] on a DB error so the hub still renders its shell and ad anchors
 * with a 200, never a 500.
 */
export async function listHubCreators(): Promise<CreatorListRow[]> {
  try {
    const rows = await listCreators();
    return rows.filter((r) => !isNonCreatorSlug(r.slug));
  } catch (error) {
    console.error('[creators] listHubCreators query failed, serving empty list:', error);
    return [];
  }
}

export interface AuthorVariant {
  author: string;
  mods: number;
}

/**
 * Every stored spelling of `author` that normalises to `slug`, with its
 * SFW mod count, most-used spelling first. Empty array = no such creator.
 */
export async function findAuthorVariants(slug: string): Promise<AuthorVariant[]> {
  if (isJunkAuthorSlug(slug)) return [];
  const rows = await prisma.$queryRaw<Array<{ author: string; mods: number }>>`
    SELECT author, COUNT(*)::int AS mods
    FROM mods
    WHERE author IS NOT NULL
      AND "isNSFW" = false
      AND regexp_replace(lower(author), '[^a-z0-9]+', '', 'g') = ${creatorKey(slug)}
    GROUP BY author
    ORDER BY COUNT(*) DESC, author ASC
  `;
  return rows.map((r) => ({ author: r.author, mods: Number(r.mods) }));
}

export interface CreatorPageData {
  slug: string;
  displayName: string;
  variants: AuthorVariant[];
  totalMods: number;
  totalDownloads: number;
  mods: Mod[];
  /** From CreatorProfile when a handle matches the slug; else null. */
  profile: { website: string | null; isVerified: boolean; bio: string | null } | null;
  /** False for a claimed creator below MIN_MODS_FOR_PAGE: the page renders with noindex. */
  indexable: boolean;
  /**
   * E293: the canonical slug when this URL is a non-canonical spelling of a
   * folded creator ("sixamcc" → "sixam-cc"); the page 308s there. Null = serve.
   */
  redirectTo: string | null;
}

/**
 * Whether a slug gets a page, and whether search engines should index it
 * (E-creator-onboarding, 2026-10-18). Pure so it is unit-tested offline.
 *
 * - Catalog creators: MIN_MODS_FOR_PAGE SFW mods, indexable (unchanged).
 * - Claimed creators (an admin-promoted, verified, real-account
 *   CreatorProfile whose handle is the slug): a page from their first mod,
 *   so a creator who joins with 1 mod is not sent to a 404 — but noindex
 *   until they reach MIN_MODS_FOR_PAGE, so thin pages stay out of the index
 *   and the sitemap (listCreators) is unchanged.
 */
export function creatorPageGate(totalMods: number, claimed: boolean): { render: boolean; indexable: boolean } {
  const indexable = totalMods >= MIN_MODS_FOR_PAGE;
  return { render: indexable || (claimed && totalMods >= 1), indexable };
}

/**
 * Load everything the creator page renders. Returns null when the slug is
 * junk or creatorPageGate() says no page.
 */
export async function getCreatorPageData(slug: string): Promise<CreatorPageData | null> {
  if (isJunkAuthorSlug(slug)) return null;
  const [variants, profile] = await Promise.all([
    findAuthorVariants(slug),
    prisma.creatorProfile.findUnique({
      where: { handle: slug },
      // user.email is read only to tell a placeholder (seed/aggregator)
      // profile from a claimed one; pageProfileFrom() drops it (E158).
      select: {
        id: true,
        website: true,
        isVerified: true,
        bio: true,
        user: { select: { email: true } },
      },
    }),
  ]);
  const pageProfile = pageProfileFrom(profile);
  const claimed = Boolean(profile && pageProfile?.isVerified);
  if (variants.length === 0 && !claimed) return null;

  // E293: one creator, one page. A spelling that folds into another creator
  // key's most-used slug redirects there (before any further query).
  const redirectTo = creatorRedirectSlug(slug, canonicalCreatorSlug(variants, slug), Boolean(profile));

  const authors = variants.map((v) => v.author);
  // A claimed creator's page also carries mods linked to their profile
  // (Mod.creatorId) — approved submissions — whatever author string they hold.
  const where = claimed
    ? { isNSFW: false, OR: [{ author: { in: authors } }, { creatorId: profile!.id }] }
    : { author: { in: authors }, isNSFW: false };

  const totalMods = claimed ? await prisma.mod.count({ where }) : variants.reduce((n, v) => n + v.mods, 0);
  const gate = creatorPageGate(totalMods, claimed);
  if (!gate.render) return null;

  const [rawMods, downloadAgg] = await Promise.all([
    prisma.mod.findMany({
      where,
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      take: CREATOR_PAGE_SIZE,
      include: {
        _count: { select: { reviews: true, favorites: true, downloads: true } },
        creator: true,
      },
    }),
    prisma.mod.aggregate({ where, _sum: { downloadCount: true } }),
  ]);

  const displayName = (variants[0]?.author ?? slug).trim();
  return {
    slug,
    displayName,
    variants,
    totalMods,
    totalDownloads: downloadAgg._sum.downloadCount ?? 0,
    mods: rawMods.map(serializeMod),
    profile: pageProfileFrom(profile),
    indexable: gate.indexable,
    redirectTo,
  };
}

/**
 * Prisma → client-safe Mod (Decimal/Date do not cross the RSC boundary).
 * Same shape as the collection page serializer.
 */
export function serializeMod(m: any): Mod {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    shortDescription: m.shortDescription,
    version: m.version,
    gameVersion: m.gameVersion,
    category: m.category ?? '',
    tags: m.tags ?? [],
    contentType: m.contentType,
    visualStyle: m.visualStyle,
    themes: m.themes ?? [],
    ageGroups: m.ageGroups ?? [],
    genderOptions: m.genderOptions ?? [],
    occultTypes: m.occultTypes ?? [],
    packRequirements: m.packRequirements ?? [],
    thumbnail: m.thumbnail,
    images: m.images ?? [],
    downloadUrl: m.downloadUrl,
    sourceUrl: m.sourceUrl,
    source: m.source ?? '',
    sourceId: m.sourceId,
    author: m.author,
    isFree: m.isFree,
    price: m.price ? String(m.price) : null,
    currency: m.currency,
    isNSFW: m.isNSFW,
    isVerified: m.isVerified,
    isFeatured: m.isFeatured,
    downloadCount: m.downloadCount ?? 0,
    viewCount: m.viewCount ?? 0,
    rating: m.rating ? Number(m.rating) : null,
    ratingCount: m.ratingCount ?? 0,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
    updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
    publishedAt: m.publishedAt?.toISOString?.() ?? m.publishedAt ?? null,
    lastScraped: m.lastScraped?.toISOString?.() ?? m.lastScraped ?? null,
    creatorId: m.creatorId,
    creator: m.creator
      ? { id: m.creator.id, handle: m.creator.handle, isVerified: m.creator.isVerified }
      : null,
    _count: {
      reviews: m._count?.reviews ?? 0,
      favorites: m._count?.favorites ?? 0,
      downloads: m._count?.downloads ?? 0,
    },
  } as Mod;
}
