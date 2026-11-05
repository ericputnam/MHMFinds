/**
 * Backfill `Mod.author` from the CurseForge API for SFW mods that link a
 * CurseForge Sims 4 project but carry no usable author (Nova, E340,
 * 2026-11-05). Tier 0 catalog data under autonomy.md: dry run first, frozen
 * plan, ≤ MAX_BACKFILL_ROWS rows, read-back, rollback.
 *
 *   npx tsx scripts/agents/curseforge-author-backfill.ts            # dry run: lookup + print + write frozen plan
 *   npx tsx scripts/agents/curseforge-author-backfill.ts --apply    # write frozen rows whose live author still equals the plan's prior
 *   npx tsx scripts/agents/curseforge-author-backfill.ts --rollback # restore the prior where the row still holds what we wrote
 *   … --plan=curseforge-authors-YYYY-MM-DD.json                     # default: today's (UTC) plan name
 *   … --replace-plan                                                # dry run may overwrite an existing plan with no applied rows
 *
 * Only `Mod.author` is written. Selection and rules live in the lib. The API
 * key is read from the env and never printed. Exit: 0 ok, 1 refused, 2 could-not-run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { authorSlug, creatorKey } from '../../lib/creatorSlug';
import { MIN_MODS_FOR_PAGE } from '../../lib/creators';
import { CURSEFORGE_SIMS4_GAME_ID } from './approve-submissions-lib';
import {
  MAX_BACKFILL_ROWS,
  type AuthorLookup,
  type BackfillRow,
  type SetDecision,
  isUnusableAuthor,
  parsePlanName,
  planBackfill,
  preferExistingPage,
  rollbackable,
  settable,
  stillApplicable,
  targetSlug,
  unknownFlags,
} from './curseforge-author-backfill-lib';

const TRIAGE_DIR = resolve(process.cwd(), 'reports/funnel/triage');
const LOOKUP_TIMEOUT_MS = 15_000;
const LOOKUP_GAP_MS = 120;

interface PlanFile {
  experiment: 'E340';
  createdAt: string;
  rows: SetDecision[];
  skipped: Record<string, number>;
  impact: { distinctAuthors: number; pagesGrown: number; pagesNew: number; modsOntoPages: number; grownSlugs: string[]; newSlugs: string[] };
  applied: string[];
  appliedAt?: string;
  rolledBack?: string[];
}

async function lookupSlug(slug: string, key: string): Promise<AuthorLookup> {
  const url = `https://api.curseforge.com/v1/mods/search?gameId=${CURSEFORGE_SIMS4_GAME_ID}&slug=${encodeURIComponent(slug)}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'x-api-key': key, Accept: 'application/json' }, signal: ctl.signal });
    if (!res.ok) return { kind: 'unreachable', detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { data?: Array<{ id: number; slug: string; authors?: Array<{ name: string }> }> };
    const hit = (body.data ?? []).find((m) => m.slug === slug);
    if (!hit) return { kind: 'not-found' };
    return { kind: 'found', projectId: hit.id, authors: (hit.authors ?? []).map((a) => a.name) };
  } catch (error) {
    return { kind: 'unreachable', detail: String((error as Error)?.message ?? error).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

async function readSfw(prisma: PrismaClient): Promise<BackfillRow[]> {
  return prisma.mod.findMany({
    where: { isNSFW: false },
    select: { id: true, title: true, author: true, downloadUrl: true, sourceUrl: true },
  });
}

/** Existing usable authors: rows per creator key and the most-used spelling of each. */
function existingSpellings(all: BackfillRow[]): { keyCounts: Map<string, number>; spellingOf: Map<string, string> } {
  const keyCounts = new Map<string, number>();
  const bySpelling = new Map<string, Map<string, number>>();
  for (const r of all) {
    if (isUnusableAuthor(r.author)) continue;
    const a = (r.author as string).trim();
    const k = creatorKey(a);
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
    const m = bySpelling.get(k) ?? new Map<string, number>();
    m.set(a, (m.get(a) ?? 0) + 1);
    bySpelling.set(k, m);
  }
  const spellingOf = new Map<string, string>();
  bySpelling.forEach((m, k) => spellingOf.set(k, Array.from(m.entries()).sort((x, y) => y[1] - x[1])[0][0]));
  return { keyCounts, spellingOf };
}

