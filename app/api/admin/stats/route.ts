import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all stats in parallel
    const [
      totalMods,
      totalCreators,
      pendingSubmissions,
      totalUsers,
      recentMods,
      favoriteStats,
      downloadStats,
    ] = await Promise.all([
      prisma.mod.count(),
      prisma.creatorProfile.count(),
      prisma.modSubmission.count({ where: { status: 'pending' } }),
      prisma.user.count(),
      prisma.mod.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          downloadCount: true,
        },
      }),
      prisma.favorite.count(),
      prisma.mod.aggregate({
        _sum: { downloadCount: true },
        _avg: { rating: true },
      }),
    ]);

    return NextResponse.json({
      totalMods,
      totalCreators,
      pendingSubmissions,
      totalUsers,
      totalDownloads: downloadStats._sum.downloadCount || 0,
      totalFavorites: favoriteStats,
      averageRating: downloadStats._avg.rating ? parseFloat(downloadStats._avg.rating.toString()) : 0,
      recentMods,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
