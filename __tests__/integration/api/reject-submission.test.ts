import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/services/emailNotifier', () => ({
  emailNotifier: {
    send: vi.fn(),
  },
}));

import { requireAdmin } from '@/lib/middleware/auth';
import { emailNotifier } from '@/lib/services/emailNotifier';
import { POST } from '@/app/api/admin/submissions/[id]/reject/route';

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  username: 'admin',
};

describe('API /api/admin/submissions/[id]/reject', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    vi.mocked(emailNotifier.send).mockResolvedValue(true);
  });

  it('rejects submission and sends a rejection email', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: mockAdminUser,
    } as any);

    mockPrismaClient.modSubmission.findUnique.mockResolvedValue({
      id: 'submission-1',
      modName: 'Test Mod',
      submitterEmail: 'creator@example.com',
    } as any);

    mockPrismaClient.modSubmission.update.mockResolvedValue({ id: 'submission-1' } as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/submissions/submission-1/reject',
      {
        method: 'POST',
        body: JSON.stringify({
          reason: 'This submission is missing required assets.',
        }),
      }
    );

    const response = await POST(request, { params: { id: 'submission-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrismaClient.modSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: {
        status: 'rejected',
        reviewedAt: expect.any(Date),
        reviewedBy: 'admin-1',
        reviewNotes: 'This submission is missing required assets.',
      },
    });
    expect(emailNotifier.send).toHaveBeenCalledWith(
      'creator@example.com',
      expect.stringContaining('Submission update'),
      expect.stringContaining('missing required assets')
    );
  });

  it('returns 400 when rejection reason is too short', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      user: mockAdminUser,
    } as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/submissions/submission-1/reject',
      {
        method: 'POST',
        body: JSON.stringify({
          reason: 'too short',
        }),
      }
    );

    const response = await POST(request, { params: { id: 'submission-1' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(mockPrismaClient.modSubmission.update).not.toHaveBeenCalled();
    expect(emailNotifier.send).not.toHaveBeenCalled();
  });
});
