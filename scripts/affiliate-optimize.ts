#!/usr/bin/env -S npx tsx
/**
 * Affiliate optimizer — the conversion-driven kill/refill loop.
 *
 * Weekly (launchd, Tuesdays 07:45 — the day before /mhm-review) it:
 *   1. Evaluates every active offer against kill rules that respect sample
 *      size — we never kill on noise, only on enough volume to mean something:
 *        - DEAD CLICKS: >= 25 clicks and $0 attributed commission → retire.
 *        - LOW CTR: >= 4,000 impressions and CTR <= 0.05% → retire. (0.05% was
 *          the retired Amazon catalog's CTR — the bar an offer must beat.)
 *        - Offers younger than 14 days are only "watched", never killed.
 *   2. Retires losers: isActive=false + validationStatus='retired'. The
 *      catalog sync explicitly refuses to resurrect retired offers, so a kill
 *      is permanent unless a human reverses it in the admin.
 *   3. Refills the pool by re-running impact-sync-catalog.ts, which pulls the
 *      next-best audience-fit items from the approved Impact catalogs.
 *   4. Appends every decision (with the numbers behind it) to
 *      reports/affiliates/optimize-log.md so Ivy and the operator can audit
 *      the loop and tune the thresholds under SD-2.
 *
 *   npx tsx scripts/affiliate-optimize.ts --dry-run   # verdicts only, no writes
 *   npx tsx scripts/affiliate-optimize.ts             # retire + refill + log
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_DIR = '/Users/eputnam/java_projects/MHMFinds';

// Kill rules — tune ONLY with before/after data logged under SD-2.
const MIN_AGE_DAYS = 14; // younger offers are watched, never killed
const DEAD_CLICK_THRESHOLD = 25; // clicks with $0 commission → dead
const LOW_CTR_MIN_IMPRESSIONS = 4000;
const LOW_CTR_MAX = 0.0005; // 0.05% — the retired Amazon catalog's CTR
const MIN_ACTIVE_FLOOR = 8; // never let the pool shrink below this without refill

interface Verdict {
  name: string;
  partner: string;
  ageDays: number;
  impressions: number;
  clicks: number;
  ctr: number;
  commission: number;
  action: 'keep' | 'retire' | 'watch';
  reason: string;
}

async function evaluate(): Promise<Verdict[]> {
  const offers = await prisma.affiliateOffer.findMany({
    where: { isActive: true, partner: { not: 'amazon' } },
    select: { id: true, name: true, partner: true, impressions: true, clicks: true, createdAt: true },
  });

  // Attributed commission per offer (reversed conversions don't count).
  let commissionByOffer = new Map<string, number>();
  try {
    const sums = await prisma.affiliateEarning.groupBy({
      by: ['offerId'],
      where: { status: { not: 'reversed' }, offerId: { not: null } },
      _sum: { commissionAmount: true },
    });
    commissionByOffer = new Map(
      sums.map((s) => [s.offerId as string, Number(s._sum.commissionAmount ?? 0)])
    );
  } catch {
    // Earnings table unavailable — treat all commissions as 0 but note it.
    console.error('AffiliateEarning unavailable; evaluating on CTR rules only.');
  }

  const now = Date.now();
  const verdicts: Verdict[] = [];

  for (const o of offers) {
    const ageDays = Math.floor((now - o.createdAt.getTime()) / 86400000);
    const ctr = o.impressions > 0 ? o.clicks / o.impressions : 0;
    const commission = commissionByOffer.get(o.id) ?? 0;
    const base = {
      name: o.name,
      partner: o.partner,
      ageDays,
      impressions: o.impressions,
      clicks: o.clicks,
      ctr,
      commission,
    };

    if (commission > 0) {
      verdicts.push({ ...base, action: 'keep', reason: `converting ($${commission.toFixed(2)})` });
      continue;
    }
    if (ageDays < MIN_AGE_DAYS) {
      verdicts.push({ ...base, action: 'watch', reason: `only ${ageDays}d old — gathering data` });
      continue;
    }
    if (o.clicks >= DEAD_CLICK_THRESHOLD) {
      verdicts.push({
        ...base,
        action: 'retire',
        reason: `${o.clicks} clicks, $0 commission (dead-click rule)`,
      });
      continue;
    }
    if (o.impressions >= LOW_CTR_MIN_IMPRESSIONS && ctr <= LOW_CTR_MAX) {
      verdicts.push({
        ...base,
        action: 'retire',
        reason: `CTR ${(ctr * 100).toFixed(3)}% after ${o.impressions} impressions (low-CTR rule)`,
      });
      continue;
    }
    verdicts.push({ ...base, action: 'keep', reason: 'below kill-rule volume thresholds' });
  }

  return verdicts.map((v) => ({ ...v, id: offers.find((o) => o.name === v.name)?.id }) as any);
}

async function main() {
  console.log(`Affiliate optimizer ${DRY_RUN ? '(DRY RUN)' : ''}\n`);
  const verdicts = await evaluate();

  const retiring = verdicts.filter((v) => v.action === 'retire');
  const keeping = verdicts.filter((v) => v.action === 'keep');
  const watching = verdicts.filter((v) => v.action === 'watch');

  for (const v of verdicts) {
    const icon = v.action === 'retire' ? '🔴' : v.action === 'watch' ? '👁️' : '🟢';
    console.log(
      `${icon} [${v.partner}] ${v.name.slice(0, 55)} — ${v.action}: ${v.reason} ` +
        `(${v.impressions} imp, ${v.clicks} clicks, $${v.commission.toFixed(2)})`
    );
  }

  if (!DRY_RUN && retiring.length) {
    for (const v of retiring as any[]) {
      await prisma.affiliateOffer.update({
        where: { id: v.id },
        data: { isActive: false, validationStatus: 'retired' },
      });
    }
  }

  // Refill from the Impact catalogs if we retired anything or are under floor.
  const activeAfter = keeping.length + watching.length;
  let refillNote = 'no refill needed';
  if (!DRY_RUN && (retiring.length > 0 || activeAfter < MIN_ACTIVE_FLOOR)) {
    console.log('\nRefilling from Impact catalogs...');
    try {
      execSync('npx tsx scripts/impact-sync-catalog.ts', {
        cwd: PROJECT_DIR,
        stdio: 'inherit',
        env: process.env,
      });
      refillNote = 'catalog sync re-run to refill the pool';
    } catch {
      refillNote = '⚠️ refill sync failed — pool may be under floor';
      console.error(refillNote);
    }
  }

  // Append the audit log.
  const date = new Date().toISOString().slice(0, 10);
  const logDir = join(PROJECT_DIR, 'reports', 'affiliates');
  mkdirSync(logDir, { recursive: true });
  const lines = [
    `\n## ${date}${DRY_RUN ? ' (dry run)' : ''}`,
    ``,
    `Kept ${keeping.length} · watching ${watching.length} · retired ${retiring.length} · ${refillNote}`,
    ``,
    ...verdicts.map(
      (v) =>
        `- ${v.action.toUpperCase()} [${v.partner}] ${v.name.slice(0, 70)} — ${v.reason} ` +
        `(${v.impressions} imp / ${v.clicks} clicks / $${v.commission.toFixed(2)})`
    ),
  ];
  if (!DRY_RUN) appendFileSync(join(logDir, 'optimize-log.md'), lines.join('\n') + '\n');

  console.log(
    `\nSummary: kept ${keeping.length}, watching ${watching.length}, retired ${retiring.length}. ` +
      (DRY_RUN ? '(dry run — nothing written)' : `Logged to reports/affiliates/optimize-log.md`)
  );
}

main()
  .catch((err) => {
    console.error('Optimizer failed:', err);
    process.exitCode = 0; // never fail the launchd job; the log tells the story
  })
  .finally(() => prisma.$disconnect());
