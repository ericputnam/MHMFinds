import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch creators with aggregated stats
    const creators = await prisma.creatorProfile.findMany({
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            displayName: true,
            avatar: true,
          },
        },
        mods: {
          select: {
            id: true,
            downloadCount: true,
            rating: true,
            _count: {
              select: {
                favorites: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // We'll sort in memory after calculating favorites
      },
    });

    // Calculate stats and format response
    const creatorsWithStats = creators
      .map((creator) => {
        const totalFavorites = creator.mods.reduce(
          (sum, mod) => sum + mod._count.favorites,
          0
        );
        const totalDownloads = creator.mods.reduce(
          (sum, mod) => sum + mod.downloadCount,
          0
        );
        const ratingsSum = creator.mods.reduce(
          (sum, mod) => sum + (mod.rating ? parseFloat(mod.rating.toString()) : 0),
          0
        );
        const ratingsCount = creator.mods.filter((mod) => mod.rating).length;
        const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

        return {
          id: creator.id,
          name: creator.user.displayName || creator.handle,
          handle: creator.handle,
          bio: creator.bio,
          avatar: creator.user.avatar,
          website: creator.website,
          isVerified: creator.isVerified,
          modCount: creator.mods.length,
          totalFavorites,
          totalDownloads,
          averageRating,
        };
      })
      // Sort by total favorites (descending), then by mod count
      .sort((a, b) => {
        if (b.totalFavorites !== a.totalFavorites) {
          return b.totalFavorites - a.totalFavorites;
        }
        return b.modCount - a.modCount;
      });

    return NextResponse.json(
      {
        success: true,
        creators: creatorsWithStats,
        total: creatorsWithStats.length,
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
