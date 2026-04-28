import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - List mods with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    // Get facet filter params
    const contentType = searchParams.get('contentType') || '';
    const visualStyle = searchParams.get('visualStyle') || '';
    const theme = searchParams.get('theme') || '';
    // Health/quality filters. `missingFacets` kept as alias for backward compat
    // with any external callers — prefer `missingContentType`.
    const missingContentType =
      searchParams.get('missingContentType') === 'true' ||
      searchParams.get('missingFacets') === 'true';
    const missingAuthor = searchParams.get('missingAuthor') === 'true';
    const noDownloadUrl = searchParams.get('noDownloadUrl') === 'true';

    // Build where clause using AND array to properly combine conditions
    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (category) {
      whereConditions.push({ category });
    }

    // Facet filters
    if (contentType) {
      whereConditions.push({ contentType });
    }

    if (visualStyle) {
      whereConditions.push({ visualStyle });
    }

    if (theme) {
      whereConditions.push({ themes: { has: theme } });
    }

    // Always fetch active contentType values — needed for both the
    // missingContentType filter clause and the count returned to the UI.
    const activeFacets = await prisma.facetDefinition.findMany({
      where: { facetType: 'contentType', isActive: true },
      select: { value: true },
    });
    const activeContentTypes: string[] = activeFacets.map((f) => f.value);

    // "Missing Content Type" — NULL OR a value that isn't in the active facet list
    const missingContentTypeWhere = {
      OR: [
        { contentType: null },
        { contentType: { notIn: activeContentTypes } },
      ],
    };

    // "Missing Author" — author is NULL or empty string
    const missingAuthorWhere = {
      OR: [{ author: null }, { author: '' }],
    };

    // "No Download URL" — downloadUrl is NULL or empty string
    const noDownloadUrlWhere = {
      OR: [{ downloadUrl: null }, { downloadUrl: '' }],
    };

    if (missingContentType) {
      whereConditions.push(missingContentTypeWhere);
    }
    if (missingAuthor) {
      whereConditions.push(missingAuthorWhere);
    }
    if (noDownloadUrl) {
      whereConditions.push(noDownloadUrlWhere);
    }

    // Combine all conditions with AND
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Get mods, total count, and counts for all three quality filters
    const [
      mods,
      total,
      missingContentTypeCount,
      missingAuthorCount,
      noDownloadUrlCount,
    ] = await Promise.all([
      prisma.mod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          author: true,
          downloadCount: true,
          rating: true,
          isFeatured: true,
          isVerified: true,
          createdAt: true,
          thumbnail: true,
          downloadUrl: true,
          // Facet fields
          contentType: true,
          visualStyle: true,
          themes: true,
        },
      }),
      prisma.mod.count({ where }),
      prisma.mod.count({ where: missingContentTypeWhere }),
      prisma.mod.count({ where: missingAuthorWhere }),
      prisma.mod.count({ where: noDownloadUrlWhere }),
    ]);

    const response = NextResponse.json({
      mods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      // New canonical names + legacy alias for any external callers
      missingContentTypeCount,
      missingAuthorCount,
      noDownloadUrlCount,
      missingFacetsCount: missingContentTypeCount,
    });

    // Prevent caching of admin data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json({ error: 'Failed to fetch mods' }, { status: 500 });
  }
}

// POST - Create new mod
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const mod = await prisma.mod.create({
      data: {
        title: body.title,
        description: body.description,
        shortDescription: body.shortDescription,
        category: body.category,
        author: body.author,
        thumbnail: body.thumbnail,
        images: body.images || [],
        downloadUrl: body.downloadUrl,
        sourceUrl: body.sourceUrl,
        source: body.source || 'Manual',
        tags: body.tags || [],
        isFree: body.isFree ?? true,
        price: body.price,
        isFeatured: body.isFeatured ?? false,
        isVerified: body.isVerified ?? false,
        gameVersion: body.gameVersion || 'Sims 4',
        version: body.version,
        isNSFW: body.isNSFW ?? false,
        currency: body.currency || 'USD',
        publishedAt: new Date(), // Set publication date
      },
    });

    // Generate AI search embeddings for the new mod
    try {
      const { AISearchService } = await import('@/lib/services/aiSearch');
      const aiSearchService = new AISearchService();
      await aiSearchService.updateSearchIndex(mod.id);
    } catch (searchError) {
      console.error('Failed to update search index:', searchError);
      // Don't fail the whole request if search indexing fails
    }

    // Invalidate mods list cache after creating new mod
    await CacheService.invalidateMod(mod.id);

    return NextResponse.json(mod, { status: 201 });
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json({ error: 'Failed to create mod' }, { status: 500 });
  }
}
