// @vitest-environment node
/**
 * The R2 storage layer, exercised with the real AWS signer and fake keys.
 * Presigning is local maths, so no request leaves the machine. These pin the
 * properties the upload/download security depends on: which headers the
 * upload link is signed over, which keys can be presigned at all, and that
 * the feature stays off on a missing or malformed setting.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_MOD_FILE_BYTES } from '@/lib/modFiles/constants';
import { approvedPath, newUploadId, quarantinePath } from '@/lib/modFiles/paths';
import {
  hostedUploadsEnabled,
  presignAdminReview,
  presignPublicDownload,
  presignQuarantineUpload,
  r2Config,
} from '@/lib/modFiles/storage';

const SECRET = 'x'.repeat(48);
const R2 = {
  MOD_FILES_R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  MOD_FILES_R2_ACCESS_KEY_ID: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  MOD_FILES_R2_SECRET_ACCESS_KEY: 'f'.repeat(64),
  MOD_FILES_R2_BUCKET: 'mhm-mod-files',
};
const env = (extra: Record<string, string>) => extra as unknown as NodeJS.ProcessEnv;

describe('feature switch', () => {
  it('is off unless every R2 setting and a strong secret are set', () => {
    expect(hostedUploadsEnabled(env({}))).toBe(false);
    expect(hostedUploadsEnabled(env(R2))).toBe(false);
    expect(hostedUploadsEnabled(env({ ...R2, NEXTAUTH_SECRET: 'short' }))).toBe(false);
    expect(hostedUploadsEnabled(env({ ...R2, NEXTAUTH_SECRET: SECRET }))).toBe(true);
    for (const key of Object.keys(R2)) {
      const partial: Record<string, string> = { ...R2, NEXTAUTH_SECRET: SECRET };
      delete partial[key];
      expect(hostedUploadsEnabled(env(partial)), key).toBe(false);
    }
  });

  it('never falls back to the public image store token or AWS credentials', () => {
    const e = env({
      BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_abc',
      AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'secret',
      NEXTAUTH_SECRET: SECRET,
    });
    expect(r2Config(e)).toBeNull();
    expect(hostedUploadsEnabled(e)).toBe(false);
  });

  it('trims stray whitespace but rejects malformed values', () => {
    const trimmed = r2Config(env({ ...R2, MOD_FILES_R2_ACCOUNT_ID: ` ${R2.MOD_FILES_R2_ACCOUNT_ID}\n` }));
    expect(trimmed?.accountId).toBe(R2.MOD_FILES_R2_ACCOUNT_ID);
    expect(r2Config(env({ ...R2, MOD_FILES_R2_ACCOUNT_ID: `${R2.MOD_FILES_R2_ACCOUNT_ID}%` }))).toBeNull();
    expect(r2Config(env({ ...R2, MOD_FILES_R2_ACCOUNT_ID: 'example.com/x' }))).toBeNull();
    expect(r2Config(env({ ...R2, MOD_FILES_R2_BUCKET: 'Bad_Bucket' }))).toBeNull();
    expect(r2Config(env({ ...R2, MOD_FILES_R2_SECRET_ACCESS_KEY: 'has space in it 1234' }))).toBeNull();
  });
});

describe('presigned links', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const [k, v] of Object.entries(R2)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
  });
  afterEach(() => {
    for (const k of Object.keys(R2)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const userId = 'cluserabc123';
  const id = newUploadId();
  const quarantine = quarantinePath(userId, id, 'zip');
  const approved = approvedPath(id, 'My_Mod.zip');

  it('upload links are signed over size, content type and create-only', async () => {
    const url = new URL(await presignQuarantineUpload(quarantine, userId, id, 1234));
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe(`${R2.MOD_FILES_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    expect(url.pathname).toBe(`/${R2.MOD_FILES_R2_BUCKET}/${quarantine}`);
    const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';');
    expect(signed).toEqual(expect.arrayContaining(['content-length', 'content-type', 'host', 'if-none-match']));
    expect(Number(url.searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(15 * 60);
    expect(url.toString()).not.toContain(R2.MOD_FILES_R2_SECRET_ACCESS_KEY);
  });

  it('upload links are only for the uploader’s own reserved quarantine key and a legal size', async () => {
    await expect(presignQuarantineUpload(approved, userId, id, 10)).rejects.toThrow();
    await expect(presignQuarantineUpload(quarantine, 'someoneelse1', id, 10)).rejects.toThrow();
    await expect(presignQuarantineUpload(quarantine, userId, newUploadId(), 10)).rejects.toThrow();
    await expect(presignQuarantineUpload('mod-images/x.zip', userId, id, 10)).rejects.toThrow();
    await expect(presignQuarantineUpload(quarantine, userId, id, 0)).rejects.toThrow();
    await expect(presignQuarantineUpload(quarantine, userId, id, MAX_MOD_FILE_BYTES + 1)).rejects.toThrow();
  });

  it('public downloads are approved keys only, saved as an attachment, for 5 minutes', async () => {
    await expect(presignPublicDownload(quarantine, 'x.zip')).rejects.toThrow();
    const url = new URL(await presignPublicDownload(approved, 'My_Mod.zip'));
    expect(url.searchParams.get('response-content-disposition')).toBe('attachment; filename="My_Mod.zip"');
    expect(url.searchParams.get('response-content-type')).toBe('application/octet-stream');
    expect(Number(url.searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(300);
  });

  it('a download name can never split the disposition header', async () => {
    const url = new URL(await presignPublicDownload(approved, 'a"; filename=evil.exe\r\nX: y'));
    const disposition = url.searchParams.get('response-content-disposition') ?? '';
    expect(disposition).toMatch(/^attachment; filename="[A-Za-z0-9._\-()[\]]+"$/);
  });

  it('admin review links cover managed keys only', async () => {
    await expect(presignAdminReview('mod-images/x.png', 'x.png')).rejects.toThrow();
    const url = new URL(await presignAdminReview(quarantine, 'x.zip'));
    expect(url.searchParams.get('response-content-disposition')).toBe('attachment; filename="x.zip"');
  });
});
