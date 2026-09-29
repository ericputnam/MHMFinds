/**
 * A signed-in user's saved mods — backs /account/favorites/ (Rowan, E140).
 *
 * WHY: until 2026-09-29 favorites were write-only. The heart on a mod card
 * stored a `Favorite` row, but nothing on the site ever read them back for the
 * user: the Navbar heart was a <button> with no href and no handler, and there
 * was no favorites route. ~1,800 accounts had saved mods they could not see.
 * A save you can never return to is not a reason to come back; this page is
 * the "come back to your list" half of the favorites loop.
 *
 * Scoped by `userId` in the query itself — never by a client-supplied id — so
 * one account can never read another's list.
 */

import { prisma } from './prisma';
import { serializeMod } from './creators';
import type { Mod } from './api';

export { FAVORITES_PATH } from './favoritesPath';

/**
 * Hard cap on one render. On 2026-09-29, 859 accounts held 22,477 favorites
 * (median list 12); 10 lists exceed 200 (max 507). Those see their newest 200
 * and the true total in the header — pagination is the follow-up if they use it.
 */
export const FAVORITES_PAGE_SIZE = 200;

export interface UserFavorites {
  mods: Mod[];
  total: number;
}

export async function getUserFavoriteMods(userId: string): Promise<UserFavorites> {
  if (!userId) return { mods: [], total: 0 };

  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: FAVORITES_PAGE_SIZE,
      include: {
        mod: {
          include: {
            _count: { select: { reviews: true, favorites: true, downloads: true } },
            creator: true,
          },
        },
      },
    }),
    prisma.favorite.count({ where: { userId } }),
  ]);

  return {
    // Newest save first — the list reads as "what I was looking at last".
    mods: rows.filter((r) => r.mod).map((r) => serializeMod(r.mod)),
    total,
  };
}
