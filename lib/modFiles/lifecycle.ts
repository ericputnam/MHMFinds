/**
 * State transitions for a hosted mod file. Every route that moves a ModUpload
 * between states goes through here, so the rules live in one place:
 *
 *   pending_upload ─verify ok─▶ verified ─approve─▶ approved ─new version─▶ superseded
 *         │                       │                    │
 *         └─verify fails─▶ rejected ◀─submission rejected     └─admin takedown─▶ removed
 *         └─never uploaded─▶ expired (cron)
 *
 * A file is downloadable by the public only in `approved` with a modId and an
 * `approved/` blob path. Every other state either has no blob or a blob that
 * only an admin can presign.
 */
import { prisma } from '@/lib/prisma';
import { approvedPath, isApprovedPath, isUploadId } from './paths';
import { BlobChangedError, deleteBlob, promoteBlob } from './storage';

export type AttachCheck =
  | { ok: true; uploadId: string }
  | { ok: false; status: number; error: string };

/**
 * Check that `uploadId` (from the request body) can be attached to a new
 * submission by `userId`: it must be theirs, verified, and not already used.
 * Absent / empty → ok with no upload.
 */
export async function checkAttachableUpload(
  uploadId: unknown,
  userId: string,
): Promise<AttachCheck | { ok: true; uploadId: null }> {
  if (uploadId === undefined || uploadId === null || uploadId === '') return { ok: true, uploadId: null };
  if (!isUploadId(uploadId)) return { ok: false, status: 400, error: 'Invalid uploaded file reference' };
  const row = await prisma.modUpload.findUnique({
    where: { id: uploadId },
    select: { uploaderId: true, status: true, submissionId: true },
  });
  if (!row || row.uploaderId !== userId) {
    return { ok: false, status: 404, error: 'Uploaded file not found' };
  }
  if (row.status !== 'verified') {
    return { ok: false, status: 409, error: 'That file has not passed checks yet. Upload it again.' };
  }
  if (row.submissionId) {
    return { ok: false, status: 409, error: 'That file is already attached to another submission' };
  }
  return { ok: true, uploadId };
}

/**
 * Attach after the submission row exists. Conditional on the same predicate
 * the check used, so a concurrent attach loses cleanly. Returns false when
 * the upload was taken in between (the caller deletes its submission).
 */
export async function attachUpload(uploadId: string, userId: string, submissionId: string): Promise<boolean> {
  const res = await prisma.modUpload.updateMany({
    where: { id: uploadId, uploaderId: userId, status: 'verified', submissionId: null },
    data: { submissionId },
  });
  return res.count === 1;
}

export type ApprovalPrep =
  | { ok: true; uploadId: string | null }
  | { ok: false; error: string };

/**
 * Before an approval writes the mod: move a verified file out of quarantine.
 * Idempotent — a retry after a failed mod write finds the row already
 * `approved` with no modId and skips the copy.
 */
export async function prepareUploadForApproval(submissionId: string, adminId: string): Promise<ApprovalPrep> {
  const upload = await prisma.modUpload.findUnique({
    where: { submissionId },
    select: { id: true, status: true, modId: true, blobPathname: true, downloadName: true, blobEtag: true },
  });
  if (!upload) return { ok: true, uploadId: null };

  if (upload.status === 'approved' && !upload.modId && isApprovedPath(upload.blobPathname)) {
    return { ok: true, uploadId: upload.id };
  }
  if (upload.status !== 'verified') {
    return {
      ok: false,
      error: `The attached file is "${upload.status}", not verified. Reject the submission or ask the creator to re-upload.`,
    };
  }

  if (!upload.blobEtag) {
    return { ok: false, error: 'The attached file has no verification record. Ask the creator to re-upload.' };
  }
  const dest = approvedPath(upload.id, upload.downloadName);
  try {
    await promoteBlob(upload.blobPathname, dest, upload.blobEtag);
  } catch (err) {
    if (err instanceof BlobChangedError) {
      return { ok: false, error: 'The stored file changed after it was checked. Reject this submission.' };
    }
    throw err;
  }
  const res = await prisma.modUpload.updateMany({
    where: { id: upload.id, status: 'verified' },
    data: { status: 'approved', blobPathname: dest, reviewedBy: adminId, reviewedAt: new Date() },
  });
  if (res.count !== 1) return { ok: false, error: 'The attached file changed during approval. Try again.' };
  return { ok: true, uploadId: upload.id };
}

export type PublishCheck =
  | { ok: true; uploadId: string | null }
  | { ok: false; status: number; error: string };

/**
 * An admin creating a mod directly (POST /api/admin/mods) publishes their
 * own upload with no submission in between: the admin is both uploader and
 * reviewer. The file must be theirs, verified, and not attached to a
 * submission, and it is copied out of quarantine on the same ETag pin as a
 * reviewed submission. Call it before the mod is written; idempotent, so a
 * retry after a failed mod write finds the row already `approved` with no
 * modId and skips the copy. Absent / empty → ok with no upload.
 */
