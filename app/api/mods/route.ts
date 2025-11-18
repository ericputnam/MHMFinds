import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// Extend the session user type to include the id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string;
      isCreator?: boolean;
      isPremium?: boolean;
      isAdmin?: boolean;
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const gameVersion = searchParams.get('gameVersion');
    const tags = searchParams.get('tags');
    const isFree = searchParams.get('isFree');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isVerified: true,
      isNSFW: false,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (gameVersion) {
      where.gameVersion = gameVersion;
    }

    if (tags) {
      where.tags = { hasSome: tags.split(',') };
    }

    if (isFree !== null) {
      where.isFree = isFree === 'true';
    }

    // Build order by clause - prioritize mods with creators
    const orderBy: any = {};
    if (sortBy === 'downloadCount') {
      orderBy.downloadCount = sortOrder;
    } else if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else {
      // Default: order by creation date (mods with creators will be mixed in)
      orderBy.createdAt = sortOrder;
    }

    // Get total count
    const total = await prisma.mod.count({ where });

    // Get mods with pagination
    const mods = await prisma.mod.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    });

    // Build base where clause for facets (exclude current filters to show all available options)
    const facetWhere: any = {
      isVerified: true,
      isNSFW: false,
    };

    if (search) {
      facetWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    // Get facet counts
    const [
      allMods,
      categoryGroups,
      gameVersionGroups,
      sourceGroups,
    ] = await Promise.all([
      // Get all mods matching search to calculate facets
      prisma.mod.findMany({
        where: facetWhere,
        select: {
          category: true,
          gameVersion: true,
          source: true,
          tags: true,
          isFree: true,
          price: true,
          rating: true,
        },
      }),
      // Category aggregation
      prisma.mod.groupBy({
        by: ['category'],
        where: facetWhere,
        _count: true,
        orderBy: {
          _count: {
            category: 'desc',
          },
        },
      }),
      // Game version aggregation
      prisma.mod.groupBy({
        by: ['gameVersion'],
        where: facetWhere,
        _count: true,
        orderBy: {
          _count: {
            gameVersion: 'desc',
          },
        },
      }),
      // Source aggregation
      prisma.mod.groupBy({
        by: ['source'],
        where: facetWhere,
        _count: true,
        orderBy: {
          _count: {
            source: 'desc',
          },
        },
      }),
    ]);

    // Calculate tag counts
    const tagCounts: Record<string, number> = {};
    allMods.forEach(mod => {
      mod.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Get top 20 tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Calculate price range counts
    const priceRanges = {
      free: allMods.filter(m => m.isFree).length,
      under5: allMods.filter(m => !m.isFree && m.price && Number(m.price) < 5).length,
      '5to10': allMods.filter(m => !m.isFree && m.price && Number(m.price) >= 5 && Number(m.price) < 10).length,
      '10to20': allMods.filter(m => !m.isFree && m.price && Number(m.price) >= 10 && Number(m.price) < 20).length,
      over20: allMods.filter(m => !m.isFree && m.price && Number(m.price) >= 20).length,
    };

    // Calculate rating counts
    const ratingRanges = {
      '4plus': allMods.filter(m => m.rating && Number(m.rating) >= 4.0).length,
      '3plus': allMods.filter(m => m.rating && Number(m.rating) >= 3.0 && Number(m.rating) < 4.0).length,
      '2plus': allMods.filter(m => m.rating && Number(m.rating) >= 2.0 && Number(m.rating) < 3.0).length,
      under2: allMods.filter(m => m.rating && Number(m.rating) < 2.0).length,
    };

    const totalPages = Math.ceil(total / limit);

    // Transform mods to serialize Decimal fields properly
    const serializedMods = mods.map(mod => ({
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
    }));

    return NextResponse.json({
      mods: serializedMods,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      facets: {
        categories: categoryGroups.map(g => ({
          value: g.category,
          count: g._count,
        })),
        gameVersions: gameVersionGroups
          .filter(g => g.gameVersion)
          .map(g => ({
            value: g.gameVersion,
            count: g._count,
          })),
        sources: sourceGroups.map(g => ({
          value: g.source,
          count: g._count,
        })),
        tags: topTags,
        priceRanges,
        ratingRanges,
      },
    });
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      shortDescription,
      version,
      gameVersion,
      category,
      tags,
      thumbnail,
      images,
      downloadUrl,
      sourceUrl,
      source,
      sourceId,
      isFree,
      price,
      isNSFW,
    } = body;

    if (!title || !category || !gameVersion) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is a creator
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { creatorProfile: true },
    });

    if (!user?.isCreator) {
      return NextResponse.json(
        { error: 'User must be a creator to upload mods' },
        { status: 403 }
      );
    }

    // Create the mod
    const mod = await prisma.mod.create({
      data: {
        title,
        description,
        shortDescription,
        version,
        gameVersion,
        category,
        tags,
        thumbnail,
        images,
        downloadUrl,
        sourceUrl,
        source,
        sourceId,
        isFree,
        price: price ? parseFloat(price) : null,
        isNSFW: isNSFW || false,
        isVerified: false, // New mods need verification
        creatorId: user.creatorProfile?.id,
      },
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
    });

    // Serialize Decimal fields
    const serializedMod = {
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
    };

    return NextResponse.json(serializedMod, { status: 201 });
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json(
      { error: 'Failed to create mod' },
      { status: 500 }
    );
  }
}
