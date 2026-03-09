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

    // First, get the current mod to find its category and gameVersion
    const currentMod = await prisma.mod.findUnique({
      where: { id },
      select: { category: true, gameVersion: true },
    });

    if (!currentMod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Fetch related mods in the same category, excluding current mod
    const relatedMods = await prisma.mod.findMany({
      where: {
        category: currentMod.category,
        gameVersion: currentMod.gameVersion || 'Sims 4',
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

    return NextResponse.json(relatedMods);
  } catch (error) {
    console.error('Error fetching related mods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related mods' },
      { status: 500 }
    );
  }
}
