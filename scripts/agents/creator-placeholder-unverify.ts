/**
 * Un-verify placeholder CreatorProfiles (Nova, E158, 2026-10-02). Tier 0
 * catalog-data fix under autonomy.md: dry run first, frozen plan, rollback.
 *
 *   npx tsx scripts/agents/creator-placeholder-unverify.ts            # dry run: print + write plan
 *   npx tsx scripts/agents/creator-placeholder-unverify.ts --apply    # flip only ids in the committed plan
 *   npx tsx scripts/agents/creator-placeholder-unverify.ts --rollback # restore isVerified=true for plan ids
 *
 * The plan file is the rollback artifact; land it on `main` before --apply.
 * Exit codes: 0 ok, 1 refused (bad plan / cap), 2 could-not-run (DB error).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { PLACEHOLDER_ACCOUNT_DOMAINS } from '../../lib/creatorClaim';
import { MAX_ROWS, idsStillTargets, planUnverify, type PlanRow, type ProfileRow } from './creator-placeholder-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const PLAN_PATH = resolve(PROJECT_DIR, 'reports/funnel/triage/creator-placeholder-unverify-2026-10-02.json');

async function readRows(prisma: PrismaClient): Promise<ProfileRow[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; handle: string; isVerified: boolean; placeholder: boolean; oauth: number; page_mods: number }>
  >(
    `SELECT c.id, c.handle, c."isVerified",
            (lower(split_part(u.email, '@', 2)) = ANY($1::text[])) AS placeholder,
            (SELECT count(*)::int FROM accounts a WHERE a."userId" = u.id) AS oauth,
            (SELECT count(*)::int FROM mods m
              WHERE m.author IS NOT NULL AND m."isNSFW" = false
                AND trim(both '-' from lower(regexp_replace(m.author, '[^A-Za-z0-9]+', '-', 'g'))) = c.handle) AS page_mods
       FROM creator_profiles c JOIN users u ON u.id = c."userId"`,
    [...PLACEHOLDER_ACCOUNT_DOMAINS],
  );
  return rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    isVerified: r.isVerified,
    placeholderAccount: r.placeholder === true,
    oauthAccounts: Number(r.oauth),
    pageMods: Number(r.page_mods),
  }));
}

function readPlan(): PlanRow[] | null {
  if (!existsSync(PLAN_PATH)) return null;
  const parsed = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
  return Array.isArray(parsed?.rows) ? (parsed.rows as PlanRow[]) : null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes('--apply');
  const rollback = process.argv.includes('--rollback');
  const prisma = new PrismaClient();
  try {
    if (rollback) {
      const plan = readPlan();
      if (!plan || plan.length === 0) { console.error('REFUSED: no plan file to roll back from'); return 1; }
      const res = await prisma.creatorProfile.updateMany({ where: { id: { in: plan.map((p) => p.id) } }, data: { isVerified: true } });
      console.log(`ROLLBACK: isVerified=true restored on ${res.count}/${plan.length} plan rows`);
      return 0;
    }

    const live = await readRows(prisma);
    if (live.length === 0) { console.error('REFUSED: read 0 CreatorProfile rows (vacuity guard)'); return 1; }

    if (!apply) {
      const plan = planUnverify(live);
      console.log(`DRY RUN: ${live.length} profiles read; ${plan.length} placeholder+verified+never-signed-in targets; ${plan.filter((p) => p.pageMods >= 5).length} back a live /creator/ page`);
      for (const p of plan) console.log(`  ${p.handle.padEnd(20)} pageMods=${p.pageMods}`);
      writeFileSync(
        PLAN_PATH,
        JSON.stringify({ experiment: 'E158', written: new Date().toISOString().slice(0, 10), change: 'creator_profiles.isVerified true -> false', rows: plan }, null, 2) + '\n',
      );
      console.log(`plan written: ${PLAN_PATH}`);
      return 0;
    }

    const plan = readPlan();
    if (!plan || plan.length === 0) { console.error('REFUSED: --apply needs the committed plan file (run the dry run, land it on main)'); return 1; }
    if (plan.length > MAX_ROWS) { console.error(`REFUSED: plan has ${plan.length} rows > ${MAX_ROWS}`); return 1; }
    const { apply: ids, skipped } = idsStillTargets(plan, live);
    const res = await prisma.creatorProfile.updateMany({ where: { id: { in: ids }, isVerified: true }, data: { isVerified: false } });
    console.log(`APPLIED: isVerified=false on ${res.count} rows; ${skipped.length} plan rows skipped (no longer targets)`);
    return 0;
  } catch (error) {
    console.error('could not run:', String((error as Error)?.message ?? error).slice(0, 200));
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
