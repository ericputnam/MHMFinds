/**
 * Feeds for new mods — JSON Feed 1.1 and RSS 2.0 (E42, Sage 2026-09-13).
 *
 * Pure builders only: no Prisma, no fetch. The route handlers under
 * app/feeds/ do the querying and pass rows in, so this module is unit-testable
 * offline and can never be the thing that 500s a crawler.
 *
 * Why feeds: AI answer engines and aggregators (ChatGPT browse, Perplexity,
 * Feedly, Pinterest RSS boards) poll feeds for "what's new" far more often
 * than they recrawl HTML. Every item cites the canonical trailing-slash mod URL
 * and the entity name "MustHaveMods", so a citation resolves to one brand and
 * one URL — the same rules as /llms.txt and /llms-full.txt.
 *
 * URL note: WordPress already serves its own RSS at /feed/ (proxied by the
 * middleware). These live under /feeds/ so the two never collide.
 */

export const SITE = 'https://musthavemods.com';
export const FEED_ITEM_LIMIT = 50;
export const FEEDS_JSON_PATH = '/feeds/mods.json';
export const FEEDS_RSS_PATH = '/feeds/mods.xml';
const DESCRIPTION_CHARS = 300;

/** The Prisma select every feed route uses — keep in sync with FeedModRow. */
export const FEED_MOD_SELECT = {
  id: true,
  title: true,
  shortDescription: true,
  description: true,
  author: true,
  contentType: true,
  isFree: true,
  images: true,
  createdAt: true,
  creator: { select: { handle: true } },
} as const;

export type FeedModRow = {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  author: string | null;
  contentType: string | null;
  isFree: boolean;
  images: string[];
  createdAt: Date | string;
  creator: { handle: string } | null;
};

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  creator: string;
  contentType: string | null;
  isFree: boolean;
  image: string | null;
  published: Date;
};

export type FeedMeta = {
  /** Feed title, e.g. "MustHaveMods — new Sims 4 mods & CC" */
  title: string;
  description: string;
  /** Page the feed is about, trailing slash. */
  homePageUrl: string;
  /** Absolute URL of the feed itself. */
  feedUrl: string;
};

export function modUrl(id: string): string {
  return `${SITE}/mods/${id}/`;
}

export function collectionFeedPath(gameSlug: string, slug: string): string {
  return `/feeds/${gameSlug}/${slug}/`;
}

/** One line, markdown/HTML stripped, capped. Descriptions are scraped content. */
export function flattenText(text: string | null | undefined, max = DESCRIPTION_CHARS): string {
  if (!text) return '';
  const flat = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/**
 * The original scraper stored Patreon campaign ids as author names
 * ("75940181", "Family Pose Pack 121935935"). Never emit a number as a creator.
 */
export function cleanAuthor(author: string | null | undefined): string {
  if (!author) return '';
  const cleaned = author.replace(/\s+\d{5,}$/, '').trim();
  return /^\d+$/.test(cleaned) ? '' : cleaned;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function firstHttpImage(images: string[] | null | undefined): string | null {
  if (!Array.isArray(images)) return null;
  const hit = images.find((u) => typeof u === 'string' && /^https?:\/\//.test(u));
  return hit ?? null;
}

export function toFeedItem(m: FeedModRow): FeedItem {
  const published = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
  return {
    id: m.id,
    url: modUrl(m.id),
    title: flattenText(m.title, 200) || 'Untitled mod',
    summary: flattenText(m.shortDescription || m.description),
    creator: m.creator?.handle || cleanAuthor(m.author) || 'creator credited on page',
    contentType: m.contentType,
    isFree: m.isFree,
    image: firstHttpImage(m.images),
    published: Number.isNaN(published.getTime()) ? new Date(0) : published,
  };
}

/** JSON Feed 1.1 — https://www.jsonfeed.org/version/1.1/ */
export function buildJsonFeed(meta: FeedMeta, items: FeedItem[]): string {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.title,
    home_page_url: meta.homePageUrl,
    feed_url: meta.feedUrl,
    description: meta.description,
    language: 'en',
    authors: [{ name: 'MustHaveMods', url: `${SITE}/` }],
    items: items.map((it) => ({
      id: it.url,
      url: it.url,
      title: it.title,
      summary: it.summary || undefined,
      content_text: it.summary || it.title,
      image: it.image || undefined,
      date_published: it.published.toISOString(),
      authors: [{ name: it.creator }],
      tags: [it.contentType, it.isFree ? 'free' : 'paid'].filter((t): t is string => !!t),
    })),
  };
  return JSON.stringify(feed, null, 2);
}

/** RSS 2.0 with atom:link self, dc:creator, and media:content for the hero image. */
export function buildRssFeed(meta: FeedMeta, items: FeedItem[], now: Date = new Date()): string {
  const lastBuild = (items[0]?.published ?? now).toUTCString();
  const itemXml = items
    .map((it) => {
      const desc = escapeXml(it.summary || it.title);
      const media = it.image
        ? `\n      <media:content url="${escapeXml(it.image)}" medium="image" />`
        : '';
      const category = it.contentType ? `\n      <category>${escapeXml(it.contentType)}</category>` : '';
      return `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.url)}</link>
      <guid isPermaLink="true">${escapeXml(it.url)}</guid>
      <pubDate>${it.published.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(it.creator)}</dc:creator>${category}
      <description>${desc}</description>${media}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.homePageUrl)}</link>
    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(meta.description)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>MustHaveMods</generator>
${itemXml}
  </channel>
</rss>
`;
}

export const FEED_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
