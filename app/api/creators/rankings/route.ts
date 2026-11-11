import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creators/rankings — creators ranked by total favorites, then mod count.
 *
 * Ranking happens BEFORE paging. This route used to `take` the first N profiles by
 * `createdAt` and sort only those in memory, so /top-creators showed the 50 oldest
 * profiles in favorites order rather than the top 50. It also loaded every mod row of
 * every creator; now it reads three light columns per creator-linked mod, ranks, and
 * fetches profile details only for the page being returned.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

    const [profiles, mods] = await Promise.all([
      prisma.creatorProfile.findMany({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mod.findMany({
        where: { creatorId: { not: null } },
        select: {
          creatorId: true,
          downloadCount: true,
          rating: true,
          _count: { select: { favorites: true } },
        },
      }),
    ]);

    type Stats = {
      modCount: number;
      totalFavorites: number;
      totalDownloads: number;
      ratingsSum: number;
      ratingsCount: number;
    };
    const stats = new Map<string, Stats>();
    for (const p of profiles) {
      stats.set(p.id, { modCount: 0, totalFavorites: 0, totalDownloads: 0, ratingsSum: 0, ratingsCount: 0 });
    }
    for (const mod of mods) {
      const s = mod.creatorId ? stats.get(mod.creatorId) : undefined;
      if (!s) continue;
      s.modCount += 1;
      s.totalFavorites += mod._count.favorites;
      s.totalDownloads += mod.downloadCount;
      if (mod.rating) {
        s.ratingsSum += parseFloat(mod.rating.toString());
        s.ratingsCount += 1;
      }
    }

    // profiles is createdAt-ascending and Array.prototype.sort is stable, so ties keep
    // the oldest profile first — a deterministic order across pages.
    const ranked = profiles
      .map((p) => ({ id: p.id, ...stats.get(p.id)! }))
      .sort((a, b) =>
        b.totalFavorites !== a.totalFavorites ? b.totalFavorites - a.totalFavorites : b.modCount - a.modCount,
      );

    const page = ranked.slice(offset, offset + limit);
    const details = await prisma.creatorProfile.findMany({
      where: { id: { in: page.map((r) => r.id) } },
      include: { user: { select: { displayName: true, avatar: true } } },
    });
    const byId = new Map(details.map((d) => [d.id, d]));

    const creators = page.flatMap((r) => {
      const creator = byId.get(r.id);
      if (!creator) return [];
      return [
        {
          id: creator.id,
          name: creator.user.displayName || creator.handle,
          handle: creator.handle,
          bio: creator.bio,
          avatar: creator.user.avatar,
          website: creator.website,
          isVerified: creator.isVerified,
          modCount: r.modCount,
          totalFavorites: r.totalFavorites,
          totalDownloads: r.totalDownloads,
          averageRating: r.ratingsCount > 0 ? r.ratingsSum / r.ratingsCount : 0,
        },
      ];
    });

    return NextResponse.json(
      {
        success: true,
        creators,
        total: creators.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching creators rankings:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch creators rankings',
        creators: [],
      },
      { status: 500 }
    );
  }
}
