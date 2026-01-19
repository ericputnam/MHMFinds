import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { actionQueue } from '@/lib/services/actionQueue';
import { agentLearning } from '@/lib/services/agentLearning';
import { impactTracker } from '@/lib/services/impactTracker';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get comprehensive learning data from the agent learning service
    const [learningDashboard, impactSummary, recentMeasurements, implemented] = await Promise.all([
      agentLearning.getLearningDashboardData(),
      impactTracker.getImpactSummary(),
      impactTracker.getRecentMeasurements(20),
      actionQueue.getImplementedOpportunities(100),
    ]);

    // Calculate legacy stats for backwards compatibility
    let totalEstimated = 0;
    let totalMeasured = 0;
    let withMeasuredCount = 0;

    const opportunities = implemented.map(opp => {
      const estimated = Number(opp.estimatedRevenueImpact ?? 0);
      const measured = opp.actions.reduce(
        (sum, a) => sum + Number(a.measuredImpact ?? 0),
        0
      );

      totalEstimated += estimated;
      if (measured > 0) {
        totalMeasured += measured;
        withMeasuredCount++;
      }

      return {
        id: opp.id,
        title: opp.title,
        opportunityType: opp.opportunityType,
        estimatedRevenueImpact: estimated,
        implementedAt: new Date().toISOString(),
        actions: opp.actions.map(a => ({
          actionType: a.actionType,
          measuredImpact: a.measuredImpact ? Number(a.measuredImpact) : null,
        })),
      };
    });

    const accuracyPercent = totalEstimated > 0
      ? Math.min(100, (totalMeasured / totalEstimated) * 100)
      : 0;

    return NextResponse.json({
      // New comprehensive learning data
      learning: learningDashboard,
      impact: {
        summary: impactSummary,
        recentMeasurements,
      },
      // Legacy data for backwards compatibility
      opportunities,
      stats: {
        totalImplemented: implemented.length,
        withMeasuredImpact: withMeasuredCount,
        totalEstimatedImpact: totalEstimated,
        totalMeasuredImpact: totalMeasured,
        accuracyPercent,
      },
    });
  } catch (error) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning data' },
      { status: 500 }
    );
  }
}
