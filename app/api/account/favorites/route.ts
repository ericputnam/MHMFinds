import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// Session-dependent — never statically rendered or cached.
export const dynamic = 'force-dynamic';

/**
 * GET — the ids of every mod the signed-in visitor has saved.
 *
 * Mod grids (home, game, collection, creator pages) used to start every heart
 * empty and never ask the server, so a saved mod looked unsaved and a tap on
 * its heart POSTed a duplicate (400) that the grid rolled back — a favorite
 * could not be removed from a grid at all. One request per page hydrates all
 * hearts (lib/capture/useGridFavoriteIds.ts). Scoped by the session's user id,
 * never a client-supplied one. Read-only: GET never mutates.
 */
export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });
    }

    const rows = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      select: { modId: true },
    });

    return NextResponse.json({ ids: rows.map((r) => r.modId) }, { headers: noStore });
  } catch (error) {
    console.error('Error reading favorite ids:', error);
    return NextResponse.json({ error: 'Failed to read favorites' }, { status: 500, headers: noStore });
  }
}
