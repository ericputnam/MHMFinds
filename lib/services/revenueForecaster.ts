/**
 * Revenue Forecasting Engine
 *
 * Predicts future revenue based on historical trends, seasonal patterns,
 * and growth metrics.
 */

import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';

// Seasonal multipliers for Sims 4 community
// Based on typical gaming community patterns
const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 0.95, // January - post-holiday dip
  2: 0.98, // February
  3: 1.0, // March
  4: 1.02, // April
  5: 1.05, // May
  6: 1.12, // June - summer start, more gaming
  7: 1.18, // July - peak summer
  8: 1.15, // August
  9: 1.08, // September - back to school dip
  10: 1.05, // October
  11: 1.1, // November - holiday shopping
  12: 1.2, // December - holiday peak
};

// Historical revenue data structure
interface HistoricalRevenue {
  month: Date;
  adRevenue: number;
  affiliateRevenue: number;
  totalRevenue: number;
}

// Growth metrics
interface GrowthMetrics {
  monthOverMonthGrowth: number;
  compoundMonthlyGrowthRate: number;
  variance: number;
  trendDirection: 'up' | 'down' | 'stable';
}

// Forecast result
interface ForecastResult {
  month: Date;
  forecastedAdRevenue: number;
  forecastedAffiliateRevenue: number;
  forecastedTotalRevenue: number;
  confidenceLevel: number;
  monthOverMonthGrowth: number;
  growthRate: number;
}

/**
 * RevenueForecaster class - predicts future revenue
 */
