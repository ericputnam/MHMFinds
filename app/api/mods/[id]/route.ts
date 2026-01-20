import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CACHE_TIERS, getCacheOptions } from '@/lib/cache-tiers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Use Accelerate caching (60s TTL) for mod detail queries
    // cacheStrategy is only applied when Accelerate extension is enabled
    const mod = await prisma.mod.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            downloads: true,
          },
        },
      },
      ...getCacheOptions(CACHE_TIERS.HOT),
    } as any);

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Serialize Decimal fields to numbers
    const serializedMod = {
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
    };

    return NextResponse.json(serializedMod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod' },
      { status: 500 }
    );
  }
}

