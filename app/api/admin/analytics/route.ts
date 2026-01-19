import { NextRequest, NextResponse } from 'next/server';
import { prisma, cacheStrategies } from '@/lib/prisma';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { AnalyticsEventType } from '@prisma/client';

// Type for analytics data structure
interface AnalyticsDataType {
  totalPageViews: number;
  uniqueVisitors: { userId: string | null; sessionId: string | null }[];
  totalSearches: number;
  totalDownloadClicks: number;
  totalAdViews: number;
  totalAdClicks: number;
  averageTimeOnPage: { _avg: { timeOnPage: number | null } };
  averageScrollDepth: { _avg: { scrollDepth: number | null } };
  topSearchQueries: { searchQuery: string | null; _count: { searchQuery: number } }[];
  topPages: { page: string | null; _count: { page: number } }[];
  topMods: { modId: string | null; _count: { modId: number } }[];
  deviceBreakdown: { deviceType: string | null; _count: { deviceType: number } }[];
  browserBreakdown: { browser: string | null; _count: { browser: number } }[];
  recentEvents: {
    id: string;
    eventType: AnalyticsEventType;
    page: string | null;
    searchQuery: string | null;
    modId: string | null;
    deviceType: string | null;
    browser: string | null;
    createdAt: Date;
  }[];
}

/**
 * GET /api/admin/analytics
 * Get analytics dashboard data for admin panel
 * Requires admin authentication
 * Query params:
 *   - period: '24h' | '7d' | '30d' | '90d' (default: '7d')
 */
