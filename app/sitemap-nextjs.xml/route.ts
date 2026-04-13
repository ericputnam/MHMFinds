import { NextResponse } from 'next/server';
import { getAllCollectionRoutes } from '../../lib/collections';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';
  // Use a stable date rather than Date.now() — dynamic timestamps
  // make lastmod meaningless since it changes on every request.
  // Update this date when the Next.js app pages actually change.
  const appLastmod = '2026-04-09';

  // /blog is omitted here — it lives in sitemap-blog-pages.xml as /blog/
  // to avoid duplicate entries across sitemaps.

  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/mods`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/creators`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/games/sims-4`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/games/stardew-valley`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/games/minecraft`, priority: '0.9', changefreq: 'daily' },
  ];

  // Collection topic pages — /games/[game]/[topic]. Higher priority
  // than bare /games/[game] because these are the Pinterest funnel
  // entry points (Revenue Pivot Initiative 1).
  const collectionUrls = getAllCollectionRoutes().map((r) => ({
    loc: `${baseUrl}/games/${r.gameSlug}/${r.topicSlug}`,
    priority: '0.85',
    changefreq: 'weekly',
  }));

  const allUrls = [...staticUrls, ...collectionUrls];

  const urlEntries = allUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
