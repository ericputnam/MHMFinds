import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentRunType, AgentRunStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const days = parseInt(searchParams.get('days') || '7');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const where: {
    startedAt: { gte: Date };
    runType?: AgentRunType;
    status?: AgentRunStatus;
  } = {
    startedAt: { gte: cutoff },
  };

  if (type && type !== 'all') {
    where.runType = type as AgentRunType;
  }
  if (status && status !== 'all') {
    where.status = status as AgentRunStatus;
  }

  const [runs, total] = await Promise.all([
    prisma.agentRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agentRun.count({ where }),
  ]);

  // Calculate stats
  const allRuns = await prisma.agentRun.findMany({
    where: { startedAt: { gte: cutoff } },
    select: {
      runType: true,
      status: true,
      startedAt: true,
      completedAt: true,
      opportunitiesFound: true,
    },
  });

  const completed = allRuns.filter(r => r.status === 'COMPLETED').length;

  // Calculate average duration
  let totalDuration = 0;
  let durationCount = 0;
  for (const run of allRuns) {
    if (run.completedAt && run.startedAt) {
      totalDuration += run.completedAt.getTime() - run.startedAt.getTime();
      durationCount++;
    }
  }

  const totalOpportunities = allRuns.reduce((sum, r) => sum + r.opportunitiesFound, 0);

  // Stats by type
  const byType = Object.values(AgentRunType).map(runType => {
    const typeRuns = allRuns.filter(r => r.runType === runType);
    const typeCompleted = typeRuns.filter(r => r.status === 'COMPLETED').length;
    return {
      type: runType,
      count: typeRuns.length,
      successRate: typeRuns.length > 0 ? (typeCompleted / typeRuns.length) * 100 : 0,
    };
  }).filter(t => t.count > 0);

  return NextResponse.json({
    runs: runs.map(r => ({
      id: r.id,
      runType: r.runType,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      durationMs: r.completedAt && r.startedAt
        ? r.completedAt.getTime() - r.startedAt.getTime()
        : null,
      itemsProcessed: r.itemsProcessed,
      opportunitiesFound: r.opportunitiesFound,
      errorsEncountered: r.errorsEncountered,
      logSummary: r.logSummary,
      errorDetails: r.errorDetails,
    })),
    totalPages: Math.ceil(total / limit),
    stats: {
      totalRuns: allRuns.length,
      successRate: allRuns.length > 0 ? (completed / allRuns.length) * 100 : 0,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      totalOpportunities,
      byType,
    },
  });
}