export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  const { user } = authResult;
  const { ipAddress, userAgent } = getRequestMetadata(request);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';

  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  switch (period) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  // Default empty response structure - used if queries fail
  const emptyResponse = {
    period,
    dateRange: {
      start: startDate.toISOString(),
      end: now.toISOString(),
    },
    overview: {
      totalPageViews: 0,
      uniqueVisitors: 0,
      totalSearches: 0,
      totalDownloadClicks: 0,
      totalAdViews: 0,
      totalAdClicks: 0,
      averageTimeOnPage: 0,
      averageScrollDepth: 0,
    },
    topSearchQueries: [],
    topPages: [],
    topMods: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    recentEvents: [],
    _warning: undefined as string | undefined,
  };

  // Fetch analytics with graceful degradation
  let analyticsData: AnalyticsDataType;
  try {
    const [
      totalPageViews,
      uniqueVisitors,
      totalSearches,
      totalDownloadClicks,
      totalAdViews,
      totalAdClicks,
      averageTimeOnPage,
      averageScrollDepth,
      topSearchQueries,
      topPages,
      topMods,
      deviceBreakdown,
      browserBreakdown,
      recentEvents,
    ] = await Promise.all([
      // Total page views
      prisma.analyticsEvent.count({
        where: {
          eventType: AnalyticsEventType.PAGE_VIEW,
          createdAt: { gte: startDate },
        },
      }),

      // Unique visitors (count distinct userId + sessionId)
      prisma.analyticsEvent.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          userId: true,
          sessionId: true,
        },
        distinct: ['userId', 'sessionId'],
      }),

      // Total searches
      prisma.analyticsEvent.count({
        where: {
          eventType: AnalyticsEventType.SEARCH,
          createdAt: { gte: startDate },
        },
      }),

      // Total download clicks
      prisma.analyticsEvent.count({
        where: {
          eventType: AnalyticsEventType.DOWNLOAD_CLICK,
          createdAt: { gte: startDate },
        },
      }),

      // Total ad views
      prisma.analyticsEvent.count({
        where: {
          eventType: AnalyticsEventType.AD_VIEW,
          createdAt: { gte: startDate },
        },
      }),

      // Total ad clicks
      prisma.analyticsEvent.count({
        where: {
          eventType: AnalyticsEventType.AD_CLICK,
          createdAt: { gte: startDate },
        },
      }),

      // Average time on page
      prisma.analyticsEvent.aggregate({
        where: {
          eventType: AnalyticsEventType.PAGE_VIEW,
          timeOnPage: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: {
          timeOnPage: true,
        },
      }),

      // Average scroll depth
      prisma.analyticsEvent.aggregate({
        where: {
          scrollDepth: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: {
          scrollDepth: true,
        },
      }),

      // Top search queries
      prisma.analyticsEvent.groupBy({
        by: ['searchQuery'],
        where: {
          eventType: AnalyticsEventType.SEARCH,
          searchQuery: { not: null },
          createdAt: { gte: startDate },
        },
        _count: {
          searchQuery: true,
        },
        orderBy: {
          _count: {
            searchQuery: 'desc',
          },
        },
        take: 10,
      }),

      // Top pages
      prisma.analyticsEvent.groupBy({
        by: ['page'],
        where: {
          eventType: AnalyticsEventType.PAGE_VIEW,
          page: { not: null },
          createdAt: { gte: startDate },
        },
        _count: {
          page: true,
        },
        orderBy: {
          _count: {
            page: 'desc',
          },
        },
        take: 10,
      }),

      // Top mods (most viewed/clicked)
      prisma.analyticsEvent.groupBy({
        by: ['modId'],
        where: {
          modId: { not: null },
          createdAt: { gte: startDate },
        },
        _count: {
          modId: true,
        },
        orderBy: {
          _count: {
            modId: 'desc',
          },
        },
        take: 10,
      }),

      // Device breakdown
      prisma.analyticsEvent.groupBy({
        by: ['deviceType'],
        where: {
          deviceType: { not: null },
          createdAt: { gte: startDate },
        },
        _count: {
          deviceType: true,
        },
      }),

      // Browser breakdown
      prisma.analyticsEvent.groupBy({
        by: ['browser'],
        where: {
          browser: { not: null },
          createdAt: { gte: startDate },
        },
        _count: {
          browser: true,
        },
        orderBy: {
          _count: {
            browser: 'desc',
          },
        },
        take: 5,
      }),

      // Recent events (last 50)
      prisma.analyticsEvent.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          eventType: true,
          page: true,
          searchQuery: true,
          modId: true,
          deviceType: true,
          browser: true,
          createdAt: true,
        },
      }),
    ]);

    analyticsData = {
      totalPageViews,
      uniqueVisitors,
      totalSearches,
      totalDownloadClicks,
      totalAdViews,
      totalAdClicks,
      averageTimeOnPage,
      averageScrollDepth,
      topSearchQueries: topSearchQueries as { searchQuery: string | null; _count: { searchQuery: number } }[],
      topPages: topPages as { page: string | null; _count: { page: number } }[],
      topMods: topMods as { modId: string | null; _count: { modId: number } }[],
      deviceBreakdown: deviceBreakdown as { deviceType: string | null; _count: { deviceType: number } }[],
      browserBreakdown: browserBreakdown as { browser: string | null; _count: { browser: number } }[],
      recentEvents,
    };
  } catch (error) {
    console.error('Failed to fetch analytics data, returning empty response:', error);
    // Return empty data instead of 500 - page will show "no data" state
    emptyResponse._warning = 'Analytics data temporarily unavailable';
    return NextResponse.json(emptyResponse);
  }

  // Get mod details for top mods (separate try-catch so main analytics still work)
  let topModsWithDetails: Array<{
    id: string;
    title: string;
    thumbnail: string | null;
    downloadCount: number;
    viewCount: number;
    analyticsCount: number;
  }> = [];

  try {
    const modIds = analyticsData.topMods.map((m) => m.modId).filter((id): id is string => id !== null);
    if (modIds.length > 0) {
      const modDetails = await prisma.mod.findMany({
        where: { id: { in: modIds } },
        select: {
          id: true,
          title: true,
          thumbnail: true,
          downloadCount: true,
          viewCount: true,
        },
      });

      topModsWithDetails = analyticsData.topMods
        .map((m) => {
          const mod = modDetails.find((d) => d.id === m.modId);
          return mod
            ? {
                ...mod,
                analyticsCount: m._count.modId,
              }
            : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
    }
  } catch (error) {
    console.error('Failed to fetch mod details for analytics:', error);
    // Continue without mod details - not critical
  }

  // Log admin action (fire-and-forget - don't let logging failures affect response)
  logAdminAction({
    userId: user.id,
    action: 'view_analytics',
    resource: 'analytics',
    ipAddress,
    userAgent,
  }).catch((error) => {
    console.error('Failed to log admin action:', error);
  });

  return NextResponse.json({
    period,
    dateRange: {
      start: startDate.toISOString(),
      end: now.toISOString(),
    },
    overview: {
      totalPageViews: analyticsData.totalPageViews,
      uniqueVisitors: analyticsData.uniqueVisitors.length,
      totalSearches: analyticsData.totalSearches,
      totalDownloadClicks: analyticsData.totalDownloadClicks,
      totalAdViews: analyticsData.totalAdViews,
      totalAdClicks: analyticsData.totalAdClicks,
      averageTimeOnPage: Math.round(analyticsData.averageTimeOnPage._avg.timeOnPage || 0),
      averageScrollDepth: Math.round(analyticsData.averageScrollDepth._avg.scrollDepth || 0),
    },
    topSearchQueries: analyticsData.topSearchQueries.map((q) => ({
      query: q.searchQuery,
      count: q._count.searchQuery,
    })),
    topPages: analyticsData.topPages.map((p) => ({
      page: p.page,
      views: p._count.page,
    })),
    topMods: topModsWithDetails,
    deviceBreakdown: analyticsData.deviceBreakdown.map((d) => ({
      device: d.deviceType,
      count: d._count.deviceType,
    })),
    browserBreakdown: analyticsData.browserBreakdown.map((b) => ({
      browser: b.browser,
      count: b._count.browser,
    })),
    recentEvents: analyticsData.recentEvents,
  });
}
