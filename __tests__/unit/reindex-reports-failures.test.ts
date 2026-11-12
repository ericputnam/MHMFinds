/**
 * /api/admin/reindex-search answered "success" even when nothing was indexed, because
 * AISearchService.updateSearchIndex swallows its own errors. Red pre-fix: both cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const updateSearchIndex = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/aiSearch', () => ({
  AISearchService: class {
    updateSearchIndex = updateSearchIndex;
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { mod: { findMany } }, default: {} }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => ({ user: { id: 'a', isAdmin: true } })) }));

import { POST } from '@/app/api/admin/reindex-search/route';

const call = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/admin/reindex-search/', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('reindex-search reports what actually happened', () => {
  it('single mod: a failed index is a 500, not "success"', async () => {
    updateSearchIndex.mockResolvedValue(false);
    const res = await call({ modId: 'm1' });
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBe(false);
  });

  it('batch: failed mods are counted as failed, not indexed', async () => {
    findMany.mockResolvedValue([
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ]);
    updateSearchIndex.mockImplementation(async (id: string) => id !== 'b');
    const json = await (await call({})).json();
    expect(json).toMatchObject({ indexed: 2, failed: 1, total: 3 });
  });
});
