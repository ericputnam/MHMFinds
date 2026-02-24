import { NextResponse } from 'next/server';

// Categories sitemap intentionally returns empty.
// All WordPress category pages serve noindex meta tags,
// so including them in the sitemap sends contradictory signals
// and wastes crawl budget. Keeping the route alive avoids
// 404 errors in GSC for previously submitted sitemaps.
export async function GET() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
