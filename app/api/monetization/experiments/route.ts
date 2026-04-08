import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { experimentManager } = await import('@/lib/services/experimentManager');
    const { optimizationCatalog } = await import('@/lib/services/optimizationCatalog');

    const [active, history] = await Promise.all([
      experimentManager.getActiveExperiments(),
      experimentManager.getExperimentHistory(20),
    ]);

    const catalog = optimizationCatalog.getSummary();
    const candidates = optimizationCatalog.getReadyCandidates();

    return NextResponse.json({
      active: active.map(e => ({
        ...e,
        baselineRpm: e.baselineRpm ? Number(e.baselineRpm) : null,
        treatmentRpm: e.treatmentRpm ? Number(e.treatmentRpm) : null,
        rpmLiftPercent: e.rpmLiftPercent ? Number(e.rpmLiftPercent) : null,
        bayesianProbability: e.bayesianProbability ? Number(e.bayesianProbability) : null,
        baselineRevenue: e.baselineRevenue ? Number(e.baselineRevenue) : null,
        treatmentRevenue: e.treatmentRevenue ? Number(e.treatmentRevenue) : null,
        baselineViewability: e.baselineViewability ? Number(e.baselineViewability) : null,
        treatmentViewability: e.treatmentViewability ? Number(e.treatmentViewability) : null,
        baselinePagesPerSession: e.baselinePagesPerSession ? Number(e.baselinePagesPerSession) : null,
        treatmentPagesPerSession: e.treatmentPagesPerSession ? Number(e.treatmentPagesPerSession) : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        baselineStartDate: e.baselineStartDate?.toISOString() ?? null,
        baselineEndDate: e.baselineEndDate?.toISOString() ?? null,
        experimentStartDate: e.experimentStartDate?.toISOString() ?? null,
        experimentEndDate: e.experimentEndDate?.toISOString() ?? null,
        decidedAt: e.decidedAt?.toISOString() ?? null,
        rolledBackAt: e.rolledBackAt?.toISOString() ?? null,
      })),
      history: history.map(e => ({
        ...e,
        baselineRpm: e.baselineRpm ? Number(e.baselineRpm) : null,
        treatmentRpm: e.treatmentRpm ? Number(e.treatmentRpm) : null,
        rpmLiftPercent: e.rpmLiftPercent ? Number(e.rpmLiftPercent) : null,
        bayesianProbability: e.bayesianProbability ? Number(e.bayesianProbability) : null,
        baselineRevenue: e.baselineRevenue ? Number(e.baselineRevenue) : null,
        treatmentRevenue: e.treatmentRevenue ? Number(e.treatmentRevenue) : null,
        baselineViewability: e.baselineViewability ? Number(e.baselineViewability) : null,
        treatmentViewability: e.treatmentViewability ? Number(e.treatmentViewability) : null,
        baselinePagesPerSession: e.baselinePagesPerSession ? Number(e.baselinePagesPerSession) : null,
        treatmentPagesPerSession: e.treatmentPagesPerSession ? Number(e.treatmentPagesPerSession) : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        baselineStartDate: e.baselineStartDate?.toISOString() ?? null,
        baselineEndDate: e.baselineEndDate?.toISOString() ?? null,
        experimentStartDate: e.experimentStartDate?.toISOString() ?? null,
        experimentEndDate: e.experimentEndDate?.toISOString() ?? null,
        decidedAt: e.decidedAt?.toISOString() ?? null,
        rolledBackAt: e.rolledBackAt?.toISOString() ?? null,
      })),
      catalog,
      candidates,
    });
  } catch (error) {
    console.error('Failed to fetch experiments data:', error);
    return NextResponse.json({
      active: [],
      history: [],
      catalog: { total: 0, byStatus: {}, totalExpectedRpmImpact: { min: 0, max: 0 }, totalExpectedRevenueImpact: { min: 0, max: 0 } },
      candidates: [],
      _warning: 'Experiments data temporarily unavailable',
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, experimentId, ...data } = body;

    const { experimentManager } = await import('@/lib/services/experimentManager');

    switch (action) {
      case 'propose': {
        const { name, description, catalogKey, scope, targetPages, maxDurationDays } = data;
        if (!name || !description || !catalogKey || !scope) {
          return NextResponse.json({ error: 'Missing required fields: name, description, catalogKey, scope' }, { status: 400 });
        }
        const id = await experimentManager.proposeExperiment({
          name,
          description,
          catalogKey,
          scope,
          targetPages,
          maxDurationDays,
        });
        return NextResponse.json({ success: true, experimentId: id });
      }

      case 'start': {
        if (!experimentId) {
          return NextResponse.json({ error: 'Missing experimentId' }, { status: 400 });
        }
        await experimentManager.startExperiment(experimentId);
        return NextResponse.json({ success: true });
      }

      case 'conclude': {
        if (!experimentId) {
          return NextResponse.json({ error: 'Missing experimentId' }, { status: 400 });
        }
        const { decision, reason } = data;
        if (!decision || !reason) {
          return NextResponse.json({ error: 'Missing required fields: decision, reason' }, { status: 400 });
        }
        await experimentManager.concludeExperiment(
          experimentId,
          decision,
          reason,
          session.user.email ?? 'admin'
        );
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Experiment action failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
