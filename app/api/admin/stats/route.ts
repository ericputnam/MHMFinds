import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';

/**
 * GET /api/admin/stats
 * Get dashboard statistics for admin panel
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  const { user } = authResult;
  const { ipAddress, userAgent } = getRequestMetadata(request);

  try {
    // Fetch statistics in parallel
    const [
      totalMods,
      totalCreators,
      pendingSubmissions,
      totalUsers,
      totalDownloads,
      totalFavorites,
      averageRating,
      recentMods,
      waitlistCount,
    ] = await Promise.all([
      // Total published mods
      prisma.mod.count({
        where: {
          isVerified: true,
        },
      }),

      // Total creators
      prisma.creatorProfile.count(),

      // Pending submissions
      prisma.modSubmission.count({
        where: {
          status: 'pending',
        },
      }),

      // Total users
      prisma.user.count(),

      // Total downloads
      prisma.download.count(),

      // Total favorites
      prisma.favorite.count(),

      // Average rating
      prisma.mod.aggregate({
        _avg: {
          rating: true,
        },
        where: {
          rating: {
            not: null,
          },
        },
      }),

      // Recent mods (last 10)
      prisma.mod.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          downloadCount: true,
        },
      }),

      // Waitlist signups
      prisma.waitlist.count(),
    ]);

    // Log admin action
    await logAdminAction({
      userId: user.id,
      action: 'view_stats',
      resource: 'dashboard',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      totalMods,
      totalCreators,
      pendingSubmissions,
      totalUsers,
      totalDownloads,
      totalFavorites,
      averageRating: averageRating._avg.rating || 0,
      recentMods,
      waitlistCount,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
