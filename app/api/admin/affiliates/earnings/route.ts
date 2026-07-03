import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/adminAuth';
import { getNetworkConfigStatus } from '@/lib/services/affiliateEarnings/earningsSync';

export const dynamic = 'force-dynamic';

// GET /api/admin/affiliates/earnings?days=30
// Revenue summary for the admin dashboard: commission totals, per-network and
// per-placement (sourceType) breakdowns with EPC, top-earning offers, and
// recent sync-run health.
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const daysParam = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const windowDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const [earnings, clicksBySource, recentSyncRuns] = await Promise.all([
      prisma.affiliateEarning.findMany({
        where: { eventDate: { gte: since } },
        select: {
          network: true,
          status: true,
          commissionAmount: true,
          saleAmount: true,
          offerId: true,
          clickId: true,
          click: { select: { sourceType: true } },
        },
      }),
      prisma.affiliateClick.groupBy({
        by: ['sourceType'],
        where: { clickedAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.affiliateSyncRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    // ---- Summary totals ----
    let pendingCommission = 0;
    let approvedCommission = 0; // approved + paid
    let reversedCommission = 0;
    let totalSaleAmount = 0;
    let attributedCommission = 0;
    const byNetwork: Record<string, { commission: number; conversions: number }> = {};
    const bySourceCommission: Record<string, { commission: number; conversions: number }> = {};

    for (const e of earnings) {
      const commission = Number(e.commissionAmount);
      if (e.status === 'reversed') {
        reversedCommission += commission;
        continue;
      }
      if (e.status === 'pending') pendingCommission += commission;
      else approvedCommission += commission;
      totalSaleAmount += Number(e.saleAmount);

      byNetwork[e.network] = byNetwork[e.network] || { commission: 0, conversions: 0 };
      byNetwork[e.network].commission += commission;
      byNetwork[e.network].conversions += 1;

      if (e.clickId && e.click) {
        attributedCommission += commission;
        const source = e.click.sourceType;
        bySourceCommission[source] = bySourceCommission[source] || { commission: 0, conversions: 0 };
        bySourceCommission[source].commission += commission;
        bySourceCommission[source].conversions += 1;
      }
    }

    const totalCommission = pendingCommission + approvedCommission;
    const conversionCount = earnings.filter((e) => e.status !== 'reversed').length;
    const totalClicks = clicksBySource.reduce((sum, row) => sum + row._count.id, 0);

    // ---- EPC per placement sourceType ----
    const sourceTypes = new Set([
      ...clicksBySource.map((row) => row.sourceType),
      ...Object.keys(bySourceCommission),
    ]);
    const bySourceType = Array.from(sourceTypes)
      .map((sourceType) => {
        const clicks =
          clicksBySource.find((row) => row.sourceType === sourceType)?._count.id ?? 0;
        const commission = bySourceCommission[sourceType]?.commission ?? 0;
        const conversions = bySourceCommission[sourceType]?.conversions ?? 0;
        return {
          sourceType,
          clicks,
          attributedCommission: commission,
          conversions,
          epc: clicks > 0 ? commission / clicks : 0,
        };
      })
      .sort((a, b) => b.attributedCommission - a.attributedCommission);

    // ---- Top-earning offers ----
    const offerEarnings = await prisma.affiliateEarning.groupBy({
      by: ['offerId'],
      where: { eventDate: { gte: since }, offerId: { not: null }, status: { not: 'reversed' } },
      _sum: { commissionAmount: true },
      _count: { id: true },
    });
    const offerIds = offerEarnings.map((row) => row.offerId as string);
    const [offers, offerClicks] = await Promise.all([
      prisma.affiliateOffer.findMany({
        where: { id: { in: offerIds } },
        select: { id: true, name: true, partner: true, network: true, affiliateUrl: true },
      }),
      prisma.affiliateClick.groupBy({
        by: ['offerId'],
        where: { offerId: { in: offerIds }, clickedAt: { gte: since } },
        _count: { id: true },
      }),
    ]);
    const topOffers = offerEarnings
      .map((row) => {
        const offer = offers.find((o) => o.id === row.offerId);
        const clicks = offerClicks.find((c) => c.offerId === row.offerId)?._count.id ?? 0;
        const commission = Number(row._sum.commissionAmount ?? 0);
        return {
          offerId: row.offerId,
          name: offer?.name ?? '(deleted offer)',
          partner: offer?.partner ?? null,
          network: offer?.network ?? null,
          conversions: row._count.id,
          commission,
          clicks,
          epc: clicks > 0 ? commission / clicks : 0,
        };
      })
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 20);

    return NextResponse.json({
      configStatus: getNetworkConfigStatus(),
      summary: {
        windowDays,
        totalCommission,
        pendingCommission,
        approvedCommission,
        reversedCommission,
        totalSaleAmount,
        conversionCount,
        attributedCommission,
        unattributedCommission: totalCommission - attributedCommission,
        totalClicks,
        overallEpc: totalClicks > 0 ? totalCommission / totalClicks : 0,
      },
      byNetwork: Object.entries(byNetwork).map(([network, stats]) => ({ network, ...stats })),
      bySourceType,
      topOffers,
      recentSyncRuns,
    });
  } catch (error) {
    console.error('Error building affiliate earnings summary:', error);
    return NextResponse.json({ error: 'Failed to load earnings summary' }, { status: 500 });
  }
}
