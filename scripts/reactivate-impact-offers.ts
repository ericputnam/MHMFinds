#!/usr/bin/env -S npx tsx
/**
 * One-time selective reactivation of Impact offers retired under the
 * miscalibrated absolute 0.05% low-CTR bar (2026-07-21/28 optimizer sweeps).
 *
 * That bar was the retired Amazon catalog's CTR — roughly 6x this placement
 * mix's real site-wide CTR — so it mass-retired offers that were actually
 * performing at or above the site norm. This script un-retires only the
 * offers whose lifetime CTR clears the recalibrated relative bar (half the
 * site-wide average CTR — the same rule affiliate-optimize.ts now applies),
 * giving them a fair trial under the corrected rule. Everything else stays
 * retired. See reports/affiliates/impact-dryrun-2026-08-16.md.
 *
 *   npx tsx scripts/reactivate-impact-offers.ts --dry-run   # verdicts only
 *   npx tsx scripts/reactivate-impact-offers.ts             # apply
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import {
  applyKnownHostFix,
  extractImpactCampaignId,
  validateAffiliateLink,
} from '../lib/services/affiliateEarnings/linkValidator';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const SITE_CTR_MULTIPLIER = 0.5; // must match LOW_CTR_SITE_MULTIPLIER in affiliate-optimize.ts
// Live-link checks are best-effort here: if creds are absent, the contract/deeplink-domain leg is
// simply not attempted (fewer checks, not a false 'unknown') — the destination-reachability leg
// still runs regardless, since it needs no Impact API access at all.
const SID = process.env.IMPACT_ACCOUNT_SID;
const TOKEN = process.env.IMPACT_AUTH_TOKEN;

async function main() {
  const totals = await prisma.affiliateOffer.aggregate({
    where: { partner: { not: 'amazon' }, impressions: { gt: 0 } },
    _sum: { clicks: true, impressions: true },
  });
  const siteImpressions = totals._sum.impressions ?? 0;
  const siteCtr = siteImpressions > 0 ? (totals._sum.clicks ?? 0) / siteImpressions : 0;
  if (siteCtr <= 0) {
    console.error('No site-wide impression history — refusing to reactivate on no data.');
    return;
  }
  const bar = siteCtr * SITE_CTR_MULTIPLIER;
  console.log(
    `Site avg CTR ${(siteCtr * 100).toFixed(4)}% → reactivation bar ${(bar * 100).toFixed(4)}%` +
      `${DRY_RUN ? ' (DRY RUN)' : ''}\n`
  );

  const retired = await prisma.affiliateOffer.findMany({
    where: { validationStatus: 'retired', partner: { not: 'amazon' } },
    select: { id: true, name: true, partner: true, impressions: true, clicks: true, affiliateUrl: true },
    orderBy: { partner: 'asc' },
  });

  let reactivated = 0;
  let clearing = 0;
  let heldBackBrokenOrUnknown = 0;
  for (const o of retired) {
    const ctr = o.impressions > 0 ? o.clicks / o.impressions : 0;
    const clears = o.impressions > 0 && ctr > bar;
    if (clears) clearing++;
    console.log(
      `${clears ? '🟢 reactivate ' : '⚪ stays retired'} [${o.partner}] ${o.name.slice(0, 55)} — ` +
        `CTR ${(ctr * 100).toFixed(4)}% (${o.impressions} imp / ${o.clicks} clicks)`
    );
    if (!clears) continue;

    // A CTR that clears the bar is not evidence the link still works (E134: GTRacing's dead
    // gtplayer.com deep-link had real historical clicks). Re-validate before promoting anything
    // out of 'retired' — never reactivate on stale click history alone.
    const campaignId = extractImpactCampaignId(o.affiliateUrl);
    const { url: fixedUrl, fixed } = applyKnownHostFix(campaignId, o.affiliateUrl);
    const validation = await validateAffiliateLink({
      affiliateUrl: fixedUrl,
      campaignId,
      sid: SID,
      token: TOKEN,
    });
    if (fixed) console.log(`    (host-fixed: ${o.affiliateUrl} -> ${fixedUrl})`);

    if (validation.outcome !== 'ok') {
      heldBackBrokenOrUnknown++;
      console.log(
        `    held back (${validation.outcome}): ${validation.checks
          .map((c) => `${c.name}=${c.outcome} (${c.detail})`)
          .join('; ')}`
      );
      continue;
    }

    if (!DRY_RUN) {
      await prisma.affiliateOffer.update({
        where: { id: o.id },
        data: { isActive: true, validationStatus: 'validated', affiliateUrl: fixedUrl },
      });
    }
    reactivated++;
  }

  console.log(
    `\n${DRY_RUN ? `Would reactivate ${reactivated}` : `Reactivated ${reactivated}`} of ` +
      `${retired.length} retired offers (${clearing} cleared the CTR bar, ` +
      `${heldBackBrokenOrUnknown} of those held back on a broken/unknown link check).`
  );
}

main()
  .catch((err) => {
    console.error('Reactivation failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
