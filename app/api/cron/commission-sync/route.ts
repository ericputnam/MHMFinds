import { NextRequest, NextResponse } from 'next/server';
import { syncAllNetworks } from '@/lib/services/affiliateEarnings/earningsSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for cron job

// GET /api/cron/commission-sync — pull commission/conversion data from all
// configured affiliate networks (Impact, Rakuten, CJ). Scheduled every 6 hours
// in vercel.json; also invocable manually with the same CRON_SECRET bearer.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAllNetworks('cron');
    return NextResponse.json({
      success: result.status !== 'failed',
      ...result,
    });
  } catch (error) {
    console.error('[commission-sync] cron run failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request); // manual trigger, same auth
}
