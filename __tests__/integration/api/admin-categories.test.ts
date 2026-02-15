import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from '@/lib/middleware/auth';
import { GET, POST } from '@/app/api/admin/categories/route';
import { PATCH, DELETE } from '@/app/api/admin/categories/[id]/route';

describe('API /api/admin/categories*', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it('rejects unauthorized access for list', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/categories');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('lists categories for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);

    mockPrismaClient.category.findMany.mockResolvedValue([
      { id: 'cat1', name: 'Hair', slug: 'hair', _count: { mods: 10 } },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/admin/categories');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.categories).toHaveLength(1);
  });

  it('creates category for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);
    mockPrismaClient.category.create.mockResolvedValue({ id: 'cat2', name: 'Shoes' } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Shoes', slug: 'shoes', description: 'desc' }),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe('cat2');
  });

  it('updates category for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);
    mockPrismaClient.category.update.mockResolvedValue({ id: 'cat1', name: 'Updated' } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/categories/cat1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PATCH(request, { params: { id: 'cat1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('Updated');
  });

  it('blocks deleting categories with children', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', isAdmin: true },
    } as any);
    mockPrismaClient.category.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/admin/categories/cat1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'cat1' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('subcategories');
  });
});
