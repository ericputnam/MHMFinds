import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma';

/**
 * Phase 2 — /sitemap-mods.xml
 *
 * This sitemap lists every indexable mod detail page so Google
 * can crawl `/mods/[id]`. See docs/PRD-traffic-recovery.md.
 */

const fakeMods = [
  { id: 'mod-alpha', updatedAt: new Date('2026-03-01T12:34:56.000Z') },
  { id: 'mod-beta', updatedAt: new Date('2026-02-15T00:00:00.000Z') },
  { id: 'mod-gamma', updatedAt: new Date('2026-01-20T09:00:00.000Z') },
];

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
      expect(body).toContain(`<loc>https://musthavemods.com/mods/${mod.id}</loc>`);
    }
  });

  it('emits <lastmod> as YYYY-MM-DD derived from updatedAt', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue(fakeMods);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    const body = await (await GET()).text();

    expect(body).toContain('<lastmod>2026-03-01</lastmod>');
    expect(body).toContain('<lastmod>2026-02-15</lastmod>');
    expect(body).toContain('<lastmod>2026-01-20</lastmod>');
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

  it('filters NSFW and unverified mods at the query level', async () => {
    mockPrismaClient.mod.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/sitemap-mods.xml/route');

    await GET();

    expect(mockPrismaClient.mod.findMany).toHaveBeenCalledOnce();
    const args = mockPrismaClient.mod.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ isNSFW: false, isVerified: true });
    expect(args.select).toMatchObject({ id: true, updatedAt: true });
    expect(args.orderBy).toMatchObject({ updatedAt: 'desc' });
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
