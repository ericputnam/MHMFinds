import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/facets
 *
 * Returns all facet definitions with mod counts for building the filter sidebar.
 * Groups facets by type for easy UI consumption.
 */
export async function GET() {
  try {
    // Get all active facet definitions
    const definitions = await prisma.facetDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ facetType: 'asc' }, { sortOrder: 'asc' }],
    });

    // Count mods per content type
    const contentTypeCounts = await prisma.mod.groupBy({
      by: ['contentType'],
      where: { contentType: { not: null }, isVerified: true },
      _count: { id: true },
    });

    // Count mods per visual style
    const visualStyleCounts = await prisma.mod.groupBy({
      by: ['visualStyle'],
      where: { visualStyle: { not: null }, isVerified: true },
      _count: { id: true },
    });

    // For array fields (themes, ageGroups, etc.), we need a different approach
    // Use raw query to count occurrences in arrays
    const themeCounts = await prisma.$queryRaw<{ theme: string; count: bigint }[]>`
      SELECT unnest(themes) as theme, COUNT(*) as count
      FROM mods
      WHERE "isVerified" = true AND array_length(themes, 1) > 0
      GROUP BY theme
      ORDER BY count DESC
    `;

    const ageGroupCounts = await prisma.$queryRaw<{ age: string; count: bigint }[]>`
      SELECT unnest("ageGroups") as age, COUNT(*) as count
      FROM mods
      WHERE "isVerified" = true AND array_length("ageGroups", 1) > 0
      GROUP BY age
      ORDER BY count DESC
    `;

    // Gender counts use exclusive logic:
    // - masculine = has masculine but NOT feminine
    // - feminine = has feminine but NOT masculine
    // - unisex = has BOTH masculine AND feminine
    const genderCounts = await prisma.$queryRaw<{ gender: string; count: bigint }[]>`
      SELECT 'masculine' as gender, COUNT(*) as count FROM mods
      WHERE "isVerified" = true
        AND 'masculine' = ANY("genderOptions")
        AND NOT ('feminine' = ANY("genderOptions"))
      UNION ALL
      SELECT 'feminine' as gender, COUNT(*) as count FROM mods
      WHERE "isVerified" = true
        AND 'feminine' = ANY("genderOptions")
        AND NOT ('masculine' = ANY("genderOptions"))
      UNION ALL
      SELECT 'unisex' as gender, COUNT(*) as count FROM mods
      WHERE "isVerified" = true
        AND 'masculine' = ANY("genderOptions")
        AND 'feminine' = ANY("genderOptions")
    `;

    // Build count maps
    const countMaps = {
      contentType: Object.fromEntries(
        contentTypeCounts.map(c => [c.contentType, c._count.id])
      ),
      visualStyle: Object.fromEntries(
        visualStyleCounts.map(c => [c.visualStyle, c._count.id])
      ),
      themes: Object.fromEntries(
        themeCounts.map(c => [c.theme, Number(c.count)])
      ),
      ageGroups: Object.fromEntries(
        ageGroupCounts.map(c => [c.age, Number(c.count)])
      ),
      genderOptions: Object.fromEntries(
        genderCounts.map(c => [c.gender, Number(c.count)])
      ),
    };

    // Enrich definitions with counts and group by type
    const enrichedDefinitions = definitions.map(def => ({
      ...def,
      count: countMaps[def.facetType as keyof typeof countMaps]?.[def.value] || 0,
    }));

    // Group by facet type
    const grouped: Record<string, typeof enrichedDefinitions> = {};
    for (const def of enrichedDefinitions) {
      if (!grouped[def.facetType]) {
        grouped[def.facetType] = [];
      }
      grouped[def.facetType].push(def);
    }

    // Sort each group by count (descending) then sortOrder
    for (const type of Object.keys(grouped)) {
      grouped[type].sort((a, b) => {
        // If both have counts, sort by count descending
        if (a.count > 0 && b.count > 0) {
          return b.count - a.count;
        }
        // Items with counts come before items without
        if (a.count > 0 && b.count === 0) return -1;
        if (a.count === 0 && b.count > 0) return 1;
        // Otherwise sort by sortOrder
        return a.sortOrder - b.sortOrder;
      });
    }

    return NextResponse.json({
      facets: grouped,
      meta: {
        totalDefinitions: definitions.length,
        facetTypes: Object.keys(grouped),
      },
    });
  } catch (error) {
    console.error('Error fetching facets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facets' },
      { status: 500 }
    );
  }
}
