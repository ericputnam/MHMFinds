# PRD-06: Revenue Forecasting Engine

## Overview
Build a forecasting system that predicts future revenue based on historical trends, seasonality, and growth patterns. Tracks forecast accuracy and provides business insights.

## Priority: P1 (Intelligence)
## Dependencies: PRD-01, PRD-02, PRD-03 (Database + Data connectors)
## Estimated Implementation: 3 hours

---

## Forecasting Models

### 1. Trend-Based Forecast
- Linear regression on historical revenue
- Month-over-month growth rate projection

### 2. Seasonal Adjustment
- Account for gaming/Sims seasonality (holidays, pack releases)
- Pinterest seasonal traffic patterns

### 3. Growth Rate Analysis
- Compound monthly growth rate (CMGR)
- Confidence intervals based on variance

---

## Implementation

### File: `lib/services/revenueForecaster.ts`

```typescript
import { prisma } from '../prisma';

interface ForecastResult {
  forecastMonth: Date;
  forecastedAdRevenue: number;
  forecastedAffiliateRevenue: number;
  forecastedMembershipRevenue: number;
  forecastedTotalRevenue: number;
  confidenceLevel: number;
  growthRate: number;
  reasoning: string;
}

interface HistoricalData {
  date: Date;
  adRevenue: number;
  affiliateRevenue: number;
  totalRevenue: number;
}

interface GrowthMetrics {
  monthOverMonthGrowth: number;
  compoundMonthlyGrowthRate: number;
  variance: number;
  trend: 'up' | 'down' | 'flat';
}

// Seasonal multipliers based on Sims community patterns
const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 0.95,  // January - post-holiday dip
  2: 0.92,  // February - slowest month
  3: 1.00,  // March - baseline
  4: 1.02,  // April - spring picks up
  5: 1.05,  // May - end of school year
  6: 1.15,  // June - summer boost
  7: 1.18,  // July - peak summer
  8: 1.12,  // August - back to school prep
  9: 0.98,  // September - school starts
  10: 1.05, // October - Halloween CC surge
  11: 1.08, // November - holiday prep
  12: 1.20, // December - holiday peak
};

export class RevenueForecaster {
  /**
   * Generate forecast for upcoming months
   */
  async generateForecast(monthsAhead: number = 3): Promise<ForecastResult[]> {
    // Get historical data
    const historical = await this.getHistoricalRevenue(180); // 6 months
    if (historical.length < 30) {
      throw new Error('Insufficient historical data for forecasting (need 30+ days)');
    }

    // Calculate growth metrics
    const growthMetrics = this.calculateGrowthMetrics(historical);

    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    const today = new Date();

    for (let i = 1; i <= monthsAhead; i++) {
      const forecastMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const forecast = this.forecastMonth(forecastMonth, historical, growthMetrics);
      forecasts.push(forecast);
    }

    return forecasts;
  }

  /**
   * Get historical revenue data from database
   */
  private async getHistoricalRevenue(days: number): Promise<HistoricalData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily aggregated revenue from metrics
    const metrics = await prisma.monetizationMetric.groupBy({
      by: ['metricDate'],
      where: {
        metricDate: { gte: startDate },
      },
      _sum: {
        adRevenue: true,
        affiliateRevenue: true,
      },
      orderBy: {
        metricDate: 'asc',
      },
    });

    return metrics.map(m => ({
      date: m.metricDate,
      adRevenue: Number(m._sum.adRevenue) || 0,
      affiliateRevenue: Number(m._sum.affiliateRevenue) || 0,
      totalRevenue: (Number(m._sum.adRevenue) || 0) + (Number(m._sum.affiliateRevenue) || 0),
    }));
  }

  /**
   * Calculate growth metrics from historical data
   */
  private calculateGrowthMetrics(data: HistoricalData[]): GrowthMetrics {
    if (data.length < 2) {
      return { monthOverMonthGrowth: 0, compoundMonthlyGrowthRate: 0, variance: 0, trend: 'flat' };
    }

    // Group by month
    const monthlyRevenue = new Map<string, number>();
    for (const d of data) {
      const monthKey = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + d.totalRevenue);
    }

    const months = Array.from(monthlyRevenue.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, revenue]) => revenue);

    if (months.length < 2) {
      return { monthOverMonthGrowth: 0, compoundMonthlyGrowthRate: 0, variance: 0, trend: 'flat' };
    }

    // Calculate month-over-month growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < months.length; i++) {
      if (months[i - 1] > 0) {
        growthRates.push((months[i] - months[i - 1]) / months[i - 1]);
      }
    }

    // Average MoM growth
    const avgGrowth = growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;

    // Compound monthly growth rate
    const startValue = months[0];
    const endValue = months[months.length - 1];
    const periods = months.length - 1;
    const cmgr = periods > 0 && startValue > 0
      ? Math.pow(endValue / startValue, 1 / periods) - 1
      : 0;

    // Variance in growth rates
    const variance = growthRates.length > 0
      ? growthRates.reduce((sum, r) => sum + Math.pow(r - avgGrowth, 2), 0) / growthRates.length
      : 0;

    // Determine trend
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (avgGrowth > 0.02) trend = 'up';
    if (avgGrowth < -0.02) trend = 'down';

    return {
      monthOverMonthGrowth: avgGrowth,
      compoundMonthlyGrowthRate: cmgr,
      variance,
      trend,
    };
  }

  /**
   * Forecast a specific month
   */
  private forecastMonth(
    month: Date,
    historical: HistoricalData[],
    growth: GrowthMetrics
  ): ForecastResult {
    // Get most recent month's revenue as baseline
    const recentMonths = this.aggregateByMonth(historical);
    const sortedMonths = Array.from(recentMonths.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));

    if (sortedMonths.length === 0) {
      throw new Error('No recent monthly data available');
    }

    const [, baselineRevenue] = sortedMonths[0];
    const monthsAhead = this.monthsDifference(new Date(), month);

    // Apply compound growth
    const projectedGrowth = Math.pow(1 + growth.compoundMonthlyGrowthRate, monthsAhead);

    // Apply seasonal adjustment
    const seasonalMultiplier = SEASONAL_MULTIPLIERS[month.getMonth() + 1] || 1;

    // Calculate forecasted revenue
    const forecastedTotal = baselineRevenue.total * projectedGrowth * seasonalMultiplier;

    // Split by revenue type (based on historical ratios)
    const adRatio = baselineRevenue.ad / (baselineRevenue.total || 1);
    const affiliateRatio = baselineRevenue.affiliate / (baselineRevenue.total || 1);
    const membershipRatio = 1 - adRatio - affiliateRatio;

    // Calculate confidence based on variance
    const confidenceLevel = Math.max(0.3, Math.min(0.95, 1 - Math.sqrt(growth.variance)));

    // Build reasoning
    const reasoning = this.buildReasoning(month, growth, seasonalMultiplier, projectedGrowth);

    return {
      forecastMonth: month,
      forecastedAdRevenue: forecastedTotal * adRatio,
      forecastedAffiliateRevenue: forecastedTotal * affiliateRatio,
      forecastedMembershipRevenue: forecastedTotal * membershipRatio,
      forecastedTotalRevenue: forecastedTotal,
      confidenceLevel,
      growthRate: growth.compoundMonthlyGrowthRate * 100,
      reasoning,
    };
  }

  /**
   * Aggregate historical data by month
   */
  private aggregateByMonth(data: HistoricalData[]): Map<string, { ad: number; affiliate: number; total: number }> {
    const monthly = new Map<string, { ad: number; affiliate: number; total: number }>();

    for (const d of data) {
      const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthly.get(key) || { ad: 0, affiliate: 0, total: 0 };
      monthly.set(key, {
        ad: existing.ad + d.adRevenue,
        affiliate: existing.affiliate + d.affiliateRevenue,
        total: existing.total + d.totalRevenue,
      });
    }

    return monthly;
  }

  /**
   * Calculate months between two dates
   */
  private monthsDifference(from: Date, to: Date): number {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  /**
   * Build human-readable reasoning
   */
  private buildReasoning(
    month: Date,
    growth: GrowthMetrics,
    seasonalMultiplier: number,
    projectedGrowth: number
  ): string {
    const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });
    const parts: string[] = [];

    parts.push(`Forecast for ${monthName}:`);

    // Growth trend
    if (growth.trend === 'up') {
      parts.push(`Positive growth trend of ${(growth.compoundMonthlyGrowthRate * 100).toFixed(1)}% monthly.`);
    } else if (growth.trend === 'down') {
      parts.push(`Declining trend of ${(growth.compoundMonthlyGrowthRate * 100).toFixed(1)}% monthly.`);
    } else {
      parts.push(`Relatively flat growth pattern.`);
    }

    // Seasonal factor
    if (seasonalMultiplier > 1.1) {
      parts.push(`Strong seasonal boost expected (+${((seasonalMultiplier - 1) * 100).toFixed(0)}%).`);
    } else if (seasonalMultiplier < 0.95) {
      parts.push(`Seasonal dip expected (${((seasonalMultiplier - 1) * 100).toFixed(0)}%).`);
    }

    // Confidence note
    if (growth.variance > 0.1) {
      parts.push(`High historical variance reduces confidence.`);
    }

    return parts.join(' ');
  }

  /**
   * Store forecasts in database
   */
  async saveForecast(forecast: ForecastResult): Promise<void> {
    await prisma.revenueForecast.upsert({
      where: {
        forecastMonth: forecast.forecastMonth,
      },
      create: {
        forecastMonth: forecast.forecastMonth,
        forecastedAdRevenue: forecast.forecastedAdRevenue,
        forecastedAffiliateRevenue: forecast.forecastedAffiliateRevenue,
        forecastedMembershipRevenue: forecast.forecastedMembershipRevenue,
        forecastedTotalRevenue: forecast.forecastedTotalRevenue,
        confidenceLevel: forecast.confidenceLevel,
        monthOverMonthGrowth: forecast.growthRate,
        forecastNotes: forecast.reasoning,
        modelVersion: 'v1',
      },
      update: {
        forecastedAdRevenue: forecast.forecastedAdRevenue,
        forecastedAffiliateRevenue: forecast.forecastedAffiliateRevenue,
        forecastedMembershipRevenue: forecast.forecastedMembershipRevenue,
        forecastedTotalRevenue: forecast.forecastedTotalRevenue,
        confidenceLevel: forecast.confidenceLevel,
        monthOverMonthGrowth: forecast.growthRate,
        forecastNotes: forecast.reasoning,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update actuals for past months
   */
  async updateActuals(): Promise<void> {
    // Get forecasts that should have actuals now
    const pastForecasts = await prisma.revenueForecast.findMany({
      where: {
        forecastMonth: { lt: new Date() },
        actualTotalRevenue: null,
      },
    });

    for (const forecast of pastForecasts) {
      const monthStart = forecast.forecastMonth;
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      // Get actual revenue for that month
      const actuals = await prisma.monetizationMetric.aggregate({
        where: {
          metricDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          adRevenue: true,
          affiliateRevenue: true,
        },
      });

      const actualAd = Number(actuals._sum.adRevenue) || 0;
      const actualAffiliate = Number(actuals._sum.affiliateRevenue) || 0;
      const actualTotal = actualAd + actualAffiliate;

      await prisma.revenueForecast.update({
        where: { id: forecast.id },
        data: {
          actualAdRevenue: actualAd,
          actualAffiliateRevenue: actualAffiliate,
          actualTotalRevenue: actualTotal,
          yearOverYearGrowth: null, // Could calculate if we have prior year data
        },
      });
    }
  }

  /**
   * Get forecast accuracy report
   */
  async getForecastAccuracy(): Promise<{
    avgAccuracy: number;
    forecasts: Array<{
      month: Date;
      forecasted: number;
      actual: number;
      accuracy: number;
    }>;
  }> {
    const completedForecasts = await prisma.revenueForecast.findMany({
      where: {
        actualTotalRevenue: { not: null },
      },
      orderBy: { forecastMonth: 'desc' },
      take: 12,
    });

    const accuracyData = completedForecasts.map(f => {
      const forecasted = Number(f.forecastedTotalRevenue);
      const actual = Number(f.actualTotalRevenue);
      const error = Math.abs(forecasted - actual) / actual;
      const accuracy = Math.max(0, 1 - error);

      return {
        month: f.forecastMonth,
        forecasted,
        actual,
        accuracy,
      };
    });

    const avgAccuracy = accuracyData.length > 0
      ? accuracyData.reduce((sum, a) => sum + a.accuracy, 0) / accuracyData.length
      : 0;

    return { avgAccuracy, forecasts: accuracyData };
  }
}
```

