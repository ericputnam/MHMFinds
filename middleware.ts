import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Known Next.js app route prefixes — these are NOT WordPress routes
const NEXTJS_PREFIXES = new Set([
  'api', 'admin', 'creators', 'mods', 'account', 'sign-in',
  'submit-mod', 'about', 'privacy', 'terms', 'games', 'go',
  '_next', 'sitemap', 'manifest',
]);

const WP_ORIGIN = 'https://blog.musthavemods.com';
const CANONICAL_ORIGIN = 'https://musthavemods.com';
const BLOG_ORIGIN_REGEX = /https:\/\/blog\.musthavemods\.com/g;
const BLOG_ORIGIN_ENCODED_REGEX = /https%3A%2F%2Fblog\.musthavemods\.com/g;

/**
 * Determine if a pathname should be proxied to WordPress.
 * Returns the full WordPress URL, or null for Next.js routes.
 */
function getWordPressUrl(pathname: string): string | null {
  // Root is the Next.js homepage
  if (pathname === '/' || pathname === '') return null;

  // Explicit WordPress route patterns
  if (pathname === '/blog' || pathname === '/blog/') return `${WP_ORIGIN}/`;
  if (pathname.startsWith('/blog/')) return `${WP_ORIGIN}${pathname.replace(/^\/blog/, '')}`;
  if (pathname.startsWith('/category/')) return `${WP_ORIGIN}${pathname}`;
  if (pathname.startsWith('/tag/')) return `${WP_ORIGIN}${pathname}`;
  if (pathname.startsWith('/author/')) return `${WP_ORIGIN}${pathname}`;
  if (pathname === '/feed' || pathname === '/feed/' || pathname.startsWith('/feed/'))
    return `${WP_ORIGIN}${pathname}`;

  // Sitemaps
  if (/^\/wp-sitemap.*\.xml$/.test(pathname)) return `${WP_ORIGIN}${pathname}`;

  // Date-based blog permalinks (e.g. /2026/02/some-post/)
  if (/^\/\d{4}\/\d{2}(\/|$)/.test(pathname)) return `${WP_ORIGIN}${pathname}`;

  // Catch-all: first path segment that isn't a known Next.js prefix
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (
    firstSegment &&
    !NEXTJS_PREFIXES.has(firstSegment) &&
    !firstSegment.includes('.') // skip files like robots.txt, favicon.ico
  ) {
    return `${WP_ORIGIN}${pathname}`;
  }

  return null;
}

/**
 * Regex to match blog origin in href attributes only (not src for images/assets).
 * This rewrites navigation links while preserving wp-content/wp-includes asset URLs.
 */
const BLOG_HREF_REGEX = /href=["']https:\/\/blog\.musthavemods\.com(\/(?!wp-content\/|wp-includes\/|wp-admin\/)[^"']*)["']/g;

/**
 * Rewrite blog.musthavemods.com references in proxied WordPress HTML:
 * - <head>: Full rewrite of all blog.musthavemods.com references (canonical, og:url, etc.)
 * - <head>: Strip any noindex meta tags (safety net for caching layer issues)
 * - <body>: Rewrite href links to keep users on musthavemods.com (but NOT asset src URLs)
 */
function rewriteHtml(html: string): string {
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex === -1) return html;

  const head = html.substring(0, headEndIndex);
  const rest = html.substring(headEndIndex);

  // Head: rewrite all blog.musthavemods.com references + strip noindex
  const rewrittenHead = head
    .replace(BLOG_ORIGIN_REGEX, CANONICAL_ORIGIN)
    .replace(BLOG_ORIGIN_ENCODED_REGEX, 'https%3A%2F%2Fmusthavemods.com')
    .replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']\s*\/?>/gi, '');

  // Body: rewrite href links (navigation) but NOT src links (images, scripts, styles)
  // This keeps users on musthavemods.com when clicking article links
  const rewrittenBody = rest.replace(BLOG_HREF_REGEX, (match, path) => {
    return `href="${CANONICAL_ORIGIN}${path}"`;
  });

  return rewrittenHead + rewrittenBody;
}

