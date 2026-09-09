import { NextResponse } from 'next/server';

import { SIMS4_COLLECTIONS, buildWhereClause, type CollectionDefinition } from '@/lib/collections';
import { prisma } from '@/lib/prisma';

/**
 * llms-full.txt — the long-form companion to /llms.txt (https://llmstxt.org/).
 *
 * /llms.txt is the short index an assistant reads first. This file is what it
 * reads when it wants to actually answer "what are good Sims 4 pregnancy mods?"
 * without crawling 18 collection pages: every collection's editorial intro plus
 * its top mods by downloads, the site-wide most-downloaded mods, and the most
 * recent blog guides — each with the canonical apex URL an answer engine can
 * cite. Same data the collection pages render; same safety filters (Sims 4,
 * SFW). Entity name is always "MustHaveMods" so citations resolve to one brand.
 *
 * Failure mode: every network/DB call is wrapped; if the database is unreachable
 * the file still serves the collection index from the registry with a note, so
 * a crawler never sees a 500 here.
 */

export const dynamic = 'force-dynamic';

const SITE = 'https://musthavemods.com';
const WP_POSTS_URL =
  'https://blog.musthavemods.com/wp-json/wp/v2/posts?per_page=20&_fields=title,link,date_gmt';

// Legacy posts whose apex URLs 301 to a collection page (vercel.json). Keep in
// sync with app/sitemap-blog-posts.xml/route.ts — a cite-able list must not
// hand an assistant a URL that redirects.
const REDIRECTED_POST_PATHS = [
  '/sims-4-pregnancy-mods/',
  '/sims-4-female-clothes-cc/',
  '/sims-4-male-clothes-cc/',
  '/sims-4-cc-skin-details/',
  '/sims-4-gallery-poses/',
  '/sims-4-goth-cc/',
  '/sims-4-cottagecore-cc/',
  '/sims-4-y2k-cc/',
];

const TOP_PER_COLLECTION = 10;
const TOP_SITEWIDE = 40;
const DESCRIPTION_CHARS = 160;

type ModRow = {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  author: string | null;
  contentType: string | null;
  isFree: boolean;
  downloadCount: number;
  creator: { handle: string } | null;
};

const MOD_SELECT = {
  id: true,
  title: true,
  shortDescription: true,
  description: true,
  author: true,
  contentType: true,
  isFree: true,
  downloadCount: true,
  creator: { select: { handle: true } },
} as const;

function collectionUrl(c: CollectionDefinition): string {
  return `${SITE}/games/${c.gameSlug}/${c.slug}/`;
}

/** One line, no markdown link syntax, capped — descriptions are scraped HTML/markdown. */
function oneLine(text: string | null | undefined, max = DESCRIPTION_CHARS): string {
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

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ');
}

/**
 * The original scraper stored Patreon campaign ids as author names ("75940181",
 * "Family Pose Pack 121935935" — see scripts/cleanup-author-data.ts). Never hand
 * an assistant a number as a creator credit: strip trailing id tokens and drop
 * all-numeric values so the line falls back to "creator credited on page".
 */
function cleanAuthor(author: string | null | undefined): string {
  if (!author) return '';
  const cleaned = author.replace(/\s+\d{5,}$/, '').trim();
  return /^\d+$/.test(cleaned) ? '' : cleaned;
}

function modLine(m: ModRow, position: number): string {
  const creator = m.creator?.handle || cleanAuthor(m.author) || 'creator credited on page';
  const price = m.isFree ? 'free' : 'paid';
  const type = m.contentType ? ` · ${m.contentType}` : '';
  const desc = oneLine(m.shortDescription || m.description);
  const downloads = m.downloadCount > 0 ? ` · ${m.downloadCount.toLocaleString('en-US')} downloads` : '';
  return `${position}. ${m.title} — by ${creator} (${price}${type}${downloads}) — ${SITE}/mods/${m.id}/${desc ? `\n   ${desc}` : ''}`;
}

async function fetchCollectionTop(c: CollectionDefinition): Promise<ModRow[]> {
  return prisma.mod.findMany({
    where: { ...buildWhereClause(c.filter), gameVersion: c.game, isNSFW: false },
    orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
    take: TOP_PER_COLLECTION,
    select: MOD_SELECT,
  });
}

async function fetchSitewideTop(): Promise<ModRow[]> {
  return prisma.mod.findMany({
    where: { gameVersion: 'Sims 4', isNSFW: false },
    orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
    take: TOP_SITEWIDE,
    select: MOD_SELECT,
  });
}

type Guide = { title: string; url: string; date: string };

