import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/affiliates/click - Track affiliate click
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, sourceType, modId, pageUrl } = body;

    if (!offerId || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: offerId, sourceType' },
        { status: 400 }
      );
    }

    // Get client info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate a session ID from IP + user agent for anonymous tracking
    const sessionId = Buffer.from(`${ipAddress}-${userAgent}`).toString('base64').slice(0, 32);

    // Record the click
    await prisma.affiliateClick.create({
      data: {
        offerId,
        sourceType, // 'interstitial', 'grid', 'sidebar'
        modId,
        pageUrl,
        sessionId,
        ipAddress,
        userAgent,
      },
    });

    // Increment the click counter on the offer
    await prisma.affiliateOffer.update({
      where: { id: offerId },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    // Still return success to not block the user
    return NextResponse.json({ success: true });
  }
}
