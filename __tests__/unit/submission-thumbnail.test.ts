/**
 * No mod goes live without a thumbnail (2026-11-22).
 *
 * ErinAOK's claim came through /submit-mod, which has no image field, and
 * was approved into a mod with a blank card. Covers the pure rule, both
 * approval paths, and the review page.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { db, prismaMock, requireAdmin, send } = vi.hoisted(() => {
  const db = {
    submissionFindUnique: vi.fn(),
    submissionUpdate: vi.fn(),
    modCreate: vi.fn(),
    modUpdate: vi.fn(),
  };
  const prismaMock = {
    modSubmission: {
      findUnique: (...a: unknown[]) => db.submissionFindUnique(...a),
      update: (...a: unknown[]) => db.submissionUpdate(...a),
    },
    mod: {
      create: (...a: unknown[]) => db.modCreate(...a),
      update: (...a: unknown[]) => db.modUpdate(...a),
    },
    creatorProfile: { create: vi.fn(), findUnique: vi.fn() },
  };
  return { db, prismaMock, requireAdmin: vi.fn(), send: vi.fn() };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock('@/lib/middleware/auth', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));
vi.mock('@/lib/services/emailNotifier', () => ({
  emailNotifier: { send: (...a: unknown[]) => send(...a) },
}));

import { POST } from '@/app/api/admin/submissions/[id]/approve/route';
import {
  MISSING_THUMBNAIL_ERROR,
  isAllowedThumbnailOverride,
  resolveApprovalThumbnail,
} from '@/lib/submissionThumbnail';

const BLOB = 'https://abc123.public.blob.vercel-storage.com/mods/uploads/gown.jpg';

describe('resolveApprovalThumbnail (pure)', () => {
  it('is null for a submission with no image at all — the ErinAOK case', () => {
    expect(resolveApprovalThumbnail({ thumbnail: null, images: [] })).toBeNull();
    expect(resolveApprovalThumbnail({ thumbnail: '  ', images: ['', ' '] })).toBeNull();
  });

  it('prefers the reviewer upload, then the thumbnail, then the first image', () => {
    expect(resolveApprovalThumbnail({ override: BLOB, thumbnail: 'https://x.test/t.jpg', images: [] })).toBe(BLOB);
    expect(resolveApprovalThumbnail({ thumbnail: 'https://x.test/t.jpg', images: ['https://x.test/1.jpg'] })).toBe(
      'https://x.test/t.jpg'
    );
    expect(resolveApprovalThumbnail({ thumbnail: null, images: ['', 'https://x.test/1.jpg'] })).toBe(
      'https://x.test/1.jpg'
    );
  });

  it("keeps an edited mod's current thumbnail when the edit carries none", () => {
    expect(resolveApprovalThumbnail({ thumbnail: null, images: [], existingModThumbnail: BLOB })).toBe(BLOB);
  });

  it('accepts only https uploads on our Blob store as an override', () => {
    expect(isAllowedThumbnailOverride(BLOB)).toBe(true);
    expect(isAllowedThumbnailOverride('http://abc123.public.blob.vercel-storage.com/a.jpg')).toBe(false);
    expect(isAllowedThumbnailOverride('https://evil.example/a.jpg')).toBe(false);
    expect(isAllowedThumbnailOverride('https://public.blob.vercel-storage.com.evil.example/a.jpg')).toBe(false);
    expect(isAllowedThumbnailOverride('javascript:alert(1)')).toBe(false);
    expect(isAllowedThumbnailOverride(42)).toBe(false);
    // A bad override is ignored, never used.
    expect(resolveApprovalThumbnail({ override: 'https://evil.example/a.jpg', thumbnail: null, images: [] })).toBeNull();
  });
});

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    status: 'pending',
    isEdit: false,
    approvedModId: null,
    userId: null,
    submitterEmail: 'creator@example.com',
    submitterName: 'Erin A',
    modName: "Women's Aurelia Gown",
    description: 'd',
    shortDescription: null,
    version: null,
    gameVersion: null,
    category: 'CAS',
    tags: [],
    thumbnail: null,
    images: [],
    downloadUrl: null,
    sourceUrl: null,
    modUrl: 'https://www.patreon.com/ErinAOK/posts/erinaok-womens-175759378',
    source: 'Creator Claim',
    author: 'erinaok',
    isFree: true,
    price: null,
    currency: 'USD',
    isNSFW: false,
    user: null,
    approvedMod: null,
    upload: null,
    ...overrides,
  };
}

const call = (body?: unknown) =>
  POST(
    new NextRequest('http://localhost/api/admin/submissions/s1/approve/', {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    }),
    { params: { id: 's1' } }
  );

describe('POST /api/admin/submissions/[id]/approve — thumbnail gate', () => {
  beforeEach(() => {
    Object.values(db).forEach((f) => f.mockReset());
    send.mockReset();
    send.mockResolvedValue(true);
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({ authorized: true, session: {}, user: { id: 'admin1', isAdmin: true } });
    db.modCreate.mockResolvedValue({ id: 'm1' });
    db.modUpdate.mockResolvedValue({ id: 'm0' });
    db.submissionUpdate.mockResolvedValue({});
  });

  it('refuses a submission with no image and writes nothing', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    const res = await call();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(MISSING_THUMBNAIL_ERROR);
    expect(json.code).toBe('missing_thumbnail');
    expect(db.modCreate).not.toHaveBeenCalled();
    expect(db.submissionUpdate).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('approves with the thumbnail the reviewer uploaded', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    const res = await call({ thumbnail: BLOB });
    expect(res.status).toBe(200);
    expect(db.modCreate.mock.calls[0][0].data.thumbnail).toBe(BLOB);
  });

  it('rejects an override that is not one of our uploads', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ thumbnail: BLOB }));
    const res = await call({ thumbnail: 'https://evil.example/a.jpg' });
    expect(res.status).toBe(400);
    expect(db.modCreate).not.toHaveBeenCalled();
  });

  it("uses the submission's first image when it has no thumbnail", async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ images: [BLOB] }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(db.modCreate.mock.calls[0][0].data.thumbnail).toBe(BLOB);
  });

  it("an edit without an image keeps the mod's thumbnail instead of wiping it", async () => {
    db.submissionFindUnique.mockResolvedValue(
      submission({ isEdit: true, approvedModId: 'm0', approvedMod: { id: 'm0', thumbnail: BLOB } })
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect(db.modUpdate.mock.calls[0][0].data.thumbnail).toBe(BLOB);
  });
});

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('other approval surfaces', () => {
  it('the scripted approval skips a row with no thumbnail before it writes', () => {
    const src = strip(readFileSync(join(process.cwd(), 'scripts/agents/approve-submissions.ts'), 'utf8'));
    const gate = src.indexOf('resolveApprovalThumbnail(');
    expect(gate).toBeGreaterThan(-1);
    expect(src.slice(gate, gate + 400)).toMatch(/if \(!resolvedThumbnail\)[\s\S]*?continue;/);
    expect(gate).toBeLessThan(src.indexOf('tx.mod.create('));
  });

  it('the review page offers an upload and sends it with the approval', () => {
    const src = strip(readFileSync(join(process.cwd(), 'app/admin/submissions/page.tsx'), 'utf8'));
    expect(src).toContain('<ImageUploadButton');
    expect(src).toMatch(/body: JSON\.stringify\(\{ thumbnail: uploadedThumbs\[submission\.id\]/);
  });
});
