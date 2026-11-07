import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CACHE_TIERS, getCacheOptions } from '@/lib/cache-tiers';
import { findHostedFile } from '@/lib/modFiles/lifecycle';
import { hostedUploadsEnabled } from '@/lib/modFiles/storage';

/**
 * Public, non-sensitive facts about a creator-hosted file: never its id,
 * storage path or hash. The bytes are only reachable through a download
 * ticket (POST /api/mods/[id]/download-ticket/).
 */
async function publicHostedFile(modId: string) {
  if (!hostedUploadsEnabled()) return null;
  try {
    const file = await findHostedFile(modId);
    if (!file) return null;
    return {
      name: file.downloadName,
      sizeBytes: file.sizeBytes,
      kind: file.kind,
      containsScript: file.containsScript,
    };
  } catch (err) {
    // A hosted-file lookup failure must never take the mod page down.
    console.error('[mod-files] hosted file lookup failed:', (err as Error).message);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Use Accelerate caching (60s TTL) for mod detail queries
    // cacheStrategy is only applied when Accelerate extension is enabled
    const mod = await prisma.mod.findUnique({
      where: { id },
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
      ...getCacheOptions(CACHE_TIERS.HOT),
    } as any);

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Serialize Decimal fields to numbers
    const serializedMod = {
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
      hostedFile: await publicHostedFile(id),
    };

    return NextResponse.json(serializedMod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod' },
      { status: 500 }
    );
  }
}

