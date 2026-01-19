/**
 * POST /api/monetization/execute
 *
 * Manually trigger execution of a specific monetization action.
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
    const { actionId, force } = body;

    if (!actionId) {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    }

    // Execute the action
    const result = await actionExecutor.execute(actionId, session.user.email || 'admin');

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
    });
  } catch (error) {
    console.error('Execute action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action', details: String(error) },
      { status: 500 }
    );
  }
}
