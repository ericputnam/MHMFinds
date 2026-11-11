/**
 * The only module that talks to the PRIVATE mod-files bucket (Cloudflare R2,
 * through its S3-compatible API).
 *
 * Invariants (enforced here so every caller inherits them):
 *   - Uses the MOD_FILES_R2_* credentials only, passed explicitly. The client
 *     never falls back to the AWS default credential chain, and nothing here
 *     touches BLOB_READ_WRITE_TOKEN (the public mod-image store).
 *   - The bucket is private; a public URL for a mod file never exists. Every
 *     link is a short-lived presigned URL.
 *   - Only keys matching lib/modFiles/paths.ts are read, copied, presigned or
 *     deleted.
 *   - Upload links are for one reserved quarantine key, one exact size, the
 *     opaque content type, and create-only (If-None-Match: *), all signed.
 *   - Public presigning is limited to `approved/` keys.
 *   - Promotion copies only the exact object verify checked (ETag pinned).
 *   - Nothing here logs a credential or a presigned URL.
 *   - Env is read at call time, never at import time.
 */
import { NextResponse } from 'next/server';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MAX_MOD_FILE_BYTES, MOD_FILE_CONTENT_TYPE, PRESIGNED_URL_TTL_MS, UPLOAD_URL_TTL_MS } from './constants';
import { isApprovedPath, isManagedPath, isQuarantinePathFor, MOD_FILES_PREFIX } from './paths';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const ACCOUNT_ID = /^[0-9a-f]{32}$/;
const KEY_PART = /^[A-Za-z0-9]{16,128}$/;
const BUCKET = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/**
 * The R2 settings, or null when any is missing or malformed. Values are
 * trimmed (a stray newline or `%` from a copy-paste must not reach a signer)
 * and then checked against R2's formats, so a typo disables the feature
 * instead of half-enabling it.
 */
export function r2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const accountId = env.MOD_FILES_R2_ACCOUNT_ID?.trim().toLowerCase() ?? '';
  const accessKeyId = env.MOD_FILES_R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.MOD_FILES_R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = env.MOD_FILES_R2_BUCKET?.trim() ?? '';
  if (!ACCOUNT_ID.test(accountId) || !KEY_PART.test(accessKeyId) || !KEY_PART.test(secretAccessKey) || !BUCKET.test(bucket)) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Hosted uploads are on only when the R2 settings AND a strong ticket secret exist. */
export function hostedUploadsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.NEXTAUTH_SECRET;
  return !!r2Config(env) && !!secret && secret.length >= 32;
}

export function hostedUploadsDisabledResponse() {
  return NextResponse.json(
    { error: 'Hosted uploads are not enabled yet' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

let cached: { fingerprint: string; client: S3Client; bucket: string } | null = null;

function r2(): { client: S3Client; bucket: string } {
  const cfg = r2Config();
  if (!cfg) throw new Error('Mod-file storage is not configured');
  const fingerprint = `${cfg.accountId}:${cfg.accessKeyId}:${cfg.secretAccessKey}:${cfg.bucket}`;
  if (cached?.fingerprint !== fingerprint) {
    cached = {
      fingerprint,
      bucket: cfg.bucket,
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
        // Only send checksums S3 requires; R2 rejects some optional ones.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }),
    };
  }
  return { client: cached.client, bucket: cached.bucket };
}

function assertManaged(pathname: string): void {
  if (!isManagedPath(pathname)) throw new Error('Refusing to touch an unmanaged storage key');
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NotFound' || e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
}

/** Strip the quotes S3 puts around an ETag, so stored and compared values agree. */
function bareEtag(etag: string | undefined): string | null {
  const t = etag?.replace(/^W\//, '').replace(/"/g, '').trim();
  return t ? t : null;
}

/**
 * A one-use upload link for a reserved quarantine key. Signed over the exact
 * byte count, the opaque content type and `If-None-Match: *`, so the browser
 * cannot send a bigger file, a different type, or overwrite bytes that verify
 * already checked. The browser must send `Content-Type: application/octet-stream`
 * and `If-None-Match: *`; it sets Content-Length itself from the file.
 */
export async function presignQuarantineUpload(
  pathname: string,
  userId: string,
  uploadId: string,
  sizeBytes: number,
): Promise<string> {
  assertManaged(pathname);
  if (!isQuarantinePathFor(pathname, userId, uploadId)) throw new Error('Upload links are only for reserved quarantine keys');
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_MOD_FILE_BYTES) {
    throw new Error('Upload size out of range');
  }
  const { client, bucket } = r2();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: pathname,
      ContentType: MOD_FILE_CONTENT_TYPE,
      ContentLength: sizeBytes,
      IfNoneMatch: '*',
    }),
    {
      expiresIn: Math.floor(UPLOAD_URL_TTL_MS / 1000),
      signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']),
    },
  );
}

/** Size of a stored object, or null if it does not exist (yet). */
export async function blobSize(pathname: string): Promise<number | null> {
  assertManaged(pathname);
  const { client, bucket } = r2();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: pathname }));
    return typeof res.ContentLength === 'number' ? res.ContentLength : null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export class BlobTooLargeError extends Error {
  constructor() {
    super('Stored file exceeds the size limit');
    this.name = 'BlobTooLargeError';
  }
}

