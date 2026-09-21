/**
 * Weekly Newsletter Cron Endpoint (Cass, 2026-09-21)
 *
 * Builds and sends the weekly issue to confirmed, non-excluded subscribers.
 * No-op unless NEWSLETTER_WEEKLY_ENABLED=true — merging this route changes
 * nothing in production until the flag is explicitly set.
 *
 * Schedule: Monday 15:00 UTC (vercel.json). Same CRON_SECRET bearer-token
 * pattern as the other /api/cron/* routes (see commission-sync,
 * monetization-agent).
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyNewsletter } from '@/lib/services/newsletterWeekly';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for cron job

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require authorization (matches other cron routes).
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('weekly-newsletter cron: unauthorized (invalid or missing bearer token)');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.NEWSLETTER_WEEKLY_ENABLED !== 'true') {
    console.log('weekly-newsletter cron: NEWSLETTER_WEEKLY_ENABLED is not "true" — no-op.');
    return NextResponse.json({ success: true, skipped: true, reason: 'flag disabled' });
  }

  const startTime = Date.now();
  try {
    const result = await sendWeeklyNewsletter();
    const duration = Date.now() - startTime;
    // Counts only — never a recipient address, never a subject with PII in it.
    console.log('weekly-newsletter cron completed:', { ...result, durationMs: duration });
    return NextResponse.json({ ...result, durationMs: duration }, { status: result.success ? 200 : 500 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('weekly-newsletter cron failed:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

// Support POST for manual triggering (same auth requirements).
export async function POST(request: NextRequest) {
  return GET(request);
}
