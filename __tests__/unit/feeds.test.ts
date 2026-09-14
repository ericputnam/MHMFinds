import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { SIMS4_COLLECTIONS } from '@/lib/collections';
import {
  buildJsonFeed,
  buildRssFeed,
  cleanAuthor,
  escapeXml,
  flattenText,
  toFeedItem,
  type FeedModRow,
} from '@/lib/feeds';

/**
 * /feeds/mods.json, /feeds/mods.xml and /feeds/{game}/{slug}/ — the "what's
 * new" surface for answer engines and feed readers (E42).
 *
 * Contract: valid JSON Feed 1.1 / RSS 2.0, every URL is the canonical
 * trailing-slash apex URL, XML is escaped, the brand is "MustHaveMods", a DB
 * failure still returns 200, and the middleware/smoke wiring cannot silently
 * regress (feeds would otherwise proxy to WordPress and 404, like /play did).
 */

const findManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { mod: { findMany: (...args: unknown[]) => findManyMock(...args) } },
  default: { mod: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}));

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf-8');

function fakeMod(i: number, extra: Partial<FeedModRow> = {}): FeedModRow {
  return {
    id: `mod${i}`,
    title: `Fake Mod ${i} & "friends" <b>bold</b>`,
    shortDescription: `Short **markdown** description for mod ${i} with [a link](https://x.test).`,
    description: null,
    author: `author${i}`,
    contentType: 'hair',
    isFree: i % 2 === 0,
    images: [`https://cdn.test/${i}.jpg`],
    createdAt: new Date(Date.UTC(2026, 8, 10 - i, 12, 0, 0)),
    creator: i % 3 === 0 ? { handle: `creator${i}` } : null,
    ...extra,
  };
}

const meta = {
  title: 'MustHaveMods — new Sims 4 mods & CC',
  description: 'desc',
  homePageUrl: 'https://musthavemods.com/',
  feedUrl: 'https://musthavemods.com/feeds/mods.xml',
};

