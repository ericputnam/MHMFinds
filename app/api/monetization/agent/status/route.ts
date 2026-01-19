import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Map job types to AgentRunType enum
  const jobTypeMap: Record<string, AgentRunType> = {
    full: AgentRunType.FULL,
    ga4_sync: AgentRunType.GA4_SYNC,
    affiliate_scan: AgentRunType.AFFILIATE_SCAN,
    rpm_analysis: AgentRunType.RPM_ANALYSIS,
    forecast: AgentRunType.FORECAST,
    cleanup: AgentRunType.CLEANUP,
  };

  const lastRuns: Record<string, {
    startedAt: string;
    completedAt: string | null;
    status: string;
    durationMs: number | null;
    itemsProcessed: number;
  }> = {};

  for (const [key, runType] of Object.entries(jobTypeMap)) {
    const lastRun = await prisma.agentRun.findFirst({
      where: { runType },
      orderBy: { startedAt: 'desc' },
      select: {
        startedAt: true,
        completedAt: true,
        status: true,
        itemsProcessed: true,
        opportunitiesFound: true,
      },
    });

    if (lastRun) {
      lastRuns[key] = {
        startedAt: lastRun.startedAt.toISOString(),
        completedAt: lastRun.completedAt?.toISOString() ?? null,
        status: lastRun.status,
        durationMs: lastRun.completedAt && lastRun.startedAt
          ? lastRun.completedAt.getTime() - lastRun.startedAt.getTime()
          : null,
        itemsProcessed: lastRun.itemsProcessed,
      };
    }
  }

  return NextResponse.json({ lastRuns });
}