/**
 * Read an object into memory, refusing anything over `maxBytes` without
 * buffering it. Only the first maxBytes + 1 bytes are ever requested. Returns
 * the bytes with the ETag of the exact object read, or null if it is missing.
 */
export async function readBlobCapped(
  pathname: string,
  maxBytes: number,
): Promise<{ bytes: Buffer; etag: string } | null> {
  assertManaged(pathname);
  const { client, bucket } = r2();
  let res;
  try {
    res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: pathname, Range: `bytes=0-${maxBytes}` }));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
  const etag = bareEtag(res.ETag);
  if (!etag || !res.Body) throw new Error('Storage returned an object without an ETag or body');

  // Content-Range: bytes 0-N/TOTAL tells us the real size even for a ranged read.
  const total = Number(res.ContentRange?.split('/')[1]);
  if (Number.isFinite(total) && total > maxBytes) {
    (res.Body as { destroy?: () => void }).destroy?.();
    throw new BlobTooLargeError();
  }

  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    received += chunk.byteLength;
    if (received > maxBytes) {
      (res.Body as { destroy?: () => void }).destroy?.();
      throw new BlobTooLargeError();
    }
    chunks.push(Buffer.from(chunk));
  }
  return { bytes: Buffer.concat(chunks), etag };
}

/** The stored object is not the one verify checked (its ETag changed). */
export class BlobChangedError extends Error {
  constructor() {
    super('Stored file changed after it was verified');
    this.name = 'BlobChangedError';
  }
}

/**
 * Copy a verified quarantine object to its approved key, then delete the
 * quarantine copy. The copy is conditional on `expectedEtag` (recorded by
 * verify), so only the bytes that passed the checks can ever be published.
 */
export async function promoteBlob(from: string, to: string, expectedEtag: string): Promise<void> {
  assertManaged(from);
  if (!isApprovedPath(to)) throw new Error('Promotion target must be an approved/ key');
  if (!expectedEtag) throw new Error('Refusing to promote a file with no recorded ETag');
  const { client, bucket } = r2();
  try {
    await client.send(
      new CopyObjectCommand({
      Bucket: bucket,
      Key: to,
        CopySource: `${bucket}/${from.split('/').map(encodeURIComponent).join('/')}`,
        CopySourceIfMatch: `"${expectedEtag}"`,
        ContentType: MOD_FILE_CONTENT_TYPE,
        MetadataDirective: 'REPLACE',
      }),
    );
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e?.name === 'PreconditionFailed' || e?.$metadata?.httpStatusCode === 412) throw new BlobChangedError();
    throw err;
  }
  await deleteBlob(from);
}

/** Delete an object. Missing objects are not an error. */
export async function deleteBlob(pathname: string): Promise<void> {
  assertManaged(pathname);
  const { client, bucket } = r2();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: pathname }));
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

async function presignDownload(pathname: string, downloadName: string, ttlMs: number): Promise<string> {
  const { client, bucket } = r2();
  // downloadName is already reduced to [A-Za-z0-9._-()[]] by sanitizeDownloadName;
  // strip anything else again so a header can never be split.
  const safeName = downloadName.replace(/[^A-Za-z0-9._\-()[\]]/g, '_') || 'mod-file';
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: pathname,
      ResponseContentDisposition: `attachment; filename="${safeName}"`,
      ResponseContentType: MOD_FILE_CONTENT_TYPE,
      ResponseCacheControl: 'private, no-store',
    }),
    { expiresIn: Math.floor(Math.min(ttlMs, PRESIGNED_URL_TTL_MS) / 1000) },
  );
}

/** A 5-minute link for a public download. Approved keys only. */
export async function presignPublicDownload(pathname: string, downloadName: string): Promise<string> {
  if (!isApprovedPath(pathname)) throw new Error('Only approved files can be downloaded');
  return presignDownload(pathname, downloadName, PRESIGNED_URL_TTL_MS);
}

/** A 5-minute link for an admin reviewing a file in any managed state. */
export async function presignAdminReview(pathname: string, downloadName: string): Promise<string> {
  assertManaged(pathname);
  return presignDownload(pathname, downloadName, PRESIGNED_URL_TTL_MS);
}

export interface ListedBlob {
  pathname: string;
  uploadedAt: Date;
}

/** One page of objects under mod-files/ (for the cleanup cron). */
export async function listManagedBlobs(
  cursor?: string,
): Promise<{ blobs: ListedBlob[]; cursor?: string; hasMore: boolean }> {
  const { client, bucket } = r2();
  const res = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: MOD_FILES_PREFIX, MaxKeys: 1000, ContinuationToken: cursor }),
  );
  const blobs = (res.Contents ?? [])
    .filter((o) => typeof o.Key === 'string' && o.LastModified instanceof Date)
    .map((o) => ({ pathname: o.Key as string, uploadedAt: o.LastModified as Date }));
  return { blobs, cursor: res.NextContinuationToken, hasMore: !!res.IsTruncated && !!res.NextContinuationToken };
}
