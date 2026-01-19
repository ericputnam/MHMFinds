import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { AnalyticsEventType } from '@prisma/client';

/**
 * POST /api/analytics/track
 * Track analytics events (page views, searches, clicks, etc.)
 * Public endpoint - works for both authenticated and anonymous users
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      eventType,
      page,
      referrer,
      searchQuery,
      modId,
      categoryId,
      adId,
      timeOnPage,
      scrollDepth,
      metadata,
      sessionId,
    } = body;

    // Validate event type
    if (!eventType || !Object.values(AnalyticsEventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Extract technical metadata from request
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Parse user agent for device type, browser, OS (basic detection)
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);

    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId: session?.user?.id,
        sessionId: sessionId || undefined,
        page,
        referrer,
        searchQuery,
        modId,
        categoryId,
        adId,
        timeOnPage,
        scrollDepth,
        ipAddress,
        userAgent,
        deviceType,
        browser,
        os,
        metadata: metadata || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently - analytics tracking should never break the user experience
    console.error('Failed to track analytics event:', error);
    return NextResponse.json({ success: true }); // Return 200 to prevent retries
  }
}

// Helper functions for user agent parsing
function getDeviceType(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;

  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function getBrowser(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;

  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Other';
}

function getOS(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;

  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Other';
}
