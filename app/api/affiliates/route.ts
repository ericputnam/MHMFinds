import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/affiliates - Get active affiliate offers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3');
    const category = searchParams.get('category');
    const source = searchParams.get('source'); // 'interstitial', 'grid', 'sidebar'

    const now = new Date();

    // Build where clause
    const where: any = {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    };

    // Optional category filter
    if (category) {
      where.category = category;
    }

    // Fetch ALL active offers for weighted random selection
    const allOffers = await prisma.affiliateOffer.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        affiliateUrl: true,
        partner: true,
        partnerLogo: true,
        category: true,
        priority: true,
        promoText: true,
        promoColor: true,
      },
    });

    // Weighted random selection function
    // Priority gives a slight boost, not absolute ordering
    // priority 100 = ~2x more likely than priority 50
    const weightedRandomSelect = (
      candidates: typeof allOffers,
      count: number,
      excludeIds: Set<string> = new Set()
    ): typeof allOffers => {
      const available = candidates.filter(c => !excludeIds.has(c.id));
      if (available.length === 0) return [];

      const selected: typeof allOffers = [];
      const used = new Set(excludeIds);

      for (let i = 0; i < count && available.length > used.size - excludeIds.size; i++) {
        const remaining = available.filter(c => !used.has(c.id));
        if (remaining.length === 0) break;

        // Calculate weights: base weight + priority bonus
        // This makes priority a soft preference, not absolute
        const weights = remaining.map(offer => {
          const baseWeight = 10; // Everyone gets a base chance
          const priorityBonus = (offer.priority || 0) / 10; // priority 100 = +10, priority 50 = +5
          return baseWeight + priorityBonus;
        });

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let j = 0; j < remaining.length; j++) {
          random -= weights[j];
          if (random <= 0) {
            selected.push(remaining[j]);
            used.add(remaining[j].id);
            break;
          }
        }
      }

      return selected;
    };

    // Group offers by category
    const offersByCategory = new Map<string, typeof allOffers>();
    for (const offer of allOffers) {
      const cat = offer.category;
      if (!offersByCategory.has(cat)) {
        offersByCategory.set(cat, []);
      }
      offersByCategory.get(cat)!.push(offer);
    }

    const offers: typeof allOffers = [];
    const usedIds = new Set<string>();

    // First: weighted random pick one from each category for diversity
    const categories = Array.from(offersByCategory.keys());
    // Shuffle categories so we don't always start with the same one
    categories.sort(() => Math.random() - 0.5);

    for (const cat of categories) {
      if (offers.length >= limit) break;
      const catOffers = offersByCategory.get(cat)!;
      const picked = weightedRandomSelect(catOffers, 1, usedIds);
      if (picked.length > 0) {
        offers.push(picked[0]);
        usedIds.add(picked[0].id);
      }
    }

    // Second: if we still need more, do weighted random from all remaining
    if (offers.length < limit) {
      const additional = weightedRandomSelect(allOffers, limit - offers.length, usedIds);
      offers.push(...additional);
    }

    // Remove priority from response (not needed by frontend)
    const offersWithoutPriority = offers.map(({ priority, ...rest }) => rest);

    // Track impressions (fire and forget)
    if (offers.length > 0) {
      const offerIds = offers.map(o => o.id);
      prisma.affiliateOffer.updateMany({
        where: { id: { in: offerIds } },
        data: { impressions: { increment: 1 } },
      }).catch(console.error);
    }

    // Return with no-cache headers to ensure fresh random selection each time
    return new NextResponse(JSON.stringify({ offers: offersWithoutPriority }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate offers' },
      { status: 500 }
    );
  }
}

// POST /api/affiliates - Create new offer (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      affiliateUrl,
      partner,
      partnerLogo,
      category,
      priority,
      promoText,
      promoColor,
      startDate,
      endDate,
    } = body;

    if (!name || !imageUrl || !affiliateUrl || !partner || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, imageUrl, affiliateUrl, partner, category' },
        { status: 400 }
      );
    }

    const offer = await prisma.affiliateOffer.create({
      data: {
        name,
        description,
        imageUrl,
        affiliateUrl,
        partner,
        partnerLogo,
        category,
        priority: priority || 0,
        promoText,
        promoColor,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Error creating affiliate offer:', error);
    return NextResponse.json(
      { error: 'Failed to create affiliate offer' },
      { status: 500 }
    );
  }
}
