/**
 * GET /api/monetization/execution/stats
 *
 * Get execution statistics for the monetization agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { actionExecutor } from '@/lib/services/actionExecutor';

export async function GET(request: NextRequest) {
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

    const stats = await actionExecutor.getExecutionStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get execution stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get execution stats', details: String(error) },
      { status: 500 }
    );
  }
}
