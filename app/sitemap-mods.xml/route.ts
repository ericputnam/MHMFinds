import { NextResponse } from 'next/server';
import { modLastmod } from '@/lib/seo/modLastmod';
import { IMAGE_SITEMAP_NS, imageEntries } from '@/lib/seo/sitemapImage';
import { listSitemapMods } from '@/lib/seo/sitemapMods';

// Each <url> also carries its thumbnail as an <image:image> (E431, Pip,
// 2026-11-19): the same URL app/mods/[id]/page.tsx emits as og:image, so Google
// Images can attribute the picture to the mod page instead of only to the
// WordPress post it was scraped from. 17,438 of 17,438 SFW verified mods had a
// thumbnail on 2026-11-19; a row without an absolute http(s) one simply gets
// no image child. Numbers in lib/seo/sitemapImage.ts.
//
// <lastmod> is max(createdAt, lastScraped, publishedAt) — never the @updatedAt
// column, which counter writes bump ~685×/day on a catalog that adds ~7 mods/day
// (E136, 2026-09-29; publishedAt floor E196, 2026-10-13; rationale and numbers
// in lib/seo/modLastmod.ts). The same function feeds the page's JSON-LD
// dateModified (components/ModJsonLd.tsx), so the two surfaces always agree.
// Selection and paging live in lib/seo/sitemapMods.ts (isNSFW=false,
// isVerified=true, mirrors scripts/agents/indexnow-submit.ts; paged because
// Accelerate caps one response at 5 MB and this select is 5.6 MB in one go).

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  const mods = await listSitemapMods();

  const urlEntries = mods
    .map((m) => {
      const lastmod = modLastmod(m);
      const image = imageEntries([{ loc: m.thumbnail ?? '', title: m.title }]);
      return `  <url>
    <loc>${baseUrl}/mods/${m.id}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${image ? `\n${image}` : ''}
  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="${IMAGE_SITEMAP_NS}">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
