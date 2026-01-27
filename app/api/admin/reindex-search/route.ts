import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Batching configuration to prevent connection pool exhaustion
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

/**
 * Helper to process items in batches with delays
 * Prevents connection pool exhaustion during bulk operations
 */
async function processBatched<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  onProgress?: (processed: number, total: number) => void
): Promise<{ successes: number; failures: number }> {
  let successes = 0;
  let failures = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const results = await Promise.allSettled(batch.map(processor));

    // Count successes and failures
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successes++;
      } else {
        failures++;
      }
    });

    // Report progress
    if (onProgress) {
      onProgress(successes + failures, items.length);
    }

    // Small delay between batches to prevent connection spike
    if (i + BATCH_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { successes, failures };
}

// POST - Re-index all mods or specific mod
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const modId = body.modId;

    const { AISearchService } = await import('@/lib/services/aiSearch');
    const aiSearchService = new AISearchService();

    if (modId) {
      // Re-index specific mod
      await aiSearchService.updateSearchIndex(modId);
      return NextResponse.json({
        success: true,
        message: `Re-indexed mod ${modId}`,
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

      console.log(`[Reindex] Starting batch indexing of ${modsWithoutIndex.length} mods`);

      // Process in batches to prevent connection pool exhaustion
      const { successes: indexed, failures: failed } = await processBatched(
        modsWithoutIndex,
        async (mod) => {
          await aiSearchService.updateSearchIndex(mod.id);
          console.log(`Indexed: ${mod.title}`);
        },
        (processed, total) => {
          if (processed % 50 === 0) {
            console.log(`[Reindex] Progress: ${processed}/${total}`);
          }
        }
      );

      console.log(`[Reindex] Complete: ${indexed} indexed, ${failed} failed`);

      return NextResponse.json({
        success: true,
        indexed,
        failed,
        total: modsWithoutIndex.length,
        message: `Re-indexed ${indexed} mods (${failed} failed)`,
      });
    }
  } catch (error) {
    console.error('Error re-indexing:', error);
    return NextResponse.json({ error: 'Failed to re-index' }, { status: 500 });
  }
}
