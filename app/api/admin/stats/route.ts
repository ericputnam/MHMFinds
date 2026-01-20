import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { CACHE_TIERS, getCacheOptions } from '@/lib/cache-tiers';

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

  // Default empty response structure
  const emptyResponse = {
    totalMods: 0,
    totalCreators: 0,
    pendingSubmissions: 0,
    totalUsers: 0,
    totalDownloads: 0,
    totalFavorites: 0,
    averageRating: 0,
    recentMods: [],
    waitlistCount: 0,
    _warning: undefined as string | undefined,
  };

  let statsData;
  try {
    // Fetch statistics in parallel with Accelerate caching (1 hour TTL for admin stats)
    // cacheStrategy is only applied when Accelerate extension is enabled (prisma:// URL)
    const longCache = getCacheOptions(CACHE_TIERS.LONG);
    const warmCache = getCacheOptions(CACHE_TIERS.WARM);

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
        where: { isVerified: true },
        ...longCache,
      } as any),

      // Total creators
      prisma.creatorProfile.count(longCache as any),

      // Pending submissions (no cache - needs real-time accuracy)
      prisma.modSubmission.count({
        where: { status: 'pending' },
      }),

      // Total users
      prisma.user.count(longCache as any),

      // Total downloads
      prisma.download.count(longCache as any),

      // Total favorites
      prisma.favorite.count(longCache as any),

      // Average rating
      prisma.mod.aggregate({
        _avg: { rating: true },
        where: { rating: { not: null } },
        ...longCache,
      } as any),

      // Recent mods (last 10) - shorter cache since these change more often
      prisma.mod.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          downloadCount: true,
        },
        ...warmCache,
      } as any),

      // Waitlist signups
      prisma.waitlist.count(longCache as any),
    ]);

    statsData = {
      totalMods,
      totalCreators,
      pendingSubmissions,
      totalUsers,
      totalDownloads,
      totalFavorites,
      averageRating,
      recentMods,
      waitlistCount,
    };
  } catch (error) {
    console.error('Failed to fetch admin stats, returning empty response:', error);
    // Return empty data instead of 500 - page will show "no data" state
    emptyResponse._warning = 'Stats data temporarily unavailable';
    return NextResponse.json(emptyResponse);
  }

  // Log admin action (fire-and-forget - don't let logging failures affect response)
  logAdminAction({
    userId: user.id,
    action: 'view_stats',
    resource: 'dashboard',
    ipAddress,
    userAgent,
  }).catch((error) => {
    console.error('Failed to log admin action:', error);
  });

  return NextResponse.json({
    totalMods: statsData.totalMods,
    totalCreators: statsData.totalCreators,
    pendingSubmissions: statsData.pendingSubmissions,
    totalUsers: statsData.totalUsers,
    totalDownloads: statsData.totalDownloads,
    totalFavorites: statsData.totalFavorites,
    averageRating: statsData.averageRating?._avg?.rating || 0,
    recentMods: statsData.recentMods,
    waitlistCount: statsData.waitlistCount,
  });
}
