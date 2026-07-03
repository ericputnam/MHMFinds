#!/usr/bin/env -S npx tsx
/**
 * Affiliate daily pulse — short, action-oriented snapshot (distinct from the
 * weekly deep-dive in affiliate-weekly-report.ts).
 *
 * Checks, in order:
 *   1. Impact.com campaign contract health (flags Expired/Inactive contracts
 *      for partners we have live offers against).
 *   2. Offer active/inactive counts by partner + zero-impression flags.
 *   3. Yesterday's clicks vs the trailing-7-day daily average, by partner and
 *      placement (sourceType).
 *   4. Last-48h commission events by network/status + latest sync run health.
 *
 * Emits a single 🟢/🟡/🔴 PULSE verdict at the top, writes a dated Markdown
 * report to reports/affiliates/daily/, and prints it to stdout (so a launchd
 * job can capture it).
 *
 * Each section is individually try/catch'd — P2021 (table doesn't exist,
 * i.e. an unapplied migration) is tolerated the same way the weekly report
 * handles it, so one missing table doesn't take down the whole pulse.
 *
 * Run manually:   npx tsx scripts/agents/affiliate-daily-pulse.ts
 * Scheduled via:  ~/Library/LaunchAgents/com.mhmfinds.affiliate-daily-pulse.plist
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// CRITICAL: Load env from .env.local (the file with the real Prisma Accelerate + direct
// DB URLs), NOT the bare `.env` (localhost placeholders). ESM import hoisting means
// @prisma/client's own dotenv already loaded `.env` before this line runs, so
// `override: true` is required or the localhost DATABASE_URL silently wins.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

// Scripts can't use Prisma Accelerate (prisma+postgres://) URLs — swap in the direct
// connection so this reaches the real production database instead of failing to connect.
if (process.env.DIRECT_DATABASE_URL) {
  const originalUrl = process.env.DATABASE_URL || '';
  if (originalUrl.startsWith('prisma://') || originalUrl.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
  }
}

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const PROJECT_DIR = '/Users/eputnam/java_projects/MHMFinds';
const IMPACT_API_BASE = 'https://api.impact.com';

// Partner (AffiliateOffer.partner, lowercase) -> Impact CampaignId. Used to flag
// contract-status changes only for partners we actually have offers against.
// Source: scripts/impact-sync-catalog.ts CATALOG_TARGETS/DEEPLINK_TARGETS.
const PARTNER_CAMPAIGN_IDS: Record<string, string> = {
  redbubble: '11754',
  capcut: '22474',
  'logitech-g': '11355',
  logitech: '8585',
  gtracing: '18111',
  canva: '10068',
};

function isoDaysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');

/** True when a Prisma error is "table does not exist" (P2021) — i.e. an unapplied migration. */
function isTableMissing(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021';
}

interface PulseFlag {
  level: 'red' | 'yellow';
  reason: string;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const yesterdayStart = isoDaysAgo(1);
  const todayStart = isoDaysAgo(0);
  const trailing7Start = isoDaysAgo(7);
  const last48hStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const flags: PulseFlag[] = [];
  let body = '';

