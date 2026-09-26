import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import { SIMS4_COLLECTIONS, collectionHref } from '@/lib/collections';
import { collectionUrls as indexNowCollectionUrls } from '../../scripts/agents/indexnow-lib';

/**
 * E114 (2026-09-26) — every registered collection is on every discovery
 * surface, and the four surfaces agree on the URL.
 *
 * The four surfaces are each generated from `SIMS4_COLLECTIONS`, and each has
 * its own test that walks the registry. What none of them asserted is the
 * cross-surface contract: that the URL /llms.txt tells an answer engine to
 * cite is byte-identical to the <loc> the sitemap hands Google, to the
 * <link> the per-collection feed carries, and to the URL IndexNow pushes to
 * Bing. A slash or host drift between any two of those splits the page's
 * signals across duplicates, and no single-surface test would go red.
 *
 * Pre-fix state (stated, per the house rule): all 26 slugs are green on
 * origin/main — kitchen-cc (shipped 09-25) was already on all four surfaces
 * live (llms.txt 1 line, llms-full.txt 3, feed 200 / 34 KB, sitemap 1 loc,
 * IndexNow 28 collection URLs http=200 at 10:43Z). This test exists so the
 * next collection page cannot ship half-covered without a red build.
 */

const findManyMock = vi.fn();
const aggregateMock = vi.fn();

vi.mock('@/lib/prisma', () => {
  const mod = {
    findMany: (...args: unknown[]) => findManyMock(...args),
    aggregate: (...args: unknown[]) => aggregateMock(...args),
  };
  return { prisma: { mod }, default: { mod } };
});

// llms-full.txt reads lib/creators listHubCreators (a $queryRaw the mock
// above cannot serve); keep the pure slug helpers real, stub the loader.
vi.mock('@/lib/creators', async () => {
  const slugHelpers = await vi.importActual<typeof import('@/lib/creatorSlug')>('@/lib/creatorSlug');
  return { ...slugHelpers, listHubCreators: async () => [] };
});

/** Vacuity guard: a registry this small means the scanner found nothing. */
const MIN_COLLECTIONS = 15;

const SITE = 'https://musthavemods.com';
const canonical = (c: (typeof SIMS4_COLLECTIONS)[number]) => `${SITE}${collectionHref(c)}`;

let llmsShort = '';
let llmsFull = '';
let sitemapXml = '';
const feedBodies = new Map<string, { status: number; body: string }>();

beforeAll(async () => {
  findManyMock.mockResolvedValue([]);
  aggregateMock.mockResolvedValue({ _max: { createdAt: new Date('2026-09-01T00:00:00.000Z') } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k === 'X-WP-TotalPages' ? '1' : null) },
      json: async () => [],
    })),
  );

  const [short, full, sitemap, feed] = await Promise.all([
    import('@/app/llms.txt/route'),
    import('@/app/llms-full.txt/route'),
    import('@/app/sitemap-nextjs.xml/route'),
    import('@/app/feeds/[game]/[slug]/route'),
  ]);

  llmsShort = await (await short.GET()).text();
  llmsFull = await (await full.GET()).text();
  sitemapXml = await (await sitemap.GET()).text();

  for (const c of SIMS4_COLLECTIONS) {
    const res = await feed.GET(new Request(`${SITE}/feeds/${c.gameSlug}/${c.slug}/`), {
      params: Promise.resolve({ game: c.gameSlug, slug: c.slug }),
    });
    feedBodies.set(c.slug, { status: res.status, body: await res.text() });
  }
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('registry → discovery surfaces (E114 scanner)', () => {
  it('walks a non-trivial registry (vacuity guard)', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThanOrEqual(MIN_COLLECTIONS);
    // The 09-25 page is the one this scanner was written for; name it so a
    // registry edit that drops it is a red line, not a silent count change.
    expect(SIMS4_COLLECTIONS.some((c) => c.slug === 'kitchen-cc')).toBe(true);
  });

  it('every registered collection is listed in /llms.txt with its canonical URL', () => {
    const missing = SIMS4_COLLECTIONS.filter((c) => !llmsShort.includes(`(${canonical(c)})`)).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it('every registered collection has a section in /llms-full.txt with its canonical URL', () => {
    const missing = SIMS4_COLLECTIONS.filter((c) => !llmsFull.includes(`URL: ${canonical(c)}`)).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it('every registered collection is a <loc> in /sitemap-nextjs.xml', () => {
    const locs = new Set(Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]));
    const missing = SIMS4_COLLECTIONS.filter((c) => !locs.has(canonical(c))).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it('every registered collection serves a 200 RSS feed whose <link> is the canonical page URL', () => {
    const bad: string[] = [];
    for (const c of SIMS4_COLLECTIONS) {
      const f = feedBodies.get(c.slug);
      if (!f || f.status !== 200) {
        bad.push(`${c.slug}: http ${f?.status ?? 'none'}`);
        continue;
      }
      if (!f.body.includes(`<link>${canonical(c)}</link>`)) bad.push(`${c.slug}: no <link>${canonical(c)}</link>`);
      if (!f.body.includes(`href="${SITE}/feeds/${c.gameSlug}/${c.slug}/"`)) bad.push(`${c.slug}: self link drift`);
    }
    expect(bad).toEqual([]);
  });

  it('IndexNow pushes exactly the sitemap’s collection set (no slug reaches Bing that Google is not told about)', () => {
    const fromSitemap = new Set(
      Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]).filter((u) => /\/games\/[^/]+\/[^/]+\/$/.test(u)),
    );
    const fromIndexNow = new Set(indexNowCollectionUrls().filter((u) => /\/games\/[^/]+\/[^/]+\/$/.test(u)));
    expect(Array.from(fromIndexNow).sort()).toEqual(Array.from(fromSitemap).sort());
    expect(fromIndexNow.size).toBe(SIMS4_COLLECTIONS.length);
  });

  it('no surface emits a slashless or blog-host collection URL (the drift this scanner exists to catch)', () => {
    const everything = [llmsShort, llmsFull, sitemapXml, ...Array.from(feedBodies.values(), (f) => f.body)].join('\n');
    for (const c of SIMS4_COLLECTIONS) {
      const slashless = new RegExp(`${SITE}/games/${c.gameSlug}/${c.slug}(?![/\\w-])`);
      expect(everything, `${c.slug} slashless`).not.toMatch(slashless);
      expect(everything, `${c.slug} on blog host`).not.toContain(`https://blog.musthavemods.com/games/${c.gameSlug}/${c.slug}`);
    }
  });
});
