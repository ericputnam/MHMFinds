/**
 * "More from <creator>" on /mods/[id] — server-resolved (Nova, E106, 2026-09-25).
 *
 * Until E106 the block was a client `useEffect` fetch to
 * /api/mods/[id]/creator: its six mod links never appeared in the server
 * HTML, it matched the *exact* author string (so "Ravasheen" 41 rows and
 * "RAVASHEEN" 12 rows never saw each other), and it never linked to the
 * creator's own page. That left the author-name link as the only crawlable
 * path from 16.5K mod pages to the 534 /creator/[slug]/ pages (E85/E97).
 *
 * This loader runs in the mod page's server render (ISR, revalidate 3600)
 * and returns plain data the presentational component prints as real
 * <a href> links on first paint. Population on 2026-09-25 (SFW rows):
 * 8,404 mods belong to a creator with >=5 mods (block + "See all" link),
 * 2,290 to a creator with 2-4 mods (block only), 5,147 are the creator's
 * only mod (no block). The slug-fold variant query costs ~90 ms unindexed;
 * under a 1 h ISR that is a rounding error, but it MUST degrade to null on
 * any error — the mod page never 500s because of a sidebar block.
 *
 * Lives in its own file, not lib/creators.ts, so a second agent's same-day
 * edit to that file cannot collide (the #167 x #168 double-`listCreators`
 * squash broke `main` on 2026-09-24).
 */

import { prisma } from './prisma';
import { MIN_MODS_FOR_PAGE, findAuthorVariants } from './creators';
import { authorSlug, creatorHref, isJunkAuthorSlug } from './creatorSlug';

/** How many sibling mods the block shows. Same as the old API's `take`. */
export const MORE_FROM_CREATOR_LIMIT = 6;

export interface CreatorModCard {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string;
  gameVersion: string | null;
  isFree: boolean;
  price: string | null;
  rating: number | null;
}

export interface MoreFromCreatorData {
  /** Most-used spelling of the author string (what the heading prints). */
  displayName: string;
  /** Total SFW mods across every spelling, including the current one. */
  totalMods: number;
  /** `/creator/<slug>/` when the creator clears MIN_MODS_FOR_PAGE, else null (that page would 404). */
  creatorHref: string | null;
  mods: CreatorModCard[];
}

/**
 * Pure: decide whether a creator page link may be printed. Mirrors the
 * 404 rule in lib/creators.ts getCreatorPageData so the mod page never
 * links to a creator URL that does not exist.
 */
export function creatorHrefFor(author: string | null | undefined, totalMods: number): string | null {
  if (!author) return null;
  const slug = authorSlug(author);
  if (isJunkAuthorSlug(slug)) return null;
  if (totalMods < MIN_MODS_FOR_PAGE) return null;
  return creatorHref(slug);
}

function toCard(m: {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string | null;
  gameVersion: string | null;
  isFree: boolean;
  price: unknown;
  rating: unknown;
}): CreatorModCard {
  return {
    id: m.id,
    title: m.title,
    thumbnail: m.thumbnail,
    category: m.category ?? '',
    gameVersion: m.gameVersion,
    isFree: m.isFree,
    price: m.price == null ? null : String(m.price),
    rating: m.rating == null ? null : Number(m.rating),
  };
}

/**
 * Other SFW mods by the same creator (every spelling folded by slug),
 * most-downloaded first, plus the creator page href when one exists.
 * Returns null when there is nothing to show (no author, junk author with
 * no siblings, or a single-mod creator) or on any DB error.
 */
export async function getMoreFromCreator(
  modId: string,
  author: string | null | undefined,
  limit: number = MORE_FROM_CREATOR_LIMIT,
): Promise<MoreFromCreatorData | null> {
  if (!author) return null;
  try {
    const slug = authorSlug(author);
    let authors: string[];
    let totalMods: number;
    let displayName: string;

    if (isJunkAuthorSlug(slug)) {
      // Scraper-fallback strings ("Kobe Sweats 135179830") are not a creator;
      // still show exact-string siblings (the same post's files) but never
      // a creator link.
      authors = [author];
      totalMods = await prisma.mod.count({ where: { author, isNSFW: false } });
      displayName = author.trim();
    } else {
      const variants = await findAuthorVariants(slug);
      if (variants.length === 0) return null;
      authors = variants.map((v) => v.author);
      totalMods = variants.reduce((n, v) => n + v.mods, 0);
      displayName = variants[0].author.trim();
    }

    if (totalMods < 2) return null;

    const rows = await prisma.mod.findMany({
      where: { author: { in: authors }, isNSFW: false, id: { not: modId } },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        category: true,
        gameVersion: true,
        isFree: true,
        price: true,
        rating: true,
      },
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    if (rows.length === 0) return null;

    return {
      displayName,
      totalMods,
      creatorHref: creatorHrefFor(author, totalMods),
      mods: rows.map(toCard),
    };
  } catch (error) {
    console.error('[creatorMods] getMoreFromCreator failed, hiding block:', error);
    return null;
  }
}
