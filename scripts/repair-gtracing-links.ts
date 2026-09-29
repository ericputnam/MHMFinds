#!/usr/bin/env -S npx tsx
/**
 * E134 targeted repair: GTRacing (Impact program 18111) catalog items deep-link via
 * `u=https://gtplayer.com/...`, a host Impact rejects for this program ("Dead End...
 * malformed"). 110 of 224 on-site AffiliateClicks since Jul 1 2026 (49%) went to these dead
 * links; Impact recorded only 9 actions against them. This is a one-time, narrowly-scoped
 * repair of the *currently live* GTRacing rows — it never touches another partner, and it never
 * resurrects a row already 'retired' by the CTR optimizer for unrelated reasons (that filter is
 * `validationStatus: { not: 'retired' }` below).
 *
 * Every row's disposition is derived live from the shared validator
 * (lib/services/affiliateEarnings/linkValidator.ts) against the real gtracing.com site, not a
 * hardcoded id list — a re-run is always safe and self-correcting as the catalog changes. A
 * rollback record (pre-repair values for every affected row) is written to
 * reports/affiliates/ before any write, dry-run or not.
 *
 * Confirmed by hand 2026-09-28 (direct, non-Impact-tracked fetches to gtracing.com):
 *   - gt-lynck-system-pro-gt890mf-edition (all 4 variant ids) -> 200 on deal.gtracing.com
 *   - gt890mf (bare "Music Series" slug)                       -> 404 on deal.gtracing.com
 * So the expected shape of this repair is 4 host-fix + 1 retire. If a live run finds a
 * different shape, it aborts rather than silently doing something wider than approved.
 *
 *   npx tsx scripts/repair-gtracing-links.ts                                # dry run (default)
 *   npx tsx scripts/repair-gtracing-links.ts --apply                        # writes the DB changes
 *   npx tsx scripts/repair-gtracing-links.ts --apply --verify-live-click    # + 1 real Impact
 *                                                                            # click on one
 *                                                                            # repaired link, to
 *                                                                            # confirm Impact
 *                                                                            # itself now forwards
 *                                                                            # correctly end-to-end
 *
 * Operator approval (2026-09-28, via coordinator): apply this repair without waiting for the
 * shared validator's PR to merge (it ships in the same PR anyway). Do NOT run
 * impact-sync-catalog.ts without --dry-run until that PR has merged — a real sync from pre-fix
 * code would set validationStatus:'validated' unconditionally again and undo this.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL) process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyKnownHostFix,
  extractImpactCampaignId,
  validateAffiliateLink,
} from '../lib/services/affiliateEarnings/linkValidator';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const VERIFY_LIVE_CLICK = process.argv.includes('--verify-live-click');
const SID = process.env.IMPACT_ACCOUNT_SID;
const TOKEN = process.env.IMPACT_AUTH_TOKEN;

// The shape approved 2026-09-28. A live run finding something different means the catalog or DB
// state moved since approval — stop and require a fresh look instead of guessing.
const EXPECTED_FIX_COUNT = 4;
const EXPECTED_RETIRE_COUNT = 1;

interface RowBefore {
  affiliateUrl: string;
  validationStatus: string;
  isActive: boolean;
}

interface Plan {
  id: string;
  name: string;
  action: 'host-fix' | 'retire' | 'no-change-needed' | 'needs-manual-review';
  before: RowBefore;
  after: RowBefore;
  reason: string;
}

async function main() {
  const rows = await prisma.affiliateOffer.findMany({
    where: { partner: 'gtracing', validationStatus: { not: 'retired' } },
    select: { id: true, name: true, affiliateUrl: true, isActive: true, validationStatus: true },
  });

  const plans: Plan[] = [];

  for (const row of rows) {
    const before: RowBefore = {
      affiliateUrl: row.affiliateUrl,
      validationStatus: row.validationStatus,
      isActive: row.isActive,
    };
    const campaignId = extractImpactCampaignId(row.affiliateUrl);
    const { url: fixedUrl, fixed } = applyKnownHostFix(campaignId, row.affiliateUrl);

    if (fixed) {
      const validation = await validateAffiliateLink({
        affiliateUrl: fixedUrl,
        campaignId,
        sid: SID,
        token: TOKEN,
      });
      if (validation.outcome === 'ok') {
        plans.push({
          id: row.id,
          name: row.name,
          action: 'host-fix',
          before,
          after: { affiliateUrl: fixedUrl, validationStatus: 'validated', isActive: true },
          reason: 'gtplayer.com -> gtracing.com host fix confirmed reachable',
        });
      } else if (validation.outcome === 'broken') {
        // Our only known fix for this host still doesn't resolve — confirmed broken, not a
        // guess. Retire rather than leave a known-dead link live under any host.
        plans.push({
          id: row.id,
          name: row.name,
          action: 'retire',
          before,
          after: { ...before, validationStatus: 'retired', isActive: false },
          reason:
            'host fix applied but destination still broken, no other slug known: ' +
            validation.checks.map((c) => `${c.name}=${c.outcome} (${c.detail})`).join('; '),
        });
      } else {
        plans.push({
          id: row.id,
          name: row.name,
          action: 'needs-manual-review',
          before,
          after: before,
          reason:
            'host fix applied but outcome unknown, refusing to guess: ' +
            validation.checks.map((c) => `${c.name}=${c.outcome}`).join('; '),
        });
      }
      continue;
    }

    // No known host fix applied to this row — either it's already fine, or it's broken in a way
    // we have no registered fix for. Validate as-is.
    const validation = await validateAffiliateLink({
      affiliateUrl: row.affiliateUrl,
      campaignId,
      sid: SID,
      token: TOKEN,
    });
    if (validation.outcome === 'ok') {
      plans.push({ id: row.id, name: row.name, action: 'no-change-needed', before, after: before, reason: 'already valid' });
    } else if (validation.outcome === 'broken') {
      plans.push({
        id: row.id,
        name: row.name,
        action: 'retire',
        before,
        after: { ...before, validationStatus: 'retired', isActive: false },
        reason: 'confirmed broken with no known fix: ' + validation.checks.map((c) => `${c.name}=${c.outcome} (${c.detail})`).join('; '),
      });
    } else {
      plans.push({
        id: row.id,
        name: row.name,
        action: 'needs-manual-review',
        before,
        after: before,
        reason: 'outcome unknown, refusing to guess: ' + validation.checks.map((c) => `${c.name}=${c.outcome}`).join('; '),
      });
    }
  }

  console.log(`E134 GTRacing repair ${APPLY ? '(APPLYING)' : '(DRY RUN)'}\n`);
  for (const p of plans) {
    console.log(`[${p.action}] ${p.name} (${p.id})`);
    console.log(`  reason: ${p.reason}`);
    if (p.action === 'host-fix' || p.action === 'retire') {
      console.log(`  before: ${JSON.stringify(p.before)}`);
      console.log(`  after:  ${JSON.stringify(p.after)}`);
    }
  }

  const fixes = plans.filter((p) => p.action === 'host-fix');
  const retires = plans.filter((p) => p.action === 'retire');
  const manualReview = plans.filter((p) => p.action === 'needs-manual-review');
  const noChange = plans.filter((p) => p.action === 'no-change-needed');

  console.log(
    `\n${fixes.length} host-fix, ${retires.length} retire, ${manualReview.length} needs-manual-review, ` +
      `${noChange.length} already fine. Total gtracing rows considered: ${rows.length}.`
  );

  if (fixes.length !== EXPECTED_FIX_COUNT || retires.length !== EXPECTED_RETIRE_COUNT) {
    console.error(
      `\nABORT: expected exactly ${EXPECTED_FIX_COUNT} host-fix + ${EXPECTED_RETIRE_COUNT} retire ` +
        `(the shape approved 2026-09-28) but found ${fixes.length} + ${retires.length}. Not writing ` +
        `anything — the catalog or DB state has moved since approval and needs a fresh look.`
    );
    process.exitCode = 1;
    return;
  }

  if (manualReview.length > 0) {
    console.log(`\n(${manualReview.length} row(s) flagged needs-manual-review are left untouched either way.)`);
  }

  // Rollback record, written before any DB write (dry-run or apply) once a plan exists.
  const reportDir = path.join(process.cwd(), 'reports', 'affiliates');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `gtracing-repair-${new Date().toISOString().slice(0, 10)}-${APPLY ? 'apply' : 'dry-run'}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), applied: APPLY, plans }, null, 2));
  console.log(`\nRollback record written: ${reportPath}`);

  if (!APPLY) {
    console.log('\nDry run only — no writes made. Re-run with --apply to write these changes.');
    return;
  }

  for (const p of [...fixes, ...retires]) {
    await prisma.affiliateOffer.update({
      where: { id: p.id },
      data: {
        affiliateUrl: p.after.affiliateUrl,
        validationStatus: p.after.validationStatus,
        isActive: p.after.isActive,
      },
    });
  }
  console.log(`\nApplied: ${fixes.length} host-fixed, ${retires.length} retired.`);

  if (VERIFY_LIVE_CLICK) {
    const target = fixes[0];
    if (!target) {
      console.log('\nNo host-fixed row available to verify.');
    } else {
      console.log(
        `\nVerifying one repaired link end-to-end (this generates exactly 1 real Impact click): ${target.name}`
      );
      try {
        const res = await fetch(target.after.affiliateUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MHMLinkCheck/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        const finalHost = (() => {
          try {
            return new URL(res.url).hostname;
          } catch {
            return '(unparseable)';
          }
        })();
        console.log(`  final URL host: ${finalHost}`);
        console.log(`  status: ${res.status} ${res.ok ? '(OK)' : '(NOT OK)'}`);
        console.log(`  landed on gtracing.com: ${finalHost.endsWith('gtracing.com')}`);
      } catch (err) {
        console.error(`  verification fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error('Repair failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
