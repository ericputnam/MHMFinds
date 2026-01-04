import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST - Re-index all mods or specific mod
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const modId = body.modId;

    const { AISearchService } = await import('@/lib/services/aiSearch');
    const aiSearchService = new AISearchService();

    if (modId) {
      // Re-index specific mod
      await aiSearchService.updateSearchIndex(modId);
      return NextResponse.json({
        success: true,
        message: `Re-indexed mod ${modId}`
      });
    } else {
      // Re-index all mods without search index
      const modsWithoutIndex = await prisma.mod.findMany({
        where: {
          searchIndex: null,
        },
        select: {
          id: true,
          title: true,
        },
      });

      let indexed = 0;
      let failed = 0;

      for (const mod of modsWithoutIndex) {
        try {
          await aiSearchService.updateSearchIndex(mod.id);
          indexed++;
          console.log(`Indexed: ${mod.title}`);
        } catch (error) {
          failed++;
          console.error(`Failed to index ${mod.title}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        indexed,
        failed,
        total: modsWithoutIndex.length,
        message: `Re-indexed ${indexed} mods (${failed} failed)`
      });
    }
  } catch (error) {
    console.error('Error re-indexing:', error);
    return NextResponse.json({ error: 'Failed to re-index' }, { status: 500 });
  }
}
