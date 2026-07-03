import { NextResponse } from 'next/server';

interface WordPressPost {
  id: number;
  link: string;
  modified_gmt: string;
}

// Legacy posts whose apex URLs 301 to a Next.js collection page
// (vercel.json). A sitemap must not list URLs that redirect, so they
// are skipped here. Keep in sync with the consolidation redirects in
// vercel.json and reports/legacy-vs-collection-strategy-2026-07-03.md.
const REDIRECTED_POST_PATHS = [
  '/sims-4-pregnancy-mods/',
  '/sims-4-female-clothes-cc/',
  '/sims-4-male-clothes-cc/',
  '/sims-4-cc-skin-details/',
  '/sims-4-gallery-poses/',
  '/sims-4-body-presets/',
  '/sims-4-male-body-presets-cc/',
  '/sims-4-plus-size-body-presets/',
  '/sims-4-athletic-body-presets/',
  '/sims-4-goth-cc/',
  '/sims-4-cottagecore-cc/',
  '/sims-4-y2k-cc/',
];

async function fetchAllWordPressPosts(): Promise<string[]> {
  const entries: string[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `https://blog.musthavemods.com/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&_fields=id,link,modified_gmt`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      );

      if (!response.ok) {
        if (response.status === 400) {
          // No more pages
          hasMore = false;
          break;
        }
        console.error(`Failed to fetch WordPress posts page ${page}: ${response.status}`);
        break;
      }

      const posts: WordPressPost[] = await response.json();

      if (posts.length === 0) {
        hasMore = false;
        break;
      }

      for (const post of posts) {
        // Rewrite blog.musthavemods.com → musthavemods.com
        const url = post.link.replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');
        if (REDIRECTED_POST_PATHS.some((p) => url.endsWith(p))) {
          continue;
        }
        const lastmod = post.modified_gmt ? `${post.modified_gmt.split('T')[0]}` : '';

        entries.push(`  <url>
    <loc>${url}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      }

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
      if (page >= totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
  }

  return entries;
}

export async function GET() {
  const entries = await fetchAllWordPressPosts();

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
