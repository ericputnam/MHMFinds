import { NextResponse } from 'next/server';

const WORDPRESS_ROBOTS_URL = 'https://blog.musthavemods.com/robots.txt';
const SITEMAP_DIRECTIVE = 'Sitemap: https://musthavemods.com/sitemap.xml';

function appendSitemapDirective(content: string): string {
  // Don't duplicate if already present
  if (content.includes('Sitemap: https://musthavemods.com/sitemap.xml')) {
    return content;
  }
  return `${content.trimEnd()}\n\n${SITEMAP_DIRECTIVE}\n`;
}

export async function GET() {
  try {
    const response = await fetch(WORDPRESS_ROBOTS_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      // Fallback to a basic robots.txt if WordPress is unavailable
      return new NextResponse(
        `User-agent: *\nAllow: /\n\n${SITEMAP_DIRECTIVE}\n`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    const robotsContent = await response.text();
    const finalContent = appendSitemapDirective(robotsContent);

    return new NextResponse(finalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to fetch robots.txt from WordPress:', error);

    // Fallback robots.txt
    return new NextResponse(
      `User-agent: *\nAllow: /\n\n${SITEMAP_DIRECTIVE}\n`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}