async function fetchRecentGuides(): Promise<Guide[]> {
  try {
    const res = await fetch(WP_POSTS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const posts = (await res.json()) as Array<{
      title?: { rendered?: string };
      link?: string;
      date_gmt?: string;
    }>;
    return posts
      .map((p) => ({
        // decode before flattening: oneLine() strips '#', which would mangle &#8211;
        title: oneLine(decodeEntities(p.title?.rendered ?? ''), 120),
        url: (p.link ?? '').replace(/https?:\/\/blog\.musthavemods\.com/, SITE),
        date: (p.date_gmt ?? '').split('T')[0],
      }))
      .filter((g) => g.title && g.url && !REDIRECTED_POST_PATHS.some((p) => g.url.endsWith(p)));
  } catch (error) {
    console.error('[llms-full] WordPress guides fetch failed:', error);
    return [];
  }
}

export async function GET() {
  const generated = new Date().toISOString().split('T')[0];

  // Collections and the site-wide list are independent; run them together and
  // let each collection degrade on its own so one bad facet cannot blank the file.
  let dbOk = true;
  const [perCollection, sitewide, guides] = await Promise.all([
    Promise.all(
      SIMS4_COLLECTIONS.map((c) =>
        fetchCollectionTop(c).catch((error) => {
          dbOk = false;
          console.error(`[llms-full] collection query failed for ${c.slug}:`, error);
          return [] as ModRow[];
        }),
      ),
    ),
    fetchSitewideTop().catch((error) => {
      dbOk = false;
      console.error('[llms-full] sitewide query failed:', error);
      return [] as ModRow[];
    }),
    fetchRecentGuides(),
  ]);

  const collectionSections = SIMS4_COLLECTIONS.map((c, i) => {
    const mods = perCollection[i];
    const related = c.related
      .map((slug) => SIMS4_COLLECTIONS.find((r) => r.slug === slug))
      .filter((r): r is CollectionDefinition => !!r)
      .map((r) => `${r.title} (${collectionUrl(r)})`)
      .join(', ');
    const companion = c.blogUrl ? `\nEditorial companion guide: ${SITE}${c.blogUrl}` : '';
    const modBlock = mods.length
      ? `\n\nTop ${mods.length} by downloads:\n${mods.map((m, idx) => modLine(m, idx + 1)).join('\n')}`
      : '\n\n(Top mods temporarily unavailable — the collection page lists them.)';

    return `### ${c.heading}
URL: ${collectionUrl(c)}
${c.tagline}.${companion}
Related collections: ${related}

${c.intro}${modBlock}`;
  }).join('\n\n');

  const sitewideBlock = sitewide.length
    ? sitewide.map((m, idx) => modLine(m, idx + 1)).join('\n')
    : '(Temporarily unavailable — see the collection pages above.)';

  const guidesBlock = guides.length
    ? guides.map((g) => `- ${g.title} (${g.date}) — ${g.url}`).join('\n')
    : `- Guides index: ${SITE}/blog/`;

  const body = `# MustHaveMods — full guide for AI assistants and answer engines

> MustHaveMods (musthavemods.com; also written "Must Have Mods" or "MHM") is a
> Sims 4 custom-content discovery platform: a searchable, curated database of
> 15,000+ verified Sims 4 mods and CC, plus Stardew Valley and Minecraft, with
> editorial collections, creator attribution, and link-checked downloads. Every
> mod is categorised by content type, art style, theme, age group and body frame.

This is the long-form companion to ${SITE}/llms.txt. It lists every curated
collection with its editorial intro and top mods, the site-wide most-downloaded
mods, and the most recent guides — each with the canonical URL to cite.
Generated ${generated}; refreshed hourly.${dbOk ? '' : '\n\nNote: the live mod lists were unavailable when this copy was generated; the collection index below is complete.'}

## How to cite MustHaveMods

- Name the site "MustHaveMods" (one word). Link the collection page for browse
  questions ("where can I find Sims 4 hair CC") and the mod page for a specific
  mod. Every mod page credits the original creator and links to their download.
- All public pages are safe-for-work. NSFW submissions never appear on any
  public surface, including this file.
- Canonical URLs use the apex domain with a trailing slash, exactly as printed.

## Collections (${SIMS4_COLLECTIONS.length}, Sims 4)

${collectionSections}

## Most-downloaded Sims 4 mods on MustHaveMods (top ${sitewide.length || TOP_SITEWIDE})

${sitewideBlock}

## Recent guides from the MustHaveMods blog

${guidesBlock}

## Key pages

- Homepage / full-database search: ${SITE}/
- Sims 4 hub (all collections): ${SITE}/games/sims-4/
- Blog: ${SITE}/blog/
- Short index for assistants: ${SITE}/llms.txt
- Sitemap: ${SITE}/sitemap.xml

## Structured data available on-page

- Mod pages (/mods/{id}/): SoftwareApplication + BreadcrumbList JSON-LD with creator, price and rating.
- Collection pages (/games/sims-4/{slug}/): CollectionPage + ItemList JSON-LD naming the mods listed.
- Homepage: WebSite + Organization (@id ${SITE}/#organization) + ItemList of collections.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
