#!/usr/bin/env -S npx tsx
/**
 * Affiliate weekly performance report.
 *
 * Pulls last-7-days vs prior-7-days offer/click/earnings data from the AffiliateOffer,
 * AffiliateClick, AffiliateEarning, and AffiliateSyncRun tables, plus GA4 `affiliate_click`
 * event counts, writes a dated Markdown report to reports/affiliates/, and prints it to
 * stdout (so a launchd job can capture it).
 *
 * Each data section is individually try/catch'd so one failure (e.g. the AffiliateEarning
 * table not yet being migrated) doesn't take down the whole report — it renders a red-flag
 * note in that section instead and moves on.
 *
 * Run manually:   npx tsx scripts/agents/affiliate-weekly-report.ts
 * Scheduled via:  ~/Library/LaunchAgents/com.mhmfinds.affiliate-weekly-report.plist
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
const THEMES = ['cozy', 'modern', 'minimalist', 'luxury', 'fantasy'];

function isoDaysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');
const pct = (n: number) => `${n.toFixed(2)}%`;

/** Render an arrow + percent delta for a week-over-week comparison. */
function wowTrend(curr: number, prev: number): string {
  if (!prev) return curr > 0 ? ' 🔺 (new vs $0 prior)' : '';
  const delta = ((curr - prev) / prev) * 100;
  const arrow = delta > 1 ? '🔺' : delta < -1 ? '🔻' : '▪️';
  return ` ${arrow} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% WoW`;
}

