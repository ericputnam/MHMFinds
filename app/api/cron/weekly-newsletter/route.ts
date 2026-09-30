/**
 * Weekly Newsletter Cron Endpoint (Cass, 2026-09-21)
 *
 * Builds and sends the weekly issue to confirmed, non-excluded subscribers.
 * No-op unless NEWSLETTER_WEEKLY_ENABLED=true — merging this route changes
 * nothing in production until the flag is explicitly set.
 *
 * NOT SCHEDULED (Part A of E78, 2026-09-30): this route ships with no entry
 * in `vercel.json`, so nothing calls it. The one-line cron schedule (Monday
 * 15:00 UTC) is Part B — Tier 2, operator-queue Q18, reply "approve 78-cron".
 * Turning NEWSLETTER_WEEKLY_ENABLED on is a separate Tier 1 send decision.
 *
 * Auth fails CLOSED: unlike the older /api/cron/* routes, a missing
 * CRON_SECRET is a 401, never an open door — this route can send email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyNewsletter } from '@/lib/services/newsletterWeekly';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for cron job

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: no configured secret, no send path.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
