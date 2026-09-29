import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma';
import { modLastmod } from '@/lib/seo/modLastmod';

/**
 * Phase 2 — /sitemap-mods.xml
 *
 * This sitemap lists every indexable mod detail page so Google
 * can crawl `/mods/[id]`. See docs/PRD-traffic-recovery.md.
 *
 * E136 (2026-09-29): `<lastmod>` is max(createdAt, lastScraped), never
 * `updatedAt` — a `@updatedAt` column that counter writes bump 685×/day
 * on a catalog that adds ~7 mods/day (see lib/seo/modLastmod.ts).
 */

const ROUTE = 'app/sitemap-mods.xml/route.ts';
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// updatedAt is deliberately *newer* than every content date on every
// fixture: if it ever leaks into <lastmod>, the assertions below fail.
const fakeMods = [
  {
    id: 'mod-alpha',
    createdAt: new Date('2026-03-01T12:34:56.000Z'),
    lastScraped: null,
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
  {
    id: 'mod-beta',
    createdAt: new Date('2026-02-15T00:00:00.000Z'),
    // Re-scraped after creation → the scrape date is the honest lastmod.
    lastScraped: new Date('2026-02-20T09:00:00.000Z'),
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
  {
    id: 'mod-gamma',
    createdAt: new Date('2026-01-20T09:00:00.000Z'),
    // A scrape timestamp older than creation (backfilled row) never moves lastmod backwards.
    lastScraped: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  },
];

describe('modLastmod()', () => {
  it('returns createdAt as YYYY-MM-DD when lastScraped is null', () => {
    expect(modLastmod({ createdAt: new Date('2026-03-01T12:34:56.000Z'), lastScraped: null })).toBe('2026-03-01');
    expect(modLastmod({ createdAt: '2026-03-01T12:34:56.000Z' })).toBe('2026-03-01');
  });

  it('takes the later of createdAt and lastScraped', () => {
    expect(modLastmod(fakeMods[1])).toBe('2026-02-20');
    expect(modLastmod(fakeMods[2])).toBe('2026-01-20');
  });

  it('ignores an invalid lastScraped and rejects an invalid createdAt', () => {
    expect(modLastmod({ createdAt: '2026-03-01T00:00:00.000Z', lastScraped: 'not-a-date' })).toBe('2026-03-01');
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
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    const urlMatches = body.match(/<url>/g) ?? [];
    expect(urlMatches.length).toBe(fakeMods.length);

    for (const mod of fakeMods) {
      // Trailing slash required — trailingSlash: true means the
      // non-slash URL is a 308 redirect, not the canonical page.
      expect(body).toContain(`<loc>https://musthavemods.com/mods/${mod.id}/</loc>`);
    }
  });

  it('emits <lastmod> as YYYY-MM-DD from max(createdAt, lastScraped), never updatedAt', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    expect(body).toContain('<lastmod>2026-03-01</lastmod>'); // alpha: createdAt
    expect(body).toContain('<lastmod>2026-02-20</lastmod>'); // beta: lastScraped > createdAt
    expect(body).toContain('<lastmod>2026-01-20</lastmod>'); // gamma: createdAt > lastScraped
    // The updatedAt date must not appear anywhere in the document.
    expect(body).not.toContain('2026-09-28');
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
    expect(args.select).toMatchObject({ id: true, createdAt: true, lastScraped: true });
    expect(args.select).not.toHaveProperty('updatedAt');
    expect(args.orderBy).toMatchObject({ createdAt: 'desc' });
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

describe('sitemap-mods.xml route source', () => {
  it('derives lastmod through lib/seo/modLastmod and never names updatedAt (counter writes bump it 685×/day)', () => {
    const src = stripComments(read(ROUTE));
    expect(src).toMatch(/from '@\/lib\/seo\/modLastmod'/);
    expect(src).toMatch(/modLastmod\(/);
    expect(src).not.toContain('updatedAt');
  });

  it('keeps the class closed on the collection sitemap too (E37)', () => {
    const lib = stripComments(read('lib/sitemapLastmod.ts'));
    expect(lib).toContain('_max: { createdAt: true }');
    expect(lib).not.toContain('updatedAt: true');
  });
});
