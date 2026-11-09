/**
 * E378 (Sage, 2026-11-09): the in-season collection hub leads the homepage
 * hero strip. Against pre-fix origin/main the module import fails and the
 * render case finds no Christmas pill (the hub sat only in "Show all").
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SEASONAL_HUBS, seasonalHubSlug } from '@/lib/seasonalHub';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { HomeCollectionStrip } from '@/app/HomeCollections';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('seasonalHubSlug', () => {
  it('has windows, and every slug is a real hub', () => {
    expect(SEASONAL_HUBS.length).toBeGreaterThanOrEqual(2);
    const slugs = new Set(SIMS4_COLLECTIONS.map((c) => c.slug));
    for (const w of SEASONAL_HUBS) expect(slugs.has(w.slug), w.slug).toBe(true);
  });

  it('picks the hub inside its window, inclusive at both ends', () => {
    expect(seasonalHubSlug(at('2026-11-01'))).toBe('christmas-cc');
    expect(seasonalHubSlug(at('2026-11-09'))).toBe('christmas-cc');
    expect(seasonalHubSlug(at('2026-12-31'))).toBe('christmas-cc');
    expect(seasonalHubSlug(at('2026-10-01'))).toBe('halloween-cc');
    expect(seasonalHubSlug(at('2026-10-31'))).toBe('halloween-cc');
  });

  it('returns null out of season', () => {
    expect(seasonalHubSlug(at('2027-01-01'))).toBeNull();
    expect(seasonalHubSlug(at('2026-09-30'))).toBeNull();
    expect(seasonalHubSlug(at('2026-06-15'))).toBeNull();
  });

  it('windows do not overlap', () => {
    const k = ([m, d]: [number, number]) => m * 100 + d;
    const sorted = [...SEASONAL_HUBS].sort((a, b) => k(a.from) - k(b.from));
    for (let i = 1; i < sorted.length; i++) {
      expect(k(sorted[i].from)).toBeGreaterThan(k(sorted[i - 1].to));
    }
  });
});

describe('HomeCollectionStrip', () => {
  afterEach(() => vi.useRealTimers());

  const hrefs = () => {
    const { container } = render(<HomeCollectionStrip />);
    // next/link drops the trailing slash under jsdom (no next.config), so
    // compare paths without it; the source href carries it.
    return Array.from(container.querySelectorAll('a.hcl-pill')).map((a) => (a.getAttribute('href') ?? '').replace(/\/$/, ''));
  };

  it('leads with the Christmas hub in November', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at('2026-11-09'));
    const h = hrefs();
    expect(h[0]).toBe('/games/sims-4/christmas-cc');
    expect(h.filter((x) => x === '/games/sims-4/christmas-cc')).toHaveLength(1);
    expect(h).toContain('/games/sims-4/hair-cc');
  });

  it('shows only the standing shortcuts out of season', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at('2026-06-15'));
    const h = hrefs();
    expect(h[0]).toBe('/games/sims-4/hair-cc');
    expect(h.some((x) => x.includes('christmas') || x.includes('halloween'))).toBe(false);
  });
});
