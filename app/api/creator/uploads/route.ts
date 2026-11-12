import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/creatorAuth';
import { prisma } from '@/lib/prisma';
import {
  MAX_MOD_FILE_BYTES,
  MOD_FILE_KINDS,
  MOD_UPLOAD_BYTES_PER_DAY,
  MOD_UPLOADS_PER_DAY,
  kindFromFilename,
} from '@/lib/modFiles/constants';
import { sanitizeDownloadName } from '@/lib/modFiles/filename';
import { newUploadId, quarantinePath } from '@/lib/modFiles/paths';
import { CREATOR_UPLOAD_SELECT, isSameOrigin } from '@/lib/modFiles/requestGuards';
import {
  hostedUploadsDisabledResponse,
  hostedUploadsEnabled,
  presignQuarantineUpload,
} from '@/lib/modFiles/storage';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/creator/uploads/
 * Upload settings for the submission form. Not user-specific.
 */
export async function GET() {
  return NextResponse.json(
    { enabled: hostedUploadsEnabled(), maxBytes: MAX_MOD_FILE_BYTES, kinds: MOD_FILE_KINDS },
    { headers: NO_STORE },
  );
}

/**
 * POST /api/creator/uploads/  { filename, size }
 * Reserve a quarantine slot for one file. The server picks the storage key
 * and returns a 15-minute upload link signed for that key, that exact size,
 * the opaque content type and create-only. The browser PUTs the bytes
 * straight to the private bucket (the 100 MB file never passes through a
 * serverless function), then asks the server to check them (verify route).
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();

  let body: { filename?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  }

  const filename = typeof body.filename === 'string' ? body.filename.slice(0, 255) : '';
  const size = typeof body.size === 'number' && Number.isInteger(body.size) ? body.size : -1;
  const kind = kindFromFilename(filename);
  if (!kind) {
    return NextResponse.json(
      { error: 'Only .package, .ts4script and .zip files can be uploaded' },
      { status: 400, headers: NO_STORE },
    );
  }
  if (size <= 0 || size > MAX_MOD_FILE_BYTES) {
    return NextResponse.json({ error: 'Files must be between 1 byte and 100 MB' }, { status: 400, headers: NO_STORE });
  }

  const userId = auth.user.id;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.modUpload.aggregate({
    where: { uploaderId: userId, createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { sizeBytes: true },
  });
  if (recent._count._all >= MOD_UPLOADS_PER_DAY) {
    return NextResponse.json(
      { error: `You can upload up to ${MOD_UPLOADS_PER_DAY} files a day. Try again tomorrow.` },
      { status: 429, headers: NO_STORE },
    );
  }
  if ((recent._sum.sizeBytes ?? 0) + size > MOD_UPLOAD_BYTES_PER_DAY) {
    return NextResponse.json(
      { error: 'You have reached the daily upload limit (1 GB). Try again tomorrow.' },
      { status: 429, headers: NO_STORE },
    );
  }

  const id = newUploadId();
  let pathname: string;
  try {
    pathname = quarantinePath(userId, id, kind);
  } catch {
    return NextResponse.json({ error: 'Uploads are not available for this account' }, { status: 400, headers: NO_STORE });
  }

  const upload = await prisma.modUpload.create({
    data: {
      id,
      uploaderId: userId,
      blobPathname: pathname,
      originalName: filename,
      downloadName: sanitizeDownloadName(filename, kind, id),
      kind,
      // Declared size until verify replaces it with the real one; counts
      // toward the daily byte limit either way.
      sizeBytes: size,
      status: 'pending_upload',
    },
    select: CREATOR_UPLOAD_SELECT,
  });

  let uploadUrl: string;
  try {
    uploadUrl = await presignQuarantineUpload(pathname, userId, id, size);
  } catch (err) {
    console.error('[mod-files] upload link failed:', (err as Error).name);
    await prisma.modUpload
      .update({ where: { id }, data: { status: 'expired', validationError: 'Upload link could not be created' } })
      .catch(() => undefined);
    return NextResponse.json({ error: 'Could not start the upload' }, { status: 502, headers: NO_STORE });
  }

  return NextResponse.json(
    { upload, uploadUrl },
    { status: 201, headers: NO_STORE },
  );
}
