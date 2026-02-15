import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/middleware/auth';
import { SubmissionRejectSchema, formatZodError } from '@/lib/validation/schemas';
import { ZodError } from 'zod';
import { emailNotifier } from '@/lib/services/emailNotifier';

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
    let reason: string;
    try {
      const body = await request.json();
      const parsed = SubmissionRejectSchema.parse(body);
      reason = parsed.reason;
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: formatZodError(error),
          },
          { status: 400 }
        );
      }
      throw error;
    }

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

    if (submission.submitterEmail) {
      const subject = `Submission update: ${submission.modName}`;
      const html = `
        <p>Your mod submission was reviewed and rejected.</p>
        <ul>
          <li><strong>Mod:</strong> ${submission.modName}</li>
          <li><strong>Reason:</strong> ${reason}</li>
        </ul>
      `;

      void Promise.resolve(emailNotifier.send(submission.submitterEmail, subject, html)).catch((notifyError) => {
        console.error('Failed to send rejection email:', notifyError);
      });
    }

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
