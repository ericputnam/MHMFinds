import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const WP_ORIGIN = 'https://blog.musthavemods.com';
const CANONICAL_ORIGIN = 'https://musthavemods.com';
const BLOG_ORIGIN_REGEX = /https:\/\/blog\.musthavemods\.com/g;

/**
 * Proxy WordPress search results.
 * The middleware proxy has issues forwarding ?s= params through Vercel edge,
 * so this dedicated route handles blog search by fetching directly from WordPress.
 */
export async function GET(request: NextRequest) {
  const searchTerm = request.nextUrl.searchParams.get('s');
  if (!searchTerm) {
    return new Response('Missing search term', { status: 400 });
  }

  const wpUrl = new URL('/', WP_ORIGIN);
  wpUrl.searchParams.set('s', searchTerm);

  try {
    const wpResponse = await fetch(wpUrl.toString(), {
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': 'text/html',
        'X-Forwarded-Host': 'musthavemods.com',
      },
    });

    const html = await wpResponse.text();

    // Rewrite blog.musthavemods.com URLs to musthavemods.com
    const rewritten = html.replace(BLOG_ORIGIN_REGEX, CANONICAL_ORIGIN);

    return new Response(rewritten, {
      status: wpResponse.status,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
      },
    });
  } catch (error) {
    console.error('Blog search proxy error:', error);
    return new Response('Search temporarily unavailable', { status: 502 });
  }
}
