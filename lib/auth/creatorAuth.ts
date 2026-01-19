import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

/**
 * Middleware to check if user is authenticated and has creator or admin role
 * Use this in API routes that creators and admins can both access
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

  // Check if user has creator or admin role
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      isCreator: true,
      isAdmin: true,
      email: true,
      username: true,
      displayName: true,
    },
  });

  if (!user || (!user.isCreator && !user.isAdmin)) {
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
    user,
    session,
    isAdmin: user.isAdmin,
  };
}
