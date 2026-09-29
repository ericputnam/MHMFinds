import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { modLastmod } from '@/lib/seo/modLastmod';

// <lastmod> is max(createdAt, lastScraped) — never the @updatedAt column,
// which counter writes bump ~685×/day on a catalog that adds ~7 mods/day
// (E136, 2026-09-29; rationale and numbers in lib/seo/modLastmod.ts).
// Selection mirrors scripts/agents/indexnow-submit.ts (isNSFW=false, isVerified=true).

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  const mods = await prisma.mod.findMany({
    where: { isNSFW: false, isVerified: true },
    select: { id: true, createdAt: true, lastScraped: true },
    orderBy: { createdAt: 'desc' },
  });

  const urlEntries = mods
    .map((m) => {
      const lastmod = modLastmod(m);
      return `  <url>
    <loc>${baseUrl}/mods/${m.id}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
