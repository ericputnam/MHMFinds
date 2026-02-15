import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deleteMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    delete: deleteMock,
  })),
}));

import { GET } from '@/app/api/auth/clear-session/route';

describe('API /api/auth/clear-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears known next-auth cookies and returns html response', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/clear-session');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(deleteMock).toHaveBeenCalled();
    expect(text).toContain('Session Cleared');
  });
});
