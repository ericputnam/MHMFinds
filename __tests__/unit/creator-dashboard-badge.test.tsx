/**
 * E286 (Nova): the creator dashboard shows a "Get your badge" card linking to
 * /creator/<handle>/badge/ — only when that creator's own page renders.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import CreatorDashboard from '@/app/creators/page';
import {
  BADGE_CTA_EVENT,
  badgeHref,
  dashboardBadge,
} from '@/lib/creatorBadge';

describe('dashboardBadge', () => {
  it('returns the badge page href when the creator page renders for that handle', () => {
    expect(dashboardBadge({ handle: 'dor-e' }, { slug: 'dor-e', displayName: 'Dor-e' })).toEqual({
      href: badgeHref('dor-e'),
      displayName: 'Dor-e',
    });
    expect(badgeHref('dor-e')).toBe('/creator/dor-e/badge/');
  });

  it('returns null with no profile, an empty handle, no page, or a slug mismatch', () => {
    expect(dashboardBadge(null, { slug: 'a', displayName: 'A' })).toBeNull();
    expect(dashboardBadge({ handle: '' }, { slug: '', displayName: 'A' })).toBeNull();
    expect(dashboardBadge({ handle: 'a' }, null)).toBeNull();
    expect(dashboardBadge({ handle: 'a' }, { slug: 'b', displayName: 'B' })).toBeNull();
  });
});

describe('creator dashboard badge card', () => {
  const base = { submissions: [], counts: { total: 0, pending: 0, approved: 0 } };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders the card linking to the badge page when the API returns a badge', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...base, badge: { href: '/creator/dor-e/badge/', displayName: 'Dor-e' } }),
    } as Response);
    render(<CreatorDashboard />);
    const card = await screen.findByTestId('dashboard-badge-card');
    const link = card.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/creator/dor-e/badge/');
  });

  it('renders no card when the API returns no badge', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => base } as Response);
    render(<CreatorDashboard />);
    await waitFor(() => expect(screen.getByText('No submissions yet')).toBeDefined());
    expect(screen.queryByTestId('dashboard-badge-card')).toBeNull();
  });

  it('fetches with a per-request nonce and a trailing slash (per-user GET under the /api/* s-maxage stamp)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => base } as Response);
    render(<CreatorDashboard />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String(vi.mocked(global.fetch).mock.calls[0][0]);
    expect(url).toMatch(/^\/api\/creator\/submissions\/\?_=\d+$/);
  });

  it('fires the GA4 event through the shared constant, not a literal', () => {
    const src = readFileSync(join(process.cwd(), 'app/creators/page.tsx'), 'utf8');
    expect(BADGE_CTA_EVENT).toBe('creator_badge_cta');
    expect(src).toContain('BADGE_CTA_EVENT');
    expect(src).not.toContain("'creator_badge_cta'");
  });
});
