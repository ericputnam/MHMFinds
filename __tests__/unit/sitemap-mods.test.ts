import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma';
import { modLastmod } from '@/lib/seo/modLastmod';
import { SITEMAP_MODS_PAGE_SIZE } from '@/lib/seo/sitemapMods';
import { ModJsonLd } from '@/components/ModJsonLd';
import type { Mod } from '@/lib/api';

/**
 * Phase 2 — /sitemap-mods.xml
 *
 * This sitemap lists every indexable mod detail page so Google
 * can crawl `/mods/[id]`. See docs/PRD-traffic-recovery.md.
 *
 * E136 (2026-09-29): `<lastmod>` is max(createdAt, lastScraped), never
 * `updatedAt` — a `@updatedAt` column that counter writes bump 685×/day
 * on a catalog that adds ~7 mods/day (see lib/seo/modLastmod.ts).
 *
 * E196 (2026-10-13): `publishedAt` is a floor too, so `<lastmod>` equals the
 * page's JSON-LD `dateModified` (which must never precede `datePublished`).
 * Before: 6,894 of 16,796 live entries (41 %) disagreed with their page.
 */

const ROUTE = 'app/sitemap-mods.xml/route.ts';
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// updatedAt is deliberately *newer* than every content date on every
// fixture: if it ever leaks into <lastmod>, the assertions below fail.
const fakeMods = [
  {
    id: 'mod-alpha',
    // E431: the thumbnail is the page's og:image and becomes <image:loc>;
    // the title carries the two characters that must be escaped in XML.
    title: 'Alpha Hair <v2> & More',
    thumbnail: 'https://blog.musthavemods.com/wp-content/uploads/2026/03/alpha.jpg?w=800&h=600',
    createdAt: new Date('2026-03-01T12:34:56.000Z'),
    lastScraped: null,
    publishedAt: null,
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
  {
    id: 'mod-beta',
    title: 'Beta Poses',
    // Not an absolute http(s) URL → no <image:image> for this entry.
    thumbnail: '/images/beta.png',
    createdAt: new Date('2026-02-15T00:00:00.000Z'),
    // Re-scraped after creation → the scrape date is the honest lastmod.
    lastScraped: new Date('2026-02-20T09:00:00.000Z'),
    // Upstream publish date before creation never moves lastmod backwards.
    publishedAt: new Date('2026-02-10T00:00:00.000Z'),
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
  {
    id: 'mod-gamma',
    title: 'Gamma Kitchen',
    thumbnail: null,
    createdAt: new Date('2026-01-20T09:00:00.000Z'),
    // A scrape timestamp older than creation (backfilled row) never moves lastmod backwards.
    lastScraped: new Date('2025-12-01T00:00:00.000Z'),
    publishedAt: null,
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
  {
    id: 'mod-delta',
    title: 'Delta Build Set',
    thumbnail: 'https://images.surferseo.art/delta.webp',
    createdAt: new Date('2025-11-30T21:42:15.000Z'),
    lastScraped: null,
    // The E196 shape: 7,076 live rows got a publishedAt later than createdAt
    // in a late-January 2026 backfill. JSON-LD datePublished is this date, so
    // dateModified — and therefore <lastmod> — can be no earlier.
    publishedAt: new Date('2026-01-27T04:16:59.000Z'),
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
];

const EXPECTED_LASTMOD: Record<string, string> = {
  'mod-alpha': '2026-03-01', // createdAt
  'mod-beta': '2026-02-20', // lastScraped > createdAt > publishedAt
  'mod-gamma': '2026-01-20', // createdAt > lastScraped
  'mod-delta': '2026-01-27', // publishedAt > createdAt (E196)
};

describe('modLastmod()', () => {
  it('returns createdAt as YYYY-MM-DD when lastScraped is null', () => {
    expect(modLastmod({ createdAt: new Date('2026-03-01T12:34:56.000Z'), lastScraped: null })).toBe('2026-03-01');
    expect(modLastmod({ createdAt: '2026-03-01T12:34:56.000Z' })).toBe('2026-03-01');
  });

  it('takes the later of createdAt and lastScraped', () => {
    expect(modLastmod(fakeMods[1])).toBe('2026-02-20');
    expect(modLastmod(fakeMods[2])).toBe('2026-01-20');
  });

  it('floors at publishedAt when it is later than both (E196)', () => {
    expect(modLastmod(fakeMods[3])).toBe('2026-01-27');
    // publishedAt between createdAt and lastScraped: lastScraped still wins.
    expect(
      modLastmod({ createdAt: '2026-01-01T00:00:00.000Z', publishedAt: '2026-02-01T00:00:00.000Z', lastScraped: '2026-03-01T00:00:00.000Z' }),
    ).toBe('2026-03-01');
    // publishedAt earlier than createdAt never moves lastmod backwards.
    expect(modLastmod({ createdAt: '2026-03-01T00:00:00.000Z', publishedAt: '2025-06-01T00:00:00.000Z' })).toBe('2026-03-01');
  });

  it('ignores an invalid lastScraped or publishedAt and rejects an invalid createdAt', () => {
    expect(modLastmod({ createdAt: '2026-03-01T00:00:00.000Z', lastScraped: 'not-a-date' })).toBe('2026-03-01');
    expect(modLastmod({ createdAt: '2026-03-01T00:00:00.000Z', publishedAt: 'not-a-date' })).toBe('2026-03-01');
    expect(() => modLastmod({ createdAt: 'nope' })).toThrow();
  });
});

describe('GET /sitemap-mods.xml', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('returns 200 with application/xml and correct cache headers', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/xml');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
  });

  it('emits a valid urlset with one <url> per mod', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    // The urlset also declares xmlns:image since E431, so match the prefix only.
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    const urlMatches = body.match(/<url>/g) ?? [];
    expect(urlMatches.length).toBe(fakeMods.length);

    for (const mod of fakeMods) {
      // Trailing slash required — trailingSlash: true means the
      // non-slash URL is a 308 redirect, not the canonical page.
      expect(body).toContain(`<loc>https://musthavemods.com/mods/${mod.id}/</loc>`);
    }
  });

  it('emits <lastmod> as YYYY-MM-DD from max(createdAt, lastScraped, publishedAt), never updatedAt', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    for (const mod of fakeMods) {
      const entry = body.match(new RegExp(`<loc>[^<]*/mods/${mod.id}/</loc>\\s*<lastmod>([^<]+)</lastmod>`));
      expect(entry?.[1], mod.id).toBe(EXPECTED_LASTMOD[mod.id]);
    }
    // The updatedAt date must not appear anywhere in the document, and
    // delta's createdAt must have been replaced by its later publishedAt.
    expect(body).not.toContain('2026-09-28');
    expect(body).not.toContain('2025-11-30');
    const lastmods = Array.from(body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)).map((m) => m[1]);
    expect(lastmods).toHaveLength(fakeMods.length);
    for (const l of lastmods) expect(l).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('emits changefreq=weekly and priority=0.8 on every entry', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    const changefreqCount = (body.match(/<changefreq>weekly<\/changefreq>/g) ?? []).length;
    const priorityCount = (body.match(/<priority>0\.8<\/priority>/g) ?? []).length;
    expect(changefreqCount).toBe(fakeMods.length);
    expect(priorityCount).toBe(fakeMods.length);
  });

  it('filters NSFW and unverified mods at the query level and never selects updatedAt', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    await GET();

    expect(mockPrismaClient.mod.findMany).toHaveBeenCalledOnce();
    const args = mockPrismaClient.mod.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ isNSFW: false, isVerified: true });
    // Every input modLastmod() reads must be selected, or the floor is silently a no-op.
    expect(args.select).toMatchObject({ id: true, createdAt: true, lastScraped: true, publishedAt: true });
    // E431: the image child needs the thumbnail and the title.
    expect(args.select).toMatchObject({ thumbnail: true, title: true });
    expect(args.select).not.toHaveProperty('updatedAt');
    // Newest first, with a total order so skip/take paging is stable.
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    expect(args.skip).toBe(0);
    expect(args.take).toBe(SITEMAP_MODS_PAGE_SIZE);
  });

  // E431: one Accelerate response is capped at 5 MB and the six-column select
  // for the live catalog is 5.6 MB (`next build` failed with P6009 on the
  // first attempt), so the route pages. A full page means "ask again".
  it('pages through the catalog until a short page and emits every row once', async () => {
    const pageSize = SITEMAP_MODS_PAGE_SIZE;
    const row = (n: number) => ({
      id: `mod-${String(n).padStart(5, '0')}`,
      title: `Mod ${n}`,
      thumbnail: `https://blog.musthavemods.com/u/${n}.jpg`,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      lastScraped: null,
      publishedAt: null,
    });
    const full = Array.from({ length: pageSize }, (_, i) => row(i));
    const tail = Array.from({ length: 3 }, (_, i) => row(pageSize + i));
    mockPrismaClient.mod.findMany.mockResolvedValueOnce(full).mockResolvedValueOnce(tail);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    expect(mockPrismaClient.mod.findMany).toHaveBeenCalledTimes(2);
    const calls = mockPrismaClient.mod.findMany.mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.skip)).toEqual([0, pageSize]);
    expect(calls.every((c) => c.take === pageSize)).toBe(true);
    expect((body.match(/<url>/g) ?? []).length).toBe(pageSize + 3);
    expect((body.match(/<image:image>/g) ?? []).length).toBe(pageSize + 3);
    expect(body).toContain(`<loc>https://musthavemods.com/mods/mod-${String(pageSize + 2).padStart(5, '0')}/</loc>`);
    // Each page must stay well inside the 5 MB cap at ~320 B a row.
    expect(pageSize * 320).toBeLessThan(2 * 1024 * 1024);
  });

  // E431 (2026-11-19). Pre-fix origin/main fails every assertion in this
  // block: the urlset had no image namespace and no <image:image> child.
  it('carries each absolute-URL thumbnail as an <image:image> child with an escaped title (E431)', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    // alpha and delta have absolute http(s) thumbnails; beta (relative) and gamma (null) do not.
    expect((body.match(/<image:image>/g) ?? []).length).toBe(2);

    const alpha = body.match(/<loc>[^<]*\/mods\/mod-alpha\/<\/loc>[\s\S]*?<\/url>/)?.[0] ?? '';
    expect(alpha).toContain(
      '<image:loc>https://blog.musthavemods.com/wp-content/uploads/2026/03/alpha.jpg?w=800&amp;h=600</image:loc>',
    );
    expect(alpha).toContain('<image:title>Alpha Hair &lt;v2&gt; &amp; More</image:title>');
    // Raw `&` or `<` inside the image block would make the whole file unparsable.
    expect(alpha).not.toMatch(/<image:(loc|title)>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);

    const delta = body.match(/<loc>[^<]*\/mods\/mod-delta\/<\/loc>[\s\S]*?<\/url>/)?.[0] ?? '';
    expect(delta).toContain('<image:loc>https://images.surferseo.art/delta.webp</image:loc>');
    expect(delta).toContain('<image:title>Delta Build Set</image:title>');

    const beta = body.match(/<loc>[^<]*\/mods\/mod-beta\/<\/loc>[\s\S]*?<\/url>/)?.[0] ?? '';
    expect(beta).not.toContain('<image:');
    const gamma = body.match(/<loc>[^<]*\/mods\/mod-gamma\/<\/loc>[\s\S]*?<\/url>/)?.[0] ?? '';
    expect(gamma).not.toContain('<image:');
    // A relative path must never leak into the file as an image location.
    expect(body).not.toContain('/images/beta.png');

    // The image child must not disturb the per-URL lastmod the E136/E196 tests read.
    expect(body.match(/<loc>[^<]*\/mods\/mod-alpha\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/)?.[1]).toBe('2026-03-01');
  });

  it('returns an empty but valid urlset when no mods match', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('<urlset');
    expect(body).toContain('</urlset>');
    expect(body).not.toContain('<url>');
  });
});

