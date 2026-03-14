import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CACHE_TIERS, getCacheOptions } from '@/lib/cache-tiers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the current mod's author
    const currentMod = await prisma.mod.findUnique({
      where: { id },
      select: { author: true, gameVersion: true },
    });

    if (!currentMod || !currentMod.author) {
      return NextResponse.json([]);
    }

    // Fetch other mods by the same author, excluding current mod
    const creatorMods = await prisma.mod.findMany({
      where: {
        author: currentMod.author,
        id: { not: id },
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        category: true,
        author: true,
        rating: true,
        isFree: true,
        price: true,
        gameVersion: true,
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 6,
      ...getCacheOptions(CACHE_TIERS.HOT),
    } as any);

    return NextResponse.json(creatorMods);
  } catch (error) {
    console.error('Error fetching creator mods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator mods' },
      { status: 500 }
    );
  }
}
