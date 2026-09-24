import { NextResponse } from 'next/server';
import { listCreators, type CreatorListRow } from '../../lib/creators';

/**
 * Sitemap for /creator/[slug]/ pages (Nova, E85). Lists every creator slug
 * that clears MIN_MODS_FOR_PAGE, with lastmod = the creator's newest mod.
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
    const lastmod = r.latest ? new Date(r.latest).toISOString().slice(0, 10) : null;
    return `  <url>
    <loc>${SITE}/creator/${r.slug}/</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
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
