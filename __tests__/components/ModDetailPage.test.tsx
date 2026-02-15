import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

import ModDetailPage from '@/app/mods/[id]/page';

describe('ModDetailPage behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles favorite state and triggers download action', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'mod-1',
        title: 'Crystal Hair',
        description: 'Great mod description',
        shortDescription: 'Great mod',
        category: 'Hair',
        gameVersion: 'Sims 4',
        version: '1.0.0',
        thumbnail: 'https://example.com/thumb.jpg',
        images: [],
        tags: ['hair'],
        isVerified: true,
        isFree: true,
        price: null,
        source: 'Patreon',
        sourceUrl: 'https://example.com/source',
        downloadUrl: 'https://example.com/download',
        creator: { handle: 'creator', isVerified: true },
        author: 'creator',
        rating: 4.7,
        ratingCount: 11,
        _count: { downloads: 100, favorites: 5 },
        downloadCount: 100,
        viewCount: 50,
      }),
    } as any);

    render(<ModDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crystal Hair' })).toBeInTheDocument();
    });

    const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
    await userEvent.click(favoriteButton);
    expect(screen.getByRole('button', { name: /favorited/i })).toBeInTheDocument();

    const downloadButton = screen.getByRole('button', { name: /download this mod now/i });
    await userEvent.click(downloadButton);

    expect(openSpy).toHaveBeenCalledWith('https://example.com/download', '_blank');
  });
});
