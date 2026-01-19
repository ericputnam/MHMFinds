import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revenueForecaster } from '@/lib/services/revenueForecaster';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { months = 3 } = await request.json();

  try {
    // Update actuals for past forecasts first
    await revenueForecaster.updateActuals();

    // Generate new forecasts
    const count = await revenueForecaster.generateForecast(months);

    return NextResponse.json({
      success: true,
      forecastsGenerated: count,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
