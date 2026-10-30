import { NextResponse } from 'next/server';
import { listCreators, type CreatorListRow } from '../../lib/creators';
import { creatorLastmod } from '../../lib/sitemapLastmod';

/**
 * Sitemap for /creator/[slug]/ pages (Nova, E85). Lists every creator slug
 * that clears MIN_MODS_FOR_PAGE, with lastmod = the later of the creator's
 * newest mod and the template date (E299, Sage, 2026-10-30).
 *
 * Why the template date: the page's title + meta changed for every creator on
 * 10-27 (E267) and every page gained collection-hub links on 10-30 (E292),
 * but on 10-30 only 28 of 554 entries carried a lastmod on or after 10-27 —
 * 169 still said January 2026 — because lastmod was the newest mod alone.
 * Google had no signal to recrawl: /creator/orchiona/ (400 impressions at
 * position 9.7) was last crawled 2026-09-24. Same rule the collection
 * sitemap has used since E37: `laterOf(template, newest content)`.
 *
 * The population comes from lib/creators.ts listCreators() — the same list
 * the IndexNow --creators push submits (E95) — so the two can never drift.
 * Crawler surface: degrades to an empty urlset on a DB error, never a 500.
 */
export const dynamic = 'force-dynamic';

const SITE = 'https://musthavemods.com';

export async function GET() {
  let rows: CreatorListRow[] = [];
  try {
    rows = await listCreators();
  } catch (error) {
    console.error('[sitemap-creators] query failed, serving empty urlset:', error);
    rows = [];
  }

  const urls = rows.map((r) => {
    const lastmod = creatorLastmod(r.latest);
    return `  <url>
    <loc>${SITE}/creator/${r.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
