/**
 * Monetization Agent Cron Endpoint
 *
 * Runs the full monetization agent scan on a daily schedule.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Schedule: Daily at 6:00 AM UTC (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/services/agentOrchestrator';

export const maxDuration = 300; // 5 minutes max for cron job

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request - invalid or missing authorization');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('Starting monetization agent cron job...');
  const startTime = Date.now();

  try {
    // Run the full agent scan
    const result = await agentOrchestrator.runJob('full');

    const response = {
      success: result.success,
      job: result.job,
      duration: result.duration,
      durationSeconds: Math.round(result.duration / 1000),
      itemsProcessed: result.itemsProcessed ?? 0,
      opportunitiesFound: result.opportunitiesFound ?? 0,
      timestamp: new Date().toISOString(),
      error: result.error,
    };

    console.log('Monetization agent cron job completed:', response);

    return NextResponse.json(response, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Monetization agent cron job failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Support POST for manual triggering (with same auth requirements)
export async function POST(request: NextRequest) {
  return GET(request);
}
