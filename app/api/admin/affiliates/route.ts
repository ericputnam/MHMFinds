import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/admin/affiliates - Get all offers including inactive (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const offers = await prisma.affiliateOffer.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            clickEvents: true,
          },
        },
      },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching all affiliates:', error);
    // Return empty offers list instead of 500 - page will show "no offers" state
    return NextResponse.json({ offers: [], _warning: 'Affiliate data temporarily unavailable' });
  }
}
