/**
 * Revenue Forecasts API
 *
 * GET - List revenue forecasts with actuals
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revenueForecaster } from '@/lib/services/revenueForecaster';

/**
 * GET /api/monetization/forecasts
 *
 * Returns revenue forecasts with actuals where available.
 * Requires admin authentication.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forecasts = await prisma.revenueForecast.findMany({
    orderBy: { forecastMonth: 'desc' },
    take: 12,
  });

  const accuracy = await revenueForecaster.getForecastAccuracy();

  return NextResponse.json({
    forecasts: forecasts.map(f => ({
      id: f.id,
      forecastMonth: f.forecastMonth.toISOString(),
      forecastedAdRevenue: Number(f.forecastedAdRevenue),
      forecastedAffiliateRevenue: Number(f.forecastedAffiliateRevenue),
      forecastedTotalRevenue: Number(f.forecastedTotalRevenue),
      actualAdRevenue: f.actualAdRevenue ? Number(f.actualAdRevenue) : null,
      actualAffiliateRevenue: f.actualAffiliateRevenue ? Number(f.actualAffiliateRevenue) : null,
      actualTotalRevenue: f.actualTotalRevenue ? Number(f.actualTotalRevenue) : null,
      confidenceLevel: Number(f.confidenceLevel),
      monthOverMonthGrowth: f.monthOverMonthGrowth ? Number(f.monthOverMonthGrowth) : 0,
      growthRate: f.growthRate ? Number(f.growthRate) : 0,
      createdAt: f.createdAt.toISOString(),
    })),
    accuracy,
  });
}
