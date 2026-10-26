/**
 * Patreon image addresses (c10.patreonusercontent.com/...?token-hash=&token-time=)
 * are signed, expire, and aren't in next.config.js images.remotePatterns, so a
 * mod saved with one shows a broken image (/_next/image → 400). Writer report
 * 2026-10-23, "Waste soil set". Admin saves now copy them to Vercel Blob, and
 * the admin forms can upload an image file directly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const { axiosGet, blobPut, getSession, handleUpload } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  blobPut: vi.fn(),
  getSession: vi.fn(),
  handleUpload: vi.fn(),
}));

vi.mock('axios', () => ({ default: { get: axiosGet } }));
vi.mock('@vercel/blob', () => ({ put: blobPut }));
vi.mock('next-auth', () => ({ getServerSession: getSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
vi.mock('@vercel/blob/client', () => ({ handleUpload }));

import { needsRehost, MAX_UPLOAD_IMAGE_BYTES } from '../../lib/imageUpload';
import { rehostModImages, ImageRehostError } from '../../lib/services/imageUploader';
import { POST as uploadImagePOST } from '../../app/api/admin/upload-image/route';

const PATREON =
  'https://c10.patreonusercontent.com/4/patreon-media/p/post/129701515/a7b3/eyJ3IjoxMDgwfQ%3D%3D/1.PNG?token-hash=abc%3D&token-time=1793836800';
const BLOB = 'https://abc.public.blob.vercel-storage.com/mods/uploads/x.png';

describe('needsRehost', () => {
  it('flags Patreon signed image hosts', () => {
    expect(needsRehost(PATREON)).toBe(true);
    expect(needsRehost('https://patreonusercontent.com/a.png')).toBe(true);
  });

  it('leaves hosts that already render alone', () => {
    expect(needsRehost('https://blog.musthavemods.com/wp-content/uploads/a.jpg')).toBe(false);
    expect(needsRehost('https://cdn.patreon.com/a.png')).toBe(false);
    expect(needsRehost(BLOB)).toBe(false);
    expect(needsRehost('https://evilpatreonusercontent.com/a.png')).toBe(false);
    expect(needsRehost('')).toBe(false);
    expect(needsRehost('not a url')).toBe(false);
  });
});

describe('rehostModImages', () => {
  beforeEach(() => {
    axiosGet.mockReset();
    blobPut.mockReset();
  });

  it('copies Patreon thumbnail and images to Blob and keeps other URLs', async () => {
    axiosGet.mockResolvedValue({ data: Buffer.from('png'), headers: { 'content-type': 'image/png' } });
    blobPut.mockResolvedValue({ url: BLOB });

    const out = await rehostModImages({
      title: 'Waste soil set',
      thumbnail: PATREON,
      images: ['https://media.tumblr.com/a.jpg', PATREON],
    });

    expect(out.thumbnail).toBe(BLOB);
    expect(out.images).toEqual(['https://media.tumblr.com/a.jpg', BLOB]);
    expect(out.title).toBe('Waste soil set');
    expect(blobPut).toHaveBeenCalledTimes(2);
    expect(blobPut.mock.calls[0][0]).toMatch(/^mods\/uploads\/.+\.png$/);
  });

  it('does nothing when no URL needs re-hosting (PATCH without image fields)', async () => {
    const body: { title: string; thumbnail?: string } = { title: 'x' };
    expect(await rehostModImages(body)).toEqual(body);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('throws ImageRehostError when the Patreon image cannot be fetched', async () => {
    axiosGet.mockRejectedValue(new Error('403'));
    await expect(rehostModImages({ thumbnail: PATREON })).rejects.toBeInstanceOf(ImageRehostError);
  });
});

describe('POST /api/admin/upload-image', () => {
  const req = (body: unknown) =>
    new Request('http://localhost/api/admin/upload-image/', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as any;

  beforeEach(() => {
    getSession.mockReset();
    handleUpload.mockReset();
  });

  it('rejects non-admins before issuing any token', async () => {
    getSession.mockResolvedValue({ user: { isAdmin: false } });
    const res = await uploadImagePOST(req({ type: 'blob.generate-client-token' }));
    expect(res.status).toBe(401);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it('issues a token limited to images under mods/uploads/', async () => {
    getSession.mockResolvedValue({ user: { isAdmin: true } });
    handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const opts = await onBeforeGenerateToken('mods/uploads/a.png', null, false);
      expect(opts.allowedContentTypes).not.toContain('image/svg+xml');
      expect(opts.maximumSizeInBytes).toBe(MAX_UPLOAD_IMAGE_BYTES);
      await expect(onBeforeGenerateToken('../other/a.png', null, false)).rejects.toThrow();
      return { type: 'blob.generate-client-token', clientToken: 't' };
    });
    const res = await uploadImagePOST(req({ type: 'blob.generate-client-token' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 'blob.generate-client-token', clientToken: 't' });
  });
});

describe('admin mod routes re-host before writing', () => {
  const src = (p: string) => readFileSync(path.join(__dirname, '../../', p), 'utf8');

  it.each([
    'app/api/admin/mods/route.ts',
    'app/api/admin/mods/[id]/route.ts',
    'app/api/admin/submissions/[id]/approve/route.ts',
  ])('%s calls rehostModImages', (file) => {
    expect(src(file)).toMatch(/rehostModImages\(/);
  });

  it('upload route checks admin session', () => {
    expect(src('app/api/admin/upload-image/route.ts')).toMatch(/session\?\.user\?\.isAdmin/);
  });
});
