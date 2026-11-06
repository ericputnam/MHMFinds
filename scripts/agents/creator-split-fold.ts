/**
 * Fold suffix-split creator spellings into the creator's one page (Nova,
 * E356, 2026-11-06). Rewrites `Mod.author` on SFW mods whose author key is
 * a key in MOVED_CREATOR_KEYS (lib/creatorSlug.ts) to the most-used spelling
 * of the canonical slug. Tier 0 catalog data under autonomy.md: dry run
 * first, frozen plan on main, ≤ MAX_FOLD_ROWS, conditional write, read-back,
 * rollback. The emptied slug 308s via movedCreatorSlug() (same constant).
 *
 *   npx tsx scripts/agents/creator-split-fold.ts                  # dry run: print + write frozen plan
 *   npx tsx scripts/agents/creator-split-fold.ts --apply          # write frozen rows whose live author still equals the prior
 *   npx tsx scripts/agents/creator-split-fold.ts --rollback       # restore the prior where the row still holds what we wrote
 *   … --plan=creator-split-fold-YYYY-MM-DD.json                   # default: today's (UTC) plan name
 *   … --replace-plan                                              # dry run may overwrite an unapplied plan
 *
 * Only `Mod.author` is written. Exit: 0 ok, 1 refused, 2 could-not-run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { MOVED_CREATOR_KEYS } from '../../lib/creatorSlug';
import {
  MAX_FOLD_ROWS,
  type FoldDecision,
  type FoldTarget,
  foldTargets,
  parsePlanName,
  planFold,
  rollbackable,
  stillApplicable,
  unknownFlags,
} from './creator-split-fold-lib';

const TRIAGE_DIR = resolve(process.cwd(), 'reports/funnel/triage');

interface PlanFile {
  experiment: 'E356';
  createdAt: string;
  targets: FoldTarget[];
  rows: FoldDecision[];
  applied: string[];
  appliedAt?: string;
  rolledBack?: string[];
}

async function liveAuthors(prisma: PrismaClient, ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 500) {
    const rows = await prisma.mod.findMany({ where: { id: { in: ids.slice(i, i + 500) } }, select: { id: true, author: true } });
    for (const r of rows) out.set(r.id, r.author);
  }
  return out;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const bad = unknownFlags(argv);
  if (bad.length) {
    console.error(`refused: unknown flag(s) ${bad.join(' ')}`);
    return 1;
  }
  const planArg = parsePlanName(argv);
  if (planArg === '') {
    console.error('refused: --plan must be a basename like creator-split-fold-YYYY-MM-DD.json');
    return 1;
  }
  const planName = planArg ?? `creator-split-fold-${new Date().toISOString().slice(0, 10)}.json`;
  const planPath = resolve(TRIAGE_DIR, planName);
  const apply = argv.includes('--apply');
  const rollback = argv.includes('--rollback');
  if (apply && rollback) {
    console.error('refused: --apply and --rollback are exclusive');
    return 1;
  }

  const prisma = new PrismaClient();
  try {
    if (apply || rollback) {
      if (!existsSync(planPath)) {
        console.error(`refused: no plan at reports/funnel/triage/${planName} — run the dry run first`);
        return 1;
      }
      const plan = JSON.parse(readFileSync(planPath, 'utf8')) as PlanFile;
      if (rollback) {
        const live = await liveAuthors(prisma, plan.rows.map((d) => d.id));
        const targets = rollbackable(plan.rows, live);
        let restored = 0;
        for (const d of targets) {
          restored += (await prisma.mod.updateMany({ where: { id: d.id, author: d.next }, data: { author: d.prior } })).count;
        }
        plan.rolledBack = targets.map((d) => d.id);
        writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
        console.log(`rollback: restored ${restored}/${plan.rows.length} (others changed since apply — left alone)`);
        return 0;
      }
      if (plan.applied.length > 0) {
        console.error(`refused: plan already applied (${plan.applied.length} rows) — rollback first or use a new plan`);
        return 1;
      }
      if (plan.rows.length > MAX_FOLD_ROWS) {
        console.error(`refused: ${plan.rows.length} rows > cap ${MAX_FOLD_ROWS}`);
        return 1;
      }
      const live = await liveAuthors(prisma, plan.rows.map((d) => d.id));
      const { apply: rows, drifted } = stillApplicable(plan.rows, live);
      const applied: string[] = [];
      for (const d of rows) {
        const res = await prisma.mod.updateMany({ where: { id: d.id, author: d.prior }, data: { author: d.next } });
        if (res.count === 1) applied.push(d.id);
      }
      plan.applied = applied;
      plan.appliedAt = new Date().toISOString();
      writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
      const back = await liveAuthors(prisma, applied);
      const ok = plan.rows.filter((d) => applied.includes(d.id) && back.get(d.id) === d.next).length;
      console.log(`apply: wrote ${applied.length}/${plan.rows.length} (drifted ${drifted.length}) · read-back ${ok}/${applied.length} hold the new author`);
      return ok === applied.length ? 0 : 1;
    }

    // Dry run.
    if (existsSync(planPath)) {
      const prior = JSON.parse(readFileSync(planPath, 'utf8')) as PlanFile;
      if (prior.applied?.length || !argv.includes('--replace-plan')) {
        console.error(`refused: plan reports/funnel/triage/${planName} exists${prior.applied?.length ? ' and is applied' : ''} (--replace-plan to overwrite an unapplied one)`);
        return 1;
      }
    }
    const counts = (
      await prisma.$queryRaw<Array<{ author: string; n: number }>>`
        SELECT author, COUNT(*)::int AS n FROM mods
        WHERE author IS NOT NULL AND "isNSFW" = false
        GROUP BY author`
    ).map((r) => ({ author: r.author, n: Number(r.n) }));
    const targets = foldTargets(MOVED_CREATOR_KEYS, counts);
    for (const t of targets) {
      console.log(`  ${t.fromKey} (${t.fromKeyMods}) → /creator/${t.toSlug}/ (${t.toKeyMods}) as ${t.spelling === null ? 'REFUSED (stale map)' : JSON.stringify(t.spelling)}`);
    }
    const refused = targets.filter((t) => t.spelling === null);
    if (refused.length) {
      console.error(`refused: ${refused.length} pair(s) have no live target spelling or move large→small — fix MOVED_CREATOR_KEYS first`);
      return 1;
    }
    const fromKeys = Object.keys(MOVED_CREATOR_KEYS);
    const rows = await prisma.$queryRaw<Array<{ id: string; author: string }>>`
      SELECT id, author FROM mods
      WHERE author IS NOT NULL AND "isNSFW" = false
        AND regexp_replace(lower(author), '[^a-z0-9]+', '', 'g') = ANY(${fromKeys})`;
    const decisions = planFold(rows, targets);
    if (decisions.length === 0) {
      console.error('could-not-run: 0 rows to fold (vacuity guard — expected ~90 on 2026-11-06)');
      return 2;
    }
    if (decisions.length > MAX_FOLD_ROWS) {
      console.error(`refused: ${decisions.length} rows > cap ${MAX_FOLD_ROWS}`);
      return 1;
    }
    const plan: PlanFile = { experiment: 'E356', createdAt: new Date().toISOString(), targets, rows: decisions, applied: [] };
    writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
    const byPair = new Map<string, number>();
    for (const d of decisions) byPair.set(`${JSON.stringify(d.prior)} → ${JSON.stringify(d.next)}`, (byPair.get(`${JSON.stringify(d.prior)} → ${JSON.stringify(d.next)}`) ?? 0) + 1);
    byPair.forEach((n, k) => console.log(`  set ${n}× ${k}`));
    console.log(`dry run: ${decisions.length} rows across ${targets.length} creators · plan: reports/funnel/triage/${planName}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`could-not-run: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
    process.exit(2);
  },
);
