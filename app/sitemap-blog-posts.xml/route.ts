import { NextResponse } from 'next/server';

async function fetchWordPressSitemaps(filter: (url: string) => boolean): Promise<string> {
  try {
    // Fetch WordPress sitemap index
    const indexResponse = await fetch('https://blog.musthavemods.com/sitemap_index.xml', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!indexResponse.ok) {
      console.error('Failed to fetch WordPress sitemap index');
      return '';
    }

    const indexXml = await indexResponse.text();

    // Extract sitemap URLs from index
    const sitemapUrlRegex = /<loc>(.*?)<\/loc>/g;
    const sitemapUrls: string[] = [];
    let match;

    while ((match = sitemapUrlRegex.exec(indexXml)) !== null) {
      if (filter(match[1])) {
        sitemapUrls.push(match[1]);
      }
    }

    // Fetch all matching sub-sitemaps
    const allEntries: string[] = [];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          next: { revalidate: 3600 }
        });

        if (!response.ok) {
          console.error(`Failed to fetch sub-sitemap: ${sitemapUrl}`);
          continue;
        }

        const xml = await response.text();

        // Extract <url>...</url> blocks and rewrite domains
        // This preserves the actual lastmod dates from WordPress
        const urlRegex = /<url>([\s\S]*?)<\/url>/g;
        let urlMatch;

        while ((urlMatch = urlRegex.exec(xml)) !== null) {
          const urlBlock = urlMatch[1];
          // Rewrite blog.musthavemods.com → musthavemods.com
          const rewrittenBlock = urlBlock
            .replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');
          allEntries.push(`  <url>${rewrittenBlock}</url>`);
        }
      } catch (error) {
        console.error(`Error fetching sitemap: ${sitemapUrl}`, error);
      }
    }

    return allEntries.join('\n');
  } catch (error) {
    console.error('Error fetching WordPress sitemaps:', error);
    return '';
  }
}

export async function GET() {
  // Fetch all post-sitemap*.xml files from WordPress
  const urls = await fetchWordPressSitemaps((url) => url.includes('post-sitemap'));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
