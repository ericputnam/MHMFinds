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
import { authorSlug, creatorHref, isJunkAuthorSlug } from './creatorSlug';

export { authorSlug, creatorHref, isJunkAuthorSlug };

/** A creator page needs at least this many SFW mods, else 404. */
export const MIN_MODS_FOR_PAGE = 5;

/** First page of mods rendered server-side (same size as collection pages). */
export const CREATOR_PAGE_SIZE = 48;

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
      AND trim(both '-' from lower(regexp_replace(author, '[^A-Za-z0-9]+', '-', 'g'))) = ${slug}
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
}

/**
 * Load everything the creator page renders. Returns null when the slug is
 * junk or the creator has fewer than MIN_MODS_FOR_PAGE SFW mods.
 */
export async function getCreatorPageData(slug: string): Promise<CreatorPageData | null> {
  const variants = await findAuthorVariants(slug);
  if (variants.length === 0) return null;
  const totalMods = variants.reduce((n, v) => n + v.mods, 0);
  if (totalMods < MIN_MODS_FOR_PAGE) return null;

  const authors = variants.map((v) => v.author);
  const where = { author: { in: authors }, isNSFW: false };

  const [rawMods, downloadAgg, profile] = await Promise.all([
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
    prisma.creatorProfile.findUnique({
      where: { handle: slug },
      select: { website: true, isVerified: true, bio: true },
    }),
  ]);

  return {
    slug,
    displayName: variants[0].author.trim(),
    variants,
    totalMods,
    totalDownloads: downloadAgg._sum.downloadCount ?? 0,
    mods: rawMods.map(serializeMod),
    profile: profile
      ? { website: profile.website, isVerified: profile.isVerified, bio: profile.bio }
      : null,
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
