import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { MIN_MODS_FOR_PAGE, isJunkAuthorSlug } from '../../lib/creators';

/**
 * Sitemap for /creator/[slug]/ pages (Nova, E85). Lists every creator slug
 * that clears MIN_MODS_FOR_PAGE, with lastmod = the creator's newest mod.
 * Crawler surface: degrades to an empty urlset on a DB error, never a 500.
 */
export const dynamic = 'force-dynamic';

const SITE = 'https://musthavemods.com';

export async function GET() {
  let rows: Array<{ slug: string; mods: number; latest: Date | null }> = [];
  try {
    rows = await prisma.$queryRaw<Array<{ slug: string; mods: number; latest: Date | null }>>`
      SELECT trim(both '-' from lower(regexp_replace(author, '[^A-Za-z0-9]+', '-', 'g'))) AS slug,
             COUNT(*)::int AS mods,
             MAX("createdAt") AS latest
      FROM mods
      WHERE author IS NOT NULL AND "isNSFW" = false
      GROUP BY 1
      HAVING COUNT(*) >= ${MIN_MODS_FOR_PAGE}
      ORDER BY COUNT(*) DESC
    `;
  } catch (error) {
    console.error('[sitemap-creators] query failed, serving empty urlset:', error);
    rows = [];
  }

  const urls = rows
    .filter((r) => !isJunkAuthorSlug(r.slug))
    .map((r) => {
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
