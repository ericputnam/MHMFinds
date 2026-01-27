import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware - runs on every request
 * Used for protecting admin routes and rate limiting
 *
 * SECURITY: This middleware provides the FIRST line of defense for admin routes.
 * Individual route handlers should ALSO check auth as defense-in-depth.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // =============================================================
  // PROTECT /api/admin/* API ROUTES - CRITICAL SECURITY LAYER
  // =============================================================
  // This ensures ALL admin API endpoints require admin authentication
  // at the middleware level, preventing unauthorized access even if
  // individual route handlers forget to check auth.
  if (pathname.startsWith('/api/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Reject unauthenticated requests
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Reject non-admin users
    if (!token.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Admin authenticated - allow request to proceed
    // Individual route handlers should still verify auth for defense-in-depth
  }

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
    // Protect admin API routes (CRITICAL - first line of defense)
    '/api/admin/:path*',
    // Protect creators routes (creator portal)
    '/creators/:path*',
    // Protect admin routes (admin-only)
    '/admin/:path*',
  ],
};
