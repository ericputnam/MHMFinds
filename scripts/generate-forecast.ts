#!/usr/bin/env npx tsx
/**
 * Revenue Forecasting Script
 *
 * Generates revenue forecasts for the next 3 months.
 *
 * Usage:
 *   npm run agent:forecast
 *   npm run agent:forecast -- --months 6
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { revenueForecaster } from '@/lib/services/revenueForecaster';
import { prisma } from '@/lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  let months = 3;

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
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
