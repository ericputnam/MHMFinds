import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * /sitemap-creators.xml per-URL <lastmod> (E299, Sage, 2026-10-30).
 *
 * Run red first against pre-fix origin/main: lib/sitemapLastmod.ts exported no
 * `creatorLastmod`, and an entry whose newest mod predates the template date
 * carried that stale date (169 of 554 live entries said January 2026 on
 * 10-30, three days after every creator page's title and meta changed).
 */

const listCreatorsMock = vi.fn();

vi.mock('@/lib/creators', () => ({
  listCreators: (...args: unknown[]) => listCreatorsMock(...args),
}));

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

function entries(xml: string): Array<{ loc: string; lastmod: string }> {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)).map((m) => ({
    loc: m[1],
    lastmod: m[2],
  }));
}

beforeEach(() => {
  listCreatorsMock.mockReset();
});

describe('sitemap-creators.xml lastmod', () => {
  it('the template date is a real YYYY-MM-DD on or after the E267 title change (2026-10-27)', async () => {
    const { CREATOR_TEMPLATE_LASTMOD } = await import('@/lib/sitemapLastmod');
    expect(CREATOR_TEMPLATE_LASTMOD).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CREATOR_TEMPLATE_LASTMOD >= '2026-10-27').toBe(true);
    // Never a moving "today": a constant the next template change bumps by hand.
    expect(read('lib/sitemapLastmod.ts')).not.toMatch(/CREATOR_TEMPLATE_LASTMOD\s*=\s*toDateStamp\(new Date\(\)\)/);
  });

  it('creatorLastmod clamps a stale newest-mod date up to the template date and keeps a newer one', async () => {
    const { creatorLastmod, CREATOR_TEMPLATE_LASTMOD } = await import('@/lib/sitemapLastmod');
    // The route must consume the lib helper and export nothing but route fields.
    const route = read('app/sitemap-creators.xml/route.ts');
    expect(route).toMatch(/import \{ creatorLastmod \} from '\.\.\/\.\.\/lib\/sitemapLastmod'/);
    expect(route).not.toMatch(/export function creatorLastmod/);
    expect(creatorLastmod(new Date('2026-01-29T10:00:00Z'))).toBe(CREATOR_TEMPLATE_LASTMOD);
    expect(creatorLastmod(null)).toBe(CREATOR_TEMPLATE_LASTMOD);
    expect(creatorLastmod(new Date('2099-01-02T10:00:00Z'))).toBe('2099-01-02');
    expect(creatorLastmod('2099-03-04T00:00:00.000Z')).toBe('2099-03-04');
  });

  it('every entry carries a lastmod; stale creators read the template date, fresh ones their own', async () => {
    listCreatorsMock.mockResolvedValue([
      { slug: 'orchiona', displayName: 'Orchiona', mods: 40, downloads: 1, latest: new Date('2026-03-18T00:00:00Z') },
      { slug: 'fresh', displayName: 'Fresh', mods: 5, downloads: 1, latest: new Date('2099-05-06T00:00:00Z') },
      { slug: 'nolatest', displayName: 'No Latest', mods: 5, downloads: 1, latest: null },
    ]);
    const { GET } = await import('@/app/sitemap-creators.xml/route');
    const { CREATOR_TEMPLATE_LASTMOD } = await import('@/lib/sitemapLastmod');
    const res = await GET();
    expect(res.status).toBe(200);
    const rows = entries(await res.text());
    expect(rows.map((r) => r.loc)).toEqual([
      'https://musthavemods.com/creator/orchiona/',
      'https://musthavemods.com/creator/fresh/',
      'https://musthavemods.com/creator/nolatest/',
    ]);
    expect(rows[0].lastmod).toBe(CREATOR_TEMPLATE_LASTMOD);
    expect(rows[1].lastmod).toBe('2099-05-06');
    expect(rows[2].lastmod).toBe(CREATOR_TEMPLATE_LASTMOD);
  });

  it('degrades to an empty urlset with a 200 when the DB rejects', async () => {
    listCreatorsMock.mockRejectedValue(new Error('db down'));
    const { GET } = await import('@/app/sitemap-creators.xml/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(entries(xml)).toEqual([]);
  });
});
