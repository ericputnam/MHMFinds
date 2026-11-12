/**
 * Guards for two auth defects found in the 2026-11-11 audit (both red pre-fix):
 *  1. Roles were frozen in the JWT for 30 days — a revoked admin kept admin.
 *  2. Signup stamped emailVerified without proof, so a squatter could register a
 *     victim's address and keep password access after the victim connected Patreon.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const prismaMock = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn() },
    collection: { create: vi.fn() },
    subscription: { create: vi.fn() },
  };
  return {
    tx,
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    account: { deleteMany: vi.fn() },
    subscription: { findUnique: vi.fn() },
    collection: { create: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));

import { authOptions, ROLE_REFRESH_MS } from '@/lib/authOptions';

const jwt = authOptions.callbacks!.jwt as (args: any) => Promise<any>;
const signIn = authOptions.callbacks!.signIn as (args: any) => Promise<any>;

beforeEach(() => vi.clearAllMocks());

describe('jwt callback re-reads roles from the database', () => {
  it('a token older than ROLE_REFRESH_MS picks up a revoked admin flag', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false, isPremium: true, isCreator: false });
    const token = await jwt({
      token: { id: 'u1', isAdmin: true, isPremium: false, isCreator: false, rolesCheckedAt: Date.now() - ROLE_REFRESH_MS - 1 },
    });
    expect(token.isAdmin).toBe(false);
    expect(token.isPremium).toBe(true);
    expect(Date.now() - token.rolesCheckedAt).toBeLessThan(5000);
  });

  it('a token minted before this change (no rolesCheckedAt) is refreshed too', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false, isPremium: false, isCreator: true });
    const token = await jwt({ token: { id: 'u1', isAdmin: true } });
    expect(token.isAdmin).toBe(false);
    expect(token.isCreator).toBe(true);
  });

  it('a fresh token makes no database read', async () => {
    const token = await jwt({ token: { id: 'u1', isAdmin: true, rolesCheckedAt: Date.now() } });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(token.isAdmin).toBe(true);
  });

  it('a failed read keeps the roles already in the token', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const token = await jwt({ token: { id: 'u1', isAdmin: true, isPremium: true } });
    expect(token.isAdmin).toBe(true);
    expect(token.isPremium).toBe(true);
    errSpy.mockRestore();
  });

  it('a user row that no longer exists leaves the token alone', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const token = await jwt({ token: { id: 'gone', isAdmin: true } });
    expect(token.isAdmin).toBe(true);
  });
});

describe('Patreon link to an unverified account drops the unproven password', () => {
  it('unverified existing account: credentials removed, email stamped verified', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'v@example.com', emailVerified: null });
    await expect(signIn({ user: { email: 'v@example.com' }, account: { provider: 'patreon' } })).resolves.toBe(true);
    expect(prismaMock.account.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', provider: 'credentials' } });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it('verified existing account keeps its password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'v@example.com', emailVerified: new Date() });
    await signIn({ user: { email: 'v@example.com' }, account: { provider: 'patreon' } });
    expect(prismaMock.account.deleteMany).not.toHaveBeenCalled();
  });

  it('a credentials sign-in never removes anything', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'v@example.com', emailVerified: null });
    await signIn({ user: { email: 'v@example.com' }, account: { provider: 'credentials' } });
    expect(prismaMock.account.deleteMany).not.toHaveBeenCalled();
  });

  it('signup no longer stamps emailVerified without proof', () => {
    const src = fs
      .readFileSync(path.resolve(__dirname, '../../app/api/auth/signup/route.ts'), 'utf8')
      .replace(/\/\/.*$/gm, '');
    expect(src).toContain('emailVerified: null');
    expect(src).not.toMatch(/emailVerified:\s*new Date\(\)/);
  });
});

describe('first OAuth sign-in creates a complete account', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock.tx));
    prismaMock.tx.user.create.mockResolvedValue({ id: 'new-1' });
  });

  it('a taken username gets a suffix instead of failing the sign-in (P2002)', async () => {
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email ? null : { id: 'someone-else' },
    );
    await expect(signIn({ user: { email: 'alex@example.com' }, account: { provider: 'patreon' } })).resolves.toBe(true);
    const { username } = prismaMock.tx.user.create.mock.calls[0][0].data;
    expect(username).toMatch(/^alex-[0-9a-f]{6}$/);
  });

  it('a free username is used as-is, and the Favorites collection and Subscription row are created', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await signIn({ user: { email: 'robin@example.com', name: 'Robin' }, account: { provider: 'patreon' } });
    const data = prismaMock.tx.user.create.mock.calls[0][0].data;
    expect(data.username).toBe('robin');
    expect(data.emailVerified).toBeInstanceOf(Date);
    expect(prismaMock.tx.collection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'new-1', name: 'Favorites' }),
    });
    expect(prismaMock.tx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'new-1', clickLimit: 5, status: 'ACTIVE' }),
    });
  });
});
