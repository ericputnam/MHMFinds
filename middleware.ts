import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware - runs on every request
 * Used for protecting admin routes and rate limiting
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
      // Always redirect to login page, which will then redirect to dashboard after successful login
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Allow both admin and creator access
    if (!token.isAdmin && !token.isCreator) {
      const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // Creators (non-admins) can only access specific routes
    if (token.isCreator && !token.isAdmin) {
      const creatorAllowedRoutes = [
        '/admin',                    // Dashboard
        '/admin/submissions',         // Their submissions
        '/admin/mods/submit',        // Submit new mod
        '/admin/mods/edit',          // Edit their mods
      ];

      const isAllowed = creatorAllowedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
      );

      if (!isAllowed) {
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
  }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    // Protect all admin routes - we handle exceptions in the middleware itself
    '/admin/:path*',
  ],
};