export async function publishOwnUpload(uploadId: unknown, adminId: string): Promise<PublishCheck> {
  if (uploadId === undefined || uploadId === null || uploadId === '') return { ok: true, uploadId: null };
  if (!isUploadId(uploadId)) return { ok: false, status: 400, error: 'Invalid uploaded file reference' };
  const upload = await prisma.modUpload.findUnique({
    where: { id: uploadId },
    select: {
      uploaderId: true,
      status: true,
      submissionId: true,
      modId: true,
      blobPathname: true,
      blobDeletedAt: true,
      downloadName: true,
      blobEtag: true,
    },
  });
  if (!upload || upload.uploaderId !== adminId) {
    return { ok: false, status: 404, error: 'Uploaded file not found' };
  }
  if (upload.submissionId) {
    return { ok: false, status: 409, error: 'That file is attached to a submission. Approve the submission instead.' };
  }
  if (
    upload.status === 'approved' &&
    !upload.modId &&
    !upload.blobDeletedAt &&
    isApprovedPath(upload.blobPathname)
  ) {
    return { ok: true, uploadId };
  }
  if (upload.status !== 'verified') {
    return { ok: false, status: 409, error: 'That file has not passed checks yet. Upload it again.' };
  }
  if (!upload.blobEtag) {
    return { ok: false, status: 409, error: 'That file has no verification record. Upload it again.' };
  }

  const dest = approvedPath(uploadId, upload.downloadName);
  try {
    await promoteBlob(upload.blobPathname, dest, upload.blobEtag);
  } catch (err) {
    if (err instanceof BlobChangedError) {
      return { ok: false, status: 409, error: 'The stored file changed after it was checked. Upload it again.' };
    }
    throw err;
  }
  const res = await prisma.modUpload.updateMany({
    where: { id: uploadId, uploaderId: adminId, status: 'verified', submissionId: null },
    data: { status: 'approved', blobPathname: dest, reviewedBy: adminId, reviewedAt: new Date() },
  });
  if (res.count !== 1) return { ok: false, status: 409, error: 'The file changed while it was being published. Try again.' };
  return { ok: true, uploadId };
}

/**
 * After the mod row exists: point the file at it and retire any earlier
 * hosted file for the same mod (a new version replaces the old one).
 * Old blobs are deleted best effort; the cleanup cron retries.
 *
 * The link is conditional on the file not already belonging to a mod, so
 * two requests racing to publish the same file cannot both win. Returns
 * false when the file was taken in between (the caller undoes its mod).
 */
export async function finalizeUploadApproval(uploadId: string, modId: string): Promise<boolean> {
  const claimed = await prisma.modUpload.updateMany({
    where: { id: uploadId, status: 'approved', modId: null },
    data: { modId },
  });
  if (claimed.count !== 1) return false;

  const older = await prisma.modUpload.findMany({
    where: { modId, status: 'approved', id: { not: uploadId } },
    select: { id: true, blobPathname: true },
  });
  for (const row of older) {
    await prisma.modUpload.update({ where: { id: row.id }, data: { status: 'superseded' } });
    try {
      await deleteBlob(row.blobPathname);
      await prisma.modUpload.update({ where: { id: row.id }, data: { blobDeletedAt: new Date() } });
    } catch (err) {
      console.error('[mod-files] could not delete superseded blob (cron will retry):', (err as Error).message);
    }
  }
  return true;
}

/**
 * Discard the file attached to a rejected submission. The row stays as a
 * record; the bytes go.
 */
export async function discardUploadForSubmission(submissionId: string, adminId: string): Promise<void> {
  const upload = await prisma.modUpload.findUnique({
    where: { submissionId },
    select: { id: true, status: true, blobPathname: true, blobDeletedAt: true },
  });
  if (!upload || upload.status === 'approved') return;
  await prisma.modUpload.update({
    where: { id: upload.id },
    data: { status: 'rejected', reviewedBy: adminId, reviewedAt: new Date() },
  });
  if (upload.blobDeletedAt) return;
  try {
    await deleteBlob(upload.blobPathname);
    await prisma.modUpload.update({ where: { id: upload.id }, data: { blobDeletedAt: new Date() } });
  } catch (err) {
    console.error('[mod-files] could not delete rejected blob (cron will retry):', (err as Error).message);
  }
}

/** Public, non-sensitive description of a mod's current hosted file. */
export const HOSTED_FILE_SELECT = {
  id: true,
  downloadName: true,
  sizeBytes: true,
  kind: true,
  containsScript: true,
  updatedAt: true,
} as const;

export async function findHostedFile(modId: string) {
  const row = await prisma.modUpload.findFirst({
    where: { modId, status: 'approved' },
    orderBy: { reviewedAt: 'desc' },
    select: { ...HOSTED_FILE_SELECT, blobPathname: true },
  });
  if (!row || !isApprovedPath(row.blobPathname)) return null;
  return {
    id: row.id,
    downloadName: row.downloadName,
    sizeBytes: row.sizeBytes,
    kind: row.kind,
    containsScript: row.containsScript,
    updatedAt: row.updatedAt,
  };
}
