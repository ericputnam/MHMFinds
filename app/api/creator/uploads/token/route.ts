import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireCreator } from '@/lib/auth/creatorAuth';
import { prisma } from '@/lib/prisma';
import {
  CLIENT_TOKEN_TTL_MS,
  MAX_MOD_FILE_BYTES,
  MOD_FILE_CONTENT_TYPE,
  PENDING_UPLOAD_TTL_MS,
} from '@/lib/modFiles/constants';
import { isQuarantinePathFor, isUploadId } from '@/lib/modFiles/paths';
import { isSameOrigin } from '@/lib/modFiles/requestGuards';
import { hostedUploadsDisabledResponse, hostedUploadsEnabled, modFilesToken } from '@/lib/modFiles/storage';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * POST /api/creator/uploads/token/
 * Issues a short-lived Blob client token for exactly one reserved
 * quarantine path. The browser uploads straight to the private store, so
 * the 100 MB file never passes through a serverless function body.
 *
 * Only `blob.generate-client-token` is accepted. No upload-completed
 * webhook is used: the creator's browser calls the verify route instead,
 * which reads the bytes back and checks them.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  if (!hostedUploadsEnabled()) return hostedUploadsDisabledResponse();
  const token = modFilesToken();
  if (!token) return hostedUploadsDisabledResponse();

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  }
  if (!body || body.type !== 'blob.generate-client-token') {
    return NextResponse.json({ error: 'Unsupported request' }, { status: 400, headers: NO_STORE });
  }

  const userId = auth.user.id;
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isUploadId(clientPayload)) throw new Error('bad-upload-id');
        const row = await prisma.modUpload.findUnique({
          where: { id: clientPayload },
          select: { uploaderId: true, status: true, blobPathname: true, createdAt: true },
        });
        if (
          !row ||
          row.uploaderId !== userId ||
          row.status !== 'pending_upload' ||
          row.blobPathname !== pathname ||
          !isQuarantinePathFor(pathname, userId, clientPayload) ||
          Date.now() - row.createdAt.getTime() > PENDING_UPLOAD_TTL_MS
        ) {
          throw new Error('upload-not-reserved');
        }
        return {
          allowedContentTypes: [MOD_FILE_CONTENT_TYPE],
          maximumSizeInBytes: MAX_MOD_FILE_BYTES,
          validUntil: Date.now() + CLIENT_TOKEN_TTL_MS,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: null,
        };
      },
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    const code = (err as Error).message;
    const known = code === 'bad-upload-id' || code === 'upload-not-reserved';
    if (!known) console.error('[mod-files] client token error:', code);
    return NextResponse.json(
      { error: known ? 'This upload slot is no longer valid. Choose the file again.' : 'Could not start the upload' },
      { status: known ? 403 : 500, headers: NO_STORE },
    );
  }
}