  // --- 1. Impact campaign health ------------------------------------------------
  body += `## Impact Campaign Health\n\n`;
  try {
    const sid = process.env.IMPACT_ACCOUNT_SID;
    const token = process.env.IMPACT_AUTH_TOKEN;
    if (!sid || !token) {
      body += `> ⚪ Impact API unavailable — IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not configured.\n\n`;
    } else {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const res = await fetch(`${IMPACT_API_BASE}/Mediapartners/${sid}/Campaigns?PageSize=100`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        body += `> ⚪ Impact API unavailable (HTTP ${res.status}).\n\n`;
      } else {
        const data: any = await res.json();
        const campaigns: any[] = data?.Campaigns ?? [];
        if (!campaigns.length) {
          body += `_No campaigns returned._\n\n`;
        } else {
          // Which of our mapped partners currently have active offers?
          const partnersWithActiveOffers = new Set(
            (
              await prisma.affiliateOffer.groupBy({
                by: ['partner'],
                where: { isActive: true },
              })
            ).map((r) => r.partner.toLowerCase())
          );

          const campaignById = new Map(campaigns.map((c) => [String(c.CampaignId), c]));

          body += `| Partner | Campaign | ContractStatus |\n|---|---|---|\n`;
          for (const [partner, campaignId] of Object.entries(PARTNER_CAMPAIGN_IDS)) {
            const c = campaignById.get(campaignId);
            const status = c?.ContractStatus ?? 'unknown';
            const weHaveActiveOffers = partnersWithActiveOffers.has(partner);
            const isBad = status === 'Expired' || status === 'Inactive';
            const flagIcon = isBad && weHaveActiveOffers ? '🔴 ' : isBad ? '⚠️ ' : '';
            body += `| ${flagIcon}${partner} | ${c?.CampaignName ?? campaignId} (${campaignId}) | ${status} |\n`;
            if (isBad && weHaveActiveOffers) {
              flags.push({
                level: 'red',
                reason: `Impact campaign "${partner}" is ${status} but has active offers still serving`,
              });
            }
          }
          body += `\n`;
        }
      }
    }
  } catch (err) {
    body += `> ⚪ Impact API unavailable: ${(err as Error).message}\n\n`;
    console.error(`[affiliate-daily-pulse] Impact campaign health section: ${(err as Error).message}`);
  }

