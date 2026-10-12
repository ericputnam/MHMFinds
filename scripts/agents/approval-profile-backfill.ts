/**
 * Backfill the E183 pending CreatorProfile + Mod.creatorId for submissions
 * approved before #274 (Nova, E190, 2026-10-12). Tier 0 catalog-data fix:
 * dry run first, frozen plan on main, then apply, read-back, rollback.
 *
 *   npx tsx scripts/agents/approval-profile-backfill.ts             # dry run: print + write frozen plan
 *   npx tsx scripts/agents/approval-profile-backfill.ts --apply     # write only rows in the frozen plan that still match live
 *   npx tsx scripts/agents/approval-profile-backfill.ts --rollback  # unlink plan mods; delete plan profiles that are still pending, unverified and unlinked
 *
 * The plan file is the rollback artifact; land it on `main` before --apply.
 * Prints no email address. Exit codes: 0 ok, 1 refused, 2 could-not-run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { isPendingHandle } from '../../lib/creatorClaim';
import {
  MAX_BACKFILL_ROWS,
  planBackfill,
  shouldWritePlan,
  stillApplicable,
  writable,
  type BackfillInputRow,
  type WritableDecision,
} from './approval-profile-backfill-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const PLAN_PATH = resolve(PROJECT_DIR, 'reports/funnel/triage/approval-profile-backfill-2026-10-12.json');

async function readRows(prisma: PrismaClient): Promise<BackfillInputRow[]> {
  const subs = await prisma.modSubmission.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      isEdit: true,
      userId: true,
      author: true,
      approvedModId: true,
      user: { select: { isAdmin: true, displayName: true, username: true, creatorProfile: { select: { id: true } } } },
    },
  });
  const modIds = subs.map((s) => s.approvedModId).filter((x): x is string => !!x);
  const mods = await prisma.mod.findMany({ where: { id: { in: modIds } }, select: { id: true, creatorId: true } });
  const modById = new Map(mods.map((m) => [m.id, m]));
  return subs.map((s) => {
    const mod = s.approvedModId ? modById.get(s.approvedModId) : undefined;
    return {
      submissionId: s.id,
      status: s.status,
      isEdit: s.isEdit,
      userId: s.userId,
      submitterIsAdmin: s.user?.isAdmin === true,
      existingProfileId: s.user?.creatorProfile?.id ?? null,
      author: s.author,
      displayName: s.user?.displayName ?? null,
      username: s.user?.username ?? null,
      approvedModId: s.approvedModId,
      modExists: !!mod,
      modCreatorId: mod?.creatorId ?? null,
    };
  });
}

function readPlan(): WritableDecision[] | null {
  if (!existsSync(PLAN_PATH)) return null;
  const parsed = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
  return Array.isArray(parsed?.rows) ? (parsed.rows as WritableDecision[]) : null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes('--apply');
  const rollback = process.argv.includes('--rollback');
  const prisma = new PrismaClient();
  try {
    if (rollback) {
      const plan = readPlan();
      if (!plan || plan.length === 0) { console.error('REFUSED: no plan file to roll back from'); return 1; }
      for (const row of plan) {
        const profileId = row.action === 'link'
          ? row.profileId
          : (await prisma.creatorProfile.findUnique({ where: { handle: row.handle }, select: { id: true } }))?.id;
        if (!profileId) { console.log(`  ${row.submissionId}: no profile — nothing to undo`); continue; }
        const unlinked = await prisma.mod.updateMany({ where: { id: row.modId, creatorId: profileId }, data: { creatorId: null } });
        let deleted = 0;
        if (row.action === 'create' && isPendingHandle(row.handle)) {
          const left = await prisma.mod.count({ where: { creatorId: profileId } });
          if (left === 0) {
            deleted = (await prisma.creatorProfile.deleteMany({ where: { id: profileId, handle: row.handle, isVerified: false } })).count;
          }
        }
        console.log(`  ${row.submissionId}: mod unlinked ${unlinked.count}, pending profile deleted ${deleted}`);
      }
      console.log(`ROLLBACK: done for ${plan.length} plan row(s)`);
      return 0;
    }

    const live = await readRows(prisma);
    if (live.length === 0) { console.error('REFUSED: read 0 approved submissions (vacuity guard)'); return 1; }
    const decisions = planBackfill(live);

    if (!apply) {
      const rows = writable(decisions);
      console.log(`DRY RUN: ${live.length} approved submissions read; ${rows.length} to write`);
      for (const d of decisions) {
        const detail = d.action === 'skip' ? `skip (${d.reason})` : d.action === 'create' ? `create ${d.handle} + link mod ${d.modId}` : `link mod ${d.modId} → profile ${d.profileId}`;
        console.log(`  ${d.submissionId}  ${detail}`);
      }
      for (const d of rows) {
        if (d.action !== 'create') continue;
        const clash = await prisma.creatorProfile.findUnique({ where: { handle: d.handle }, select: { id: true } });
        if (clash) { console.error(`REFUSED: handle ${d.handle} already exists`); return 1; }
      }
      const existing = readPlan();
      if (!shouldWritePlan(existing ? existing.length : null, process.argv.includes('--replace-plan'))) {
        console.log(`plan NOT written: ${PLAN_PATH} already holds ${existing?.length} rows (the rollback artifact); pass --replace-plan to overwrite`);
        return 0;
      }
      writeFileSync(
        PLAN_PATH,
        JSON.stringify(
          {
            experiment: 'E190',
            written: new Date().toISOString().slice(0, 10),
            change: 'create pending CreatorProfile (isVerified=false) + set Mod.creatorId (was null) for pre-#274 approvals',
            skipped: decisions.filter((d) => d.action === 'skip'),
            rows,
          },
          null,
          2,
        ) + '\n',
      );
      console.log(`plan written: ${PLAN_PATH}`);
      return 0;
    }

    const plan = readPlan();
    if (!plan || plan.length === 0) { console.error('REFUSED: --apply needs the committed plan file (run the dry run, land it on main)'); return 1; }
    if (plan.length > MAX_BACKFILL_ROWS) { console.error(`REFUSED: plan has ${plan.length} rows > ${MAX_BACKFILL_ROWS}`); return 1; }
    const { apply: rows, drifted } = stillApplicable(plan, decisions);
    let created = 0;
    let linked = 0;
    for (const row of rows) {
      await prisma.$transaction(async (tx) => {
        let profileId: string;
        if (row.action === 'create') {
          const p = await tx.creatorProfile.create({ data: { userId: row.userId, handle: row.handle, isVerified: false }, select: { id: true } });
          profileId = p.id;
          created++;
        } else {
          profileId = row.profileId;
        }
        const res = await tx.mod.updateMany({ where: { id: row.modId, creatorId: null }, data: { creatorId: profileId } });
        if (res.count !== 1) throw new Error(`mod ${row.modId} was linked meanwhile — transaction rolled back`);
        linked++;
      });
    }
    console.log(`APPLIED: ${created} pending profile(s) created, ${linked} mod(s) linked; ${drifted.length} plan row(s) skipped as drifted`);

    // Read-back as a separate query on the field the change alters.
    let ok = 0;
    for (const row of rows) {
      const mod = await prisma.mod.findUnique({ where: { id: row.modId }, select: { creatorId: true, creator: { select: { handle: true, isVerified: true, userId: true } } } });
      const good = !!mod?.creator && mod.creator.userId === row.userId && mod.creator.isVerified === false
        && (row.action === 'link' || mod.creator.handle === row.handle);
      if (good) ok++;
      console.log(`  read-back ${row.modId}: ${good ? 'OK' : 'MISMATCH'} (${mod?.creator?.handle ?? 'no creator'})`);
    }
    console.log(`READ-BACK: ${ok}/${rows.length}`);
    return ok === rows.length ? 0 : 1;
  } catch (error) {
    console.error('could not run:', String((error as Error)?.message ?? error).slice(0, 200));
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
