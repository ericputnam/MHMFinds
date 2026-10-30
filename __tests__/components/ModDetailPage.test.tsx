import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Mod } from '@/lib/api';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({ id: 'mod-1' }),
}));

vi.mock('@/components/AffiliateRecommendations', () => ({
  AffiliateRecommendations: () => null,
}));

vi.mock('@/components/RelatedMods', () => ({
  RelatedMods: () => null,
}));

vi.mock('@/components/ModContentSections', () => ({
  ModContentSections: () => null,
}));

vi.mock('@/components/MoreFromCreator', () => ({
  MoreFromCreator: () => null,
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

import { useSession } from 'next-auth/react';
import ModDetailClient from '@/app/mods/[id]/ModDetailClient';

const mockMod: Mod = {
  id: 'mod-1',
  title: 'Crystal Hair',
  description: 'Great mod description',
  shortDescription: 'Great mod',
  version: '1.0.0',
  gameVersion: 'Sims 4',
  category: 'Hair',
  tags: ['hair'],
  contentType: null,
  visualStyle: null,
  themes: [],
  ageGroups: [],
  genderOptions: [],
  occultTypes: [],
  packRequirements: [],
  thumbnail: 'https://example.com/thumb.jpg',
  images: [],
  downloadUrl: 'https://example.com/download',
  sourceUrl: 'https://example.com/source',
  source: 'Patreon',
  sourceId: null,
  author: 'creator',
  isFree: true,
  price: null,
  currency: null,
  isNSFW: false,
  isVerified: true,
  isFeatured: false,
  downloadCount: 100,
  viewCount: 50,
  rating: 4.7,
  ratingCount: 11,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: null,
  lastScraped: null,
  creatorId: null,
  creator: { id: 'c1', handle: 'creator', isVerified: true },
  _count: { reviews: 0, favorites: 5, downloads: 100 },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ModDetailClient behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The heart calls the favorite API (E107) and its state is hydrated for
    // signed-in visitors (E138), so drive it as a signed-in visitor whose
    // hydration read says "not saved yet".
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    } as never);
    vi.mocked(global.fetch).mockImplementation(async (_url, init) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') return jsonResponse({ favorited: false });
      return jsonResponse({ success: true });
    });
  });

  it('toggles favorite state and routes download through the /go interstitial', async () => {
    render(<ModDetailClient initialMod={mockMod} />);

    expect(screen.getByRole('heading', { name: 'Crystal Hair' })).toBeInTheDocument();

    const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
    await userEvent.click(favoriteButton);
    expect(await screen.findByRole('button', { name: /favorited/i })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mods/mod-1/favorite',
      expect.objectContaining({ method: 'POST' }),
    );

    await userEvent.click(screen.getByRole('button', { name: /favorited/i }));
    expect(await screen.findByRole('button', { name: /add to favorites/i })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mods/mod-1/favorite',
      expect.objectContaining({ method: 'DELETE' }),
    );

    const downloadButton = screen.getByRole('button', { name: /download this mod now/i });
    await userEvent.click(downloadButton);

    expect(pushMock).toHaveBeenCalledWith('/go/mod-1');
  });
});
