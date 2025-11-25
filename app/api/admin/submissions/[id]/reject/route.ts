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

  try {
    const body = await request.json();
    const { reason } = body;

    // Get the submission
    const submission = await prisma.modSubmission.findUnique({
      where: { id: params.id },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Update submission status
    await prisma.modSubmission.update({
      where: { id: params.id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
        reviewNotes: reason,
      },
    });

    // TODO: Send rejection email to submitter

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    return NextResponse.json(
      { error: 'Failed to reject submission' },
      { status: 500 }
    );
  }
}
