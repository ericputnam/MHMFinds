import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const submissions = await prisma.modSubmission.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        // Review facts for a hosted file. Never the blob path: the admin
        // downloads through /api/admin/mod-uploads/[id]/review-url/.
        upload: {
          select: {
            id: true,
            originalName: true,
            downloadName: true,
            kind: true,
            sizeBytes: true,
            sha256: true,
            status: true,
            validationError: true,
            containsScript: true,
            inspection: true,
            blobDeletedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