export class RevenueForecaster {
  /**
   * Generate forecasts for the next N months
   */
  async generateForecast(monthsAhead = 3): Promise<number> {
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.FORECAST,
        status: 'RUNNING',
      },
    });

    try {
      // Get historical data
      const historical = await this.getHistoricalRevenue(180); // 6 months

      if (historical.length < 2) {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            itemsProcessed: 0,
            logSummary: 'Not enough historical data for forecasting',
          },
        });
        return 0;
      }

      // Calculate growth metrics
      const growthMetrics = this.calculateGrowthMetrics(historical);

      // Generate forecasts
      const forecasts: ForecastResult[] = [];
      const lastMonth = historical[historical.length - 1];

      for (let i = 1; i <= monthsAhead; i++) {
        const forecast = this.forecastMonth(lastMonth, i, growthMetrics);
        forecasts.push(forecast);
      }

      // Save forecasts
      let savedCount = 0;
      for (const forecast of forecasts) {
        await this.saveForecast(forecast, historical);
        savedCount++;
      }

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: savedCount,
          logSummary: `Generated ${savedCount} monthly forecasts`,
        },
      });

      return savedCount;
    } catch (error) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorsEncountered: 1,
          errorDetails: { error: String(error) },
        },
      });

      throw error;
    }
  }

  /**
   * Get historical revenue aggregated by month
   */
  async getHistoricalRevenue(days = 180): Promise<HistoricalRevenue[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Get daily metrics
    const metrics = await prisma.monetizationMetric.findMany({
      where: {
        metricDate: { gte: cutoff },
      },
      select: {
        metricDate: true,
        adRevenue: true,
        affiliateRevenue: true,
      },
    });

    // Aggregate by month
    const monthlyMap = new Map<
      string,
      { adRevenue: number; affiliateRevenue: number }
    >();

    for (const m of metrics) {
      const monthKey = `${m.metricDate.getFullYear()}-${String(m.metricDate.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(monthKey) ?? {
        adRevenue: 0,
        affiliateRevenue: 0,
      };

      existing.adRevenue += Number(m.adRevenue);
      existing.affiliateRevenue += Number(m.affiliateRevenue);
      monthlyMap.set(monthKey, existing);
    }

    // Convert to array sorted by date
    const result: HistoricalRevenue[] = [];
    for (const [key, values] of Array.from(monthlyMap.entries()).sort()) {
      const [year, month] = key.split('-').map(Number);
      result.push({
        month: new Date(year, month - 1, 1),
        adRevenue: values.adRevenue,
        affiliateRevenue: values.affiliateRevenue,
        totalRevenue: values.adRevenue + values.affiliateRevenue,
      });
    }

    return result;
  }

  /**
   * Calculate growth metrics from historical data
   */
  calculateGrowthMetrics(historical: HistoricalRevenue[]): GrowthMetrics {
    if (historical.length < 2) {
      return {
        monthOverMonthGrowth: 0,
        compoundMonthlyGrowthRate: 0,
        variance: 0,
        trendDirection: 'stable',
      };
    }

    // Calculate MoM growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < historical.length; i++) {
      const prev = historical[i - 1].totalRevenue;
      const curr = historical[i].totalRevenue;
      if (prev > 0) {
        growthRates.push((curr - prev) / prev);
      }
    }

    if (growthRates.length === 0) {
      return {
        monthOverMonthGrowth: 0,
        compoundMonthlyGrowthRate: 0,
        variance: 0,
        trendDirection: 'stable',
      };
    }

    // Average MoM growth
    const avgGrowth =
      growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

    // CMGR (Compound Monthly Growth Rate)
    const first = historical[0].totalRevenue;
    const last = historical[historical.length - 1].totalRevenue;
    const months = historical.length - 1;
    const cmgr = first > 0 ? Math.pow(last / first, 1 / months) - 1 : 0;

    // Variance
    const variance =
      growthRates.reduce((sum, g) => sum + Math.pow(g - avgGrowth, 2), 0) /
      growthRates.length;

    // Trend direction based on last 3 months
    const recentRates = growthRates.slice(-3);
    const recentAvg =
      recentRates.length > 0
        ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length
        : 0;

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > 0.05) trendDirection = 'up';
    else if (recentAvg < -0.05) trendDirection = 'down';

    return {
      monthOverMonthGrowth: avgGrowth * 100,
      compoundMonthlyGrowthRate: cmgr,
      variance,
      trendDirection,
    };
  }

  /**
   * Forecast a single month
   */
  forecastMonth(
    lastMonth: HistoricalRevenue,
    monthsAhead: number,
    growthMetrics: GrowthMetrics
  ): ForecastResult {
    const targetDate = new Date(lastMonth.month);
    targetDate.setMonth(targetDate.getMonth() + monthsAhead);

    // Apply growth rate
    const growthFactor = Math.pow(
      1 + growthMetrics.compoundMonthlyGrowthRate,
      monthsAhead
    );

    // Apply seasonal adjustment
    const targetMonth = targetDate.getMonth() + 1;
    const seasonalFactor = SEASONAL_MULTIPLIERS[targetMonth] ?? 1;

    // Calculate forecasted values
    const forecastedAdRevenue =
      lastMonth.adRevenue * growthFactor * seasonalFactor;
    const forecastedAffiliateRevenue =
      lastMonth.affiliateRevenue * growthFactor * seasonalFactor;
    const forecastedTotalRevenue =
      forecastedAdRevenue + forecastedAffiliateRevenue;

    // Calculate confidence based on variance and forecast distance
    const baseConfidence = 0.9;
    const variancePenalty = Math.min(0.3, growthMetrics.variance * 2);
    const distancePenalty = monthsAhead * 0.05;
    const confidenceLevel = Math.max(
      0.3,
      baseConfidence - variancePenalty - distancePenalty
    );

    // MoM growth for this forecast
    const prevMonthRevenue =
      monthsAhead === 1
        ? lastMonth.totalRevenue
        : lastMonth.totalRevenue *
          Math.pow(1 + growthMetrics.compoundMonthlyGrowthRate, monthsAhead - 1) *
          (SEASONAL_MULTIPLIERS[
            ((targetMonth - 2 + 12) % 12) + 1
          ] ?? 1);

    const momGrowth =
      prevMonthRevenue > 0
        ? ((forecastedTotalRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
        : 0;

    return {
      month: targetDate,
      forecastedAdRevenue,
      forecastedAffiliateRevenue,
      forecastedTotalRevenue,
      confidenceLevel,
      monthOverMonthGrowth: momGrowth,
      growthRate: growthMetrics.compoundMonthlyGrowthRate,
    };
  }

  /**
   * Save forecast to database
   */
  async saveForecast(
    forecast: ForecastResult,
    inputData: HistoricalRevenue[]
  ): Promise<void> {
    const forecastMonth = new Date(
      forecast.month.getFullYear(),
      forecast.month.getMonth(),
      1
    );

    await prisma.revenueForecast.upsert({
      where: {
        forecastMonth,
      },
      create: {
        forecastMonth,
        forecastedAdRevenue: forecast.forecastedAdRevenue,
        forecastedAffiliateRevenue: forecast.forecastedAffiliateRevenue,
        forecastedMembershipRevenue: 0,
        forecastedTotalRevenue: forecast.forecastedTotalRevenue,
        confidenceLevel: forecast.confidenceLevel,
        monthOverMonthGrowth: forecast.monthOverMonthGrowth,
        growthRate: forecast.growthRate,
        modelVersion: 'v1',
        inputDataSnapshot: inputData.map((h) => ({
          month: h.month.toISOString(),
          total: h.totalRevenue,
        })),
      },
      update: {
        forecastedAdRevenue: forecast.forecastedAdRevenue,
        forecastedAffiliateRevenue: forecast.forecastedAffiliateRevenue,
        forecastedTotalRevenue: forecast.forecastedTotalRevenue,
        confidenceLevel: forecast.confidenceLevel,
        monthOverMonthGrowth: forecast.monthOverMonthGrowth,
        growthRate: forecast.growthRate,
        inputDataSnapshot: inputData.map((h) => ({
          month: h.month.toISOString(),
          total: h.totalRevenue,
        })),
      },
    });
  }

  /**
   * Update actuals for past forecasts
   */
  async updateActuals(): Promise<number> {
    // Get forecasts without actuals for past months
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const forecasts = await prisma.revenueForecast.findMany({
      where: {
        forecastMonth: { lt: currentMonth },
        actualTotalRevenue: null,
      },
    });

    let updated = 0;
    for (const forecast of forecasts) {
      // Get actual data for that month
      const startOfMonth = forecast.forecastMonth;
      const endOfMonth = new Date(
        startOfMonth.getFullYear(),
        startOfMonth.getMonth() + 1,
        0
      );

      const actuals = await prisma.monetizationMetric.aggregate({
        where: {
          metricDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          adRevenue: true,
          affiliateRevenue: true,
        },
      });

      const actualAd = Number(actuals._sum.adRevenue ?? 0);
      const actualAffiliate = Number(actuals._sum.affiliateRevenue ?? 0);

      if (actualAd > 0 || actualAffiliate > 0) {
        await prisma.revenueForecast.update({
          where: { id: forecast.id },
          data: {
            actualAdRevenue: actualAd,
            actualAffiliateRevenue: actualAffiliate,
            actualMembershipRevenue: 0,
            actualTotalRevenue: actualAd + actualAffiliate,
          },
        });
        updated++;
      }
    }

    return updated;
  }

  /**
   * Get forecast accuracy report
   */
  async getForecastAccuracy(): Promise<{
    totalForecasts: number;
    withActuals: number;
    averageError: number;
    accuracyPercent: number;
  }> {
    const forecasts = await prisma.revenueForecast.findMany({
      where: {
        actualTotalRevenue: { not: null },
      },
    });

    if (forecasts.length === 0) {
      return {
        totalForecasts: 0,
        withActuals: 0,
        averageError: 0,
        accuracyPercent: 0,
      };
    }

    let totalError = 0;
    for (const f of forecasts) {
      const forecasted = Number(f.forecastedTotalRevenue);
      const actual = Number(f.actualTotalRevenue);
      if (actual > 0) {
        totalError += Math.abs(forecasted - actual) / actual;
      }
    }

    const averageError = (totalError / forecasts.length) * 100;

    return {
      totalForecasts: await prisma.revenueForecast.count(),
      withActuals: forecasts.length,
      averageError,
      accuracyPercent: Math.max(0, 100 - averageError),
    };
  }
}

// Export singleton instance
export const revenueForecaster = new RevenueForecaster();
