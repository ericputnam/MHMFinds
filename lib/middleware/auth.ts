import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * Authentication middleware for MHMFinds API routes
 * Provides functions to require authentication, admin access, and creator access
 */

/**
 * Require user to be authenticated
 * Returns user session if authenticated, or 401 response if not
 */
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}

/**
 * Require user to be authenticated AND have admin role
 * Returns user session if authorized, or 401/403 response if not
 */
export async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }

  if (!session.user.isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}

/**
 * Require user to be authenticated AND have creator role
 * Returns user session if authorized, or 401/403 response if not
 */
export async function requireCreator(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }

  if (!session.user.isCreator) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Creator access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}

/**
 * Require user to be authenticated AND have premium subscription
 * Returns user session if authorized, or 401/403 response if not
 */
export async function requirePremium(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }

  if (!session.user.isPremium) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Premium subscription required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}

/**
 * Optional authentication - returns session if available, but doesn't require it
 * Useful for endpoints that have different behavior for authenticated users
 */
export async function optionalAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  return {
    session: session || null,
    user: session?.user || null,
  };
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * import { requireAdmin } from '@/lib/middleware/auth';
 *
 * export async function POST(request: NextRequest) {
 *   // Check authentication
 *   const auth = await requireAdmin(request);
 *   if (!auth.authorized) {
 *     return auth.response; // Returns 401 or 403
 *   }
 *
 *   // Continue with authenticated logic
 *   const { user } = auth;
 *   // ... your code here
 * }
 * ```
 */
