import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - List all facet definitions grouped by facetType with mod counts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all facet definitions
    const facets = await prisma.facetDefinition.findMany({
      orderBy: [{ facetType: 'asc' }, { sortOrder: 'asc' }, { displayName: 'asc' }],
    });

    // Get mod counts for each facet value
    // We need to count how many mods use each facet value
    const [contentTypeCounts, visualStyleCounts, themeCounts] = await Promise.all([
      // Count mods by contentType
      prisma.mod.groupBy({
        by: ['contentType'],
        _count: { id: true },
        where: { contentType: { not: null } },
      }),
      // Count mods by visualStyle
      prisma.mod.groupBy({
        by: ['visualStyle'],
        _count: { id: true },
        where: { visualStyle: { not: null } },
      }),
      // For themes (array), we need a different approach - raw query
      prisma.$queryRaw<Array<{ theme: string; count: bigint }>>`
        SELECT unnest(themes) as theme, COUNT(*) as count
        FROM mods
        WHERE array_length(themes, 1) > 0
        GROUP BY unnest(themes)
      `,
    ]);

    // Build a map of facet value -> mod count
    const modCountMap: Record<string, number> = {};

    contentTypeCounts.forEach((item) => {
      if (item.contentType) {
        modCountMap[`contentType:${item.contentType}`] = item._count.id;
      }
    });

    visualStyleCounts.forEach((item) => {
      if (item.visualStyle) {
        modCountMap[`visualStyle:${item.visualStyle}`] = item._count.id;
      }
    });

    themeCounts.forEach((item) => {
      modCountMap[`themes:${item.theme}`] = Number(item.count);
    });

    // Attach mod counts to facets
    const facetsWithCounts = facets.map((facet) => ({
      ...facet,
      modCount: modCountMap[`${facet.facetType}:${facet.value}`] || 0,
    }));

    // Group by facetType
    const grouped = facetsWithCounts.reduce(
      (acc, facet) => {
        if (!acc[facet.facetType]) {
          acc[facet.facetType] = [];
        }
        acc[facet.facetType].push(facet);
        return acc;
      },
      {} as Record<string, typeof facetsWithCounts>
    );

    return NextResponse.json({
      facets: facetsWithCounts,
      grouped,
      total: facets.length,
    });
  } catch (error) {
    console.error('Error fetching facet definitions:', error);
    return NextResponse.json({ error: 'Failed to fetch facet definitions' }, { status: 500 });
  }
}

// POST - Create new facet definition
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { facetType, value, displayName, description, icon, color, sortOrder, isActive } = body;

    // Validate required fields
    if (!facetType || !value || !displayName) {
      return NextResponse.json(
        { error: 'facetType, value, and displayName are required' },
        { status: 400 }
      );
    }

    // Validate facetType is one of the allowed values
    const allowedFacetTypes = [
      'contentType',
      'visualStyle',
      'themes',
      'ageGroups',
      'genderOptions',
      'occultTypes',
      'packRequirements',
    ];
    if (!allowedFacetTypes.includes(facetType)) {
      return NextResponse.json(
        { error: `Invalid facetType. Must be one of: ${allowedFacetTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if facet already exists
    const existing = await prisma.facetDefinition.findUnique({
      where: {
        facetType_value: { facetType, value },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Facet definition already exists for ${facetType}:${value}` },
        { status: 400 }
      );
    }

    const facet = await prisma.facetDefinition.create({
      data: {
        facetType,
        value,
        displayName,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(facet, { status: 201 });
  } catch (error) {
    console.error('Error creating facet definition:', error);
    return NextResponse.json({ error: 'Failed to create facet definition' }, { status: 500 });
  }
}
