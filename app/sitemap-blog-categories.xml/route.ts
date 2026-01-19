import { NextResponse } from 'next/server';

interface WordPressCategory {
  id: number;
  link: string;
  count: number;
}

async function fetchAllWordPressCategories(): Promise<string[]> {
  const entries: string[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `https://blog.musthavemods.com/wp-json/wp/v2/categories?per_page=${perPage}&page=${page}&_fields=id,link,count`,
        { next: { revalidate: 300 } }
      );

      if (!response.ok) {
        if (response.status === 400) {
          hasMore = false;
          break;
        }
        console.error(`Failed to fetch WordPress categories page ${page}: ${response.status}`);
        break;
      }

      const categories: WordPressCategory[] = await response.json();

      if (categories.length === 0) {
        hasMore = false;
        break;
      }

      for (const category of categories) {
        // Skip empty categories
        if (category.count === 0) continue;

        const url = category.link.replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');

        entries.push(`  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.4</priority>
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
    console.error('Error fetching WordPress categories:', error);
  }

  return entries;
}

export async function GET() {
  const entries = await fetchAllWordPressCategories();

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
