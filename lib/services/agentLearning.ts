/**
 * Agent Learning Service (PRD-20)
 *
 * Tracks prediction accuracy and adjusts future estimates based on
 * historical performance. Provides insights for the learning dashboard.
 */

import { prisma } from '@/lib/prisma';
import { ActionType, Prisma } from '@prisma/client';

// Minimum measurements needed for reliable adjustments
const MIN_MEASUREMENTS_FOR_ADJUSTMENT = 5;

// Default confidence when no historical data exists
const DEFAULT_CONFIDENCE = 0.5;

// Trend detection window (days)
const TREND_WINDOW_DAYS = 30;

/**
 * Insight generated from learning data
 */
export interface LearningInsight {
  type: 'accuracy' | 'trend' | 'recommendation' | 'warning';
  actionType?: ActionType | string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  metric?: number;
  trend?: 'improving' | 'stable' | 'declining';
}

/**
 * Accuracy data for an action type
 */
export interface ActionTypeAccuracy {
  actionType: string;
  measurementCount: number;
  avgAccuracy: number;
  avgPredictionError: number;
  totalEstimatedImpact: number;
  totalActualImpact: number;
  confidenceLevel: number;
  trend: 'improving' | 'stable' | 'declining';
  adjustmentFactor: number;
}

/**
 * AgentLearning class - learns from historical performance
 */
export class AgentLearning {
  /**
   * Get accuracy metrics for a specific action type
   */
  async getAccuracyForType(actionType: ActionType | string): Promise<{
    accuracy: number;
    measurementCount: number;
    confidence: number;
  }> {
    const stats = await prisma.impactMeasurement.aggregate({
      where: {
        status: 'complete',
        action: {
          actionType: actionType as ActionType,
        },
      },
      _avg: {
        predictionAccuracy: true,
      },
      _count: true,
    });

    const measurementCount = stats._count;
    const accuracy = Number(stats._avg.predictionAccuracy ?? 0);

    // Calculate confidence based on sample size
    const confidence = this.calculateConfidence(measurementCount);

    return {
      accuracy,
      measurementCount,
      confidence,
    };
  }

  /**
   * Get estimate adjustment factor for an action type
   * Returns a multiplier to apply to future estimates
   */
  async getEstimateAdjustment(actionType: ActionType | string): Promise<{
    adjustmentFactor: number;
    confidence: number;
    sampleSize: number;
  }> {
    // Get completed measurements for this action type
    const measurements = await prisma.$queryRaw<
      { estimatedImpact: number; revenueImpact: number }[]
    >(Prisma.sql`
      SELECT im."estimatedImpact", im."revenueImpact"
      FROM impact_measurements im
      JOIN monetization_actions ma ON im."actionId" = ma.id
      WHERE im.status = 'complete'
        AND im."revenueImpact" IS NOT NULL
        AND ma."actionType" = ${actionType}
    `);

    if (measurements.length < MIN_MEASUREMENTS_FOR_ADJUSTMENT) {
      return {
        adjustmentFactor: 1.0, // No adjustment if insufficient data
        confidence: DEFAULT_CONFIDENCE,
        sampleSize: measurements.length,
      };
    }

    // Calculate average ratio of actual to estimated
    let totalRatio = 0;
    let validCount = 0;

    for (const m of measurements) {
      if (m.estimatedImpact > 0) {
        totalRatio += m.revenueImpact / m.estimatedImpact;
        validCount++;
      }
    }

    const adjustmentFactor = validCount > 0 ? totalRatio / validCount : 1.0;
    const confidence = this.calculateConfidence(validCount);

    // Store/update the learning metric
    await this.updateLearningMetric(actionType as ActionType, {
      measurementCount: validCount,
      adjustmentFactor,
      avgAccuracy: await this.getAccuracyForType(actionType).then(r => r.accuracy),
    });

    return {
      adjustmentFactor,
      confidence,
      sampleSize: validCount,
    };
  }

