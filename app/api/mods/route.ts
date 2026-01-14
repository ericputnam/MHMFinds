import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { CacheService } from '../../../lib/cache';

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
    const category = searchParams.get('category'); // OLD: flat category string
    const categoryId = searchParams.get('categoryId'); // NEW: hierarchical category ID
    const categoryPath = searchParams.get('categoryPath'); // NEW: category path for hierarchical filtering
    const gameVersion = searchParams.get('gameVersion');
    const tags = searchParams.get('tags');
    const isFree = searchParams.get('isFree');
    const creatorHandle = searchParams.get('creator');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // NEW: Faceted filters
    const contentType = searchParams.get('contentType'); // e.g., "hair", "tops", "furniture"
    const visualStyle = searchParams.get('visualStyle'); // e.g., "alpha", "maxis-match"
    const themes = searchParams.get('themes'); // comma-separated: "christmas,winter"
    const ageGroups = searchParams.get('ageGroups'); // comma-separated: "teen,adult"
    const genderOptions = searchParams.get('genderOptions'); // comma-separated: "feminine,unisex"

    const skip = (page - 1) * limit;
    const isProduction = process.env.NODE_ENV === 'production';

    // Debug logging (reduced in production)
    if (!isProduction) {
      console.log('[API] Mods query params:', {
        search,
        category,
        gameVersion,
        page,
        limit
      });
    }

    // Try to get from cache first
    const cacheParams = {
      page,
      limit,
      search,
      category,
      categoryId,
      categoryPath,
      gameVersion,
      tags,
      isFree,
      creatorHandle,
      sortBy,
      sortOrder,
      // Faceted filters - MUST be included in cache key
      contentType,
      visualStyle,
      themes,
      ageGroups,
      genderOptions,
    };

    const cached = await CacheService.getModsList(cacheParams);
    if (cached) {
      if (!isProduction) console.log('[Cache] HIT - Returning cached mods list');
      // Return cached response with edge caching headers
      return new NextResponse(JSON.stringify({
        ...cached,
        fromCache: true,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // CDN edge caching: cache for 60s, stale for 300s while revalidating
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      });
    }
    if (!isProduction) console.log('[Cache] MISS - Fetching from database');

    // Build where clause
    const where: any = {
      isVerified: true,
      isNSFW: false,
    };

    // Filter by creator handle
    if (creatorHandle) {
      where.creator = {
        handle: creatorHandle,
      };
    }

    // Search will be filtered first, then re-ranked with relevance scoring
    const searchTerm = search?.toLowerCase().trim();
    if (searchTerm) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
        // Also match if search term matches contentType
        { contentType: { equals: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Category filtering: support both old flat categories and new hierarchical categories
    if (categoryId) {
      // NEW: Filter by hierarchical category ID
      where.categoryId = categoryId;
    } else if (categoryPath) {
      // NEW: Filter by category path (e.g., "cc/build-buy/house")
      // This will match all mods in this category and all subcategories
      where.categoryRel = {
        path: {
          startsWith: categoryPath,
        },
      };
    } else if (category) {
      // OLD: Filter by flat category string (legacy support)
      where.category = category;
    }

    if (gameVersion) {
      // Handle "Other" as special case - show games NOT in the main 4
      if (gameVersion === '__other__') {
        where.gameVersion = {
          notIn: ['Sims 4', 'Stardew Valley', 'Animal Crossing', 'Minecraft']
        };
      } else {
        where.gameVersion = gameVersion;
      }
    }

    if (tags) {
      where.tags = { hasSome: tags.split(',') };
    }

    if (isFree !== null) {
      where.isFree = isFree === 'true';
    }

    // NEW: Faceted filters
    if (contentType) {
      where.contentType = contentType;
    }
    if (visualStyle) {
      where.visualStyle = visualStyle;
    }
    if (themes) {
      // Match mods that have ANY of the specified themes
      where.themes = { hasSome: themes.split(',') };
    }
    if (ageGroups) {
      where.ageGroups = { hasSome: ageGroups.split(',') };
    }
    if (genderOptions) {
      const genders = genderOptions.split(',');

      // Exclusive gender filtering:
      // - "masculine" = masculine-only (not feminine)
      // - "feminine" = feminine-only (not masculine)
      // - "unisex" = has both or tagged as unisex
      if (genders.length === 1) {
        if (genders[0] === 'masculine') {
          where.AND = [
            { genderOptions: { has: 'masculine' } },
            { NOT: { genderOptions: { has: 'feminine' } } }
          ];
        } else if (genders[0] === 'feminine') {
          where.AND = [
            { genderOptions: { has: 'feminine' } },
            { NOT: { genderOptions: { has: 'masculine' } } }
          ];
        } else if (genders[0] === 'unisex') {
          // Unisex = has both masculine AND feminine, OR has 'unisex' tag
          where.OR = [
            { genderOptions: { hasEvery: ['masculine', 'feminine'] } },
            { genderOptions: { has: 'unisex' } }
          ];
        }
      } else {
        // Multiple gender filters selected - use OR logic
        where.genderOptions = { hasSome: genders };
      }
    }

    // Debug: log the where clause
    console.log('[API] WHERE clause:', JSON.stringify(where, null, 2));

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

    // For search queries, we need to fetch more results and apply relevance scoring
    // Otherwise, use standard pagination
    const useRelevanceScoring = searchTerm && sortBy !== 'downloadCount' && sortBy !== 'rating' && sortBy !== 'title';

    // Get mods - fetch more if we need to re-rank by relevance
    let mods = await prisma.mod.findMany({
      where,
      orderBy,
      // If re-ranking, fetch more results to ensure we have enough good matches
      // Otherwise, use normal pagination
      skip: useRelevanceScoring ? 0 : skip,
      take: useRelevanceScoring ? Math.min(total, 500) : limit, // Cap at 500 for performance
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            isVerified: true,
          },
        },
        categoryRel: {
          select: {
            id: true,
            name: true,
            slug: true,
            path: true,
            level: true,
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

    // Apply relevance scoring for search queries
    if (useRelevanceScoring && searchTerm) {
      // Calculate relevance score for each mod
      const scoredMods = mods.map(mod => {
        let score = 0;
        const titleLower = (mod.title || '').toLowerCase();
        const descLower = (mod.description || '').toLowerCase();
        const contentTypeLower = (mod.contentType || '').toLowerCase();
        const tagsLower = (mod.tags || []).map(t => t.toLowerCase());

        // Create word boundary regex for exact word matching
        const wordBoundaryRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

        // Highest priority: exact contentType match (e.g., searching "glasses" matches contentType="glasses")
        if (contentTypeLower === searchTerm) {
          score += 100;
        }

        // High priority: exact word match in title
        if (wordBoundaryRegex.test(titleLower)) {
          score += 80;
        } else if (titleLower.includes(searchTerm)) {
          // Lower score for partial match in title (e.g., "eyelashes" when searching "lash")
          score += 30;
        }

        // Medium priority: exact tag match
        if (tagsLower.includes(searchTerm)) {
          score += 50;
        }

        // Lower priority: title starts with search term
        if (titleLower.startsWith(searchTerm)) {
          score += 20;
        }

        // Lowest priority: description match (exact word vs partial)
        if (wordBoundaryRegex.test(descLower)) {
          score += 15;
        } else if (descLower.includes(searchTerm)) {
          score += 5;
        }

        // Small boost for popularity (downloads, favorites)
        const popularityBoost = Math.log10((mod.downloadCount || 0) + (mod._count.favorites || 0) + 10) * 2;
        score += popularityBoost;

        return { ...mod, _relevanceScore: score };
      });

      // Sort by relevance score (descending)
      scoredMods.sort((a, b) => b._relevanceScore - a._relevanceScore);

      // Apply pagination after sorting
      mods = scoredMods.slice(skip, skip + limit);
    }

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
      hierarchicalCategoryGroups,
      allCategories,
      gameVersionGroups,
      sourceGroups,
    ] = await Promise.all([
      // Get all mods matching search to calculate facets
      prisma.mod.findMany({
        where: facetWhere,
        select: {
          category: true,
          categoryId: true,
          gameVersion: true,
          source: true,
          tags: true,
          isFree: true,
          price: true,
          rating: true,
        },
      }),
      // OLD: Flat category aggregation (for legacy support)
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
      // NEW: Hierarchical category aggregation
      prisma.mod.groupBy({
        by: ['categoryId'],
        where: {
          ...facetWhere,
          categoryId: {
            not: null,
          },
        },
        _count: true,
      }),
      // Get all categories for building the tree
      prisma.category.findMany({
        orderBy: [{ level: 'asc' }, { order: 'asc' }, { name: 'asc' }],
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

    // Build hierarchical category tree with counts
    const categoryCounts = new Map<string, number>();
    hierarchicalCategoryGroups.forEach((group) => {
      if (group.categoryId) {
        categoryCounts.set(group.categoryId, group._count);
      }
    });

    // Build category tree structure
    const categoryMap = new Map<string, any>();
    const categoryTreeRoots: any[] = [];

    // First pass: create all nodes with counts
    allCategories.forEach((cat) => {
      const count = categoryCounts.get(cat.id) || 0;
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        path: cat.path,
        level: cat.level,
        count,
        children: [],
      });
    });

    // Second pass: build tree by connecting parents and children
    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
          // Accumulate child counts to parent
          parent.count = (parent.count || 0) + (node.count || 0);
        }
      } else {
        categoryTreeRoots.push(node);
      }
    });

    // Filter out categories with 0 count (and their empty children)
    const filterEmptyCategories = (node: any): boolean => {
      // Filter children first
      if (node.children && node.children.length > 0) {
        node.children = node.children.filter(filterEmptyCategories);
      }
      // Keep node if it has count > 0 or has non-empty children
      return node.count > 0 || (node.children && node.children.length > 0);
    };

    const filteredCategoryTree = categoryTreeRoots.filter(filterEmptyCategories);

    // Transform mods to serialize Decimal fields properly
    const serializedMods = mods.map(mod => ({
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
    }));

    // Debug: log what mods are being returned (only in development)
    if (!isProduction) {
      console.log('[API] Returning mods:', serializedMods.map(m => ({
        title: m.title,
        category: m.category,
        gameVersion: m.gameVersion
      })));
    }

    const response = {
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
        // OLD: Flat categories (for legacy support)
        categories: categoryGroups.map(g => ({
          value: g.category,
          count: g._count,
        })),
        // NEW: Hierarchical category tree
        categoryTree: filteredCategoryTree,
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
      fromCache: false,
    };

    // Cache the response for 5 minutes
    await CacheService.setModsList(cacheParams, response);

    // Return with edge caching headers for CDN optimization
    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // CDN edge caching: cache for 60s, stale for 300s while revalidating
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Cache': 'MISS',
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
      category, // OLD: flat category string
      categoryId, // NEW: hierarchical category ID
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

    // Require either old category or new categoryId
    if (!title || (!category && !categoryId) || !gameVersion) {
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
        category: category || 'Other', // Fallback to 'Other' if not provided
        categoryId, // NEW: hierarchical category reference
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
        categoryRel: {
          select: {
            id: true,
            name: true,
            slug: true,
            path: true,
            level: true,
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

    // Invalidate caches when new mod is created
    await CacheService.invalidateMod(mod.id);

    return NextResponse.json(serializedMod, { status: 201 });
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json(
      { error: 'Failed to create mod' },
      { status: 500 }
    );
  }
}
