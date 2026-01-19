import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

/**
 * Middleware to check if user is authenticated and has admin role
 * Use this in API routes that require admin access
 */
export async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  // Check if user has admin role
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, isAdmin: true, email: true, username: true }
  });

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return { user, session };
}

/**
 * Create audit log entry for admin actions
 */
export async function logAdminAction(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Helper to extract IP and User-Agent from request
 */
export function getRequestMetadata(request: NextRequest) {
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
