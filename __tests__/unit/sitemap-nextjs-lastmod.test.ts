import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { SIMS4_COLLECTIONS } from '@/lib/collections';

/**
 * /sitemap-nextjs.xml per-collection <lastmod> (E37).
 *
 * Until 2026-09-12 every URL carried one hardcoded date, which Google
 * treats as no signal at all. Now each collection page's lastmod is the
 * later of the template date and the newest mod *created* inside it, the
 * route is force-dynamic, and a DB failure degrades to the template date
 * rather than a 500.
 */

const aggregateMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { mod: { aggregate: (...args: unknown[]) => aggregateMock(...args) } },
  default: { mod: { aggregate: (...args: unknown[]) => aggregateMock(...args) } },
}));

const ROUTE = 'app/sitemap-nextjs.xml/route.ts';
const LIB = 'lib/sitemapLastmod.ts';
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

function entries(xml: string): Array<{ loc: string; lastmod: string }> {
  return Array.from(
    xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g),
  ).map((m) => ({ loc: m[1], lastmod: m[2] }));
}

// Deterministic per-collection dates keyed off the where-clause the route
// builds: hair → recent, everything else → older than the template date.
function aggregateByWhere(args: any) {
  const where = JSON.stringify(args?.where ?? {});
  if (where.includes('"hair"')) {
    return Promise.resolve({ _max: { createdAt: new Date('2026-09-10T18:22:00.000Z') } });
  }
  if (where.includes('"poses"')) {
    return Promise.resolve({ _max: { createdAt: new Date('2026-09-09T02:00:00.000Z') } });
  }
  return Promise.resolve({ _max: { createdAt: new Date('2026-01-25T00:00:00.000Z') } });
}

beforeEach(() => {
  aggregateMock.mockReset();
});

describe('sitemap-nextjs.xml route structure', () => {
  it('is force-dynamic (it reads the DB per request)', () => {
    const src = read(ROUTE);
    expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(src).not.toMatch(/force-static/);
  });

  it('derives lastmod from createdAt, never updatedAt (a daily job bumps updatedAt catalog-wide)', () => {
    const src = read(LIB);
    expect(src).toContain('_max: { createdAt: true }');
    expect(src).not.toContain('updatedAt: true');
  });

  it('collection where-clause matches the collection page (gameVersion + isNSFW:false)', () => {
    const src = read(LIB);
    expect(src).toContain('...buildWhereClause(collection.filter)');
    expect(src).toContain('gameVersion: collection.game');
    expect(src).toContain('isNSFW: false');
  });
});

describe('sitemap-nextjs.xml per-URL lastmod', () => {
  it('emits one lastmod per URL that varies by collection', async () => {
    aggregateMock.mockImplementation(aggregateByWhere);
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const { COLLECTION_TEMPLATE_LASTMOD } = await import('@/lib/sitemapLastmod');
    const xml = await (await GET()).text();
    const rows = entries(xml);

    expect(rows.length).toBeGreaterThan(SIMS4_COLLECTIONS.length);
    for (const r of rows) {
      expect(r.lastmod, r.loc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    const hair = rows.find((r) => r.loc === 'https://musthavemods.com/games/sims-4/hair-cc/');
    const goth = rows.find((r) => r.loc === 'https://musthavemods.com/games/sims-4/goth-cc/');
    expect(hair?.lastmod).toBe('2026-09-10');
    // Older than the template change → clamps up to the template date.
    expect(goth?.lastmod).toBe(COLLECTION_TEMPLATE_LASTMOD);

    const distinct = new Set(rows.map((r) => r.lastmod));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });

  it('queries the DB once per collection and never with a dynamic "today"', async () => {
    aggregateMock.mockImplementation(aggregateByWhere);
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const xml = await (await GET()).text();

    expect(aggregateMock).toHaveBeenCalledTimes(SIMS4_COLLECTIONS.length);
    const today = new Date().toISOString().slice(0, 10);
    // Fixture dates are all in the past, so "today" must not appear.
    expect(xml).not.toContain(`<lastmod>${today}</lastmod>`);
  });

  it('rolls the newest collection date up to the game hub and the homepage', async () => {
    aggregateMock.mockImplementation(aggregateByWhere);
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const rows = entries(await (await GET()).text());

    const home = rows.find((r) => r.loc === 'https://musthavemods.com/');
    const sims4 = rows.find((r) => r.loc === 'https://musthavemods.com/games/sims-4/');
    expect(home?.lastmod).toBe('2026-09-10');
    expect(sims4?.lastmod).toBe('2026-09-10');
  });

  it('degrades to the template date with a 200 when the DB rejects', async () => {
    aggregateMock.mockRejectedValue(new Error('db down'));
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const { COLLECTION_TEMPLATE_LASTMOD, APP_LASTMOD } = await import('@/lib/sitemapLastmod');
    const res = await GET();
    expect(res.status).toBe(200);
    const rows = entries(await res.text());

    expect(rows.length).toBeGreaterThan(SIMS4_COLLECTIONS.length);
    for (const c of SIMS4_COLLECTIONS) {
      const row = rows.find((r) => r.loc === `https://musthavemods.com/games/sims-4/${c.slug}/`);
      expect(row?.lastmod, c.slug).toBe(COLLECTION_TEMPLATE_LASTMOD);
    }
    const about = rows.find((r) => r.loc === 'https://musthavemods.com/about/');
    expect(about?.lastmod).toBe(APP_LASTMOD);
  });

  it('keeps every loc on a trailing slash and the XML shape intact', async () => {
    aggregateMock.mockImplementation(aggregateByWhere);
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const res = await GET();
    const xml = await res.text();
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    for (const r of entries(xml)) {
      expect(r.loc.endsWith('/'), r.loc).toBe(true);
    }
  });
});
