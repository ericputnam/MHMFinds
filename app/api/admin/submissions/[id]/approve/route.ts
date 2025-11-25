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
    // Get the submission
    const submission = await prisma.modSubmission.findUnique({
      where: { id: params.id },
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

    // Create mod from submission
    const mod = await prisma.mod.create({
      data: {
        title: submission.modName,
        description: submission.description,
        category: submission.category,
        sourceUrl: submission.modUrl,
        source: 'User Submission',
        tags: [submission.category],
        isFree: true,
        downloadUrl: submission.modUrl,
      },
    });

    // Update submission status
    await prisma.modSubmission.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      mod,
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    );
  }
}
