/**
 * Impact Tracker Service (PRD-20)
 *
 * Tracks actual impact of executed actions by comparing
 * baseline metrics to post-execution metrics.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Measurement configuration per action type
const MEASUREMENT_CONFIG: Record<string, {
  measurementType: string;
  measurementWindow: number; // Days to measure
  baselineWindow: number; // Days for baseline
}> = {
  ADD_AFFILIATE_LINK: {
    measurementType: 'affiliate_clicks',
    measurementWindow: 14, // 2 weeks to see impact
    baselineWindow: 14,
  },
  UPDATE_META_DESCRIPTION: {
    measurementType: 'traffic',
    measurementWindow: 21, // 3 weeks for SEO changes
    baselineWindow: 14,
  },
  ADD_TO_COLLECTION: {
    measurementType: 'pageviews',
    measurementWindow: 7,
    baselineWindow: 7,
  },
  UPDATE_AD_PLACEMENT: {
    measurementType: 'rpm',
    measurementWindow: 14,
    baselineWindow: 14,
  },
  DEFAULT: {
    measurementType: 'revenue',
    measurementWindow: 14,
    baselineWindow: 14,
  },
};

/**
 * ImpactTracker class - measures actual impact of actions
 */
export class ImpactTracker {
  /**
   * Start tracking for an executed action
   */
  async startTracking(actionId: string): Promise<string | null> {
    const action = await prisma.monetizationAction.findUnique({
      where: { id: actionId },
      include: {
        opportunity: true,
      },
    });

    if (!action || action.status !== 'EXECUTED' || !action.executedAt) {
      return null;
    }

    // Get measurement config
    const config = MEASUREMENT_CONFIG[action.actionType] || MEASUREMENT_CONFIG.DEFAULT;

    // Calculate baseline period (before execution)
    const baselinePeriodEnd = new Date(action.executedAt);
    const baselinePeriodStart = new Date(baselinePeriodEnd);
    baselinePeriodStart.setDate(baselinePeriodStart.getDate() - config.baselineWindow);

    // Calculate measurement period (after execution)
    const measurementStart = new Date(action.executedAt);
    const measurementEnd = new Date(measurementStart);
    measurementEnd.setDate(measurementEnd.getDate() + config.measurementWindow);

    // Calculate baseline value
    const baselineValue = await this.calculateBaseline(
      action,
      config.measurementType,
      baselinePeriodStart,
      baselinePeriodEnd
    );

    // Create measurement record
    const measurement = await prisma.impactMeasurement.create({
      data: {
        actionId,
        measurementType: config.measurementType,
        measurementWindow: config.measurementWindow,
        startDate: measurementStart,
        endDate: measurementEnd,
        baselineValue,
        baselinePeriodStart,
        baselinePeriodEnd,
        measuredValue: 0, // Will be updated when measurement completes
        absoluteImpact: 0,
        percentImpact: 0,
        estimatedImpact: Number(action.opportunity.estimatedRevenueImpact ?? 0),
        predictionError: 0,
        predictionAccuracy: 0,
        attributionConfidence: 0.7, // Default confidence
        status: 'pending',
      },
    });

    return measurement.id;
  }

