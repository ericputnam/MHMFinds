#!/usr/bin/env npx tsx
/**
 * Revenue Forecasting Script
 *
 * Generates revenue forecasts for the next 3 months.
 *
 * Usage:
 *   npm run agent:forecast
 *   npm run agent:forecast -- --months 6
 *   npm run agent:forecast -- --trends      (show trends analysis)
 *   npm run agent:forecast -- --impact      (show pending action impact)
 *   npm run agent:forecast -- --summary     (show comprehensive summary)
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { revenueForecaster } from '@/lib/services/revenueForecaster';
import { prisma } from '@/lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  let months = 3;
  const showTrends = args.includes('--trends');
  const showImpact = args.includes('--impact');
  const showSummary = args.includes('--summary');

  // Parse --months argument
  const monthsIndex = args.indexOf('--months');
  if (monthsIndex !== -1 && args[monthsIndex + 1]) {
    months = parseInt(args[monthsIndex + 1]) || 3;
  }

  console.log('\n📈 Revenue Forecasting Engine');
  console.log('═══════════════════════════════════════');
  console.log(`  Generating ${months}-month forecast...\n`);

  try {
    // First, update actuals for past forecasts
    const actualsUpdated = await revenueForecaster.updateActuals();
    if (actualsUpdated > 0) {
      console.log(`  📊 Updated ${actualsUpdated} past forecasts with actuals`);
    }

    const startTime = Date.now();
    const count = await revenueForecaster.generateForecast(months);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n───────────────────────────────────────');
    console.log(`  ✅ Generated ${count} monthly forecasts`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════\n');

    if (count > 0) {
      // Show forecasts
      console.log('📋 Revenue Forecasts:');
      console.log('──────────────────────────────────────────────────────────────');

      const forecasts = await prisma.revenueForecast.findMany({
        orderBy: { forecastMonth: 'asc' },
        take: months + 3, // Include some past for context
      });

      for (const f of forecasts) {
        const monthStr = f.forecastMonth.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });

        const forecasted = Number(f.forecastedTotalRevenue);
        const confidence = (Number(f.confidenceLevel) * 100).toFixed(0);
        const growth = Number(f.monthOverMonthGrowth);

        let actualStr = '';
        if (f.actualTotalRevenue) {
          const actual = Number(f.actualTotalRevenue);
          const diff = ((actual - forecasted) / forecasted) * 100;
          const diffSign = diff >= 0 ? '+' : '';
          actualStr = ` | Actual: $${actual.toFixed(2)} (${diffSign}${diff.toFixed(1)}%)`;
        }

        const growthStr =
          growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;

        console.log(
          `  ${monthStr}: $${forecasted.toFixed(2)} (${confidence}% conf, ${growthStr} MoM)${actualStr}`
        );
      }

      // Show accuracy if we have actuals
      const accuracy = await revenueForecaster.getForecastAccuracy();
      if (accuracy.withActuals > 0) {
        console.log('\n  📊 Model Accuracy:');
        console.log(`     Forecasts with actuals: ${accuracy.withActuals}`);
        console.log(`     Average error: ${accuracy.averageError.toFixed(1)}%`);
        console.log(`     Accuracy: ${accuracy.accuracyPercent.toFixed(1)}%`);
      }

      console.log('──────────────────────────────────────────────────────────────\n');
    }

    // Show trends analysis if requested
    if (showTrends) {
      console.log('📈 Revenue Trends Analysis:');
      console.log('──────────────────────────────────────────────────────────────');

      const trends = await revenueForecaster.getRevenueTrends();

      console.log(`\n  Overall Trend: ${trends.overall.direction.toUpperCase()}`);
      console.log(`  Growth Rate: ${trends.overall.growthRate.toFixed(1)}% monthly`);
      console.log(`  Confidence: ${(trends.overall.confidence * 100).toFixed(0)}%`);

      console.log(`\n  Ad Revenue:`);
      console.log(`    Trend: ${trends.adRevenue.direction}`);
      console.log(`    Growth: ${trends.adRevenue.growthRate.toFixed(1)}%`);
      console.log(`    Share: ${trends.adRevenue.share.toFixed(0)}%`);

      console.log(`\n  Affiliate Revenue:`);
      console.log(`    Trend: ${trends.affiliateRevenue.direction}`);
      console.log(`    Growth: ${trends.affiliateRevenue.growthRate.toFixed(1)}%`);
      console.log(`    Share: ${trends.affiliateRevenue.share.toFixed(0)}%`);

      console.log(`\n  Seasonality:`);
      console.log(`    Current month multiplier: ${trends.seasonality.currentMultiplier.toFixed(2)}x`);
      console.log(`    Next month multiplier: ${trends.seasonality.nextMonthMultiplier.toFixed(2)}x`);
      console.log(`    Peak month: ${trends.seasonality.peakMonth}`);
      console.log(`    Trough month: ${trends.seasonality.troughMonth}`);

      if (trends.insights.length > 0) {
        console.log(`\n  Insights:`);
        for (const insight of trends.insights) {
          console.log(`    - ${insight}`);
        }
      }

      console.log('──────────────────────────────────────────────────────────────\n');
    }

    // Show action impact if requested
    if (showImpact) {
      console.log('⚡ Pending Action Impact:');
      console.log('──────────────────────────────────────────────────────────────');

      const impact = await revenueForecaster.projectActionImpact();

      console.log(`\n  Pending Actions: ${impact.pendingActions}`);
      console.log(`  Total Estimated Impact: $${impact.totalEstimatedImpact.toFixed(2)}/month`);

      if (Object.keys(impact.impactByType).length > 0) {
        console.log(`\n  Impact by Opportunity Type:`);
        for (const [type, data] of Object.entries(impact.impactByType)) {
          console.log(`    ${type}: ${data.count} actions, $${data.impact.toFixed(2)}/month`);
        }
      }

      if (impact.adjustedForecast.length > 0) {
        console.log(`\n  Adjusted Forecast (with actions):`);
        for (const f of impact.adjustedForecast) {
          const monthStr = f.month.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
          });
          console.log(`    ${monthStr}: $${f.baseRevenue.toFixed(2)} -> $${f.withActions.toFixed(2)} (+$${f.uplift.toFixed(2)}, +${f.upliftPercent.toFixed(1)}%)`);
        }
      }

      console.log('──────────────────────────────────────────────────────────────\n');
    }

    // Show comprehensive summary if requested
    if (showSummary) {
      console.log('📊 Forecast Summary:');
      console.log('──────────────────────────────────────────────────────────────');

      const summary = await revenueForecaster.getForecastSummary();

      console.log(`\n  Current Month:`);
      console.log(`    Forecasted: $${summary.currentMonth.forecasted.toFixed(2)}`);
      if (summary.currentMonth.actual !== null) {
        console.log(`    Actual: $${summary.currentMonth.actual.toFixed(2)}`);
        console.log(`    Variance: $${summary.currentMonth.variance?.toFixed(2) ?? 'N/A'}`);
      }

      console.log(`\n  Next 3 Months:`);
      console.log(`    Total Forecasted: $${summary.nextThreeMonths.total.toFixed(2)}`);
      console.log(`    Avg Confidence: ${(summary.nextThreeMonths.avgConfidence * 100).toFixed(0)}%`);
      console.log(`    Avg Growth: ${summary.nextThreeMonths.avgGrowth.toFixed(1)}% MoM`);

      console.log(`\n  Trends:`);
      console.log(`    Direction: ${summary.trends.direction.toUpperCase()}`);
      console.log(`    Insight: ${summary.trends.insight}`);

      console.log(`\n  Model Accuracy:`);
      console.log(`    Accuracy: ${summary.accuracy.percent.toFixed(1)}%`);
      console.log(`    Sample Size: ${summary.accuracy.sampleSize} forecasts`);

      console.log('──────────────────────────────────────────────────────────────\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
