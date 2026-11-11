/**
 * Guards for the second batch of 2026-11-11 audit fixes (all red against the pre-fix tree).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const prismaMock = vi.hoisted(() => {
  const tx = {
    user: { update: vi.fn() },
    subscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  };
  return {
    tx,
    user: { delete: vi.fn() },
    waitlist: { findUnique: vi.fn(), create: vi.fn() },
    analyticsEvent: { findFirst: vi.fn(), create: vi.fn() },
    mod: { update: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
const getServerSession = vi.hoisted(() => vi.fn());
vi.mock('next-auth', () => ({ getServerSession }));
const axiosGet = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { get: axiosGet } }));
const put = vi.hoisted(() => vi.fn());
vi.mock('@vercel/blob', () => ({ put }));

const ROOT = path.resolve(__dirname, '../..');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock.tx));
});

describe('escapeHtml', () => {
  it('neutralises markup in user-submitted text', async () => {
    const { escapeHtml } = await import('@/lib/escapeHtml');
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;',
    );
    expect(escapeHtml(null)).toBe('');
  });

  it('both notification emails escape every submitted field', () => {
    for (const rel of ['app/api/admin/submissions/[id]/reject/route.ts', 'app/api/submit-mod/route.ts']) {
      const src = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      expect(src, rel).not.toMatch(/<\/strong> \$\{(submission\.(modName|category|modUrl|submitterName)|reason)\}/);
    }
  });
});

describe('admin user route', () => {
  const admin = { user: { id: 'admin-1', isAdmin: true } };

  it('an admin cannot delete their own account', async () => {
    getServerSession.mockResolvedValue(admin);
    const { DELETE } = await import('@/app/api/admin/users/[id]/route');
    const res = await DELETE(new NextRequest('http://localhost/api/admin/users/admin-1/', { method: 'DELETE' }), {
      params: { id: 'admin-1' },
    });
    expect(res.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it('revoking premium downgrades the non-Stripe subscription row', async () => {
    getServerSession.mockResolvedValue(admin);
    prismaMock.tx.user.update.mockResolvedValue({ id: 'u2', isAdmin: false, isPremium: false });
    const { PATCH } = await import('@/app/api/admin/users/[id]/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/users/u2/', { method: 'PATCH', body: JSON.stringify({ isPremium: false }) }),
      { params: { id: 'u2' } },
    );
    expect(res.status).toBe(200);
    expect(prismaMock.tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u2', stripeSubscriptionId: null },
      data: { isPremium: false, clickLimit: 5 },
    });
  });

  it('revoking premium from an admin leaves the subscription alone', async () => {
    getServerSession.mockResolvedValue(admin);
    prismaMock.tx.user.update.mockResolvedValue({ id: 'u3', isAdmin: true, isPremium: false });
    const { PATCH } = await import('@/app/api/admin/users/[id]/route');
    await PATCH(
      new NextRequest('http://localhost/api/admin/users/u3/', { method: 'PATCH', body: JSON.stringify({ isPremium: false }) }),
      { params: { id: 'u3' } },
    );
    expect(prismaMock.tx.subscription.updateMany).not.toHaveBeenCalled();
  });
});

describe('waitlist create race', () => {
  it('a unique-index collision is "already on the list", not a 500', async () => {
    prismaMock.waitlist.findUnique.mockResolvedValue(null);
    prismaMock.waitlist.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const { POST } = await import('@/app/api/waitlist/route');
    const res = await POST(
      new NextRequest('http://localhost/api/waitlist/', {
        method: 'POST',
        body: JSON.stringify({ email: 'race@example.com', source: 'home' }),
        headers: { 'x-forwarded-for': '203.0.113.9' },
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyExists).toBe(true);
  });
});

describe('download counter', () => {
  const post = async () => {
    const { POST } = await import('@/app/api/analytics/track/route');
    return POST(
      new NextRequest('http://localhost/api/analytics/track/', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'DOWNLOAD_CLICK', modId: 'm1', sessionId: 's1', page: '/go/m1/' }),
      }),
    );
  };

  it('first download in the window increments the counter', async () => {
    prismaMock.analyticsEvent.findFirst.mockResolvedValue(null);
    prismaMock.analyticsEvent.create.mockResolvedValue({});
    prismaMock.mod.update.mockResolvedValue({});
    await post();
    expect(prismaMock.mod.update).toHaveBeenCalledTimes(1);
  });

  it('a repeat from the same session is logged but does not move the counter', async () => {
    prismaMock.analyticsEvent.findFirst.mockResolvedValue({ id: 'e0' });
    prismaMock.analyticsEvent.create.mockResolvedValue({});
    await post();
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.mod.update).not.toHaveBeenCalled();
    expect(prismaMock.analyticsEvent.findFirst.mock.calls[0][0].where).toMatchObject({
      eventType: 'DOWNLOAD_CLICK',
      modId: 'm1',
      sessionId: 's1',
    });
  });

  it('subscription click tracking no longer increments Mod.downloadCount as well', () => {
    const src = stripComments(fs.readFileSync(path.join(ROOT, 'lib/services/subscriptionService.ts'), 'utf8'));
    expect(src).not.toMatch(/downloadCount:\s*\{\s*increment/);
  });
});

describe('re-hosting a remote image', () => {
  it('refuses SVG and non-image responses, and caps the download size', async () => {
    const { uploadImageToBlob } = await import('@/lib/services/imageUploader');
    const { MAX_UPLOAD_IMAGE_BYTES } = await import('@/lib/imageUpload');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    axiosGet.mockResolvedValue({ headers: { 'content-type': 'image/svg+xml' }, data: Buffer.from('<svg/>') });
    expect(await uploadImageToBlob('https://example.com/a.svg')).toBeNull();
    axiosGet.mockResolvedValue({ headers: { 'content-type': 'text/html; charset=utf-8' }, data: Buffer.from('x') });
    expect(await uploadImageToBlob('https://example.com/a.png')).toBeNull();
    expect(put).not.toHaveBeenCalled();
    expect(axiosGet.mock.calls[0][1].maxContentLength).toBe(MAX_UPLOAD_IMAGE_BYTES);

    put.mockResolvedValue({ url: 'https://blob.example/x.png' });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    axiosGet.mockResolvedValue({ headers: { 'content-type': 'image/png' }, data: Buffer.from('x') });
    expect(await uploadImageToBlob('https://example.com/a.png')).toBe('https://blob.example/x.png');
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});
