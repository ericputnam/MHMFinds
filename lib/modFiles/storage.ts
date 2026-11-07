/**
 * The only module that talks to the PRIVATE mod-files Blob store.
 *
 * Invariants (enforced here so every caller inherits them):
 *   - Uses MOD_FILES_BLOB_READ_WRITE_TOKEN only. It never falls back to
 *     BLOB_READ_WRITE_TOKEN — that store is public (mod images).
 *   - Every blob is private; a public URL for a mod file never exists.
 *   - Only pathnames matching lib/modFiles/paths.ts are read, copied,
 *     presigned or deleted.
 *   - Public presigning is limited to `approved/` paths.
 *   - Nothing here logs a token or a presigned URL.
 */
import { NextResponse } from 'next/server';
import { BlobNotFoundError, copy, del, get, head, issueSignedToken, list, presignUrl } from '@vercel/blob';
import { MOD_FILE_CONTENT_TYPE, PRESIGNED_URL_TTL_MS } from './constants';
import { isApprovedPath, isManagedPath, MOD_FILES_PREFIX } from './paths';

export function modFilesToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const t = env.MOD_FILES_BLOB_READ_WRITE_TOKEN?.trim();
  if (!t || !t.startsWith('vercel_blob_rw_')) return null;
  return t;
}

/** Hosted uploads are on only when the private store token AND a strong ticket secret exist. */
export function hostedUploadsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.NEXTAUTH_SECRET;
  return !!modFilesToken(env) && !!secret && secret.length >= 32;
}

export function hostedUploadsDisabledResponse() {
  return NextResponse.json({ error: 'Hosted uploads are not enabled yet' }, { status: 503 });
}

function requireToken(): string {
  const t = modFilesToken();
  if (!t) throw new Error('Hosted uploads are not enabled');
  return t;
}

function assertManaged(pathname: string) {
  if (!isManagedPath(pathname)) throw new Error('Refusing to touch an unmanaged blob path');
}

export async function blobSize(pathname: string): Promise<number | null> {
  assertManaged(pathname);
  try {
    const h = await head(pathname, { token: requireToken() });
    return h.size;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

export class BlobTooLargeError extends Error {}

/**
 * Read a private blob fully into memory, aborting as soon as it exceeds
 * `maxBytes` (the head() size is a hint; this is the enforcement).
 */
export async function readBlobCapped(pathname: string, maxBytes: number): Promise<Buffer | null> {
  assertManaged(pathname);
  const res = await get(pathname, { access: 'private', token: requireToken(), useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const reader = res.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new BlobTooLargeError('Blob exceeds the size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/** Copy a verified quarantine blob to its approved path, then delete the quarantine copy. */
export async function promoteBlob(fromPathname: string, toPathname: string): Promise<void> {
  assertManaged(fromPathname);
  if (!isApprovedPath(toPathname)) throw new Error('Refusing to promote to a non-approved path');
  const token = requireToken();
  await copy(fromPathname, toPathname, {
    access: 'private',
    token,
    contentType: MOD_FILE_CONTENT_TYPE,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  await deleteBlob(fromPathname);
}

export async function deleteBlob(pathname: string): Promise<void> {
  assertManaged(pathname);
  try {
    await del(pathname, { token: requireToken() });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return;
    throw err;
  }
}

async function presign(pathname: string, ttlMs: number): Promise<string> {
  const token = requireToken();
  const validUntil = Date.now() + Math.min(ttlMs, PRESIGNED_URL_TTL_MS);
  const signed = await issueSignedToken({ pathname, operations: ['get'], validUntil, token });
  const { presignedUrl } = await presignUrl(signed, {
    operation: 'get',
    pathname,
    validUntil,
    access: 'private',
  });
  return presignedUrl;
}

/** Public download link. Approved files only. */
export async function presignPublicDownload(pathname: string): Promise<string> {
  if (!isApprovedPath(pathname)) throw new Error('Only approved files can be downloaded');
  return presign(pathname, PRESIGNED_URL_TTL_MS);
}

/** Admin review link. Any managed path (quarantine included). Caller must be an admin. */
export async function presignAdminReview(pathname: string): Promise<string> {
  assertManaged(pathname);
  return presign(pathname, PRESIGNED_URL_TTL_MS);
}

export interface ListedBlob {
  pathname: string;
  uploadedAt: Date;
}

export async function listManagedBlobs(cursor?: string): Promise<{ blobs: ListedBlob[]; cursor?: string; hasMore: boolean }> {
  const res = await list({ prefix: MOD_FILES_PREFIX, cursor, limit: 1000, token: requireToken() });
  return {
    blobs: res.blobs.map((b) => ({ pathname: b.pathname, uploadedAt: new Date(b.uploadedAt) })),
    cursor: res.cursor,
    hasMore: res.hasMore,
  };
}
