import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

vi.mock('@/lib/services/turnstile', () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock('@/lib/services/emailNotifier', () => ({
  emailNotifier: {
    send: vi.fn(),
  },
}));

import { verifyTurnstileToken } from '@/lib/services/turnstile';
import { emailNotifier } from '@/lib/services/emailNotifier';
import { POST } from '@/app/api/submit-mod/route';

const validPayload = {
  modUrl: 'https://example.com/my-mod',
  modName: 'My Mod',
  description: 'This is a valid mod description.',
  category: 'Furniture',
  submitterName: 'Test User',
  submitterEmail: 'test@example.com',
  captchaToken: 'captcha-ok',
};

describe('API /api/submit-mod', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    vi.mocked(emailNotifier.send).mockResolvedValue(true);
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
