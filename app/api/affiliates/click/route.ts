import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appendClickSubId } from '@/lib/services/affiliateEarnings/network';

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

    // Use a transaction to create click record and increment offer clicks atomically
    const [click, offer] = await prisma.$transaction([
      // Record the click
      prisma.affiliateClick.create({
        data: {
          offerId,
          sourceType, // 'interstitial', 'grid', 'sidebar', 'mod_page'
          modId,
          pageUrl,
          sessionId,
          ipAddress,
          userAgent,
        },
      }),
      // Increment the click counter on the offer and return the offer
      prisma.affiliateOffer.update({
        where: { id: offerId },
        data: { clicks: { increment: 1 } },
      }),
    ]);

    // Inject the click ID as the network's subid (Impact subId1, Rakuten u1,
    // CJ sid, Amazon ascsubtag) so the network's conversion report can be
    // joined back to this click — this is what makes EPC-per-placement possible.
    const redirectUrl = appendClickSubId(offer.affiliateUrl, click.id, offer.network);

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    // Still return success to not block the user
    return NextResponse.json({ success: true });
  }
}
