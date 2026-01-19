/**
 * POST /api/monetization/execute/rollback
 *
 * Rollback a previously executed action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { actionExecutor } from '@/lib/services/actionExecutor';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { executionLogId, reason } = body;

    if (!executionLogId) {
      return NextResponse.json({ error: 'executionLogId is required' }, { status: 400 });
    }

    // Rollback the action
    const success = await actionExecutor.rollback(
      executionLogId,
      session.user.email || 'admin',
      reason
    );

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback action', details: String(error) },
      { status: 500 }
    );
  }
}
