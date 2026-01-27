/**
 * GET /api/affiliates/performance - Get affiliate performance metrics
 *
 * PRD: Affiliate Research Agent System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');

  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: 'Invalid days parameter. Must be between 1 and 365.' },
      { status: 400 }
    );
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Get all offers created in the period
    const offers = await prisma.affiliateOffer.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        name: true,
        category: true,
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
        personaValidated: true,
        personaScore: true,
        finalScore: true,
        matchingThemes: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Calculate overall metrics
    const totalImpressions = offers.reduce((sum, o) => sum + o.impressions, 0);
    const totalClicks = offers.reduce((sum, o) => sum + o.clicks, 0);
    const totalConversions = offers.reduce((sum, o) => sum + o.conversions, 0);
    const totalRevenue = offers.reduce((sum, o) => sum + Number(o.revenue), 0);

    // Persona-validated vs non-validated comparison
    const validatedOffers = offers.filter((o) => o.personaValidated);
    const nonValidatedOffers = offers.filter((o) => !o.personaValidated);

    const validatedImpressions = validatedOffers.reduce((sum, o) => sum + o.impressions, 0);
    const validatedClicks = validatedOffers.reduce((sum, o) => sum + o.clicks, 0);
    const validatedConversions = validatedOffers.reduce((sum, o) => sum + o.conversions, 0);
    const validatedRevenue = validatedOffers.reduce((sum, o) => sum + Number(o.revenue), 0);

    const nonValidatedImpressions = nonValidatedOffers.reduce((sum, o) => sum + o.impressions, 0);
    const nonValidatedClicks = nonValidatedOffers.reduce((sum, o) => sum + o.clicks, 0);
    const nonValidatedConversions = nonValidatedOffers.reduce((sum, o) => sum + o.conversions, 0);

    const validatedCTR =
      validatedImpressions > 0 ? validatedClicks / validatedImpressions : 0;
    const nonValidatedCTR =
      nonValidatedImpressions > 0 ? nonValidatedClicks / nonValidatedImpressions : 0;

    const validatedConvRate =
      validatedClicks > 0 ? validatedConversions / validatedClicks : 0;
    const nonValidatedConvRate =
      nonValidatedClicks > 0 ? nonValidatedConversions / nonValidatedClicks : 0;

    // Top performers
    const topPerformers = offers
      .filter((o) => o.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        name: o.name,
        category: o.category,
        impressions: o.impressions,
        clicks: o.clicks,
        conversions: o.conversions,
        revenue: Number(o.revenue),
        personaValidated: o.personaValidated,
        personaScore: o.personaScore,
        ctr: o.impressions > 0 ? o.clicks / o.impressions : 0,
        conversionRate: o.clicks > 0 ? o.conversions / o.clicks : 0,
      }));

    // Performance by category
    const categoryStats: Record<
      string,
      { impressions: number; clicks: number; conversions: number; revenue: number }
    > = {};

    for (const offer of offers) {
      if (!categoryStats[offer.category]) {
        categoryStats[offer.category] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
      }
      categoryStats[offer.category].impressions += offer.impressions;
      categoryStats[offer.category].clicks += offer.clicks;
      categoryStats[offer.category].conversions += offer.conversions;
      categoryStats[offer.category].revenue += Number(offer.revenue);
    }

    const byCategory = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        ...stats,
        ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
        conversionRate: stats.clicks > 0 ? stats.conversions / stats.clicks : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    // Performance by theme
    const themeStats: Record<
      string,
      { count: number; conversions: number; revenue: number }
    > = {};

    for (const offer of offers) {
      for (const theme of offer.matchingThemes) {
        if (!themeStats[theme]) {
          themeStats[theme] = { count: 0, conversions: 0, revenue: 0 };
        }
        themeStats[theme].count++;
        themeStats[theme].conversions += offer.conversions;
        themeStats[theme].revenue += Number(offer.revenue);
      }
    }

    const byTheme = Object.entries(themeStats)
      .map(([theme, stats]) => ({
        theme,
        offerCount: stats.count,
        conversions: stats.conversions,
        revenue: stats.revenue,
        avgConversions: stats.count > 0 ? stats.conversions / stats.count : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    // Persona score correlation
    const personaCorrelation = validatedOffers
      .filter((o) => o.personaScore !== null && o.clicks > 0)
      .map((o) => ({
        personaScore: o.personaScore,
        ctr: o.impressions > 0 ? o.clicks / o.impressions : 0,
        conversionRate: o.clicks > 0 ? o.conversions / o.clicks : 0,
      }));

    // Group by persona score
    const byPersonaScore: Record<
      number,
      { offers: number; avgCtr: number; avgConvRate: number }
    > = {};

    for (const item of personaCorrelation) {
      const score = item.personaScore!;
      if (!byPersonaScore[score]) {
        byPersonaScore[score] = { offers: 0, avgCtr: 0, avgConvRate: 0 };
      }
      byPersonaScore[score].offers++;
      byPersonaScore[score].avgCtr += item.ctr;
      byPersonaScore[score].avgConvRate += item.conversionRate;
    }

    // Calculate averages
    for (const score of Object.keys(byPersonaScore)) {
      const s = Number(score);
      byPersonaScore[s].avgCtr /= byPersonaScore[s].offers;
      byPersonaScore[s].avgConvRate /= byPersonaScore[s].offers;
    }

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      overall: {
        totalOffers: offers.length,
        activeOffers: offers.filter((o) => o.isActive).length,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalRevenue,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
      },
      personaValidation: {
        validatedCount: validatedOffers.length,
        nonValidatedCount: nonValidatedOffers.length,
        validated: {
          impressions: validatedImpressions,
          clicks: validatedClicks,
          conversions: validatedConversions,
          revenue: validatedRevenue,
          ctr: validatedCTR,
          conversionRate: validatedConvRate,
        },
        nonValidated: {
          impressions: nonValidatedImpressions,
          clicks: nonValidatedClicks,
          conversions: nonValidatedConversions,
          ctr: nonValidatedCTR,
          conversionRate: nonValidatedConvRate,
        },
        ctrImprovement: validatedCTR - nonValidatedCTR,
        convRateImprovement: validatedConvRate - nonValidatedConvRate,
      },
      topPerformers,
      byCategory,
      byTheme,
      byPersonaScore: Object.entries(byPersonaScore)
        .map(([score, stats]) => ({
          personaScore: Number(score),
          ...stats,
        }))
        .sort((a, b) => a.personaScore - b.personaScore),
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics', details: String(error) },
      { status: 500 }
    );
  }
}
