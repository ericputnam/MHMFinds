import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { rehostModImages, ImageRehostError } from '@/lib/services/imageUploader';
import { finalizeUploadApproval, publishOwnUpload } from '@/lib/modFiles/lifecycle';
import { hostedUploadsDisabledResponse, hostedUploadsEnabled } from '@/lib/modFiles/storage';
import { isSameOrigin } from '@/lib/modFiles/requestGuards';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    // Get facet filter params
    const contentType = searchParams.get('contentType') || '';
    const visualStyle = searchParams.get('visualStyle') || '';
    const theme = searchParams.get('theme') || '';
    const missingFacets = searchParams.get('missingFacets') === 'true';

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

    // For missing facets filter, we need to find:
    // 1. Mods with NULL contentType
    // 2. Mods with contentType values that don't have active FacetDefinitions
    // Get active contentType values for the missing facets check
    let activeContentTypes: string[] = [];
    if (missingFacets) {
      const activeFacets = await prisma.facetDefinition.findMany({
        where: {
          facetType: 'contentType',
          isActive: true,
        },
        select: { value: true },
      });
      activeContentTypes = activeFacets.map((f) => f.value);

      // Filter mods where contentType is NULL OR not in the active list
      whereConditions.push({
        OR: [
          { contentType: null },
          { contentType: { notIn: activeContentTypes } },
        ],
      });
    }

    // Combine all conditions with AND
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Always fetch active content types for the missing facets count
    // (reuse if already fetched for the filter)
    if (!missingFacets && activeContentTypes.length === 0) {
      const activeFacets = await prisma.facetDefinition.findMany({
        where: {
          facetType: 'contentType',
          isActive: true,
        },
        select: { value: true },
      });
      activeContentTypes = activeFacets.map((f) => f.value);
    }

    // Get mods, total count, and count of mods with missing facets
    const [mods, total, missingFacetsCount] = await Promise.all([
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
      // Count mods with missing facets (NULL contentType or inactive facet)
      prisma.mod.count({
        where: {
          OR: [
            { contentType: null },
            { contentType: { notIn: activeContentTypes } },
          ],
        },
      }),
    ]);

    const response = NextResponse.json({
      mods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      missingFacetsCount,
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

    // Patreon image addresses expire and don't render — copy them to Blob first
    const body = await rehostModImages(await request.json());

    // Hosted file: the admin's own verified upload, copied out of quarantine
    // before the mod is written (lib/modFiles/lifecycle.ts). Same origin only.
    const wantsHostedFile = body.uploadId !== undefined && body.uploadId !== null && body.uploadId !== '';
    if (wantsHostedFile) {
      if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();
    }
    const filePrep = await publishOwnUpload(body.uploadId, session.user.id);
    if (!filePrep.ok) {
      return NextResponse.json({ error: filePrep.error }, { status: filePrep.status });
    }

    const mod = await prisma.mod.create({
      data: {
        title: body.title,
        description: body.description,
        shortDescription: body.shortDescription,
        category: body.category,
        author: body.author,
        thumbnail: body.thumbnail,
        images: body.images || [],
        downloadUrl: body.downloadUrl || null, // optional when a hosted file is attached
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

    if (filePrep.uploadId && !(await finalizeUploadApproval(filePrep.uploadId, mod.id))) {
      // Another request published the same file first: undo this mod.
      await prisma.mod.delete({ where: { id: mod.id } });
      return NextResponse.json({ error: 'That file was just used for another mod.' }, { status: 409 });
    }

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
    if (error instanceof ImageRehostError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('Error creating mod:', error);
    return NextResponse.json({ error: 'Failed to create mod' }, { status: 500 });
  }
}
