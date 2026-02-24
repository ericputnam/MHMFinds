import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  // Categories sitemap removed — all category pages serve noindex,
  // so including them in the sitemap sends contradictory signals.
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-nextjs.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog-posts.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog-pages.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