/** True when a Prisma error is "table does not exist" (P2021) — i.e. an unapplied migration. */
function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021'
  );
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const last7Start = isoDaysAgo(7);
  const prev7Start = isoDaysAgo(14);
  const last28Start = isoDaysAgo(28);
  const now = new Date();

  let md = `# Affiliate Weekly Report — ${today}\n\n`;

  // --- 1. Offers -------------------------------------------------------------
  md += `## Offers\n\n`;
  try {
    const [activeCount, inactiveCount, byPartner] = await Promise.all([
      prisma.affiliateOffer.count({ where: { isActive: true } }),
      prisma.affiliateOffer.count({ where: { isActive: false } }),
      prisma.affiliateOffer.groupBy({
        by: ['partner'],
        _count: { _all: true },
        _sum: { impressions: true, clicks: true },
      }),
    ]);

    md += `- Active offers: **${num(activeCount)}**\n`;
    md += `- Inactive/placeholder offers: **${num(inactiveCount)}** (isActive:false — do not serve)\n\n`;

    if (byPartner.length) {
      md += `| Partner | Offers | Impressions | Clicks | CTR |\n|---|--:|--:|--:|--:|\n`;
      for (const row of byPartner.sort((a, b) => (b._sum.clicks ?? 0) - (a._sum.clicks ?? 0))) {
        const impressions = row._sum.impressions ?? 0;
        const clicks = row._sum.clicks ?? 0;
        const ctr = impressions ? (clicks / impressions) * 100 : 0;
        md += `| ${row.partner} | ${num(row._count._all)} | ${num(impressions)} | ${num(clicks)} | ${impressions ? pct(ctr) : '—'} |\n`;
      }
      md += `\n`;
    } else {
      md += `_No offers found by partner._\n\n`;
    }

    const byCategory = await prisma.affiliateOffer.groupBy({
      by: ['category'],
      _count: { _all: true },
      _sum: { impressions: true, clicks: true },
    });
    if (byCategory.length) {
      md += `**CTR by category**\n\n`;
      md += `| Category | Offers | Impressions | Clicks | CTR |\n|---|--:|--:|--:|--:|\n`;
      for (const row of byCategory.sort((a, b) => (b._sum.clicks ?? 0) - (a._sum.clicks ?? 0))) {
        const impressions = row._sum.impressions ?? 0;
        const clicks = row._sum.clicks ?? 0;
        const ctr = impressions ? (clicks / impressions) * 100 : 0;
        md += `| ${row.category} | ${num(row._count._all)} | ${num(impressions)} | ${num(clicks)} | ${impressions ? pct(ctr) : '—'} |\n`;
      }
      md += `\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    md += `> 🔴 **Offers section failed:** ${msg}\n\n`;
    console.error(`[affiliate-weekly] offers section: ${msg}`);
  }

  // --- 2. Clicks by placement --------------------------------------------------
  md += `## Clicks by Placement\n\n`;
  try {
    const [last7, prev7] = await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ['sourceType'],
        where: { clickedAt: { gte: last7Start, lte: now } },
        _count: { _all: true },
      }),
      prisma.affiliateClick.groupBy({
        by: ['sourceType'],
        where: { clickedAt: { gte: prev7Start, lt: last7Start } },
        _count: { _all: true },
      }),
    ]);

    const prevMap = new Map(prev7.map((r) => [r.sourceType, r._count._all]));
    const sourceTypes = Array.from(
      new Set([...last7.map((r) => r.sourceType), ...prev7.map((r) => r.sourceType)])
    );

    if (sourceTypes.length) {
      md += `| Source | Last 7d | Prior 7d | WoW |\n|---|--:|--:|--:|\n`;
      for (const src of sourceTypes) {
        const curr = last7.find((r) => r.sourceType === src)?._count._all ?? 0;
        const prev = prevMap.get(src) ?? 0;
        md += `| ${src} | ${num(curr)} | ${num(prev)} |${wowTrend(curr, prev)} |\n`;
      }
      const currTotal = last7.reduce((s, r) => s + r._count._all, 0);
      const prevTotal = prev7.reduce((s, r) => s + r._count._all, 0);
      md += `| **Total** | **${num(currTotal)}** | **${num(prevTotal)}** |${wowTrend(currTotal, prevTotal)} |\n\n`;
    } else {
      md += `_No affiliate clicks recorded in the last 14 days._\n\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    md += `> 🔴 **Clicks section failed:** ${msg}\n\n`;
    console.error(`[affiliate-weekly] clicks section: ${msg}`);
  }

  // --- 3. Earnings (table may not exist yet) -----------------------------------
  md += `## Earnings\n\n`;
  try {
    const [byNetwork7d, byNetwork28d, byStatus] = await Promise.all([
      prisma.affiliateEarning.groupBy({
        by: ['network'],
        where: { eventDate: { gte: last7Start, lte: now } },
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateEarning.groupBy({
        by: ['network'],
        where: { eventDate: { gte: last28Start, lte: now } },
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateEarning.groupBy({
        by: ['status'],
        where: { eventDate: { gte: last7Start, lte: now } },
        _count: { _all: true },
      }),
    ]);

    const prevWeekByNetwork = await prisma.affiliateEarning.groupBy({
      by: ['network'],
      where: { eventDate: { gte: prev7Start, lt: last7Start } },
      _sum: { commissionAmount: true },
    });
    const prevMap = new Map(
      prevWeekByNetwork.map((r) => [r.network, Number(r._sum.commissionAmount ?? 0)])
    );

    if (byNetwork7d.length || byNetwork28d.length) {
      md += `**Commission by network (last 7d vs prior 7d)**\n\n`;
      md += `| Network | Last 7d | Prior 7d | WoW | Last 28d |\n|---|--:|--:|--:|--:|\n`;
      const networks = Array.from(
        new Set([...byNetwork7d.map((r) => r.network), ...byNetwork28d.map((r) => r.network)])
      );
      let total7 = 0;
      let totalPrev = 0;
      for (const net of networks) {
        const curr = Number(byNetwork7d.find((r) => r.network === net)?._sum.commissionAmount ?? 0);
        const prev = prevMap.get(net) ?? 0;
        const d28 = Number(byNetwork28d.find((r) => r.network === net)?._sum.commissionAmount ?? 0);
        total7 += curr;
        totalPrev += prev;
        md += `| ${net} | ${money(curr)} | ${money(prev)} |${wowTrend(curr, prev)} | ${money(d28)} |\n`;
      }
      md += `| **Total** | **${money(total7)}** | **${money(totalPrev)}** |${wowTrend(total7, totalPrev)} | |\n\n`;
    } else {
      md += `_No commission events recorded yet. Catalog was only recently seeded — this is expected until network syncs start landing conversions._\n\n`;
    }

    if (byStatus.length) {
      md += `**Status breakdown (last 7d)**: `;
      md += byStatus.map((r) => `${r.status}: ${num(r._count._all)}`).join(', ');
      md += `\n\n`;
    }
  } catch (err) {
    if (isTableMissing(err)) {
      md += `> ⚪ Commission sync not yet migrated/configured — the \`AffiliateEarning\` table doesn't exist in this database yet (migration \`20260701000000_add_affiliate_earnings\` is staged but not applied). Run \`npm run db:deploy\` once network sync is ready to go live.\n\n`;
    } else {
      const msg = (err as Error).message;
      md += `> 🔴 **Earnings section failed:** ${msg}\n\n`;
      console.error(`[affiliate-weekly] earnings section: ${msg}`);
    }
  }

  // --- 4. Sync run health (same table-missing tolerance) -----------------------
  md += `## Sync Run Health\n\n`;
  try {
    const latestRun = await prisma.affiliateSyncRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    if (latestRun) {
      const statusIcon =
        latestRun.status === 'completed' ? '🟢' : latestRun.status === 'partial' ? '🟡' : latestRun.status === 'running' ? '🔵' : '🔴';
      md += `- ${statusIcon} **Latest run**: ${latestRun.trigger} — ${latestRun.status} (started ${latestRun.startedAt.toISOString()})\n`;
      md += `- Networks synced: ${latestRun.networksSynced.length ? latestRun.networksSynced.join(', ') : '—'}\n`;
      md += `- Earnings created/updated: ${num(latestRun.earningsCreated)} / ${num(latestRun.earningsUpdated)}\n`;
      md += `- Total commission touched: ${money(Number(latestRun.totalCommission))}\n`;
      if (latestRun.errorDetails) {
        md += `- ⚠️ Error details present — see raw record for network-level failures.\n`;
      }
      md += `\n`;
    } else {
      md += `_No sync runs recorded yet._\n\n`;
    }
  } catch (err) {
    if (isTableMissing(err)) {
      md += `> ⚪ Commission sync not yet migrated/configured — the \`AffiliateSyncRun\` table doesn't exist in this database yet (migration \`20260701000000_add_affiliate_earnings\` is staged but not applied).\n\n`;
    } else {
      const msg = (err as Error).message;
      md += `> 🔴 **Sync run health section failed:** ${msg}\n\n`;
      console.error(`[affiliate-weekly] sync run section: ${msg}`);
    }
  }

  // --- 5. GA4 affiliate_click events --------------------------------------------
  md += `## GA4 \`affiliate_click\` Events\n\n`;
  try {
    const { ga4Connector } = await import('../../lib/services/ga4Connector');
    const startDate = last7Start.toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    const clickMap = await ga4Connector.fetchAffiliateClicks(startDate, endDate);

    const totalClicks = Array.from(clickMap.values()).reduce((s: number, v: number) => s + v, 0);
    md += `_This event was just instrumented, so low/zero counts in the first reporting window are expected — it takes time for GA4 processing + real traffic to populate it._\n\n`;

    if (clickMap.size) {
      md += `| Page | Clicks (7d) |\n|---|--:|\n`;
      const sorted = Array.from(clickMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [page, clicks] of sorted) {
        md += `| ${page} | ${num(clicks)} |\n`;
      }
      md += `\n**Total GA4 affiliate_click events (7d): ${num(totalClicks)}**\n\n`;
    } else {
      md += `_No \`affiliate_click\` events returned for the last 7 days._\n\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    md += `> ⚪ **GA4 unavailable**: ${msg}\n\n`;
    console.error(`[affiliate-weekly] GA4 section: ${msg}`);
  }

  // --- 6. Dead weight + coverage gaps -------------------------------------------
  md += `## Dead Weight\n\n`;
  try {
    const topClicked = await prisma.affiliateOffer.findMany({
      where: { clicks: { gt: 0 } },
      orderBy: { clicks: 'desc' },
      take: 25,
      select: { id: true, name: true, partner: true, clicks: true, revenue: true },
    });
    const deadWeight = topClicked.filter((o) => Number(o.revenue) === 0).slice(0, 10);

    if (deadWeight.length) {
      md += `Top offers by clicks with **zero revenue** (candidates to swap out):\n\n`;
      md += `| Offer | Partner | Clicks | Revenue |\n|---|---|--:|--:|\n`;
      for (const o of deadWeight) {
        md += `| ${o.name} | ${o.partner} | ${num(o.clicks)} | ${money(Number(o.revenue))} |\n`;
      }
      md += `\n`;
    } else {
      md += `_No dead-weight offers found (either no clicks yet, or all clicked offers have revenue)._\n\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    md += `> 🔴 **Dead weight section failed:** ${msg}\n\n`;
    console.error(`[affiliate-weekly] dead weight section: ${msg}`);
  }

  md += `## Coverage Gaps\n\n`;
  try {
    const activeThemeCounts = await Promise.all(
      THEMES.map(async (theme) => ({
        theme,
        count: await prisma.affiliateOffer.count({
          where: { isActive: true, matchingThemes: { has: theme } },
        }),
      }))
    );

    const gaps = activeThemeCounts.filter((t) => t.count === 0);
    md += `| Theme | Active Offers |\n|---|--:|\n`;
    for (const t of activeThemeCounts) {
      md += `| ${t.theme} | ${num(t.count)}${t.count === 0 ? ' ⚠️' : ''} |\n`;
    }
    md += `\n`;
    if (gaps.length) {
      md += `> ⚠️ **${gaps.length} theme(s) with zero active offers**: ${gaps.map((g) => g.theme).join(', ')}\n\n`;
    } else {
      md += `All 5 themes have at least one active offer.\n\n`;
    }
  } catch (err) {
    const msg = (err as Error).message;
    md += `> 🔴 **Coverage gaps section failed:** ${msg}\n\n`;
    console.error(`[affiliate-weekly] coverage gaps section: ${msg}`);
  }

  // --- Footer -------------------------------------------------------------------
  md += `---\n`;
  md += `### How to read this\n\n`;
  md += `The affiliate catalog was only recently seeded, so early reports will show thin data — `;
  md += `sparse clicks, no commission history, and low/zero GA4 event counts are all expected right now, `;
  md += `not a sign of something broken. Offers with \`isActive:false\` are placeholders and don't serve `;
  md += `to real traffic, so they're excluded from CTR and coverage calculations above. Revisit this report `;
  md += `weekly as the catalog and network syncs mature — the trend lines will become meaningful once there's `;
  md += `a few weeks of history to compare against.\n`;

  // --- Persist + emit -------------------------------------------------------
  const outDir = join(PROJECT_DIR, 'reports', 'affiliates');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${today}.md`);
  writeFileSync(outFile, md);
  console.log(md);
  console.error(`[affiliate-weekly] wrote ${outFile}`);
}

main()
  .catch((err) => {
    console.error('[affiliate-weekly] fatal error:', err);
    process.exitCode = 0; // Never fail the launchd job — a partial report is still useful.
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
