/**
 * E242 (Rowan, 2026-10-19) — write the hand-audited `isNSFW` pins for the 8
 * adult-themed titles in the gameplay-mod / script-mod top 25. Tier 0
 * catalog-data fix: dry run first, frozen rollback file, narrow `--ids` scope.
 *
 *   npx tsx scripts/e242-isnsfw-pass.ts             # dry run: print plan, write rollback file (write-once)
 *   npx tsx scripts/e242-isnsfw-pass.ts --apply     # write only the E242 pins; refuses if rows drifted from the rollback file
 *   npx tsx scripts/e242-isnsfw-pass.ts --rollback  # restore every row to the prior value in the rollback file
 *
 * The plan is HAND_AUDITED_NSFW (scripts/lib/hand-audited-content-types.ts),
 * restricted to entries whose `why` starts with "E242 ". It never decides a
 * value itself. Prints titles only, never descriptions.
 * Exit codes: 0 ok, 1 refused, 2 could-not-run (DB error).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { HAND_AUDITED_NSFW } from './lib/hand-audited-content-types';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..');
const ROLLBACK_PATH = resolve(PROJECT_DIR, 'reports/funnel/triage/e242-rollback.json');
const LABEL = 'E242 ';

interface RollbackRow {
  id: string;
  title: string;
  priorIsNSFW: boolean;
  targetIsNSFW: boolean;
}

async function main(): Promise<number> {
  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry';
  const plan = Object.entries(HAND_AUDITED_NSFW).filter(([, v]) => v.why.startsWith(LABEL));
  if (plan.length === 0) {
    console.error('refused: no E242 pins found');
    return 1;
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.mod.findMany({
      where: { id: { in: plan.map(([id]) => id) } },
      select: { id: true, title: true, isNSFW: true, contentType: true },
    });
    if (rows.length !== plan.length) {
      console.error(`refused: plan has ${plan.length} ids, DB returned ${rows.length}`);
      return 1;
    }
    const byId = new Map(rows.map((r) => [r.id, r]));

    if (mode === 'rollback') {
      if (!existsSync(ROLLBACK_PATH)) {
        console.error(`refused: no rollback file at ${ROLLBACK_PATH}`);
        return 1;
      }
      const rb = JSON.parse(readFileSync(ROLLBACK_PATH, 'utf8')) as RollbackRow[];
      for (const r of rb) {
        await prisma.mod.update({ where: { id: r.id }, data: { isNSFW: r.priorIsNSFW } });
        console.log(`restored ${r.id} isNSFW=${r.priorIsNSFW}  ${r.title}`);
      }
      return 0;
    }

    const table: RollbackRow[] = plan.map(([id, pin]) => {
      const row = byId.get(id)!;
      return { id, title: row.title, priorIsNSFW: row.isNSFW, targetIsNSFW: pin.isNSFW };
    });
    console.log('id                         prior  target  change  contentType   title');
    for (const r of table) {
      const ct = byId.get(r.id)!.contentType ?? 'NULL';
      const ch = r.priorIsNSFW === r.targetIsNSFW ? 'keep' : 'WRITE';
      console.log(`${r.id}  ${String(r.priorIsNSFW).padEnd(5)}  ${String(r.targetIsNSFW).padEnd(6)}  ${ch.padEnd(6)}  ${ct.padEnd(12)}  ${r.title}`);
    }
    const writes = table.filter((r) => r.priorIsNSFW !== r.targetIsNSFW);
    console.log(`plan: ${table.length} pinned, ${writes.length} to write, ${table.length - writes.length} keeps`);

    if (mode === 'dry') {
      if (existsSync(ROLLBACK_PATH)) {
        console.log(`rollback file exists, not overwritten: ${ROLLBACK_PATH}`);
      } else {
        writeFileSync(ROLLBACK_PATH, JSON.stringify(table, null, 2) + '\n');
        console.log(`wrote rollback file ${ROLLBACK_PATH}`);
      }
      return 0;
    }

    // apply
    if (!existsSync(ROLLBACK_PATH)) {
      console.error('refused: run the dry run first (no rollback file)');
      return 1;
    }
    const rb = JSON.parse(readFileSync(ROLLBACK_PATH, 'utf8')) as RollbackRow[];
    const rbById = new Map(rb.map((r) => [r.id, r]));
    for (const r of table) {
      const frozen = rbById.get(r.id);
      if (!frozen) {
        console.error(`refused: ${r.id} not in rollback file`);
        return 1;
      }
      if (frozen.priorIsNSFW !== r.priorIsNSFW && r.priorIsNSFW !== r.targetIsNSFW) {
        console.error(`refused: ${r.id} drifted since the dry run (frozen ${frozen.priorIsNSFW}, now ${r.priorIsNSFW})`);
        return 1;
      }
    }
    for (const r of writes) {
      await prisma.mod.update({ where: { id: r.id }, data: { isNSFW: r.targetIsNSFW } });
    }
    const after = await prisma.mod.findMany({ where: { id: { in: table.map((r) => r.id) } }, select: { id: true, isNSFW: true } });
    const atValue = after.filter((a) => a.isNSFW === HAND_AUDITED_NSFW[a.id].isNSFW).length;
    console.log(`applied: ${writes.length} written; read-back ${atValue}/${table.length} at pinned value`);
    return atValue === table.length ? 0 : 1;
  } catch (e) {
    console.error('could not run:', (e as Error).message);
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