  /**
   * Adjust an estimate based on historical learning
   */
  async adjustEstimate(
    actionType: ActionType | string,
    baseEstimate: number
  ): Promise<{
    adjustedEstimate: number;
    adjustmentFactor: number;
    confidence: number;
    learningApplied: boolean;
  }> {
    const { adjustmentFactor, confidence, sampleSize } =
      await this.getEstimateAdjustment(actionType);

    // Only apply adjustment if we have enough confidence
    const learningApplied = sampleSize >= MIN_MEASUREMENTS_FOR_ADJUSTMENT && confidence >= 0.6;

    return {
      adjustedEstimate: learningApplied ? baseEstimate * adjustmentFactor : baseEstimate,
      adjustmentFactor: learningApplied ? adjustmentFactor : 1.0,
      confidence,
      learningApplied,
    };
  }

  /**
   * Calculate trend for an action type (improving, stable, or declining)
   */
  async calculateTrend(actionType: ActionType | string): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    recentAccuracy: number;
    historicalAccuracy: number;
  }> {
    const now = new Date();
    const trendStart = new Date(now);
    trendStart.setDate(trendStart.getDate() - TREND_WINDOW_DAYS);
    const midpoint = new Date(now);
    midpoint.setDate(midpoint.getDate() - TREND_WINDOW_DAYS / 2);

    // Get recent measurements (last half of window)
    const recentStats = await prisma.impactMeasurement.aggregate({
      where: {
        status: 'complete',
        completedAt: { gte: midpoint },
        action: {
          actionType: actionType as ActionType,
        },
      },
      _avg: { predictionAccuracy: true },
      _count: true,
    });

    // Get historical measurements (first half of window)
    const historicalStats = await prisma.impactMeasurement.aggregate({
      where: {
        status: 'complete',
        completedAt: { gte: trendStart, lt: midpoint },
        action: {
          actionType: actionType as ActionType,
        },
      },
      _avg: { predictionAccuracy: true },
      _count: true,
    });

    const recentAccuracy = Number(recentStats._avg.predictionAccuracy ?? 0);
    const historicalAccuracy = Number(historicalStats._avg.predictionAccuracy ?? 0);

    // Need minimum data points to determine trend
    if (recentStats._count < 3 || historicalStats._count < 3) {
      return { trend: 'stable', recentAccuracy, historicalAccuracy };
    }

    const improvement = recentAccuracy - historicalAccuracy;

    // 5% threshold for trend detection
    let trend: 'improving' | 'stable' | 'declining';
    if (improvement > 0.05) {
      trend = 'improving';
    } else if (improvement < -0.05) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return { trend, recentAccuracy, historicalAccuracy };
  }

  /**
   * Generate insights for the learning dashboard
   */
  async generateInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Get all action types with measurements
    const actionTypeStats = await this.getAllActionTypeAccuracy();

    // Overall accuracy insight
    const overallAccuracy = await this.getOverallAccuracy();
    if (overallAccuracy.measurementCount > 0) {
      const accuracyPercent = Math.round(overallAccuracy.accuracy * 100);
      insights.push({
        type: 'accuracy',
        title: 'Overall Prediction Accuracy',
        description: `Agent predictions are ${accuracyPercent}% accurate on average across ${overallAccuracy.measurementCount} measurements.`,
        severity: accuracyPercent >= 80 ? 'success' : accuracyPercent >= 60 ? 'info' : 'warning',
        metric: overallAccuracy.accuracy,
      });
    }

    // Per-action-type insights
    for (const stat of actionTypeStats) {
      // High accuracy celebration
      if (stat.avgAccuracy >= 0.85 && stat.measurementCount >= 5) {
        insights.push({
          type: 'accuracy',
          actionType: stat.actionType,
          title: `High Accuracy: ${stat.actionType.replace(/_/g, ' ')}`,
          description: `Predictions for ${stat.actionType.replace(/_/g, ' ')} actions are ${Math.round(stat.avgAccuracy * 100)}% accurate.`,
          severity: 'success',
          metric: stat.avgAccuracy,
        });
      }

      // Low accuracy warning
      if (stat.avgAccuracy < 0.5 && stat.measurementCount >= 5) {
        insights.push({
          type: 'warning',
          actionType: stat.actionType,
          title: `Low Accuracy: ${stat.actionType.replace(/_/g, ' ')}`,
          description: `Predictions for ${stat.actionType.replace(/_/g, ' ')} are only ${Math.round(stat.avgAccuracy * 100)}% accurate. Consider reviewing estimation logic.`,
          severity: 'warning',
          metric: stat.avgAccuracy,
        });
      }

      // Trend insights
      if (stat.trend === 'improving') {
        insights.push({
          type: 'trend',
          actionType: stat.actionType,
          title: `Improving: ${stat.actionType.replace(/_/g, ' ')}`,
          description: `Prediction accuracy for ${stat.actionType.replace(/_/g, ' ')} is improving over time.`,
          severity: 'success',
          trend: 'improving',
        });
      } else if (stat.trend === 'declining') {
        insights.push({
          type: 'trend',
          actionType: stat.actionType,
          title: `Declining: ${stat.actionType.replace(/_/g, ' ')}`,
          description: `Prediction accuracy for ${stat.actionType.replace(/_/g, ' ')} is declining. May need recalibration.`,
          severity: 'warning',
          trend: 'declining',
        });
      }

      // Significant adjustment recommendation
      if (Math.abs(stat.adjustmentFactor - 1.0) > 0.2 && stat.confidenceLevel >= 0.7) {
        const direction = stat.adjustmentFactor > 1.0 ? 'underestimating' : 'overestimating';
        const adjustPercent = Math.round(Math.abs(stat.adjustmentFactor - 1.0) * 100);
        insights.push({
          type: 'recommendation',
          actionType: stat.actionType,
          title: `Calibration Needed: ${stat.actionType.replace(/_/g, ' ')}`,
          description: `Agent is ${direction} ${stat.actionType.replace(/_/g, ' ')} impact by ~${adjustPercent}%. Learning adjustments are being applied.`,
          severity: 'info',
          metric: stat.adjustmentFactor,
        });
      }
    }

    // Insufficient data warning
    const lowDataTypes = actionTypeStats.filter(s => s.measurementCount < MIN_MEASUREMENTS_FOR_ADJUSTMENT);
    if (lowDataTypes.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Insufficient Learning Data',
        description: `${lowDataTypes.length} action type(s) have fewer than ${MIN_MEASUREMENTS_FOR_ADJUSTMENT} measurements. More data needed for reliable adjustments.`,
        severity: 'info',
      });
    }

    return insights;
  }

  /**
   * Get accuracy data for all action types
   */
  async getAllActionTypeAccuracy(): Promise<ActionTypeAccuracy[]> {
    const rawStats = await prisma.$queryRaw<
      {
        actionType: string;
        count: bigint;
        avgAccuracy: number;
        avgError: number;
        totalEstimated: number;
        totalActual: number;
      }[]
    >(Prisma.sql`
      SELECT
        ma."actionType",
        COUNT(*)::bigint as count,
        AVG(im."predictionAccuracy")::float as "avgAccuracy",
        AVG(im."predictionError")::float as "avgError",
        SUM(im."estimatedImpact")::float as "totalEstimated",
        SUM(im."revenueImpact")::float as "totalActual"
      FROM impact_measurements im
      JOIN monetization_actions ma ON im."actionId" = ma.id
      WHERE im.status = 'complete'
      GROUP BY ma."actionType"
    `);

    const results: ActionTypeAccuracy[] = [];

    for (const stat of rawStats) {
      const measurementCount = Number(stat.count);
      const { trend } = await this.calculateTrend(stat.actionType);
      const { adjustmentFactor } = await this.getEstimateAdjustment(stat.actionType);

      results.push({
        actionType: stat.actionType,
        measurementCount,
        avgAccuracy: stat.avgAccuracy ?? 0,
        avgPredictionError: stat.avgError ?? 0,
        totalEstimatedImpact: stat.totalEstimated ?? 0,
        totalActualImpact: stat.totalActual ?? 0,
        confidenceLevel: this.calculateConfidence(measurementCount),
        trend,
        adjustmentFactor,
      });
    }

    return results;
  }

  /**
   * Get overall accuracy across all action types
   */
  async getOverallAccuracy(): Promise<{
    accuracy: number;
    measurementCount: number;
  }> {
    const stats = await prisma.impactMeasurement.aggregate({
      where: { status: 'complete' },
      _avg: { predictionAccuracy: true },
      _count: true,
    });

    return {
      accuracy: Number(stats._avg.predictionAccuracy ?? 0),
      measurementCount: stats._count,
    };
  }

  /**
   * Get learning summary for dashboard
   */
  async getLearningDashboardData(): Promise<{
    overallAccuracy: number;
    totalMeasurements: number;
    actionTypeStats: ActionTypeAccuracy[];
    insights: LearningInsight[];
    recentTrend: 'improving' | 'stable' | 'declining';
    topPerformingType: string | null;
    needsAttentionType: string | null;
  }> {
    const [overall, actionTypeStats, insights] = await Promise.all([
      this.getOverallAccuracy(),
      this.getAllActionTypeAccuracy(),
      this.generateInsights(),
    ]);

    // Determine overall trend
    let improvingCount = 0;
    let decliningCount = 0;
    for (const stat of actionTypeStats) {
      if (stat.trend === 'improving') improvingCount++;
      if (stat.trend === 'declining') decliningCount++;
    }

    let recentTrend: 'improving' | 'stable' | 'declining';
    if (improvingCount > decliningCount) {
      recentTrend = 'improving';
    } else if (decliningCount > improvingCount) {
      recentTrend = 'declining';
    } else {
      recentTrend = 'stable';
    }

    // Find top and bottom performers
    const sortedByAccuracy = actionTypeStats
      .filter(s => s.measurementCount >= MIN_MEASUREMENTS_FOR_ADJUSTMENT)
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy);

    const topPerformingType = sortedByAccuracy[0]?.actionType ?? null;
    const needsAttentionType = sortedByAccuracy[sortedByAccuracy.length - 1]?.actionType ?? null;

    return {
      overallAccuracy: overall.accuracy,
      totalMeasurements: overall.measurementCount,
      actionTypeStats,
      insights,
      recentTrend,
      topPerformingType,
      needsAttentionType: needsAttentionType !== topPerformingType ? needsAttentionType : null,
    };
  }

  /**
   * Calculate confidence level based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    if (sampleSize === 0) return 0;
    if (sampleSize < 3) return 0.3;
    if (sampleSize < 5) return 0.5;
    if (sampleSize < 10) return 0.7;
    if (sampleSize < 20) return 0.85;
    return 0.95;
  }

  /**
   * Update or create learning metric record
   */
  private async updateLearningMetric(
    actionType: ActionType,
    data: {
      measurementCount: number;
      adjustmentFactor: number;
      avgAccuracy: number;
    }
  ): Promise<void> {
    const existing = await prisma.agentLearningMetric.findFirst({
      where: {
        metricType: 'prediction_accuracy',
        actionType,
      },
      orderBy: { periodEnd: 'desc' },
    });

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);

    if (existing && existing.periodEnd > periodStart) {
      // Update existing record
      const previousValue = existing.meanValue;
      const trend = previousValue
        ? ((data.avgAccuracy - Number(previousValue)) / Number(previousValue)) * 100
        : 0;

      await prisma.agentLearningMetric.update({
        where: { id: existing.id },
        data: {
          sampleSize: data.measurementCount,
          meanValue: data.avgAccuracy,
          previousPeriodValue: previousValue,
          trend,
          periodEnd: now,
        },
      });
    } else {
      // Create new record
      await prisma.agentLearningMetric.create({
        data: {
          metricType: 'prediction_accuracy',
          actionType,
          periodType: 'monthly',
          periodStart,
          periodEnd: now,
          sampleSize: data.measurementCount,
          meanValue: data.avgAccuracy,
        },
      });
    }
  }
}

// Export singleton instance
export const agentLearning = new AgentLearning();