---

## Script: `scripts/generate-forecast.ts`

```typescript
import { RevenueForecaster } from '../lib/services/revenueForecaster';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Generating revenue forecasts...');

  const startTime = Date.now();
  const forecaster = new RevenueForecaster();

  const agentRun = await prisma.agentRun.create({
    data: {
      runType: 'forecast',
      status: 'running',
    },
  });

  try {
    // Update actuals for past forecasts first
    await forecaster.updateActuals();

    // Generate 3-month forecast
    const forecasts = await forecaster.generateForecast(3);

    // Save to database
    for (const forecast of forecasts) {
      await forecaster.saveForecast(forecast);
    }

    // Get accuracy report
    const accuracy = await forecaster.getForecastAccuracy();

    const durationMs = Date.now() - startTime;

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        itemsProcessed: forecasts.length,
        logSummary: `Generated ${forecasts.length} month forecasts. Model accuracy: ${(accuracy.avgAccuracy * 100).toFixed(1)}%`,
      },
    });

    // Print summary
    console.log('\n=== Revenue Forecast Summary ===\n');
    for (const f of forecasts) {
      console.log(`${f.forecastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}:`);
      console.log(`  Total: $${f.forecastedTotalRevenue.toFixed(2)}`);
      console.log(`  Ad Revenue: $${f.forecastedAdRevenue.toFixed(2)}`);
      console.log(`  Affiliate: $${f.forecastedAffiliateRevenue.toFixed(2)}`);
      console.log(`  Confidence: ${(f.confidenceLevel * 100).toFixed(0)}%`);
      console.log(`  Growth Rate: ${f.growthRate.toFixed(1)}% monthly`);
      console.log('');
    }

    console.log(`Forecast accuracy: ${(accuracy.avgAccuracy * 100).toFixed(1)}%`);
    console.log(`Completed in ${durationMs}ms`);
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorDetails: { message: String(error) },
      },
    });

    console.error('Forecast generation failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Package.json Script

```json
{
  "scripts": {
    "agent:forecast": "npx tsx scripts/generate-forecast.ts"
  }
}
```

---

## Validation Criteria

- [ ] Calculates compound monthly growth rate
- [ ] Applies seasonal multipliers
- [ ] Generates multi-month forecasts
- [ ] Updates actuals for past forecasts
- [ ] Tracks forecast accuracy
- [ ] `npm run agent:forecast` works