  // --- 2. Offers -------------------------------------------------------------
  body += `## Offers\n\n`;
  try {
    const [activeCount, inactiveCount, byPartner] = await Promise.all([
      prisma.affiliateOffer.count({ where: { isActive: true } }),
      prisma.affiliateOffer.count({ where: { isActive: false } }),
      prisma.affiliateOffer.groupBy({
        by: ['partner'],
        where: { isActive: true },
        _count: { _all: true },
        _sum: { impressions: true, clicks: true },
      }),
    ]);

    body += `- Active offers: **${num(activeCount)}**\n`;
    body += `- Inactive/placeholder offers: **${num(inactiveCount)}**\n\n`;

    if (byPartner.length) {
      body += `| Partner | Active Offers | Impressions (all-time) | Clicks (all-time) |\n|---|--:|--:|--:|\n`;
      for (const row of byPartner.sort((a, b) => (b._sum.clicks ?? 0) - (a._sum.clicks ?? 0))) {
        const impressions = row._sum.impressions ?? 0;
        const clicks = row._sum.clicks ?? 0;
        const zeroImpFlag = impressions === 0 ? ' 🔴' : '';
        body += `| ${row.partner}${zeroImpFlag} | ${num(row._count._all)} | ${num(impressions)} | ${num(clicks)} |\n`;
        if (impressions === 0) {
          flags.push({
            level: 'red',
            reason: `Partner "${row.partner}" has active offers but zero all-time impressions`,
          });
        }
      }
      body += `\n`;
    } else {
      body += `_No active offers found._\n\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    body += `> 🔴 **Offers section failed:** ${msg}\n\n`;
    console.error(`[affiliate-daily-pulse] offers section: ${msg}`);
  }

  // --- 3. Clicks: yesterday vs trailing-7d daily average --------------------
  body += `## Clicks — Yesterday vs Trailing 7d Avg\n\n`;
  let clicksYesterdayTotal = 0;
  try {
    const [yesterdayClicks, trailing7Clicks] = await Promise.all([
      prisma.affiliateClick.findMany({
        where: { clickedAt: { gte: yesterdayStart, lt: todayStart } },
        select: { sourceType: true, offer: { select: { partner: true } } },
      }),
      prisma.affiliateClick.findMany({
        where: { clickedAt: { gte: trailing7Start, lt: todayStart } },
        select: { sourceType: true, offer: { select: { partner: true } } },
      }),
    ]);

    clicksYesterdayTotal = yesterdayClicks.length;

    // By partner
    const partnerYesterday = new Map<string, number>();
    for (const c of yesterdayClicks) {
      const p = c.offer?.partner ?? 'unknown';
      partnerYesterday.set(p, (partnerYesterday.get(p) ?? 0) + 1);
    }
    const partnerTrailing = new Map<string, number>();
    for (const c of trailing7Clicks) {
      const p = c.offer?.partner ?? 'unknown';
      partnerTrailing.set(p, (partnerTrailing.get(p) ?? 0) + 1);
    }
    const partners = Array.from(new Set([...Array.from(partnerYesterday.keys()), ...Array.from(partnerTrailing.keys())]));

    if (partners.length) {
      body += `**By partner**\n\n`;
      body += `| Partner | Yesterday | Trailing 7d Daily Avg |\n|---|--:|--:|\n`;
      for (const p of partners.sort((a, b) => (partnerYesterday.get(b) ?? 0) - (partnerYesterday.get(a) ?? 0))) {
        const yest = partnerYesterday.get(p) ?? 0;
        const avg = (partnerTrailing.get(p) ?? 0) / 7;
        body += `| ${p} | ${num(yest)} | ${avg.toFixed(1)} |\n`;
      }
      body += `\n`;
    } else {
      body += `_No clicks recorded in the trailing 7 days._\n\n`;
    }

    // By sourceType
    const sourceYesterday = new Map<string, number>();
    for (const c of yesterdayClicks) {
      sourceYesterday.set(c.sourceType, (sourceYesterday.get(c.sourceType) ?? 0) + 1);
    }
    const sourceTrailing = new Map<string, number>();
    for (const c of trailing7Clicks) {
      sourceTrailing.set(c.sourceType, (sourceTrailing.get(c.sourceType) ?? 0) + 1);
    }
    const sourceTypes = Array.from(new Set([...Array.from(sourceYesterday.keys()), ...Array.from(sourceTrailing.keys())]));

    if (sourceTypes.length) {
      body += `**By placement (sourceType)**\n\n`;
      body += `| Source | Yesterday | Trailing 7d Daily Avg |\n|---|--:|--:|\n`;
      for (const s of sourceTypes.sort((a, b) => (sourceYesterday.get(b) ?? 0) - (sourceYesterday.get(a) ?? 0))) {
        const yest = sourceYesterday.get(s) ?? 0;
        const avg = (sourceTrailing.get(s) ?? 0) / 7;
        body += `| ${s} | ${num(yest)} | ${avg.toFixed(1)} |\n`;
      }
      body += `\n`;
    }

    body += `**Total clicks yesterday: ${num(clicksYesterdayTotal)}** (trailing 7d daily avg: ${(trailing7Clicks.length / 7).toFixed(1)})\n\n`;

    if (clicksYesterdayTotal === 0) {
      flags.push({ level: 'yellow', reason: 'Zero affiliate clicks recorded yesterday' });
    }
  } catch (err) {
    const msg = (err as Error).message;
    body += `> 🔴 **Clicks section failed:** ${msg}\n\n`;
    console.error(`[affiliate-daily-pulse] clicks section: ${msg}`);
  }

  // --- 4. Earnings (last 48h) + sync run health ------------------------------
  body += `## Earnings (Last 48h)\n\n`;
  try {
    const [byNetworkStatus] = await Promise.all([
      prisma.affiliateEarning.groupBy({
        by: ['network', 'status'],
        where: { eventDate: { gte: last48hStart, lte: now } },
        _count: { _all: true },
        _sum: { commissionAmount: true },
      }),
    ]);

    if (byNetworkStatus.length) {
      body += `| Network | Status | Count | Commission |\n|---|---|--:|--:|\n`;
      let totalCommission = 0;
      for (const row of byNetworkStatus.sort((a, b) => a.network.localeCompare(b.network))) {
        const commission = Number(row._sum.commissionAmount ?? 0);
        totalCommission += commission;
        body += `| ${row.network} | ${row.status} | ${num(row._count._all)} | ${money(commission)} |\n`;
      }
      body += `| **Total** | | | **${money(totalCommission)}** |\n\n`;
    } else {
      body += `_No commission events in the last 48h._\n\n`;
    }
  } catch (err) {
    if (isTableMissing(err)) {
      body += `> ⚪ Commission sync not yet migrated/configured — the \`AffiliateEarning\` table doesn't exist in this database yet.\n\n`;
    } else {
      const msg = (err as Error).message;
      body += `> 🔴 **Earnings section failed:** ${msg}\n\n`;
      console.error(`[affiliate-daily-pulse] earnings section: ${msg}`);
    }
  }

  body += `## Sync Run Health\n\n`;
  try {
    const latestRun = await prisma.affiliateSyncRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    if (latestRun) {
      const hoursSince = (now.getTime() - latestRun.startedAt.getTime()) / (1000 * 60 * 60);
      const staleRun = hoursSince > 12;
      const failedRun = latestRun.status === 'failed';
      const statusIcon =
        latestRun.status === 'completed' && !staleRun
          ? '🟢'
          : latestRun.status === 'partial'
            ? '🟡'
            : latestRun.status === 'running'
              ? '🔵'
              : '🔴';
      body += `- ${statusIcon} **Latest run**: ${latestRun.trigger} — ${latestRun.status} (started ${latestRun.startedAt.toISOString()}, ${hoursSince.toFixed(1)}h ago)\n`;
      body += `- Networks synced: ${latestRun.networksSynced.length ? latestRun.networksSynced.join(', ') : '—'}\n`;
      body += `- Earnings created/updated: ${num(latestRun.earningsCreated)} / ${num(latestRun.earningsUpdated)}\n\n`;

      if (failedRun) {
        flags.push({ level: 'red', reason: 'Latest AffiliateSyncRun failed' });
      } else if (staleRun) {
        flags.push({ level: 'red', reason: `No affiliate sync run in the last ${hoursSince.toFixed(1)}h (>12h)` });
      }
    } else {
      body += `_No sync runs recorded yet._\n\n`;
      flags.push({ level: 'red', reason: 'No AffiliateSyncRun recorded' });
    }
  } catch (err) {
    if (isTableMissing(err)) {
      body += `> ⚪ Commission sync not yet migrated/configured — the \`AffiliateSyncRun\` table doesn't exist in this database yet.\n\n`;
    } else {
      const msg = (err as Error).message;
      body += `> 🔴 **Sync run health section failed:** ${msg}\n\n`;
      console.error(`[affiliate-daily-pulse] sync run section: ${msg}`);
    }
  }

  // --- Verdict ----------------------------------------------------------------
  const redFlags = flags.filter((f) => f.level === 'red');
  const yellowFlags = flags.filter((f) => f.level === 'yellow');
  let verdictIcon: string;
  let verdictReason: string;
  if (redFlags.length) {
    verdictIcon = '🔴';
    verdictReason = redFlags.map((f) => f.reason).join('; ');
  } else if (yellowFlags.length) {
    verdictIcon = '🟡';
    verdictReason = yellowFlags.map((f) => f.reason).join('; ');
  } else {
    verdictIcon = '🟢';
    verdictReason = 'No red or yellow flags — sync healthy, clicks flowing, campaigns active.';
  }

  let md = `# Affiliate Daily Pulse — ${today}\n\n`;
  md += `## PULSE: ${verdictIcon} ${verdictReason}\n\n`;
  md += body;

  // --- Persist + emit -------------------------------------------------------
  const outDir = join(PROJECT_DIR, 'reports', 'affiliates', 'daily');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${today}.md`);
  writeFileSync(outFile, md);
  console.log(md);
  console.error(`[affiliate-daily-pulse] wrote ${outFile}`);
}

main()
  .catch((err) => {
    console.error('[affiliate-daily-pulse] fatal error:', err);
    process.exitCode = 0; // Never fail the launchd job — a partial report is still useful.
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
