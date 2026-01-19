/**
 * Monetization Queue API
 *
 * GET  - List pending opportunities and queue stats
 * POST - Approve or reject an opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { actionQueue } from '@/lib/services/actionQueue';

/**
 * GET /api/monetization/queue
 *
 * Returns pending opportunities and queue statistics.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50');

    // Get opportunities and stats
    const [opportunities, stats] = await Promise.all([
      actionQueue.getPendingOpportunities(limit),
      actionQueue.getQueueStats(),
    ]);

    return NextResponse.json({
      opportunities,
      stats,
    });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monetization/queue
 *
 * Approve or reject an opportunity.
 * Requires admin authentication.
 *
 * Body:
 * {
 *   opportunityId: string,
 *   action: 'approve' | 'reject',
 *   reason?: string  // Optional rejection reason
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { opportunityId, action, reason } = body;

    if (!opportunityId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunityId, action' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get user identifier for audit
    const userId = session.user.email ?? 'admin';

    // Perform action
    if (action === 'approve') {
      await actionQueue.approveOpportunity(opportunityId, userId);
    } else {
      await actionQueue.rejectOpportunity(opportunityId, userId, reason);
    }

    // Get updated opportunity
    const opportunity = await actionQueue.getOpportunity(opportunityId);

    return NextResponse.json({
      success: true,
      opportunity,
    });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
