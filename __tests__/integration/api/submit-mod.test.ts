import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

vi.mock('@/lib/services/turnstile', () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

vi.mock('@/lib/services/emailNotifier', () => ({
  emailNotifier: {
    send: vi.fn(),
  },
}));

import { verifyTurnstileToken } from '@/lib/services/turnstile';
import { emailNotifier } from '@/lib/services/emailNotifier';
import { put } from '@vercel/blob';
import { POST } from '@/app/api/submit-mod/route';

const BLOB_URL = 'https://abc.public.blob.vercel-storage.com/mods/submissions/preview-x1.jpg';
// A few bytes that start with the JPEG magic number.
const TINY_JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]).toString('base64')}`;

const validPayload = {
  modUrl: 'https://example.com/my-mod',
  modName: 'My Mod',
  description: 'This is a valid mod description.',
  category: 'Furniture',
  submitterName: 'Test User',
  submitterEmail: 'test@example.com',
  captchaToken: 'captcha-ok',
  imageData: TINY_JPEG,
};

function post(body: unknown, ip: string) {
  return POST(
    new NextRequest('http://localhost:3000/api/submit-mod', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    })
  );
}

describe('API /api/submit-mod', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    vi.mocked(emailNotifier.send).mockResolvedValue(true);
    vi.mocked(put).mockResolvedValue({ url: BLOB_URL } as any);
    delete process.env.SUBMISSIONS_ALERT_EMAIL;
    delete process.env.ADMIN_EMAIL;
  });

  it('creates a submission and sends admin email when alert email is configured', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    process.env.SUBMISSIONS_ALERT_EMAIL = 'admin@example.com';

    mockPrismaClient.modSubmission.findFirst.mockResolvedValue(null);
    mockPrismaClient.modSubmission.create.mockResolvedValue({
      id: 'submission-1',
      modName: validPayload.modName,
      category: validPayload.category,
      modUrl: validPayload.modUrl,
      submitterName: validPayload.submitterName,
      submitterEmail: validPayload.submitterEmail,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/submit-mod', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(mockPrismaClient.modSubmission.create).toHaveBeenCalledTimes(1);
    const created = mockPrismaClient.modSubmission.create.mock.calls[0][0] as any;
    expect(created.data.thumbnail).toBe(BLOB_URL);
    expect(created.data.images).toEqual([BLOB_URL]);
    expect(put).toHaveBeenCalledWith(
      'mods/submissions/preview.jpg',
      expect.any(Buffer),
      expect.objectContaining({ access: 'public', contentType: 'image/jpeg', addRandomSuffix: true })
    );
    expect(emailNotifier.send).toHaveBeenCalledWith(
      'admin@example.com',
      expect.stringContaining('New mod submission'),
      expect.stringContaining(validPayload.modName)
    );
  });

  it('returns 409 when the mod was already submitted recently', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    mockPrismaClient.modSubmission.findFirst.mockResolvedValue({ id: 'existing' } as any);

    const request = new NextRequest('http://localhost:3000/api/submit-mod', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.success).toBe(false);
    expect(mockPrismaClient.modSubmission.create).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('returns 400 with errors.image when no image is attached', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    const response = await post({ ...validPayload, imageData: undefined }, '10.0.0.4');
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.image).toMatch(/preview image/i);
    expect(put).not.toHaveBeenCalled();
    expect(mockPrismaClient.modSubmission.create).not.toHaveBeenCalled();
  });

  it('rejects bytes that are not a picture, whatever the data URL claims', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    const fake = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    const response = await post({ ...validPayload, imageData: fake }, '10.0.0.5');
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.image).toMatch(/JPG, PNG or WebP/);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects an image over the size cap', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    const big = Buffer.alloc(3 * 1024 * 1024 + 10, 0);
    big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
    const response = await post(
      { ...validPayload, imageData: `data:image/jpeg;base64,${big.toString('base64')}` },
      '10.0.0.6'
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.image).toMatch(/too large/);
    expect(put).not.toHaveBeenCalled();
  });

  it('never stores the image when the CAPTCHA fails', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: false } as any);
    const response = await post(validPayload, '10.0.0.7');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(put).not.toHaveBeenCalled();
    expect(mockPrismaClient.modSubmission.create).not.toHaveBeenCalled();
  });

  it('returns 502 and creates nothing when the image cannot be stored', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    mockPrismaClient.modSubmission.findFirst.mockResolvedValue(null);
    vi.mocked(put).mockRejectedValue(new Error('blob down'));
    const response = await post(validPayload, '10.0.0.8');

    expect(response.status).toBe(502);
    expect(mockPrismaClient.modSubmission.create).not.toHaveBeenCalled();
  });

  it('returns 400 when captcha token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/submit-mod', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.3' },
      body: JSON.stringify({
        ...validPayload,
        captchaToken: undefined,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(vi.mocked(verifyTurnstileToken)).not.toHaveBeenCalled();
  });
});
