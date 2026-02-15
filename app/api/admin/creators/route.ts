import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { handle: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const creators = await prisma.creatorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            mods: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ creators });
  } catch (error) {
    console.error('Error fetching creators:', error);
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
  }
}
