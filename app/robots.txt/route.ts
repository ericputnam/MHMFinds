import { NextResponse } from 'next/server';

const WORDPRESS_ROBOTS_URL = 'https://blog.musthavemods.com/robots.txt';

export async function GET() {
  try {
    const response = await fetch(WORDPRESS_ROBOTS_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      // Fallback to a basic robots.txt if WordPress is unavailable
      return new NextResponse(
        `User-agent: *\nAllow: /\nSitemap: https://musthavemods.com/sitemap.xml`,
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

    return new NextResponse(robotsContent, {
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
      `User-agent: *\nAllow: /\nSitemap: https://musthavemods.com/sitemap.xml`,
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
