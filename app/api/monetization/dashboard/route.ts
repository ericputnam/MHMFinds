import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actionQueue } from '@/lib/services/actionQueue';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get queue stats
  const queueStats = await actionQueue.getQueueStats();

  // Get recent runs (last 24 hours)
  const recentRuns = await prisma.agentRun.findMany({
    where: {
      startedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: {
      runType: true,
      status: true,
      startedAt: true,
      itemsProcessed: true,
      opportunitiesFound: true,
    },
  });

  // Get next 3 months of forecasts
  const forecasts = await prisma.revenueForecast.findMany({
    where: {
      forecastMonth: { gte: new Date() },
    },
    orderBy: { forecastMonth: 'asc' },
    take: 3,
    select: {
      forecastMonth: true,
      forecastedTotalRevenue: true,
      actualTotalRevenue: true,
    },
  });

  return NextResponse.json({
    queueStats,
    recentRuns: recentRuns.map(r => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
    })),
    forecasts: forecasts.map(f => ({
      forecastMonth: f.forecastMonth.toISOString(),
      forecastedTotalRevenue: Number(f.forecastedTotalRevenue),
      actualTotalRevenue: f.actualTotalRevenue ? Number(f.actualTotalRevenue) : null,
    })),
  });
}
