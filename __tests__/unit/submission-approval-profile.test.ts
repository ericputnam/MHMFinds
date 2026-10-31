/**
 * E183 (Nova, 2026-10-11): approving a submission creates the submitter's
 * CreatorProfile — pending handle, unverified, idempotent — and links the mod.
 *
 * Pure planner + the approve route with prisma and requireAdmin mocked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

const { db, prismaMock, requireAdmin } = vi.hoisted(() => {
  const db = {
    submissionFindUnique: vi.fn(),
    submissionUpdate: vi.fn(),
    modCreate: vi.fn(),
    modUpdate: vi.fn(),
    profileCreate: vi.fn(),
    profileFindUnique: vi.fn(),
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
    creatorProfile: {
      create: (...a: unknown[]) => db.profileCreate(...a),
      findUnique: (...a: unknown[]) => db.profileFindUnique(...a),
    },
  };
  const requireAdmin = vi.fn();
  return { db, prismaMock, requireAdmin };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));

vi.mock('@/lib/middleware/auth', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

import { POST } from '@/app/api/admin/submissions/[id]/approve/route';
import { approvalSlug, planApprovalProfile } from '@/lib/submissionApprovalProfile';
import { resolveIngestContentType } from '@/lib/services/contentTypeDetector';
import { isPendingHandle } from '@/lib/creatorClaim';
import { planPromotion, promotionData, slugFromPendingHandle } from '@/lib/creatorClaimReview';

const USER_ID = 'cmgabcdefgh6dphnz';

function base(overrides: Partial<Parameters<typeof planApprovalProfile>[0]> = {}) {
  return {
    isEdit: false,
    userId: USER_ID,
    submitterIsAdmin: false,
    existingProfileId: null,
    author: 'Atino00',
    displayName: 'atino00',
    username: 'atino00',
    ...overrides,
  };
}

describe('planApprovalProfile (pure)', () => {
  it('creates a pending, unverified profile for a submitter with none', () => {
    const plan = planApprovalProfile(base());
    expect(plan.kind).toBe('create');
    if (plan.kind !== 'create') return;
    expect(plan.slug).toBe('atino00');
    expect(plan.data.userId).toBe(USER_ID);
    expect(isPendingHandle(plan.data.handle)).toBe(true);
    expect(plan.data.handle).not.toBe('atino00'); // never the public slug
    expect(plan.data.isVerified).toBe(false); // E151: only promotion verifies
  });

  it('round-trips through the claim queue: the default promote target is the slug', () => {
    const plan = planApprovalProfile(base());
    if (plan.kind !== 'create') throw new Error('expected create');
    expect(slugFromPendingHandle(plan.data.handle)).toBe('atino00');
    const decision = planPromotion({
      currentHandle: plan.data.handle,
      requestedSlug: null,
      conflictingProfileId: null,
      profileId: 'p-new',
    });
    expect(decision).toEqual({ ok: true, handle: 'atino00', displaceSeed: null });
    expect(promotionData('atino00').isVerified).toBe(true);
  });

  it('a seed-held slug is freed at promotion (E166), not at approval', () => {
    const plan = planApprovalProfile(base({ author: 'Lumpinou' }));
    if (plan.kind !== 'create') throw new Error('expected create');
    expect(plan.data.handle).not.toBe('lumpinou');
    const decision = planPromotion({
      currentHandle: plan.data.handle,
      requestedSlug: null,
      conflictingProfileId: 'seed-row',
      profileId: 'p-new',
      conflictingIsSeed: true,
      seedHandleTaken: false,
    });
    expect(decision).toEqual({
      ok: true,
      handle: 'lumpinou',
      displaceSeed: { profileId: 'seed-row', toHandle: 'seed-lumpinou' },
    });
  });

  it('is idempotent: an existing profile is linked, never duplicated', () => {
    expect(planApprovalProfile(base({ existingProfileId: 'p1' }))).toEqual({ kind: 'link', profileId: 'p1' });
  });

  it('existing profile wins even for an admin submitter (pre-E183 behaviour kept)', () => {
    expect(planApprovalProfile(base({ existingProfileId: 'p1', submitterIsAdmin: true }))).toEqual({
      kind: 'link',
      profileId: 'p1',
    });
  });

  it('creates nothing for edits, anonymous submissions and admins', () => {
    expect(planApprovalProfile(base({ isEdit: true }))).toEqual({ kind: 'none', reason: 'edit' });
    expect(planApprovalProfile(base({ userId: null }))).toEqual({ kind: 'none', reason: 'anonymous' });
    expect(planApprovalProfile(base({ submitterIsAdmin: true }))).toEqual({ kind: 'none', reason: 'admin' });
  });

  it('falls back from a platform/junk author to the account name', () => {
    expect(approvalSlug({ author: 'CurseForge', displayName: null, username: 'atino00' })).toBe('atino00');
    expect(approvalSlug({ author: '75940181', displayName: 'Dorée Sims', username: 'doree' })).toBe('dor-e-sims');
    expect(approvalSlug({ author: null, displayName: '', username: 'ab' })).toBeNull();
    expect(planApprovalProfile(base({ author: null, displayName: null, username: 'ab' }))).toEqual({
      kind: 'none',
      reason: 'no-valid-slug',
    });
  });
});

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    status: 'pending',
    isEdit: false,
    approvedModId: null,
    userId: USER_ID,
    modName: 'Vintage decor set',
    description: 'd',
    shortDescription: null,
    version: null,
    gameVersion: null,
    category: 'Build/Buy',
    tags: [],
    thumbnail: null,
    images: [],
    downloadUrl: 'https://example.com/d',
    sourceUrl: null,
    modUrl: 'https://example.com/d',
    source: 'CurseForge',
    author: 'Atino00',
    isFree: true,
    price: null,
    currency: 'USD',
    isNSFW: false,
    user: { id: USER_ID, isAdmin: false, username: 'atino00', displayName: 'atino00', creatorProfile: null },
    approvedMod: null,
    ...overrides,
  };
}

const req = () => new NextRequest('http://localhost/api/admin/submissions/s1/approve/', { method: 'POST' });
const call = () => POST(req(), { params: { id: 's1' } });

describe('POST /api/admin/submissions/[id]/approve', () => {
  beforeEach(() => {
    Object.values(db).forEach((f) => f.mockReset());
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({ authorized: true, session: {}, user: { id: 'admin1', isAdmin: true } });
    db.modCreate.mockResolvedValue({ id: 'm1' });
    db.submissionUpdate.mockResolvedValue({});
    db.profileCreate.mockResolvedValue({ id: 'p-new' });
  });

  it('refuses a non-admin before any read', async () => {
    requireAdmin.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const res = await call();
    expect(res.status).toBe(403);
    expect(db.submissionFindUnique).not.toHaveBeenCalled();
    expect(db.profileCreate).not.toHaveBeenCalled();
  });

  it('creates the pending profile and links the new mod to it', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    const res = await call();
    expect(res.status).toBe(200);
    expect(db.profileCreate).toHaveBeenCalledTimes(1);
    const arg = db.profileCreate.mock.calls[0][0] as { data: { handle: string; isVerified: boolean; userId: string } };
    expect(arg.data.userId).toBe(USER_ID);
    expect(arg.data.isVerified).toBe(false);
    expect(slugFromPendingHandle(arg.data.handle)).toBe('atino00');
    expect((db.modCreate.mock.calls[0][0] as { data: { creatorId?: string } }).data.creatorId).toBe('p-new');
    const body = await res.json();
    expect(body.createdCreatorProfileHandle).toBe(arg.data.handle);
  });

  it('E304: a new mod gets its contentType through the ingest resolver, like every other ingest path', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ modName: 'Cute & kawaii doll wallpaper' }));
    await call();
    const data = (db.modCreate.mock.calls[0][0] as { data: { contentType?: string | null; downloadUrl: string } }).data;
    expect(data.contentType).toBe(resolveIngestContentType('Cute & kawaii doll wallpaper', 'd', null));
    expect(typeof data.contentType).toBe('string');
    expect(data.downloadUrl).toBe('https://example.com/d');
  });

  it('reuses an existing profile without creating one', async () => {
    db.submissionFindUnique.mockResolvedValue(
      submission({ user: { id: USER_ID, isAdmin: false, username: 'atino00', displayName: null, creatorProfile: { id: 'p-old' } } })
    );
    await call();
    expect(db.profileCreate).not.toHaveBeenCalled();
    expect((db.modCreate.mock.calls[0][0] as { data: { creatorId?: string } }).data.creatorId).toBe('p-old');
  });

  it('a concurrent create (P2002 on userId) reuses the row that won', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    db.profileCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    db.profileFindUnique.mockResolvedValue({ id: 'p-race' });
    const res = await call();
    expect(res.status).toBe(200);
    expect(db.profileFindUnique).toHaveBeenCalledWith({ where: { userId: USER_ID }, select: { id: true } });
    expect((db.modCreate.mock.calls[0][0] as { data: { creatorId?: string } }).data.creatorId).toBe('p-race');
  });

  it('a handle collision still approves the mod, unlinked (pre-E183 behaviour)', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    db.profileCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    db.profileFindUnique.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(200);
    expect((db.modCreate.mock.calls[0][0] as { data: { creatorId?: string } }).data.creatorId).toBeUndefined();
    expect(db.submissionUpdate).toHaveBeenCalled();
  });

  it('an anonymous submission creates no profile', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ userId: null, user: null }));
    await call();
    expect(db.profileCreate).not.toHaveBeenCalled();
  });

  it('an edit submission creates no profile and updates the existing mod', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ isEdit: true, approvedModId: 'm-old' }));
    db.modUpdate.mockResolvedValue({ id: 'm-old' });
    await call();
    expect(db.profileCreate).not.toHaveBeenCalled();
    expect(db.modCreate).not.toHaveBeenCalled();
  });
});
