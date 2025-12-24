import { MetadataRoute } from 'next';

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

async function fetchWordPressSitemapUrls(): Promise<SitemapEntry[]> {
  try {
    // Fetch the sitemap index from WordPress
    const indexResponse = await fetch('https://blog.musthavemods.com/sitemap_index.xml', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!indexResponse.ok) {
      console.error('Failed to fetch WordPress sitemap index');
      return [];
    }

    const indexXml = await indexResponse.text();

    // Parse sitemap index to get all sub-sitemap URLs
    const sitemapUrlRegex = /<loc>(.*?)<\/loc>/g;
    const sitemapUrls: string[] = [];
    let match;

    while ((match = sitemapUrlRegex.exec(indexXml)) !== null) {
      sitemapUrls.push(match[1]);
    }

    console.log(`Found ${sitemapUrls.length} sub-sitemaps in WordPress`);

    // Fetch all sub-sitemaps and extract URLs
    const allUrls: SitemapEntry[] = [];

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

        // Parse URLs from sitemap - handle both urlset and simple loc tags
        const urlRegex = /<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?(?:<lastmod>(.*?)<\/lastmod>)?[\s\S]*?<\/url>/g;
        let urlMatch;

        while ((urlMatch = urlRegex.exec(xml)) !== null) {
          const url = urlMatch[1];
          const lastMod = urlMatch[2];

          // Rewrite blog.musthavemods.com to musthavemods.com for canonical URLs
          const canonicalUrl = url
            .replace('https://blog.musthavemods.com', 'https://musthavemods.com')
            .replace('http://blog.musthavemods.com', 'https://musthavemods.com');

          allUrls.push({
            url: canonicalUrl,
            lastModified: lastMod ? new Date(lastMod) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      } catch (error) {
        console.error(`Error fetching sitemap: ${sitemapUrl}`, error);
      }
    }

    console.log(`Extracted ${allUrls.length} URLs from WordPress sitemaps`);
    return allUrls;
  } catch (error) {
    console.error('Failed to fetch WordPress sitemaps:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://musthavemods.com';

  // Fetch WordPress blog URLs (this will be dynamic and update automatically)
  const wordpressUrls = await fetchWordPressSitemapUrls();

  // Define Next.js routes
  const nextJsRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/creators`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Combine Next.js routes with WordPress URLs
  // WordPress URLs are already formatted as SitemapEntry objects
  return [...nextJsRoutes, ...wordpressUrls];
}