/**
 * E196: the sitemap and the page must tell Google the same date. Pre-fix
 * (origin/main before 2026-10-13) this fails on mod-delta only: the sitemap
 * said 2025-11-30 (createdAt) while the page said 2026-01-27 (publishedAt).
 */
describe('sitemap <lastmod> equals the page JSON-LD dateModified (E196)', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  function pageDateModified(fixture: (typeof fakeMods)[number]): unknown {
    const mod = {
      id: fixture.id,
      title: `Fixture ${fixture.id}`,
      description: 'A fixture.',
      shortDescription: 'A fixture.',
      category: 'Hair',
      gameVersion: 'Sims 4',
      isFree: true,
      price: null,
      thumbnail: null,
      images: [],
      createdAt: fixture.createdAt.toISOString(),
      updatedAt: fixture.updatedAt.toISOString(),
      publishedAt: fixture.publishedAt ? fixture.publishedAt.toISOString() : null,
      lastScraped: fixture.lastScraped ? fixture.lastScraped.toISOString() : null,
    } as unknown as Mod;
    const html = renderToStaticMarkup(createElement(ModJsonLd, { mod }));
    const blocks = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) =>
      JSON.parse(m[1]),
    );
    const node = blocks.find((b) => b['@type'] === 'SoftwareApplication');
    expect(node, fixture.id).toBeTruthy();
    return node.dateModified;
  }

  it('agrees on every fixture, including the publishedAt-later-than-createdAt shape', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');
    const body = await (await GET()).text();

    const disagreements: string[] = [];
    for (const mod of fakeMods) {
      const sitemap = body.match(new RegExp(`<loc>[^<]*/mods/${mod.id}/</loc>\\s*<lastmod>([^<]+)</lastmod>`))?.[1];
      const page = pageDateModified(mod);
      if (sitemap !== page) disagreements.push(`${mod.id}: sitemap ${sitemap} vs page ${page}`);
    }
    expect(disagreements).toEqual([]);
    // Vacuity guard: the fixture set must contain the shape that used to disagree.
    expect(fakeMods.some((m) => m.publishedAt && m.publishedAt > m.createdAt)).toBe(true);
  });
});

describe('sitemap-mods.xml route source', () => {
  it('derives lastmod through lib/seo/modLastmod and never names updatedAt (counter writes bump it 685×/day)', () => {
    const src = stripComments(read(ROUTE));
    expect(src).toMatch(/from '@\/lib\/seo\/modLastmod'/);
    expect(src).toMatch(/modLastmod\(/);
    expect(src).not.toContain('updatedAt');
    // The query lives in the paged helper; the route must not grow its own findMany.
    expect(src).toMatch(/listSitemapMods\(\)/);
    expect(src).not.toContain('findMany');
    const lib = stripComments(read('lib/seo/sitemapMods.ts'));
    expect(lib).not.toContain('updatedAt');
    expect(lib).toContain('skip');
    expect(lib).toContain('take: pageSize');
  });

  it('keeps the class closed on the collection sitemap too (E37)', () => {
    const lib = stripComments(read('lib/sitemapLastmod.ts'));
    expect(lib).toContain('_max: { createdAt: true }');
    expect(lib).not.toContain('updatedAt: true');
  });
});
