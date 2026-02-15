import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from '@/lib/middleware/auth';
import { GET as getUsers } from '@/app/api/admin/users/route';
import { GET as getUserStats } from '@/app/api/admin/users/stats/route';

describe('API /api/admin/users*', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it('rejects unauthorized access for users list', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await getUsers(request);

    expect(response.status).toBe(401);
    expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
  });

  it('returns paginated users for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);

    mockPrismaClient.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'u1@example.com',
        username: 'u1',
        displayName: null,
        avatar: null,
        isCreator: false,
        isPremium: false,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      },
    ] as any);
    mockPrismaClient.user.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/admin/users?page=1&limit=20');
    const response = await getUsers(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.users).toHaveLength(1);
  });

  it('rejects unauthorized access for users stats', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/stats');
    const response = await getUserStats(request);

    expect(response.status).toBe(401);
    expect(mockPrismaClient.user.count).not.toHaveBeenCalled();
  });

  it('returns user stats for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);

    mockPrismaClient.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1);

    const request = new NextRequest('http://localhost:3000/api/admin/users/stats');
    const response = await getUserStats(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(100);
    expect(json.creators).toBe(20);
    expect(json.newToday).toBe(1);
  });
});
