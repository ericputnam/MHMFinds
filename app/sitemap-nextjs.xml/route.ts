import { NextResponse } from 'next/server';
import { getAllCollectionRoutes } from '../../lib/collections';
import { getAllGameSlugs } from '../../lib/gameRoutes';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';
  // Use a stable date rather than Date.now() — dynamic timestamps
  // make lastmod meaningless since it changes on every request.
  // Update this date when the Next.js app pages actually change.
  const appLastmod = '2026-07-03';

  // /blog is omitted here — it lives in sitemap-blog-pages.xml as /blog/
  // to avoid duplicate entries across sitemaps.

  // All locs use trailing slashes: next.config.js sets trailingSlash:
  // true, so non-slash URLs 308-redirect. Sitemap entries pointing at
  // redirects split indexing signals with the canonical variant.
  // /mods/ (no such route — 404s) and /creators/ (307s to /sign-in for
  // logged-out visitors, i.e. every crawler) are intentionally absent.
  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    ...getAllGameSlugs().map((slug) => ({
      loc: `${baseUrl}/games/${slug}/`,
      priority: '0.9',
      changefreq: 'daily',
    })),
    { loc: `${baseUrl}/top-creators/`, priority: '0.5', changefreq: 'weekly' },
    { loc: `${baseUrl}/about/`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/submit-mod/`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy-policy/`, priority: '0.1', changefreq: 'yearly' },
    { loc: `${baseUrl}/terms/`, priority: '0.1', changefreq: 'yearly' },
  ];

  // Collection topic pages — /games/[game]/[topic]. Higher priority
  // than bare /games/[game] because these are the Pinterest funnel
  // entry points (Revenue Pivot Initiative 1).
  const collectionUrls = getAllCollectionRoutes().map((r) => ({
    loc: `${baseUrl}/games/${r.gameSlug}/${r.topicSlug}/`,
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
