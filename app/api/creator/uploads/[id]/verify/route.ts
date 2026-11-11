import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireCreator } from '@/lib/auth/creatorAuth';
import { prisma } from '@/lib/prisma';
import { MAX_MOD_FILE_BYTES, type ModFileKind } from '@/lib/modFiles/constants';
import { isQuarantinePathFor, isUploadId } from '@/lib/modFiles/paths';
import { CREATOR_UPLOAD_SELECT, isSameOrigin } from '@/lib/modFiles/requestGuards';
import {
  BlobTooLargeError,
  blobSize,
  deleteBlob,
  hostedUploadsDisabledResponse,
  hostedUploadsEnabled,
  readBlobCapped,
} from '@/lib/modFiles/storage';
import { validateModFileBytes } from '@/lib/modFiles/validate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * POST /api/creator/uploads/[id]/verify/
 * Reads the uploaded bytes back from quarantine and checks them: real size,
 * file signature, zip structure (no path tricks, no encryption, no zip
 * bombs, no executables), and a SHA-256 for the admin's malware lookup.
 * A file that fails is deleted immediately.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();
  if (!isUploadId(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

  const userId = auth.user.id;
  const row = await prisma.modUpload.findUnique({
    where: { id: params.id },
    select: { id: true, uploaderId: true, status: true, blobPathname: true, kind: true },
  });
  if (!row || row.uploaderId !== userId || !isQuarantinePathFor(row.blobPathname, userId, row.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
  }
  if (row.status !== 'pending_upload') {
    const current = await prisma.modUpload.findUnique({ where: { id: row.id }, select: CREATOR_UPLOAD_SELECT });
    return NextResponse.json({ upload: current }, { status: row.status === 'verified' ? 200 : 409, headers: NO_STORE });
  }

  const reject = async (message: string) => {
    await deleteBlob(row.blobPathname).catch((err) =>
      console.error('[mod-files] could not delete rejected upload (cron will retry):', (err as Error).message),
    );
    const upload = await prisma.modUpload.update({
      where: { id: row.id },
      data: { status: 'rejected', validationError: message.slice(0, 500), blobDeletedAt: new Date() },
      select: CREATOR_UPLOAD_SELECT,
    });
    return NextResponse.json({ error: message, upload }, { status: 400, headers: NO_STORE });
  };

  let read: { bytes: Buffer; etag: string } | null;
  try {
    const size = await blobSize(row.blobPathname);
    if (size === null) {
      return NextResponse.json(
        { error: 'The file has not finished uploading yet' },
        { status: 409, headers: NO_STORE },
      );
    }
    if (size > MAX_MOD_FILE_BYTES) return reject('The file is larger than 100 MB.');
    read = await readBlobCapped(row.blobPathname, MAX_MOD_FILE_BYTES);
  } catch (err) {
    if (err instanceof BlobTooLargeError) return reject('The file is larger than 100 MB.');
    console.error('[mod-files] verify read failed:', (err as Error).message);
    return NextResponse.json({ error: 'Could not read the uploaded file. Try again.' }, { status: 502, headers: NO_STORE });
  }
  if (!read) {
    return NextResponse.json({ error: 'The file has not finished uploading yet' }, { status: 409, headers: NO_STORE });
  }

  const result = validateModFileBytes(read.bytes, row.kind as ModFileKind);
  if (!result.ok) return reject(`This file was not accepted: ${result.error}.`);

  const { inspection } = result;
  const updated = await prisma.modUpload.updateMany({
    where: { id: row.id, status: 'pending_upload' },
    data: {
      status: 'verified',
      sizeBytes: inspection.sizeBytes,
      sha256: inspection.sha256,
      // Promotion copies only this exact object (see promoteBlob).
      blobEtag: read.etag,
      containsScript: inspection.containsScript,
      inspection: inspection.summary as unknown as Prisma.InputJsonValue,
      validationError: null,
    },
  });
  const upload = await prisma.modUpload.findUnique({ where: { id: row.id }, select: CREATOR_UPLOAD_SELECT });
  return NextResponse.json({ upload }, { status: updated.count === 1 ? 200 : 409, headers: NO_STORE });
}
