import { prisma } from '@/lib/prisma';
import type { NetworkClient, NormalizedEarning } from './types';
import { impactClient } from './impactClient';
import { rakutenClient } from './rakutenClient';
import { cjClient } from './cjClient';

// How far back each sync looks. 30 days keeps us under CJ's 31-day window cap
// and re-reads recent history every run so status transitions (pending →
// approved → paid, or reversals) get picked up. Upserts make this idempotent.
const SYNC_WINDOW_DAYS = 30;

export const NETWORK_CLIENTS: NetworkClient[] = [impactClient, rakutenClient, cjClient];

export interface SyncResult {
  syncRunId: string;
  status: 'completed' | 'partial' | 'failed';
  networksSynced: string[];
  networksSkipped: string[]; // not configured
  earningsCreated: number;
  earningsUpdated: number;
  totalCommission: number;
  errors: Record<string, string>;
}

export function getNetworkConfigStatus() {
  return NETWORK_CLIENTS.map((client) => ({
    network: client.network,
    configured: client.isConfigured(),
    requiredEnvVars: client.requiredEnvVars,
  })).concat([
    {
      network: 'amazon' as const,
      configured: false, // no earnings API — CSV import only
      requiredEnvVars: [],
    },
  ]);
}

/**
 * Upsert one normalized earning: resolve the click via subId, the offer via
 * the click, and write the row keyed on (network, networkTransactionId).
 * Returns whether the row was created and which offer it attributed to.
 */
async function upsertEarning(
  earning: NormalizedEarning
): Promise<{ created: boolean; offerId: string | null }> {
  // Our subid is the AffiliateClick.id we injected at redirect time.
  // Verify it actually resolves — networks echo whatever was in the URL.
  let clickId: string | null = null;
  let offerId: string | null = null;
  if (earning.subId) {
    const click = await prisma.affiliateClick.findUnique({
      where: { id: earning.subId },
      select: { id: true, offerId: true },
    });
    if (click) {
      clickId = click.id;
      offerId = click.offerId;
    }
  }

  const data = {
    subId: earning.subId,
    clickId,
    offerId,
    saleAmount: earning.saleAmount,
    commissionAmount: earning.commissionAmount,
    currency: earning.currency,
    status: earning.status,
    advertiserName: earning.advertiserName,
    campaignId: earning.campaignId,
    eventDate: earning.eventDate,
    postingDate: earning.postingDate,
    rawData: earning.rawData as any,
  };

  const existing = await prisma.affiliateEarning.findUnique({
    where: {
      network_networkTransactionId: {
        network: earning.network,
        networkTransactionId: earning.networkTransactionId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.affiliateEarning.update({ where: { id: existing.id }, data });
    return { created: false, offerId };
  }

  await prisma.affiliateEarning.create({
    data: { network: earning.network, networkTransactionId: earning.networkTransactionId, ...data },
  });
  return { created: true, offerId };
}

/**
 * Recompute the denormalized conversions/revenue rollups on offers that were
 * touched this sync, so the existing admin table (and any code reading
 * AffiliateOffer.revenue) reflects real network data.
 */
async function recomputeOfferRollups(offerIds: string[]) {
  const uniqueIds = Array.from(new Set(offerIds.filter(Boolean)));
  for (const offerId of uniqueIds) {
    const agg = await prisma.affiliateEarning.aggregate({
      where: { offerId, status: { not: 'reversed' } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    });
    await prisma.affiliateOffer.update({
      where: { id: offerId },
      data: {
        conversions: agg._count.id,
        revenue: agg._sum.commissionAmount ?? 0,
      },
    });
  }
}

/**
 * Pull commission data from every configured network and upsert it.
 * Safe to run repeatedly (cron every 6h + manual triggers).
 */
export async function syncAllNetworks(trigger: 'cron' | 'manual'): Promise<SyncResult> {
  const syncRun = await prisma.affiliateSyncRun.create({
    data: { trigger, status: 'running' },
  });

  const until = new Date();
  const since = new Date(until.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const networksSynced: string[] = [];
  const networksSkipped: string[] = [];
  const errors: Record<string, string> = {};
  let earningsCreated = 0;
  let earningsUpdated = 0;
  let totalCommission = 0;
  const touchedOfferIds: string[] = [];

  for (const client of NETWORK_CLIENTS) {
    if (!client.isConfigured()) {
      networksSkipped.push(client.network);
      continue;
    }
    try {
      const earnings = await client.fetchEarnings(since, until);
      for (const earning of earnings) {
        const { created, offerId } = await upsertEarning(earning);
        if (created) earningsCreated++;
        else earningsUpdated++;
        if (earning.status !== 'reversed') totalCommission += earning.commissionAmount;
        if (offerId) touchedOfferIds.push(offerId);
      }
      networksSynced.push(client.network);
    } catch (error) {
      errors[client.network] = error instanceof Error ? error.message : String(error);
      console.error(`[commission-sync] ${client.network} failed:`, error);
    }
  }

  await recomputeOfferRollups(touchedOfferIds);

  const failedCount = Object.keys(errors).length;
  const status: SyncResult['status'] =
    failedCount === 0 ? 'completed' : networksSynced.length > 0 ? 'partial' : 'failed';

  await prisma.affiliateSyncRun.update({
    where: { id: syncRun.id },
    data: {
      status,
      networksSynced,
      earningsCreated,
      earningsUpdated,
      totalCommission,
      errorDetails: failedCount > 0 ? errors : undefined,
      completedAt: new Date(),
    },
  });

  return {
    syncRunId: syncRun.id,
    status,
    networksSynced,
    networksSkipped,
    earningsCreated,
    earningsUpdated,
    totalCommission,
    errors,
  };
}
