import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { isManagedPath, isUploadId } from '@/lib/modFiles/paths';
import { isSameOrigin } from '@/lib/modFiles/requestGuards';
import { deleteBlob, hostedUploadsDisabledResponse, hostedUploadsEnabled } from '@/lib/modFiles/storage';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * DELETE /api/admin/mod-uploads/[id]/   { reason?: string }
 * Takedown: stop serving a hosted file and delete its bytes (malware report,
 * DMCA, creator request). The mod page falls back to its external link, if
 * it has one. The row stays as the record, with an audit log entry.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
    }
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
    if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();
    if (!isUploadId(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

    let reason = '';
    try {
      const body = await request.json();
      if (typeof body?.reason === 'string') reason = body.reason.slice(0, 500);
    } catch {
      // body is optional
    }

    const upload = await prisma.modUpload.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, blobPathname: true, blobDeletedAt: true, modId: true, sha256: true },
    });
    if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

    // Stop serving first, then delete the bytes.
    await prisma.modUpload.update({
      where: { id: upload.id },
      data: { status: 'removed', reviewedBy: session.user.id, reviewedAt: new Date(), validationError: reason || 'Removed by admin' },
    });
    if (!upload.blobDeletedAt && isManagedPath(upload.blobPathname)) {
      await deleteBlob(upload.blobPathname);
      await prisma.modUpload.update({ where: { id: upload.id }, data: { blobDeletedAt: new Date() } });
    }

    await prisma.adminAuditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'delete',
          resource: 'mod_upload',
          resourceId: upload.id,
          details: { previousStatus: upload.status, modId: upload.modId, sha256: upload.sha256, reason },
        },
      })
      .catch((err) => console.error('[mod-files] audit log write failed:', (err as Error).message));

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[mod-files] takedown failed:', (error as Error).message);
    return NextResponse.json({ error: 'Takedown failed' }, { status: 500, headers: NO_STORE });
  }
}
