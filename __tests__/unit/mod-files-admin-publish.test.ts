// @vitest-environment node
/**
 * An admin creating a mod directly publishes their own hosted upload
 * (publishOwnUpload) and links it to the new mod (finalizeUploadApproval).
 * The database and the bucket are mocked; these pin the rules: only the
 * admin's own verified, unattached file; the copy is pinned to the ETag
 * verify recorded; a retry is safe; two racing requests cannot both win.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { modUpload: db } }));

const blob = vi.hoisted(() => ({ promoteBlob: vi.fn(), deleteBlob: vi.fn() }));
vi.mock('@/lib/modFiles/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/modFiles/storage')>()),
  promoteBlob: blob.promoteBlob,
  deleteBlob: blob.deleteBlob,
}));

import { finalizeUploadApproval, publishOwnUpload } from '@/lib/modFiles/lifecycle';
import { approvedPath, newUploadId, quarantinePath } from '@/lib/modFiles/paths';
import { BlobChangedError } from '@/lib/modFiles/storage';

const ADMIN = 'cladmin00001';
const id = newUploadId();
const verified = {
  uploaderId: ADMIN,
  status: 'verified',
  submissionId: null,
  modId: null,
  blobPathname: quarantinePath(ADMIN, id, 'zip'),
  blobDeletedAt: null,
  downloadName: 'My_Mod.zip',
  blobEtag: '"etag-from-verify"',
};

beforeEach(() => {
  vi.clearAllMocks();
  db.updateMany.mockResolvedValue({ count: 1 });
  db.findMany.mockResolvedValue([]);
});

describe('publishOwnUpload', () => {
  it('no file → ok with nothing to publish, and no lookups', async () => {
    for (const none of [undefined, null, '']) {
      expect(await publishOwnUpload(none, ADMIN)).toEqual({ ok: true, uploadId: null });
    }
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a malformed reference before touching the database', async () => {
    expect(await publishOwnUpload('../../etc', ADMIN)).toMatchObject({ ok: false, status: 400 });
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a file that is not the admin’s own', async () => {
    db.findUnique.mockResolvedValue({ ...verified, uploaderId: 'clsomeoneelse' });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 404 });
    db.findUnique.mockResolvedValue(null);
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 404 });
    expect(blob.promoteBlob).not.toHaveBeenCalled();
  });

  it('refuses a file attached to a submission, or one that has not passed checks', async () => {
    db.findUnique.mockResolvedValue({ ...verified, submissionId: 'clsub0000001' });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
    for (const status of ['pending_upload', 'rejected', 'expired', 'removed', 'superseded']) {
      db.findUnique.mockResolvedValue({ ...verified, status });
      expect(await publishOwnUpload(id, ADMIN), status).toMatchObject({ ok: false, status: 409 });
    }
    db.findUnique.mockResolvedValue({ ...verified, blobEtag: null });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
    expect(blob.promoteBlob).not.toHaveBeenCalled();
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it('copies a verified file out of quarantine on the verified ETag, then marks it approved', async () => {
    db.findUnique.mockResolvedValue(verified);
    expect(await publishOwnUpload(id, ADMIN)).toEqual({ ok: true, uploadId: id });
    expect(blob.promoteBlob).toHaveBeenCalledWith(verified.blobPathname, approvedPath(id, 'My_Mod.zip'), verified.blobEtag);
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id, uploaderId: ADMIN, status: 'verified', submissionId: null },
      data: expect.objectContaining({ status: 'approved', blobPathname: approvedPath(id, 'My_Mod.zip'), reviewedBy: ADMIN }),
    });
  });

  it('a file whose bytes changed after verify is never published', async () => {
    db.findUnique.mockResolvedValue(verified);
    blob.promoteBlob.mockRejectedValueOnce(new BlobChangedError());
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it('loses cleanly when the row changed during the copy', async () => {
    db.findUnique.mockResolvedValue(verified);
    db.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
  });

  it('a retry after a failed mod write reuses the published file without copying again', async () => {
    db.findUnique.mockResolvedValue({ ...verified, status: 'approved', blobPathname: approvedPath(id, 'My_Mod.zip') });
    expect(await publishOwnUpload(id, ADMIN)).toEqual({ ok: true, uploadId: id });
    expect(blob.promoteBlob).not.toHaveBeenCalled();
  });

  it('never reuses a published file that already has a mod or whose bytes are gone', async () => {
    const published = { ...verified, status: 'approved', blobPathname: approvedPath(id, 'My_Mod.zip') };
    db.findUnique.mockResolvedValue({ ...published, modId: 'clmod0000001' });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
    db.findUnique.mockResolvedValue({ ...published, blobDeletedAt: new Date() });
    expect(await publishOwnUpload(id, ADMIN)).toMatchObject({ ok: false, status: 409 });
  });
});

describe('finalizeUploadApproval', () => {
  it('links the file only if no mod has it yet, then retires the mod’s older file', async () => {
    db.findMany.mockResolvedValue([{ id: 'old', blobPathname: approvedPath(newUploadId(), 'Old.zip') }]);
    expect(await finalizeUploadApproval(id, 'clmod0000001')).toBe(true);
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id, status: 'approved', modId: null },
      data: { modId: 'clmod0000001' },
    });
    expect(db.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { status: 'superseded' } });
  });

  it('returns false, and retires nothing, when another request linked the file first', async () => {
    db.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await finalizeUploadApproval(id, 'clmod0000002')).toBe(false);
    expect(db.findMany).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
