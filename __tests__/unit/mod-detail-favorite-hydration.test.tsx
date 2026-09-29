/**
 * /mods/[id] favorite state is hydrated from the server (Cass, E138, 2026-09-29).
 *
 * What this protects:
 *   1. GET /api/mods/[id]/favorite/ answers "is this mod in my favorites?"
 *      for a signed-in visitor, 401s an anonymous one without touching the
 *      DB, never mutates, and is never cached.
 *   2. The hook asks only when `useSession()` reports `authenticated` —
 *      anonymous and loading visitors make no request — and a visitor action
 *      that lands before the read resolves wins over the read.
 *   3. ModDetailClient takes its heart / "Save this find" state from the hook,
 *      not from a bare `useState(false)` (the pre-E138 bug).
 *
 * Red against pre-E138 `origin/main` (4ba11cc): the route has no GET, the
 * hook module does not exist, and the client still starts at useState(false).
 * Hook modules are imported dynamically so each case reports on its own.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import * as favoriteRoute from '@/app/api/mods/[id]/favorite/route';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const HOOK = '@/lib/capture/useModFavoriteState';

type RouteGet = (req: NextRequest, ctx: { params: { id: string } }) => Promise<Response>;
const routeGet = () => (favoriteRoute as unknown as { GET?: RouteGet }).GET;

function setSession(status: 'authenticated' | 'unauthenticated' | 'loading') {
  vi.mocked(useSession).mockReturnValue({
    data: status === 'authenticated' ? ({ user: { id: 'u1' }, expires: '' } as never) : null,
    status,
    update: vi.fn(),
  } as never);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/mods/[id]/favorite/', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.mocked(getServerSession).mockReset();
  });

  it('exists', () => {
    expect(typeof routeGet()).toBe('function');
  });

  it('401s an anonymous visitor without querying the DB', async () => {
    const GET = routeGet();
    expect(GET).toBeTypeOf('function');
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const res = await GET!(new NextRequest('http://localhost/api/mods/m1/favorite/'), {
      params: { id: 'm1' },
    });
    expect(res.status).toBe(401);
    expect(mockPrismaClient.favorite.findUnique).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('reports favorited true/false for the signed-in user and never writes', async () => {
    const GET = routeGet();
    expect(GET).toBeTypeOf('function');
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as never);

    mockPrismaClient.favorite.findUnique.mockResolvedValueOnce({ id: 'f1' });
    const yes = await GET!(new NextRequest('http://localhost/api/mods/m1/favorite/'), {
      params: { id: 'm1' },
    });
    expect(yes.status).toBe(200);
    expect(await yes.json()).toEqual({ favorited: true });
    expect(mockPrismaClient.favorite.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_modId: { userId: 'u1', modId: 'm1' } } }),
    );

    mockPrismaClient.favorite.findUnique.mockResolvedValueOnce(null);
    const no = await GET!(new NextRequest('http://localhost/api/mods/m2/favorite/'), {
      params: { id: 'm2' },
    });
    expect(await no.json()).toEqual({ favorited: false });
    expect(no.headers.get('Cache-Control')).toContain('no-store');

    expect(mockPrismaClient.favorite.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.favorite.delete).not.toHaveBeenCalled();
  });
});

describe('useModFavoriteState', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('makes no request for an anonymous or loading visitor', async () => {
    const { useModFavoriteState } = await import(HOOK);
    for (const status of ['unauthenticated', 'loading'] as const) {
      setSession(status);
      const { result } = renderHook(() => useModFavoriteState('m1'));
      expect(result.current[0]).toBe(false);
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('hydrates true for a signed-in visitor who already saved, with one GET to the slashed URL', async () => {
    const { useModFavoriteState, favoriteStateUrl } = await import(HOOK);
    setSession('authenticated');
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ favorited: true }));
    const { result } = renderHook(() => useModFavoriteState('m1'));
    await waitFor(() => expect(result.current[0]).toBe(true));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    // Slashed path plus a per-request nonce (next.config.js marks /api/*
    // publicly cacheable, so the URL must never be shared between visitors).
    expect(String(url)).toMatch(new RegExp(`^${favoriteStateUrl('m1')}\\?t=\\d+$`));
    expect(favoriteStateUrl('m1').endsWith('/favorite/')).toBe(true);
    expect((init as RequestInit | undefined)?.method ?? 'GET').toBe('GET');
  });

  it('a visitor action before the read resolves wins over the read', async () => {
    const { useModFavoriteState } = await import(HOOK);
    setSession('authenticated');
    let resolve!: (r: Response) => void;
    vi.mocked(global.fetch).mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { result } = renderHook(() => useModFavoriteState('m1'));
    act(() => result.current[1](true));
    await act(async () => {
      resolve(jsonResponse({ favorited: false }));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current[0]).toBe(true);
  });

  it('fails open: a 500 or a network error leaves the state unfavorited', async () => {
    const { useModFavoriteState } = await import(HOOK);
    setSession('authenticated');
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ error: 'x' }, 500));
    const a = renderHook(() => useModFavoriteState('m1'));
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('offline'));
    const b = renderHook(() => useModFavoriteState('m2'));
    await new Promise((r) => setTimeout(r, 0));
    expect(a.result.current[0]).toBe(false);
    expect(b.result.current[0]).toBe(false);
  });
});

describe('ModDetailClient takes its favorite state from the hook', () => {
  const src = stripComments(readFileSync(join(ROOT, 'app/mods/[id]/ModDetailClient.tsx'), 'utf8'));

  it('imports and uses useModFavoriteState for isFavorited', () => {
    expect(src).toMatch(/from ['"]@\/lib\/capture\/useModFavoriteState['"]/);
    expect(src).toMatch(/\[isFavorited,\s*setIsFavorited\]\s*=\s*useModFavoriteState\(/);
  });

  it('no longer starts every visitor at a bare useState(false)', () => {
    expect(src).not.toMatch(/\[isFavorited,\s*setIsFavorited\]\s*=\s*useState/);
  });
});
