import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/middleware/auth';

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

    let mod;

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
          thumbnail: submission.thumbnail,
          images: submission.images,
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
      // CREATE new mod
      const modData: any = {
        title: submission.modName,
        description: submission.description,
        shortDescription: submission.shortDescription,
        version: submission.version,
        gameVersion: submission.gameVersion,
        category: submission.category,
        tags: submission.tags.length > 0 ? submission.tags : [submission.category],
        thumbnail: submission.thumbnail,
        images: submission.images,
        downloadUrl: submission.downloadUrl || submission.modUrl,
        sourceUrl: submission.sourceUrl || submission.modUrl,
        source: submission.source || 'User Submission',
        author: submission.author,
        isFree: submission.isFree,
        price: submission.price,
        currency: submission.currency,
        isNSFW: submission.isNSFW,
      };

      // Link to creator profile if submission has userId and creatorProfile exists
      if (submission.userId && submission.user?.creatorProfile) {
        modData.creatorId = submission.user.creatorProfile.id;
      }

      mod = await prisma.mod.create({
        data: modData,
      });
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
