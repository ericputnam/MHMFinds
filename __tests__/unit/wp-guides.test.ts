import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  REDIRECTED_POST_PATHS,
  WP_GUIDES_PER_PAGE,
  fetchAllWpGuides,
  isRedirectedPostUrl,
  toApexUrl,
} from '@/lib/seo/wpGuides';

/**
 * lib/seo/wpGuides.ts — the shared WordPress guide inventory (E71).
 *
 * The contract that matters: `complete` must be false whenever the population
 * could be wrong. A zero-rows guard does not cover a truncated fetch, and a
 * truncated fetch is exactly how /llms-full.txt could quietly go back to
 * publishing a fraction of the blog.
 */

let pageSeq = 0;
/** n posts with unique links across calls, so pagination is observable. */
function page(n: number, opts: { totalPages?: number; status?: number } = {}) {
  const p = ++pageSeq;
  const items = Array.from({ length: n }, (_, i) => ({
    title: { rendered: `Guide ${String(i).padStart(3, '0')}` },
    link: `https://blog.musthavemods.com/guide-${p}-${i}/`,
    date_gmt: '2026-01-01T00:00:00',
  }));
  return {
    ok: (opts.status ?? 200) < 400,
    status: opts.status ?? 200,
    headers: { get: (k: string) => (k === 'X-WP-TotalPages' ? String(opts.totalPages ?? 1) : null) },
    json: async () => items,
  } as unknown as Response;
}

describe('toApexUrl / isRedirectedPostUrl', () => {
  it('rewrites the blog subdomain to the apex', () => {
    expect(toApexUrl('https://blog.musthavemods.com/sims-4-elf-cc/')).toBe(
      'https://musthavemods.com/sims-4-elf-cc/',
    );
    expect(toApexUrl('http://blog.musthavemods.com/x/')).toBe('https://musthavemods.com/x/');
    expect(toApexUrl('')).toBe('');
  });

  it('excludes only the URLs that still 301, and keeps the un-redirected ones', () => {
    for (const p of REDIRECTED_POST_PATHS) {
      expect(isRedirectedPostUrl(`https://musthavemods.com${p}`)).toBe(true);
    }
    // Un-redirected in 2026-07 / 2026-09 because the blog copy outranked the
    // collection page — these must stay cite-able and crawlable.
    for (const p of [
      '/sims-4-pregnancy-mods/',
      '/sims-4-y2k-cc/',
      '/sims-4-male-body-presets-cc/',
      '/sims-4-elf-cc/',
    ]) {
      expect(isRedirectedPostUrl(`https://musthavemods.com${p}`)).toBe(false);
    }
  });
});

describe('fetchAllWpGuides', () => {
  it('paginates past the first page and reports complete', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(page(WP_GUIDES_PER_PAGE, { totalPages: 3 }))
      .mockResolvedValueOnce(page(WP_GUIDES_PER_PAGE, { totalPages: 3 }))
      .mockResolvedValueOnce(page(42, { totalPages: 3 }));

    const r = await fetchAllWpGuides({ fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(r.guides).toHaveLength(WP_GUIDES_PER_PAGE * 2 + 42);
    expect(r.pagesFetched).toBe(3);
    expect(r.totalPages).toBe(3);
    expect(r.complete).toBe(true);
    // every URL is apex, none is a redirected slug
    expect(r.guides.every((g) => g.url.startsWith('https://musthavemods.com/'))).toBe(true);
  });

  it('marks the result incomplete when the page cap is hit (a truncated fetch is not a population)', async () => {
    const fetchImpl = vi.fn(async () => page(WP_GUIDES_PER_PAGE, { totalPages: 50 }));
    const r = await fetchAllWpGuides({ maxPages: 2, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.guides.length).toBeGreaterThan(0);
    expect(r.complete).toBe(false);
  });

  it('marks the result incomplete when a later page errors, but keeps what it got', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(page(WP_GUIDES_PER_PAGE, { totalPages: 4 }))
      .mockResolvedValueOnce(page(0, { totalPages: 4, status: 503 }));

    const r = await fetchAllWpGuides({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.guides).toHaveLength(WP_GUIDES_PER_PAGE);
    expect(r.complete).toBe(false);
  });

  it('treats a 400 past the last page as the normal end of the list, not an error', async () => {
    // No X-WP-TotalPages header and an exact-multiple last page: the only way
    // out of the loop is WordPress's 400 on the page after the last one.
    const fullPageNoHeader = {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () =>
        Array.from({ length: WP_GUIDES_PER_PAGE }, (_, i) => ({
          title: { rendered: `G${i}` },
          link: `https://blog.musthavemods.com/g-${i}/`,
          date_gmt: '2026-01-01T00:00:00',
        })),
    } as unknown as Response;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fullPageNoHeader)
      .mockResolvedValueOnce(page(0, { status: 400 }));

    const r = await fetchAllWpGuides({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.guides).toHaveLength(WP_GUIDES_PER_PAGE);
    expect(r.complete).toBe(true);
  });

  it('never throws and reports incomplete when the network is down', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const r = await fetchAllWpGuides({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.guides).toHaveLength(0);
    expect(r.complete).toBe(false);
  });

  it('de-duplicates by URL so a shifting WP page boundary cannot double-list a guide', async () => {
    const dup = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k === 'X-WP-TotalPages' ? '2' : null) },
      json: async () =>
        Array.from({ length: WP_GUIDES_PER_PAGE }, () => ({
          title: { rendered: 'Same Guide' },
          link: 'https://blog.musthavemods.com/same/',
          date_gmt: '2026-01-01T00:00:00',
        })),
    } as unknown as Response;
    const fetchImpl = vi.fn().mockResolvedValueOnce(dup).mockResolvedValueOnce(page(1, { totalPages: 2 }));

    const r = await fetchAllWpGuides({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.guides.filter((g) => g.url.endsWith('/same/'))).toHaveLength(1);
  });
});

describe('the exclusion list has exactly one definition', () => {
  it('the sitemap route imports it instead of restating it', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../app/sitemap-blog-posts.xml/route.ts'),
      'utf-8',
    );
    expect(src).toContain("from '@/lib/seo/wpGuides'");
    // a second copy of the literal is the drift this extraction removes
    expect(src).not.toContain("'/sims-4-female-clothes-cc/'");
  });

  it('the llms-full route imports it instead of restating it', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../app/llms-full.txt/route.ts'),
      'utf-8',
    );
    expect(src).toContain("from '@/lib/seo/wpGuides'");
    expect(src).not.toContain("'/sims-4-female-clothes-cc/'");
  });
});