  /**
   * Process all pending measurements that are ready to complete
   */
  async processPendingMeasurements(): Promise<number> {
    const now = new Date();

    // Get measurements that are ready to complete
    const pendingMeasurements = await prisma.impactMeasurement.findMany({
      where: {
        status: 'pending',
        endDate: { lte: now },
      },
      include: {
        action: {
          include: {
            opportunity: true,
          },
        },
      },
    });

    let processedCount = 0;

    for (const measurement of pendingMeasurements) {
      try {
        // Fetch actual metrics for the measurement period
        const measuredValue = await this.fetchActualMetrics(
          measurement.action,
          measurement.measurementType,
          measurement.startDate,
          measurement.endDate
        );

        // Calculate impact
        const impact = this.calculateImpact(
          Number(measurement.baselineValue),
          measuredValue
        );

        // Calculate prediction accuracy
        const estimatedImpact = Number(measurement.estimatedImpact);
        const actualMonthlyImpact = this.extrapolateToMonthly(
          impact.absoluteImpact,
          measurement.measurementWindow
        );

        const predictionError = estimatedImpact !== 0
          ? (actualMonthlyImpact - estimatedImpact) / estimatedImpact
          : 0;

        const predictionAccuracy = Math.max(0, 1 - Math.abs(predictionError));

        // Update measurement
        await prisma.impactMeasurement.update({
          where: { id: measurement.id },
          data: {
            measuredValue,
            absoluteImpact: impact.absoluteImpact,
            percentImpact: impact.percentImpact,
            revenueImpact: actualMonthlyImpact,
            predictionError,
            predictionAccuracy,
            status: measuredValue > 0 ? 'complete' : 'inconclusive',
            completedAt: new Date(),
          },
        });

        // Update action with verified impact
        await prisma.monetizationAction.update({
          where: { id: measurement.actionId },
          data: {
            verifiedImpact: actualMonthlyImpact,
            verifiedAt: new Date(),
          },
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to process measurement ${measurement.id}:`, error);
        await prisma.impactMeasurement.update({
          where: { id: measurement.id },
          data: {
            status: 'inconclusive',
            attributionNotes: `Error: ${String(error)}`,
          },
        });
      }
    }

    return processedCount;
  }

  /**
   * Calculate baseline metrics for an action
   */
  private async calculateBaseline(
    action: {
      actionType: string;
      opportunity: { pageUrl: string | null; modId: string | null };
    },
    measurementType: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const pageUrl = action.opportunity.pageUrl;
    if (!pageUrl) return 0;

    const metrics = await prisma.monetizationMetric.aggregate({
      where: {
        pageUrl,
        metricDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      _avg: {
        pageviews: true,
        affiliateClicks: true,
        adRevenue: true,
        rpm: true,
      },
    });

    switch (measurementType) {
      case 'traffic':
      case 'pageviews':
        return metrics._avg.pageviews ?? 0;
      case 'affiliate_clicks':
        return metrics._avg.affiliateClicks ?? 0;
      case 'rpm':
        return Number(metrics._avg.rpm ?? 0);
      case 'revenue':
      default:
        return Number(metrics._avg.adRevenue ?? 0);
    }
  }

  /**
   * Fetch actual metrics for the measurement period
   */
  private async fetchActualMetrics(
    action: {
      actionType: string;
      opportunity: { pageUrl: string | null; modId: string | null };
    },
    measurementType: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const pageUrl = action.opportunity.pageUrl;
    if (!pageUrl) return 0;

    const metrics = await prisma.monetizationMetric.aggregate({
      where: {
        pageUrl,
        metricDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      _avg: {
        pageviews: true,
        affiliateClicks: true,
        adRevenue: true,
        rpm: true,
      },
    });

    switch (measurementType) {
      case 'traffic':
      case 'pageviews':
        return metrics._avg.pageviews ?? 0;
      case 'affiliate_clicks':
        return metrics._avg.affiliateClicks ?? 0;
      case 'rpm':
        return Number(metrics._avg.rpm ?? 0);
      case 'revenue':
      default:
        return Number(metrics._avg.adRevenue ?? 0);
    }
  }

  /**
   * Calculate impact from baseline and measured values
   */
  calculateImpact(baseline: number, measured: number): {
    absoluteImpact: number;
    percentImpact: number;
  } {
    const absoluteImpact = measured - baseline;
    const percentImpact = baseline !== 0
      ? (absoluteImpact / baseline) * 100
      : 0;

    return { absoluteImpact, percentImpact };
  }

  /**
   * Extrapolate short-term impact to monthly value
   */
  private extrapolateToMonthly(value: number, days: number): number {
    return (value / days) * 30;
  }

  /**
   * Get impact summary for dashboard
   */
  async getImpactSummary(): Promise<{
    totalMeasurements: number;
    completedMeasurements: number;
    avgPredictionAccuracy: number;
    totalVerifiedImpact: number;
    byActionType: Record<string, { count: number; avgAccuracy: number; totalImpact: number }>;
  }> {
    const [total, completed, accuracyAgg, impactAgg] = await Promise.all([
      prisma.impactMeasurement.count(),
      prisma.impactMeasurement.count({ where: { status: 'complete' } }),
      prisma.impactMeasurement.aggregate({
        where: { status: 'complete' },
        _avg: { predictionAccuracy: true },
      }),
      prisma.impactMeasurement.aggregate({
        where: { status: 'complete' },
        _sum: { revenueImpact: true },
      }),
    ]);

    // Get breakdown by action type
    const byActionTypeRaw = await prisma.$queryRaw<
      { actionType: string; count: bigint; avgAccuracy: number; totalImpact: number }[]
    >(Prisma.sql`
      SELECT
        ma."actionType",
        COUNT(*)::int as count,
        AVG(im."predictionAccuracy")::float as "avgAccuracy",
        SUM(im."revenueImpact")::float as "totalImpact"
      FROM impact_measurements im
      JOIN monetization_actions ma ON im."actionId" = ma.id
      WHERE im.status = 'complete'
      GROUP BY ma."actionType"
    `);

    const byActionType: Record<string, { count: number; avgAccuracy: number; totalImpact: number }> = {};
    for (const row of byActionTypeRaw) {
      byActionType[row.actionType] = {
        count: Number(row.count),
        avgAccuracy: row.avgAccuracy ?? 0,
        totalImpact: row.totalImpact ?? 0,
      };
    }

    return {
      totalMeasurements: total,
      completedMeasurements: completed,
      avgPredictionAccuracy: Number(accuracyAgg._avg.predictionAccuracy ?? 0),
      totalVerifiedImpact: Number(impactAgg._sum.revenueImpact ?? 0),
      byActionType,
    };
  }

  /**
   * Get recent impact measurements
   */
  async getRecentMeasurements(limit = 20): Promise<{
    id: string;
    actionType: string;
    status: string;
    estimatedImpact: number;
    measuredImpact: number | null;
    predictionAccuracy: number | null;
    completedAt: Date | null;
  }[]> {
    const measurements = await prisma.impactMeasurement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        action: {
          select: { actionType: true },
        },
      },
    });

    return measurements.map(m => ({
      id: m.id,
      actionType: m.action.actionType,
      status: m.status,
      estimatedImpact: Number(m.estimatedImpact),
      measuredImpact: m.revenueImpact ? Number(m.revenueImpact) : null,
      predictionAccuracy: m.predictionAccuracy ? Number(m.predictionAccuracy) : null,
      completedAt: m.completedAt,
    }));
  }
}

// Export singleton instance
export const impactTracker = new ImpactTracker();
