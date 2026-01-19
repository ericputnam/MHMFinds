import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/admin/affiliates - Get all offers including inactive (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch affiliate offers' },
      { status: 500 }
    );
  }
}
