import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { SIMS4_COLLECTIONS } from '@/lib/collections';

/**
 * /llms.txt and /llms-full.txt — the AI answer-engine surface (E27).
 *
 * Structural: both files must list every collection in the registry with its
 * canonical trailing-slash URL, name the brand consistently, and the long form
 * must never 500 — a crawler that gets an error once may not come back.
 */

const findManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { mod: { findMany: (...args: unknown[]) => findManyMock(...args) } },
  default: { mod: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}));

function fakeMod(i: number, extra: Partial<Record<string, unknown>> = {}) {
  return {
    id: `mod${i}`,
    title: `Fake Mod ${i}`,
    shortDescription: `Short description for mod ${i} with **markdown** and [a link](https://x.test).`,
    description: null,
    author: `author${i}`,
    contentType: 'hair',
    isFree: i % 2 === 0,
    downloadCount: 1000 - i,
    creator: i % 3 === 0 ? { handle: `creator${i}` } : null,
    ...extra,
  };
}

const wpPosts = [
  { title: { rendered: 'Sims 4 Goth Nails CC &#8211; 20 Finds' }, link: 'https://blog.musthavemods.com/sims-4-goth-nails-cc/', date_gmt: '2026-09-09T10:00:00' },
  { title: { rendered: 'Redirected legacy post' }, link: 'https://blog.musthavemods.com/sims-4-pregnancy-mods/', date_gmt: '2025-01-01T00:00:00' },
];

const collectionUrls = SIMS4_COLLECTIONS.map((c) => `https://musthavemods.com/games/${c.gameSlug}/${c.slug}/`);

describe('/llms.txt (short index)', () => {
  it('lists every registry collection with its canonical URL and points at llms-full.txt', async () => {
    const { GET } = await import('@/app/llms.txt/route');
    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    for (const url of collectionUrls) expect(text).toContain(url);
    expect(text).toContain('https://musthavemods.com/llms-full.txt');
    expect(text).toContain('# MustHaveMods');
    expect(text).toContain('https://musthavemods.com/sitemap.xml');
  });
});

describe('/llms-full.txt (long form)', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => wpPosts })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves every collection with intro, related links, and top mods with creator credit and canonical mod URLs', async () => {
    findManyMock.mockImplementation(async ({ take }: { take: number }) =>
      Array.from({ length: Math.min(take, 3) }, (_, i) => fakeMod(i)),
    );

    const { GET } = await import('@/app/llms-full.txt/route');
    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');

    for (const c of SIMS4_COLLECTIONS) {
      expect(text).toContain(`### ${c.heading}`);
      expect(text).toContain(`URL: https://musthavemods.com/games/${c.gameSlug}/${c.slug}/`);
      // the editorial intro is what makes the file answer-ready
      expect(text).toContain(c.intro.slice(0, 80));
    }
    // one query per collection + one site-wide
    expect(findManyMock).toHaveBeenCalledTimes(SIMS4_COLLECTIONS.length + 1);

    // mod lines: canonical trailing-slash URL, creator credit, free/paid
    expect(text).toContain('https://musthavemods.com/mods/mod0/');
    expect(text).toContain('Fake Mod 0 — by creator0 (free · hair · 1,000 downloads)');
    expect(text).toContain('Fake Mod 1 — by author1 (paid · hair · 999 downloads)');
    // markdown/link syntax stripped from descriptions
    expect(text).not.toContain('**markdown**');
    expect(text).not.toContain('](https://x.test)');
    expect(text).toContain('Short description for mod 0 with markdown and a link.');

    // guides: apex-rewritten, entities decoded, redirected legacy posts excluded
    expect(text).toContain('Sims 4 Goth Nails CC – 20 Finds (2026-09-09) — https://musthavemods.com/sims-4-goth-nails-cc/');
    expect(text).not.toContain('/sims-4-pregnancy-mods/');
    expect(text).not.toContain('blog.musthavemods.com');
  });

  it('never credits a Patreon id as the creator', async () => {
    findManyMock.mockResolvedValue([
      fakeMod(1, { author: '75940181', creator: null }),
      fakeMod(2, { author: 'Family Pose Pack 121935935', creator: null }),
      fakeMod(3, { author: 'PolarBearSims', creator: null }),
    ]);
    const { GET } = await import('@/app/llms-full.txt/route');
    const text = await (await GET()).text();

    expect(text).toContain('Fake Mod 1 — by creator credited on page (');
    expect(text).toContain('Fake Mod 2 — by Family Pose Pack (');
    expect(text).toContain('Fake Mod 3 — by PolarBearSims (');
    expect(text).not.toMatch(/by \d+ \(/);
  });

  it('every query is Sims 4 + SFW, ordered by downloads', async () => {
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/llms-full.txt/route');
    await GET();

    for (const call of findManyMock.mock.calls) {
      const args = call[0] as { where: Record<string, unknown>; orderBy: unknown[] };
      expect(args.where.isNSFW).toBe(false);
      expect(args.where.gameVersion).toBe('Sims 4');
      expect(args.orderBy[0]).toEqual({ downloadCount: 'desc' });
    }
  });

  it('still returns 200 with the full collection index when the database is down', async () => {
    findManyMock.mockRejectedValue(new Error('P1001: cannot reach database'));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    const { GET } = await import('@/app/llms-full.txt/route');
    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    for (const url of collectionUrls) expect(text).toContain(`URL: ${url}`);
    expect(text).toContain('live mod lists were unavailable');
    expect(text).toContain('Guides index: https://musthavemods.com/blog/');
  });

  it('is force-dynamic (never baked at build time) and names the brand consistently', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../app/llms-full.txt/route.ts'), 'utf-8');
    expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(src).not.toMatch(/force-static/);
    expect(src).toContain('# MustHaveMods');
  });

  it('is on the smoke-render target list so deploy-verify checks it is live', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/agents/smoke-render.ts'), 'utf-8');
    expect(src).toContain("{ path: '/llms-full.txt', kind: 'text' }");
  });
});
