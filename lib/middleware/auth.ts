import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * Authentication middleware for MHMFinds API routes
 * Provides functions to require authentication, admin access, and creator access
 */

// Discriminated union so `if (!auth.authorized) return auth.response;` narrows:
// callers get a plain NextResponse on failure and non-optional session/user on
// success, instead of `NextResponse | undefined` leaking into handler return types.
type AuthFailure = { authorized: false; response: NextResponse };
type AuthSuccess = {
  authorized: true;
  session: Session;
  user: NonNullable<Session['user']>;
};
export type AuthResult = AuthFailure | AuthSuccess;

/**
 * Require user to be authenticated AND have admin role
 * Returns user session if authorized, or 401/403 response if not
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
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
