import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/middleware/auth';
import { newModDataFromSubmission, planApprovalProfile } from '@/lib/submissionApprovalProfile';
import { rehostModImages } from '@/lib/services/imageUploader';
import { finalizeUploadApproval, prepareUploadForApproval } from '@/lib/modFiles/lifecycle';

export const dynamic = 'force-dynamic';

/**
 * Create the submitter's pending CreatorProfile, idempotently. A P2002 means
 * a concurrent approval (or claim) created the user's row first — reuse it.
 * If the unique hit was the handle instead (two users sharing an id tail and
 * a slug), return null: the mod is still approved, just unlinked, exactly as
 * before E183. The profile is written before the mod, so a failed mod create
 * leaves a profile the retry reuses rather than a mod with no profile.
 */
async function ensureApprovalProfile(data: {
  userId: string;
  handle: string;
  isVerified: false;
}): Promise<string | null> {
  try {
    const created = await prisma.creatorProfile.create({ data, select: { id: true } });
    return created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.creatorProfile.findUnique({
        where: { userId: data.userId },
        select: { id: true },
      });
      return existing?.id ?? null;
    }
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CRITICAL: Require admin authentication
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response;
  }

  // TypeScript safety check
  if (!auth.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Get the submission with related data
    const submission = await prisma.modSubmission.findUnique({
      where: { id: params.id },
      include: {
        user: {
          include: {
            creatorProfile: true,
          },
        },
        approvedMod: true,
        // Only whether a hosted file is attached; its details are re-read
        // (and its status re-checked) inside prepareUploadForApproval.
        upload: { select: { id: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission already processed' },
        { status: 400 }
      );
    }

    // Hosted file: move it out of quarantine before the mod is written.
    // Idempotent, so a retry after a failure further down is safe.
    const filePrep = submission.upload
      ? await prepareUploadForApproval(
          submission.id,
          auth.user.id,
          submission.gameVersion || submission.approvedMod?.gameVersion || 'Sims 4',
        )
      : ({ ok: true, uploadId: null } as const);
    if (!filePrep.ok) {
      return NextResponse.json({ error: filePrep.error }, { status: 400 });
    }

    // Patreon image addresses expire and don't render — copy them to Blob.
    // Best effort: approval still goes through with the original URLs.
    const { thumbnail, images } = await rehostModImages({
      thumbnail: submission.thumbnail,
      images: submission.images,
    }).catch((err) => {
      console.error('Image rehost failed on approval:', err);
      return { thumbnail: submission.thumbnail, images: submission.images };
    });

    let mod;
    let profileHandle: string | null = null;

    // Check if this is an edit submission
    if (submission.isEdit && submission.approvedModId) {
      // UPDATE existing mod
      mod = await prisma.mod.update({
        where: { id: submission.approvedModId },
        data: {
          title: submission.modName,
          description: submission.description,
          shortDescription: submission.shortDescription,
          version: submission.version,
          gameVersion: submission.gameVersion,
          category: submission.category,
          tags: submission.tags,
          thumbnail,
          images,
          downloadUrl: submission.downloadUrl,
          sourceUrl: submission.sourceUrl,
          source: submission.source || 'Creator Upload',
          author: submission.author,
          isFree: submission.isFree,
          price: submission.price,
          currency: submission.currency,
          isNSFW: submission.isNSFW,
          updatedAt: new Date(),
        },
      });
    } else {
      // CREATE new mod — same builder as scripts/agents/approve-submissions.ts (E304).
      const modData: any = newModDataFromSubmission(submission, { thumbnail, images });

      // E183: link to the submitter's CreatorProfile, creating a pending
      // (unverified) one when they have none — see lib/submissionApprovalProfile.ts.
      const plan = planApprovalProfile({
        isEdit: submission.isEdit,
        userId: submission.userId,
        submitterIsAdmin: submission.user?.isAdmin === true,
        existingProfileId: submission.user?.creatorProfile?.id ?? null,
        author: submission.author,
        displayName: submission.user?.displayName ?? null,
        username: submission.user?.username ?? null,
      });
      if (plan.kind === 'link') {
        modData.creatorId = plan.profileId;
      } else if (plan.kind === 'create') {
        const profileId = await ensureApprovalProfile(plan.data);
        if (profileId) {
          modData.creatorId = profileId;
          profileHandle = plan.data.handle;
        }
      }

      mod = await prisma.mod.create({
        data: modData,
      });
    }

    if (filePrep.uploadId) {
      await finalizeUploadApproval(filePrep.uploadId, mod.id);
    }

    // Update submission status and link to approved mod
    await prisma.modSubmission.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
        approvedModId: mod.id,
      },
    });

    return NextResponse.json({
      success: true,
      mod,
      createdCreatorProfileHandle: profileHandle,
      message: submission.isEdit
        ? 'Edit approved and mod updated successfully'
        : 'Submission approved and mod created successfully',
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    );
  }
}
