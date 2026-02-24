import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';
  // Use a stable date rather than Date.now() — dynamic timestamps
  // make lastmod meaningless since it changes on every request.
  // Update this date when the Next.js app pages actually change.
  const appLastmod = '2026-02-24';

  // /blog is omitted here — it lives in sitemap-blog-pages.xml as /blog/
  // to avoid duplicate entries across sitemaps.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/mods</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/creators</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/games/sims-4</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/games/stardew-valley</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/games/minecraft</loc>
    <lastmod>${appLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
