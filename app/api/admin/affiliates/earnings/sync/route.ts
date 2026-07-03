import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { syncAllNetworks } from '@/lib/services/affiliateEarnings/earningsSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/admin/affiliates/earnings/sync — manual "Sync Now" from the admin
// dashboard. Same work as the cron, but admin-authenticated and audit-logged.
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const result = await syncAllNetworks('manual');

    const { ipAddress, userAgent } = getRequestMetadata(request);
    await logAdminAction({
      userId: user.id,
      action: 'affiliate_earnings_sync',
      resource: 'affiliate_earnings',
      resourceId: result.syncRunId,
      details: {
        status: result.status,
        networksSynced: result.networksSynced,
        earningsCreated: result.earningsCreated,
        earningsUpdated: result.earningsUpdated,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: result.status !== 'failed', ...result });
  } catch (error) {
    console.error('Manual commission sync failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
