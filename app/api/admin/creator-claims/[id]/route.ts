import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { isPlaceholderAccountEmail } from '@/lib/creatorClaim';
import {
  CLAIM_AUDIT_RESOURCE,
  isSeedHolder,
  parseReviewAction,
  planPromotion,
  planRejection,
  promotionData,
  seedHandleFor,
  seedHolderWhere,
} from '@/lib/creatorClaimReview';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/creator-claims/[id]/ (Nova, E129)
 *
 * body { action: 'promote', slug?: string }  → the pending profile's handle
 *   becomes the public creator slug, so /creator/<slug>/ (which joins
 *   CreatorProfile on handle === slug) now shows the claimant's profile,
 *   and the row is set isVerified (E151) — the page gates the verified
 *   badge and hides the claim card on that flag, so a promoted page stops
 *   asking to be claimed. Only a `pending-*` handle can be promoted, only
 *   to a valid creator slug, and never onto a handle a real profile holds
 *   (409). A handle held by a seed profile (placeholder account, never
 *   signed in) is freed instead: the seed row is renamed to seed-<handle>
 *   in the same transaction and keeps its mods (E166).
 * body { action: 'reject', reason?: string } → the pending profile is
 *   deleted, unless mods already link to it (409).
 *
 * Neither action touches User.isCreator or the claimant's submissions —
 * those stay in their existing admin screens. Every action writes an
 * AdminAuditLog row (best-effort; a log failure never undoes the review).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const action = parseReviewAction(body);
    if (!action) {
      return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    }

    const profile = await prisma.creatorProfile.findUnique({
      where: { id: params.id },
      select: { id: true, handle: true, _count: { select: { mods: true } } },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (action.action === 'promote') {
      const base = {
        currentHandle: profile.handle,
        requestedSlug: action.slug,
        profileId: profile.id,
      };
      // First pass without the DB probe: resolves the target or refuses.
      const probe = planPromotion({ ...base, conflictingProfileId: null });
      if (!probe.ok) {
        return NextResponse.json({ error: probe.error }, { status: probe.status });
      }
      const conflict = await prisma.creatorProfile.findFirst({
        where: { handle: probe.handle, NOT: { id: profile.id } },
        select: { id: true, user: { select: { email: true, _count: { select: { accounts: true } } } } },
      });
      // Reduce the holder's email to a boolean here; it never leaves this block.
      const holder = conflict
        ? {
            id: conflict.id,
            placeholderAccount: isPlaceholderAccountEmail(conflict.user?.email ?? null),
            oauthAccounts: conflict.user?._count.accounts ?? 0,
          }
        : null;
      const conflictingIsSeed = isSeedHolder(holder);
      const seedHandleTaken = conflictingIsSeed
        ? (await prisma.creatorProfile.count({ where: { handle: seedHandleFor(probe.handle) } })) > 0
        : undefined;
      const decision = planPromotion({
        ...base,
        conflictingProfileId: holder?.id ?? null,
        conflictingIsSeed,
        seedHandleTaken,
      });
      if (!decision.ok) {
        return NextResponse.json({ error: decision.error }, { status: decision.status });
      }

      // E166: the seed rename and the promote are one transaction. The rename
      // re-asserts the seed predicate; if it no longer holds, it matches 0 rows,
      // the promote hits the unique handle (P2002 → 409) and both roll back.
      const writes: Prisma.PrismaPromise<unknown>[] = [];
      if (decision.displaceSeed) {
        writes.push(
          prisma.creatorProfile.updateMany({
            where: { id: decision.displaceSeed.profileId, handle: decision.handle, ...seedHolderWhere() },
            data: { handle: decision.displaceSeed.toHandle },
          })
        );
      }
      writes.push(
        prisma.creatorProfile.update({
          where: { id: profile.id },
          data: promotionData(decision.handle),
        })
      );

      try {
        await prisma.$transaction(writes);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return NextResponse.json(
            { error: `Handle "${decision.handle}" already belongs to another profile` },
            { status: 409 }
          );
        }
        throw error;
      }

      await audit(session.user.id, 'promote', profile.id, {
        fromHandle: profile.handle,
        toHandle: decision.handle,
        isVerified: 'true',
        displacedSeedProfileId: decision.displaceSeed?.profileId ?? null,
        displacedSeedHandle: decision.displaceSeed?.toHandle ?? null,
      });
      return NextResponse.json({
        success: true,
        handle: decision.handle,
        page: `/creator/${decision.handle}/`,
        displacedSeedHandle: decision.displaceSeed?.toHandle ?? null,
      });
    }

    const rejection = planRejection({ currentHandle: profile.handle, linkedModCount: profile._count.mods });
    if (!rejection.ok) {
      return NextResponse.json({ error: rejection.error }, { status: rejection.status });
    }
    // Re-assert the pending predicate on the write so a concurrent
    // promotion can never be deleted by a stale reject.
    const deleted = await prisma.creatorProfile.deleteMany({
      where: { id: profile.id, handle: profile.handle },
    });
    if (deleted.count !== 1) {
      return NextResponse.json({ error: 'Claim changed while reviewing; reload' }, { status: 409 });
    }
    await audit(session.user.id, 'reject', profile.id, {
      handle: profile.handle,
      reason: action.reason || null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reviewing creator claim:', error);
    return NextResponse.json({ error: 'Failed to review creator claim' }, { status: 500 });
  }
}

async function audit(
  userId: string | undefined,
  action: 'promote' | 'reject',
  resourceId: string,
  details: Record<string, string | null>
): Promise<void> {
  if (!userId) return;
  try {
    await prisma.adminAuditLog.create({
      data: { userId, action, resource: CLAIM_AUDIT_RESOURCE, resourceId, details },
    });
  } catch (error) {
    console.error('creator-claim audit log failed:', error);
  }
}
