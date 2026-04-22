import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  const mods = await prisma.mod.findMany({
    where: { isNSFW: false, isVerified: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const urlEntries = mods
    .map((m) => {
      const lastmod =
        m.updatedAt instanceof Date
          ? m.updatedAt.toISOString().split('T')[0]
          : String(m.updatedAt).split('T')[0];
      return `  <url>
    <loc>${baseUrl}/mods/${m.id}</loc>
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
