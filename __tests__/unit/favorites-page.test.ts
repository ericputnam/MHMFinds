/**
 * E140 (Rowan, 2026-09-29): favorites were write-only. The Navbar heart was a
 * <button> with no href and no handler, and no route listed a user's saves.
 *
 * Red on pre-fix origin/main: every case below — lib/favoritesPath,
 * lib/favorites and app/account/favorites/page.tsx did not exist, and the
 * Navbar heart was not a link.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const findMany = vi.fn();
const count = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { favorite: { findMany: (...a: unknown[]) => findMany(...a), count: (...a: unknown[]) => count(...a) } },
  default: {},
}));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u) }));

import { FAVORITES_PATH } from '@/lib/favoritesPath';
import { getUserFavoriteMods, FAVORITES_PAGE_SIZE } from '@/lib/favorites';

const ROOT = path.resolve(__dirname, '../..');
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('favorites route (E140)', () => {
  beforeEach(() => {
    findMany.mockReset();
    count.mockReset();
    getServerSession.mockReset();
    redirect.mockClear();
  });

  it('path is under /account/ and carries the global trailing slash', () => {
    expect(FAVORITES_PATH).toBe('/account/favorites/');
    // `account` must be a Next.js prefix or middleware proxies it to WordPress.
    const mw = fs.readFileSync(path.join(ROOT, 'middleware.ts'), 'utf8');
    expect(mw).toMatch(/'account'/);
  });

  it('the Navbar heart is a link to the favorites page, not a dead button', () => {
    const src = stripComments(fs.readFileSync(path.join(ROOT, 'components/Navbar.tsx'), 'utf8'));
    const heart = src.indexOf('<Heart className="h-5 w-5" />');
    expect(heart).toBeGreaterThan(0);
    const before = src.slice(0, heart);
    const lastLink = before.lastIndexOf('<Link');
    const lastButton = before.lastIndexOf('<button');
    expect(lastLink).toBeGreaterThan(lastButton);
    expect(before.slice(lastLink)).toMatch(/href=\{FAVORITES_PATH\}/);
    // The Navbar is a client component: it must not import the Prisma module.
    expect(src).not.toMatch(/from ['"][^'"]*lib\/favorites['"]/);
  });

  it('queries only the given user, newest first, capped', async () => {
    findMany.mockResolvedValue([{ mod: { id: 'm1', title: 'A', price: null, createdAt: new Date(), updatedAt: new Date() } }, { mod: null }]);
    count.mockResolvedValue(2);
    const res = await getUserFavoriteMods('user-1');
    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: 'user-1' });
    expect(arg.orderBy).toEqual({ createdAt: 'desc' });
    expect(arg.take).toBe(FAVORITES_PAGE_SIZE);
    expect(count.mock.calls[0][0]).toEqual({ where: { userId: 'user-1' } });
    expect(res.total).toBe(2);
    expect(res.mods.map((m) => m.id)).toEqual(['m1']); // a deleted mod is dropped, not rendered
  });

  it('never queries without a user id', async () => {
    const res = await getUserFavoriteMods('');
    expect(findMany).not.toHaveBeenCalled();
    expect(res).toEqual({ mods: [], total: 0 });
  });

  it('a signed-out visitor is redirected to sign-in with a same-origin callback', async () => {
    getServerSession.mockResolvedValue(null);
    const { default: Page } = await import('@/app/account/favorites/page');
    await expect(Page()).rejects.toThrow('REDIRECT /sign-in/?callbackUrl=%2Faccount%2Ffavorites%2F');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('a signed-in visitor gets their own list', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-9' } });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    const { default: Page } = await import('@/app/account/favorites/page');
    const el = await Page();
    expect(redirect).not.toHaveBeenCalled();
    expect(findMany.mock.calls[0][0].where).toEqual({ userId: 'user-9' });
    expect((el as { props: { total: number } }).props.total).toBe(0);
  });
});
