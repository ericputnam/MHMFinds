import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import * as fs from 'fs';
import * as path from 'path';
import type { FunnelHistory } from '@/lib/funnel/dashboardMath';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/funnel/history
 *
 * Serves reports/funnel/history.json (committed daily by the funnel team's
 * runner) to the admin-only /admin/funnel dashboard. Read via fs.readFileSync
 * from process.cwd() rather than a static `import` so a missing file (before
 * the first daily run has committed it) is a clean runtime 404 instead of a
 * build failure. Because next.config.js's `output: 'standalone'` only ships
 * files Next explicitly traces, `experimental.outputFileTracingIncludes` in
 * next.config.js pins this path into the serverless bundle on Vercel.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filePath = path.join(process.cwd(), 'reports', 'funnel', 'history.json');

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'history not generated yet' }, { status: 404 });
    }

    let history: FunnelHistory;
    try {
      history = JSON.parse(raw) as FunnelHistory;
    } catch {
      return NextResponse.json({ error: 'history.json is malformed' }, { status: 500 });
    }

    return NextResponse.json(history, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Failed to load funnel history:', error);
    return NextResponse.json({ error: 'Failed to load funnel history' }, { status: 500 });
  }
}
