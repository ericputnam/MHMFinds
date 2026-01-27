/**
 * POST /api/affiliates/research - Trigger affiliate research cycle
 * GET /api/affiliates/research - Get research run status/history
 *
 * PRD: Affiliate Research Agent System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { affiliateResearchService } from '@/lib/services/affiliateResearchService';

export async function POST(request: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { limit = 10, themes } = body;

    // Validate input
    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 50.' },
        { status: 400 }
      );
    }

    if (themes && !Array.isArray(themes)) {
      return NextResponse.json(
        { error: 'Invalid themes. Must be an array of strings.' },
        { status: 400 }
      );
    }

    const result = await affiliateResearchService.runResearchCycle(limit, themes);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      productsFound: result.productsFound,
      productsValidated: result.productsValidated,
      offersCreated: result.offersCreated,
      themesAnalyzed: result.themesAnalyzed,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Research cycle error:', error);
    return NextResponse.json(
      { error: 'Research cycle failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  try {
    if (runId) {
      // Get specific run with offers
      const run = await prisma.affiliateResearchRun.findUnique({
        where: { id: runId },
        include: {
          discoveredOffers: {
            select: {
              id: true,
              name: true,
              category: true,
              salePrice: true,
              finalScore: true,
              personaValidated: true,
              personaScore: true,
            },
          },
        },
      });

      if (!run) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }

      return NextResponse.json(run);
    }

    // Get recent runs
    const runs = await prisma.affiliateResearchRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        runType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        themesAnalyzed: true,
        productsFound: true,
        productsValidated: true,
        offersDiscovered: true,
        errorsEncountered: true,
        logSummary: true,
      },
    });

    return NextResponse.json({
      runs,
      total: runs.length,
    });
  } catch (error) {
    console.error('Error fetching research runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research runs', details: String(error) },
      { status: 500 }
    );
  }
}
