import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { isManagedPath, isUploadId } from '@/lib/modFiles/paths';
import { hostedUploadsDisabledResponse, hostedUploadsEnabled, presignAdminReview } from '@/lib/modFiles/storage';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };

/**
 * GET /api/admin/mod-uploads/[id]/review-url/
 * A 5-minute link so an admin can download a file (quarantined or live) for
 * manual review. Download it, don't open it: treat every upload as untrusted.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
    }
    if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();
    if (!isUploadId(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

    const upload = await prisma.modUpload.findUnique({
      where: { id: params.id },
      select: { blobPathname: true, blobDeletedAt: true, downloadName: true },
    });
    if (!upload || upload.blobDeletedAt || !isManagedPath(upload.blobPathname)) {
      return NextResponse.json({ error: 'File not stored' }, { status: 404, headers: NO_STORE });
    }

    const url = await presignAdminReview(upload.blobPathname, upload.downloadName);
    return NextResponse.json({ url, filename: upload.downloadName, expiresInSeconds: 300 }, { headers: NO_STORE });
  } catch (error) {
    console.error('[mod-files] review link failed:', (error as Error).name);
    return NextResponse.json({ error: 'Could not create a review link' }, { status: 500, headers: NO_STORE });
  }
}
