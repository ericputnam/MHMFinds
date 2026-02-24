import { NextResponse } from 'next/server';

interface WordPressPage {
  id: number;
  link: string;
  modified_gmt: string;
}

async function fetchAllWordPressPages(): Promise<string[]> {
  const entries: string[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `https://blog.musthavemods.com/wp-json/wp/v2/pages?per_page=${perPage}&page=${page}&_fields=id,link,modified_gmt`,
        { next: { revalidate: 300 } }
      );

      if (!response.ok) {
        if (response.status === 400) {
          hasMore = false;
          break;
        }
        console.error(`Failed to fetch WordPress pages page ${page}: ${response.status}`);
        break;
      }

      const pages: WordPressPage[] = await response.json();

      if (pages.length === 0) {
        hasMore = false;
        break;
      }

      for (const wpPage of pages) {
        const url = wpPage.link.replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');

        // Skip /homepage/ — it 301-redirects to / (PRD 8)
        if (url.includes('/homepage')) continue;

        const lastmod = wpPage.modified_gmt ? `${wpPage.modified_gmt.split('T')[0]}` : '';

        entries.push(`  <url>
    <loc>${url}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
      }

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
      if (page >= totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }
  } catch (error) {
    console.error('Error fetching WordPress pages:', error);
  }

  return entries;
}

export async function GET() {
  const entries = await fetchAllWordPressPages();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
