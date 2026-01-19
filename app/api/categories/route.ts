import { NextRequest, NextResponse } from 'next/server';
import { prisma, cacheStrategies } from '../../../lib/prisma';
import { CacheService } from '../../../lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameVersion = searchParams.get('gameVersion');

    if (!gameVersion) {
      return NextResponse.json(
        { error: 'gameVersion parameter is required' },
        { status: 400 }
      );
    }

    // Try to get from cache first
    const cached = await CacheService.getGameCategories(gameVersion);
    if (cached) {
      console.log(`[Cache] HIT - Categories for ${gameVersion}`);
      return NextResponse.json({
        categories: cached,
        fromCache: true,
      });
    }

    console.log(`[Cache] MISS - Fetching categories from database for ${gameVersion}`);

    // Build where clause based on game version
    const where: any = {
      isVerified: true,
      isNSFW: false,
    };

    // Handle "Other" as special case - show categories from games NOT in the main 4
    if (gameVersion === 'Other' || gameVersion === '__other__') {
      where.gameVersion = {
        notIn: ['Sims 4', 'Stardew Valley', 'Animal Crossing', 'Minecraft']
      };
    } else {
      where.gameVersion = gameVersion;
    }

    // Fetch distinct categories for this game version from the database
    // Cached for 5 minutes since categories rarely change
    const categoriesData = await prisma.mod.findMany({
      where,
      select: {
        category: true,
      },
      distinct: ['category'],
      cacheStrategy: cacheStrategies.medium,
    });

    // Extract unique categories and filter out null/empty values
    const categories = categoriesData
      .map(mod => mod.category)
      .filter(cat => cat && cat.trim() !== '')
      .sort();

    // Add "All" as the first option
    const categoriesWithAll = ['All', ...categories];

    // Cache the result
    await CacheService.setGameCategories(gameVersion, categoriesWithAll);

    return NextResponse.json({
      categories: categoriesWithAll,
      fromCache: false,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