/**
 * Fetch from WordPress, rewrite canonical URLs, return response.
 */
async function proxyAndRewriteWordPress(
  wpUrl: string,
  request: NextRequest
): Promise<Response> {
  // Build the full URL with query parameters
  const url = new URL(wpUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Forward relevant request headers
  const forwardHeaders: Record<string, string> = {
    'User-Agent': request.headers.get('user-agent') || '',
    'Accept': request.headers.get('accept') || '',
    'Accept-Language': request.headers.get('accept-language') || '',
    // Tell WordPress this request comes via the apex domain proxy
    // (required for is_from_apex_rewrite() to return true and avoid noindex)
    'X-Forwarded-Host': 'musthavemods.com',
  };
  const cookie = request.headers.get('cookie');
  if (cookie) forwardHeaders['Cookie'] = cookie;
  const xForwardedFor = request.headers.get('x-forwarded-for') || request.ip;
  if (xForwardedFor) forwardHeaders['X-Forwarded-For'] = xForwardedFor;

  const fetchOptions: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'follow',
  };

  // Forward body for non-GET/HEAD requests (e.g. comment forms)
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body;
    const ct = request.headers.get('content-type');
    if (ct) forwardHeaders['Content-Type'] = ct;
  }

  const wpResponse = await fetch(url.toString(), fetchOptions);

  const contentType = wpResponse.headers.get('content-type') || '';

  // Copy response headers, dropping ones invalidated by body rewriting
  const responseHeaders = new Headers();
  wpResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Drop headers invalidated by body rewriting or that could harm SEO
    if (['content-length', 'content-encoding', 'transfer-encoding', 'x-robots-tag'].includes(lower)) return;
    responseHeaders.append(key, value);
  });

  // HTML responses — rewrite head (SEO) + body links (navigation)
  if (contentType.includes('text/html')) {
    const html = await wpResponse.text();
    const rewritten = rewriteHtml(html);
    return new Response(rewritten, {
      status: wpResponse.status,
      headers: responseHeaders,
    });
  }

  // XML responses (sitemaps, RSS/Atom feeds) — rewrite throughout
  if (
    contentType.includes('text/xml') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/rss+xml') ||
    contentType.includes('application/atom+xml')
  ) {
    const xml = await wpResponse.text();
    const rewritten = xml.replace(BLOG_ORIGIN_REGEX, CANONICAL_ORIGIN);
    return new Response(rewritten, {
      status: wpResponse.status,
      headers: responseHeaders,
    });
  }

  // Non-HTML/XML (images, CSS, JS, JSON, etc.) — pass through unchanged
  return new Response(wpResponse.body, {
    status: wpResponse.status,
    headers: responseHeaders,
  });
}

/**
 * Next.js Middleware
 *
 * 1. Protects /admin and /creators routes (auth)
 * 2. Proxies WordPress routes with canonical URL rewriting
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Auth: protect /creators routes ──────────────────────────
  if (pathname.startsWith('/creators')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    if (!token.isCreator) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // ── Auth: protect /admin routes ─────────────────────────────
  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/admin/unauthorized')
  ) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (token.isCreator && !token.isAdmin) {
      return NextResponse.redirect(new URL('/creators', request.url));
    }
    if (!token.isAdmin) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
    }
    return NextResponse.next();
  }

  // ── WordPress proxy with canonical URL rewriting ────────────
  const wpUrl = getWordPressUrl(pathname);
  if (wpUrl) {
    try {
      return await proxyAndRewriteWordPress(wpUrl, request);
    } catch (error) {
      console.error('[WordPress proxy] fetch failed:', error);
      return new Response('Service temporarily unavailable', { status: 502 });
    }
  }

  // ── Everything else: Next.js app routes ─────────────────────
  return NextResponse.next();
}

// Run middleware on all routes except static assets and WordPress static files
// (wp-content/wp-includes are still handled by vercel.json rewrites directly)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|wp-content/|wp-includes/).*)',
  ],
};