function impactOf(all: BackfillRow[], rows: SetDecision[]): PlanFile['impact'] {
  const before = new Map<string, number>();
  for (const r of all) {
    if (isUnusableAuthor(r.author)) continue;
    const k = creatorKey(r.author as string);
    before.set(k, (before.get(k) ?? 0) + 1);
  }
  const gain = new Map<string, number>();
  for (const d of rows) gain.set(creatorKey(d.next), (gain.get(creatorKey(d.next)) ?? 0) + 1);
  const slugOf = new Map<string, string>();
  for (const d of rows) slugOf.set(creatorKey(d.next), authorSlug(d.next));
  const grownSlugs: string[] = [];
  const newSlugs: string[] = [];
  let modsOntoPages = 0;
  for (const [k, n] of Array.from(gain.entries())) {
    const b = before.get(k) ?? 0;
    if (b >= MIN_MODS_FOR_PAGE) {
      grownSlugs.push(slugOf.get(k) as string);
      modsOntoPages += n;
    } else if (b + n >= MIN_MODS_FOR_PAGE) {
      newSlugs.push(slugOf.get(k) as string);
      modsOntoPages += n;
    }
  }
  grownSlugs.sort();
  newSlugs.sort();
  return { distinctAuthors: gain.size, pagesGrown: grownSlugs.length, pagesNew: newSlugs.length, modsOntoPages, grownSlugs, newSlugs };
}

async function liveAuthors(prisma: PrismaClient, ids: string[]): Promise<Map<string, string | null>> {
  const rows = await prisma.mod.findMany({ where: { id: { in: ids } }, select: { id: true, author: true } });
  return new Map(rows.map((r) => [r.id, r.author]));
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
    console.error('refused: --plan must be a basename like curseforge-authors-YYYY-MM-DD.json');
    return 1;
  }
  const planName = planArg ?? `curseforge-authors-${new Date().toISOString().slice(0, 10)}.json`;
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
        // Every plan row, not just `applied`: the plan on main is written before
        // the apply, so its `applied` list may be empty. rollbackable() only
        // touches rows that still hold exactly the author this plan wrote.
        const appliedRows = plan.rows;
        const live = await liveAuthors(prisma, appliedRows.map((d) => d.id));
        const targets = rollbackable(appliedRows, live);
        for (const d of targets) await prisma.mod.update({ where: { id: d.id }, data: { author: d.prior } });
        plan.rolledBack = targets.map((d) => d.id);
        writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
        console.log(`rollback: restored ${targets.length}/${appliedRows.length} (others changed since apply — left alone)`);
        return 0;
      }
      if (plan.applied.length > 0) {
        console.error(`refused: plan already applied (${plan.applied.length} rows) — rollback first or use a new plan`);
        return 1;
      }
      const live = await liveAuthors(prisma, plan.rows.map((d) => d.id));
      const { apply: rows, drifted } = stillApplicable(plan.rows, live);
      if (rows.length > MAX_BACKFILL_ROWS) {
        console.error(`refused: ${rows.length} rows > cap ${MAX_BACKFILL_ROWS}`);
        return 1;
      }
      const applied: string[] = [];
      for (const d of rows) {
        // Conditional on the prior value: a concurrent hand fix is never overwritten.
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
    const key = process.env.CURSEFORGE_API_KEY;
    if (!key) {
      console.error('could-not-run: CURSEFORGE_API_KEY unset');
      return 2;
    }
    const all = await readSfw(prisma);
    const targets = all.filter((r) => targetSlug(r) !== null);
    if (targets.length === 0) {
      console.error('could-not-run: 0 target rows (vacuity guard — expected hundreds on 2026-11-05)');
      return 2;
    }
    const lookups = new Map<string, AuthorLookup>();
    for (const r of targets) {
      const slug = targetSlug(r) as string;
      if (lookups.has(slug)) continue;
      lookups.set(slug, await lookupSlug(slug, key));
      await new Promise((res) => setTimeout(res, LOOKUP_GAP_MS));
    }
    const decisions = planBackfill(targets, lookups);
    const { keyCounts, spellingOf } = existingSpellings(all);
    const rows = settable(decisions).map((d) => {
      const next = preferExistingPage(d.next, keyCounts, spellingOf, MIN_MODS_FOR_PAGE, creatorKey);
      if (next !== d.next) console.log(`  spelling: ${JSON.stringify(d.next)} → ${JSON.stringify(next)} (existing page)`);
      return { ...d, next };
    });
    const skipped: Record<string, number> = {};
    for (const d of decisions) if (d.action === 'skip') skipped[d.reason] = (skipped[d.reason] ?? 0) + 1;
    const unreachable = skipped.unreachable ?? 0;
    if (unreachable > targets.length / 10) {
      console.error(`could-not-run: ${unreachable}/${targets.length} lookups unreachable — no plan written`);
      return 2;
    }
    const impact = impactOf(all, rows);
    const plan: PlanFile = { experiment: 'E340', createdAt: new Date().toISOString(), rows, skipped, impact, applied: [] };
    writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
    for (const d of rows.slice(0, 15)) console.log(`  set ${d.id} cf=${d.slug} ${JSON.stringify(d.prior)} → ${JSON.stringify(d.next)}`);
    console.log(
      `dry run: targets ${targets.length} · set ${rows.length} · skipped ${JSON.stringify(skipped)} · ` +
        `authors ${impact.distinctAuthors} · creator pages grown ${impact.pagesGrown}, new ${impact.pagesNew} · mods onto pages ${impact.modsOntoPages}`,
    );
    console.log(`plan: reports/funnel/triage/${planName}`);
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
