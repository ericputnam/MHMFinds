import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware - runs on every request
 * Used for protecting admin routes and rate limiting
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /creators routes - creators only
  if (pathname.startsWith('/creators')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if user is authenticated
    if (!token) {
      const loginUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Only creators can access /creators
    if (!token.isCreator) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Protect /admin routes (except login and unauthorized pages)
  if (pathname.startsWith('/admin') &&
      !pathname.startsWith('/admin/login') &&
      !pathname.startsWith('/admin/unauthorized')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if user is authenticated
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Creators should use /creators instead
    if (token.isCreator && !token.isAdmin) {
      const creatorsUrl = new URL('/creators', request.url);
      return NextResponse.redirect(creatorsUrl);
    }

    // Only admins can access /admin
    if (!token.isAdmin) {
      const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    // Protect creators routes (creator portal)
    '/creators/:path*',
    // Protect admin routes (admin-only)
    '/admin/:path*',
  ],
};
