import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { CLAIM_SOURCE, PENDING_HANDLE_PREFIX } from '@/lib/creatorClaim';
import { slugFromPendingHandle } from '@/lib/creatorClaimReview';

export const dynamic = 'force-dynamic';

/** Bounded read: the queue is expected to hold a handful of rows. */
const MAX_ROWS = 200;

/**
 * GET /api/admin/creator-claims/ (Nova, E129)
 *
 * Every pending creator claim (CreatorProfile whose handle starts with
 * `pending-`, created by E122's claim form) with the claimant's public
 * account name, their claim submissions, how many mods already link to the
 * profile, and whether the public handle is free. Also lists anonymous
 * claim submissions, which have no profile yet (the claimant was not
 * signed in). No email addresses are returned.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await prisma.creatorProfile.findMany({
      where: { handle: { startsWith: PENDING_HANDLE_PREFIX } },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: {
        id: true,
        handle: true,
        createdAt: true,
        userId: true,
        user: { select: { username: true, displayName: true, isCreator: true } },
        _count: { select: { mods: true } },
      },
    });

    const userIds = profiles.map((p) => p.userId);
    const slugs = profiles
      .map((p) => slugFromPendingHandle(p.handle))
      .filter((s): s is string => Boolean(s));

    const [submissions, takenHandles, anonymous] = await Promise.all([
      userIds.length
        ? prisma.modSubmission.findMany({
            where: { userId: { in: userIds }, source: CLAIM_SOURCE },
            orderBy: { createdAt: 'desc' },
            take: MAX_ROWS,
            select: {
              id: true,
              userId: true,
              modName: true,
              modUrl: true,
              author: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      slugs.length
        ? prisma.creatorProfile.findMany({
            where: { handle: { in: slugs } },
            select: { handle: true },
          })
        : Promise.resolve([]),
      prisma.modSubmission.findMany({
        where: { userId: null, source: CLAIM_SOURCE },
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
        select: { id: true, modName: true, modUrl: true, author: true, status: true, createdAt: true },
      }),
    ]);

    const taken = new Set(takenHandles.map((t) => t.handle));

    const claims = profiles.map((p) => {
      const slug = slugFromPendingHandle(p.handle);
      return {
        id: p.id,
        handle: p.handle,
        claimedSlug: slug,
        slugTaken: slug ? taken.has(slug) : false,
        createdAt: p.createdAt,
        account: {
          username: p.user.username,
          displayName: p.user.displayName,
          isCreator: p.user.isCreator,
        },
        linkedMods: p._count.mods,
        submissions: submissions
          .filter((s) => s.userId === p.userId)
          .map((s) => ({
            id: s.id,
            modName: s.modName,
            modUrl: s.modUrl,
            author: s.author,
            status: s.status,
            createdAt: s.createdAt,
          })),
      };
    });

    return NextResponse.json({ claims, anonymous });
  } catch (error) {
    console.error('Error fetching creator claims:', error);
    return NextResponse.json({ error: 'Failed to fetch creator claims' }, { status: 500 });
  }
}
