import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isManagedPath } from '@/lib/modFiles/paths';
import { deleteBlob, hostedUploadsEnabled, listManagedBlobs } from '@/lib/modFiles/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A reserved slot that never received a verified file. */
const PENDING_EXPIRY_MS = DAY_MS;
/** A verified file the creator never attached to a submission. */
const UNATTACHED_EXPIRY_MS = 7 * DAY_MS;
/** An approved file whose mod was deleted (modId set null by the FK). */
const ORPHAN_APPROVED_EXPIRY_MS = 7 * DAY_MS;
/** A blob in the store with no row (e.g. a row deleted with its user). */
const UNTRACKED_BLOB_GRACE_MS = DAY_MS;
const BATCH = 200;

/**
 * GET /api/cron/mod-upload-cleanup/ — daily.
 * Deletes the bytes of every hosted file that is not live or waiting for
 * review, and any stored blob the database does not know about. Only
 * paths under mod-files/ are ever touched (enforced in storage.ts).
 *
 * Auth fails CLOSED: with CRON_SECRET unset, every request is refused.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hostedUploadsEnabled()) {
    return NextResponse.json({ skipped: 'hosted uploads not enabled' });
  }

  const now = Date.now();
  const summary = { expiredPending: 0, expiredUnattached: 0, blobsDeleted: 0, untrackedDeleted: 0, errors: 0 };

  try {
    const pending = await prisma.modUpload.updateMany({
      where: { status: 'pending_upload', createdAt: { lt: new Date(now - PENDING_EXPIRY_MS) } },
      data: { status: 'expired', validationError: 'Upload was never completed' },
    });
    summary.expiredPending = pending.count;

    const unattached = await prisma.modUpload.updateMany({
      where: { status: 'verified', submissionId: null, updatedAt: { lt: new Date(now - UNATTACHED_EXPIRY_MS) } },
      data: { status: 'expired', validationError: 'File was never attached to a submission' },
    });
    summary.expiredUnattached = unattached.count;

    // Rows whose bytes should be gone.
    const doomed = await prisma.modUpload.findMany({
      where: {
        blobDeletedAt: null,
        OR: [
          { status: { in: ['rejected', 'removed', 'superseded', 'expired'] } },
          { status: 'approved', modId: null, updatedAt: { lt: new Date(now - ORPHAN_APPROVED_EXPIRY_MS) } },
        ],
      },
      select: { id: true, blobPathname: true },
      take: BATCH,
    });
    for (const row of doomed) {
      try {
        if (isManagedPath(row.blobPathname)) await deleteBlob(row.blobPathname);
        await prisma.modUpload.update({ where: { id: row.id }, data: { blobDeletedAt: new Date() } });
        summary.blobsDeleted++;
      } catch (err) {
        summary.errors++;
        console.error('[mod-upload-cleanup] delete failed:', (err as Error).message);
      }
    }

    // Blobs with no matching row.
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await listManagedBlobs(cursor);
      const candidates = page.blobs.filter(
        (b) => isManagedPath(b.pathname) && now - b.uploadedAt.getTime() > UNTRACKED_BLOB_GRACE_MS,
      );
      if (candidates.length) {
        const known = await prisma.modUpload.findMany({
          where: { blobPathname: { in: candidates.map((b) => b.pathname) } },
          select: { blobPathname: true, blobDeletedAt: true },
        });
        const live = new Set(known.filter((k) => !k.blobDeletedAt).map((k) => k.blobPathname));
        for (const b of candidates) {
          if (live.has(b.pathname)) continue;
          try {
            await deleteBlob(b.pathname);
            summary.untrackedDeleted++;
          } catch (err) {
            summary.errors++;
            console.error('[mod-upload-cleanup] untracked delete failed:', (err as Error).message);
          }
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
      pages++;
    } while (cursor && pages < 50);

    return NextResponse.json({ success: summary.errors === 0, ...summary });
  } catch (error) {
    console.error('[mod-upload-cleanup] run failed:', (error as Error).message);
    return NextResponse.json({ success: false, ...summary, error: 'cleanup failed' }, { status: 500 });
  }
}