describe('lib/feeds builders (pure)', () => {
  it('toFeedItem uses the canonical trailing-slash mod URL, flattens markdown and credits the creator', () => {
    const it0 = toFeedItem(fakeMod(0));
    expect(it0.url).toBe('https://musthavemods.com/mods/mod0/');
    expect(it0.summary).toBe('Short markdown description for mod 0 with a link.');
    expect(it0.creator).toBe('creator0');
    expect(toFeedItem(fakeMod(1)).creator).toBe('author1');
    expect(it0.image).toBe('https://cdn.test/0.jpg');
  });

  it('never emits an all-digit Patreon id as a creator', () => {
    expect(cleanAuthor('75940181')).toBe('');
    expect(cleanAuthor('Family Pose Pack 121935935')).toBe('Family Pose Pack');
    expect(toFeedItem(fakeMod(1, { author: '75940181', creator: null })).creator).toBe('creator credited on page');
  });

  it('survives bad dates and non-http images', () => {
    const item = toFeedItem(fakeMod(1, { createdAt: 'not a date', images: ['data:image/png;base64,xx', '/relative.jpg'] }));
    expect(item.published.getTime()).toBe(0);
    expect(item.image).toBeNull();
  });

  it('flattenText caps at the limit on a word boundary', () => {
    const long = 'word '.repeat(200);
    const out = flattenText(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('builds a JSON Feed 1.1 document', () => {
    const json = JSON.parse(buildJsonFeed(meta, [toFeedItem(fakeMod(0)), toFeedItem(fakeMod(1))]));
    expect(json.version).toBe('https://jsonfeed.org/version/1.1');
    expect(json.title).toContain('MustHaveMods');
    expect(json.feed_url).toBe(meta.feedUrl);
    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe('https://musthavemods.com/mods/mod0/');
    expect(json.items[0].url).toMatch(/\/$/);
    expect(json.items[0].date_published).toBe('2026-09-10T12:00:00.000Z');
    expect(json.items[0].authors[0].name).toBe('creator0');
    expect(json.items[0].tags).toEqual(['hair', 'free']);
    expect(json.items[1].tags).toEqual(['hair', 'paid']);
  });

  it('builds RSS 2.0 with escaped text, self link, pubDate and permalink guid', () => {
    const xml = buildRssFeed(meta, [toFeedItem(fakeMod(0))], new Date(0));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<atom:link href="https://musthavemods.com/feeds/mods.xml" rel="self"');
    // HTML tags are stripped from titles before escaping; & and quotes are escaped
    expect(xml).toContain('<title>Fake Mod 0 &amp; &quot;friends&quot; bold</title>');
    expect(xml).not.toContain('<b>');
    expect(xml).not.toContain(' & ');
    expect(xml).toContain('<guid isPermaLink="true">https://musthavemods.com/mods/mod0/</guid>');
    expect(xml).toContain('<pubDate>Thu, 10 Sep 2026 12:00:00 GMT</pubDate>');
    expect(xml).toContain('<dc:creator>creator0</dc:creator>');
    expect(xml).toContain('<media:content url="https://cdn.test/0.jpg"');
    expect(escapeXml(`a"b'c`)).toBe('a&quot;b&apos;c');
  });

  it('an empty feed is still a valid document', () => {
    const xml = buildRssFeed(meta, [], new Date(0));
    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
    const json = JSON.parse(buildJsonFeed(meta, []));
    expect(json.items).toEqual([]);
  });
});

describe('/feeds/mods.json and /feeds/mods.xml (route handlers)', () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it('serves the newest Sims 4 SFW mods as JSON Feed, newest first, capped at 50', async () => {
    findManyMock.mockResolvedValue([fakeMod(0), fakeMod(1), fakeMod(2)]);
    const { GET } = await import('@/app/feeds/mods.json/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/feed+json');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
    const json = JSON.parse(await res.text());
    expect(json.items.map((i: { id: string }) => i.id)).toEqual([
      'https://musthavemods.com/mods/mod0/',
      'https://musthavemods.com/mods/mod1/',
      'https://musthavemods.com/mods/mod2/',
    ]);
    const args = findManyMock.mock.calls[0][0] as { where: Record<string, unknown>; take: number; orderBy: unknown[] };
    expect(args.where).toMatchObject({ gameVersion: 'Sims 4', isNSFW: false });
    expect(args.take).toBe(50);
    expect(args.orderBy[0]).toEqual({ createdAt: 'desc' });
  });

  it('serves RSS with the rss+xml content type', async () => {
    findManyMock.mockResolvedValue([fakeMod(0)]);
    const { GET } = await import('@/app/feeds/mods.xml/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/rss+xml');
    const xml = await res.text();
    expect(xml).toContain('<link>https://musthavemods.com/mods/mod0/</link>');
    expect(xml).toContain('<atom:link href="https://musthavemods.com/feeds/mods.xml"');
  });

  it('degrades to an empty valid feed with a 200 when the DB rejects', async () => {
    findManyMock.mockRejectedValue(new Error('db down'));
    const jsonRoute = await import('@/app/feeds/mods.json/route');
    const rssRoute = await import('@/app/feeds/mods.xml/route');
    const jsonRes = await jsonRoute.GET();
    const rssRes = await rssRoute.GET();
    expect(jsonRes.status).toBe(200);
    expect(rssRes.status).toBe(200);
    expect(JSON.parse(await jsonRes.text()).items).toEqual([]);
    expect(await rssRes.text()).toContain('<channel>');
  });
});

describe('/feeds/{game}/{slug}/ (per-collection RSS)', () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  const ctx = (game: string, slug: string) => ({ params: Promise.resolve({ game, slug }) });

  it('404s for a collection that does not exist', async () => {
    const { GET } = await import('@/app/feeds/[game]/[slug]/route');
    const res = await GET(new Request('https://musthavemods.com/feeds/sims-4/nope/'), ctx('sims-4', 'nope'));
    expect(res.status).toBe(404);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('uses the collection page where-clause and its canonical page URL', async () => {
    findManyMock.mockResolvedValue([fakeMod(0)]);
    const { GET } = await import('@/app/feeds/[game]/[slug]/route');
    const res = await GET(new Request('https://musthavemods.com/feeds/sims-4/hair-cc/'), ctx('sims-4', 'hair-cc'));
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<link>https://musthavemods.com/games/sims-4/hair-cc/</link>');
    expect(xml).toContain('<atom:link href="https://musthavemods.com/feeds/sims-4/hair-cc/"');
    expect(xml).toContain('MustHaveMods');
    const args = findManyMock.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ gameVersion: 'Sims 4', isNSFW: false });
    expect(Object.keys(args.where).length).toBeGreaterThan(2); // the facet filter is present
  });

  it('every registry collection resolves to a feed (no slug 404s)', async () => {
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/feeds/[game]/[slug]/route');
    for (const c of SIMS4_COLLECTIONS) {
      const res = await GET(new Request('https://musthavemods.com/'), ctx(c.gameSlug, c.slug));
      expect(res.status, c.slug).toBe(200);
    }
  });
});

describe('wiring that would otherwise fail silently', () => {
  it("middleware routes /feeds/* to Next.js (not the WordPress proxy) and leaves WordPress's /feed/ alone", () => {
    const src = read('middleware.ts');
    const prefixes = src.match(/const NEXTJS_PREFIXES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
    expect(prefixes).toMatch(/'feeds'/);
    expect(prefixes).not.toMatch(/'feed'/); // singular is the WP RSS feed, must keep proxying
  });

  it('the homepage and collection pages advertise the feeds via <link rel="alternate">', () => {
    expect(read('app/layout.tsx')).toContain("'application/rss+xml': 'https://musthavemods.com/feeds/mods.xml'");
    expect(read('app/layout.tsx')).toContain("'application/feed+json': 'https://musthavemods.com/feeds/mods.json'");
    expect(read('app/games/[game]/[topic]/page.tsx')).toContain(
      "'application/rss+xml': `https://musthavemods.com/feeds/${collection.gameSlug}/${collection.slug}/`",
    );
  });

  it('llms.txt points assistants at the feeds', async () => {
    const { GET } = await import('@/app/llms.txt/route');
    const text = await (await GET()).text();
    expect(text).toContain('https://musthavemods.com/feeds/mods.json');
    expect(text).toContain('https://musthavemods.com/feeds/mods.xml');
  });

  it('the post-deploy smoke check renders both feeds', () => {
    const src = read('scripts/agents/smoke-render.ts');
    expect(src).toContain("{ path: '/feeds/mods.json', kind: 'text' }");
    expect(src).toContain("{ path: '/feeds/mods.xml', kind: 'xml' }");
  });
});
