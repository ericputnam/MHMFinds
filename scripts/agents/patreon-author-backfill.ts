/**
 * Backfill `Mod.author` from Patreon's public post API for SFW mods that link
 * a Patreon post but carry no usable author (Nova, E370, 2026-11-07). Tier 0
 * catalog data under autonomy.md: dry run first, frozen plan, ≤
 * MAX_PATREON_BACKFILL_ROWS rows, read-back, rollback. Same shape as E340's
 * curseforge-author-backfill.ts.
 *
 *   npx tsx scripts/agents/patreon-author-backfill.ts               # dry run: lookup + print + write frozen plan
 *   npx tsx scripts/agents/patreon-author-backfill.ts --limit=200   # dry probe on the first 200 posts (prints; writes no plan)
 *   npx tsx scripts/agents/patreon-author-backfill.ts --apply       # write frozen rows whose live author still equals the plan's prior
 *   npx tsx scripts/agents/patreon-author-backfill.ts --rollback    # restore the prior where the row still holds what we wrote
 *   … --plan=patreon-authors-YYYY-MM-DD.json                        # default: today's (UTC) plan name
 *   … --replace-plan                                                # dry run may overwrite an existing unapplied plan
 *
 * The client identifies itself honestly (no browser UA) and stops on the
 * first 429 or a blanket 401/403 — autonomy.md never scrapes a source that
 * refuses us. Only `Mod.author` is written. Exit: 0 ok, 1 refused, 2 could-not-run.
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
import {
  MAX_PATREON_BACKFILL_ROWS,
  type BackfillRow,
  type PostLookup,
  type SetDecision,
  isUnusableAuthor,
  parseLimit,
  parsePlanName,
  planBackfill,
  resolveSpelling,
  rollbackable,
  settable,
  shouldAbort,
  stillApplicable,
  targetPostId,
  unknownFlags,
} from './patreon-author-backfill-lib';

const TRIAGE_DIR = resolve(process.cwd(), 'reports/funnel/triage');
const LOOKUP_TIMEOUT_MS = 15_000;
const LOOKUP_GAP_MS = 400;
const USER_AGENT = 'MHMFinds-catalog/1.0 (+https://musthavemods.com; creator attribution)';

interface PlanFile {
  experiment: 'E370';
  createdAt: string;
  rows: SetDecision[];
  skipped: Record<string, number>;
  impact: { distinctAuthors: number; pagesGrown: number; pagesNew: number; modsOntoPages: number; grownSlugs: string[]; newSlugs: string[] };
  applied: string[];
  appliedAt?: string;
  rolledBack?: string[];
}

type Lookup = PostLookup & { status?: number };

async function lookupPost(postId: string): Promise<Lookup> {
  const url =
    `https://www.patreon.com/api/posts/${postId}?include=campaign` +
    '&fields%5Bcampaign%5D=name,vanity,is_nsfw&fields%5Bpost%5D=title';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: ctl.signal });
    if (res.status === 404 || res.status === 410) return { kind: 'not-found', status: res.status };
    if (res.status === 401 || res.status === 403) return { kind: 'forbidden', status: res.status };
    if (!res.ok) return { kind: 'unreachable', detail: `HTTP ${res.status}`, status: res.status };
    const body = (await res.json()) as {
      data?: { relationships?: { campaign?: { data?: { id: string } | null } } };
      included?: Array<{ id: string; type: string; attributes?: { name?: string; vanity?: string; is_nsfw?: boolean } }>;
    };
    const cid = body.data?.relationships?.campaign?.data?.id ?? null;
    const camp = (body.included ?? []).find((i) => i.type === 'campaign' && (!cid || i.id === cid));
    if (!camp) return { kind: 'found', campaignId: cid, name: null, vanity: null, isNsfw: false };
    return {
      kind: 'found',
      campaignId: camp.id,
      name: camp.attributes?.name ?? null,
      vanity: camp.attributes?.vanity ?? null,
      isNsfw: camp.attributes?.is_nsfw === true,
    };
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

function impactOf(keyCounts: Map<string, number>, rows: SetDecision[]): PlanFile['impact'] {
  const gain = new Map<string, number>();
  const slugOf = new Map<string, string>();
  for (const d of rows) {
    const k = creatorKey(d.next);
    gain.set(k, (gain.get(k) ?? 0) + 1);
    slugOf.set(k, authorSlug(d.next));
  }
  const grownSlugs: string[] = [];
  const newSlugs: string[] = [];
  let modsOntoPages = 0;
  for (const [k, n] of Array.from(gain.entries())) {
    const b = keyCounts.get(k) ?? 0;
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
  const out = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 1000) {
    const rows = await prisma.mod.findMany({ where: { id: { in: ids.slice(i, i + 1000) } }, select: { id: true, author: true } });
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
    console.error('refused: --plan must be a basename like patreon-authors-YYYY-MM-DD.json');
    return 1;
  }
  const limit = parseLimit(argv);
  if (Number.isNaN(limit)) {
    console.error('refused: --limit must be a positive integer');
    return 1;
  }
  const planName = planArg ?? `patreon-authors-${new Date().toISOString().slice(0, 10)}.json`;
  const planPath = resolve(TRIAGE_DIR, planName);
  const apply = argv.includes('--apply');
  const rollback = argv.includes('--rollback');
  if (apply && rollback) {
    console.error('refused: --apply and --rollback are exclusive');
    return 1;
  }
  if (limit !== null && (apply || rollback)) {
    console.error('refused: --limit is a dry-run probe only');
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
        // Every plan row: the plan on main is written before the apply, so `applied` may be empty there.
        const live = await liveAuthors(prisma, plan.rows.map((d) => d.id));
        const targets = rollbackable(plan.rows, live);
        for (const d of targets) await prisma.mod.updateMany({ where: { id: d.id, author: d.next }, data: { author: d.prior } });
        plan.rolledBack = targets.map((d) => d.id);
        writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
        console.log(`rollback: restored ${targets.length}/${plan.rows.length} (others changed since apply — left alone)`);
        return 0;
      }
      if (plan.applied.length > 0) {
        console.error(`refused: plan already applied (${plan.applied.length} rows) — rollback first or use a new plan`);
        return 1;
      }
      const live = await liveAuthors(prisma, plan.rows.map((d) => d.id));
      const { apply: rows, drifted } = stillApplicable(plan.rows, live);
      if (rows.length > MAX_PATREON_BACKFILL_ROWS) {
        console.error(`refused: ${rows.length} rows > cap ${MAX_PATREON_BACKFILL_ROWS}`);
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
      const appliedSet = new Set(applied);
      const ok = plan.rows.filter((d) => appliedSet.has(d.id) && back.get(d.id) === d.next).length;
      console.log(`apply: wrote ${applied.length}/${plan.rows.length} (drifted ${drifted.length}) · read-back ${ok}/${applied.length} hold the new author`);
      return ok === applied.length ? 0 : 1;
    }

    // Dry run.
    if (limit === null && existsSync(planPath)) {
      const prior = JSON.parse(readFileSync(planPath, 'utf8')) as PlanFile;
      if (prior.applied?.length || !argv.includes('--replace-plan')) {
        console.error(`refused: plan reports/funnel/triage/${planName} exists${prior.applied?.length ? ' and is applied' : ''} (--replace-plan to overwrite an unapplied one)`);
        return 1;
      }
    }
    const all = await readSfw(prisma);
    let targets = all.filter((r) => targetPostId(r) !== null);
    if (targets.length === 0) {
      console.error('could-not-run: 0 target rows (vacuity guard — expected ~3,600 on 2026-11-07)');
      return 2;
    }
    if (limit !== null) {
      const keep = new Set(Array.from(new Set(targets.map((r) => targetPostId(r) as string))).slice(0, limit));
      targets = targets.filter((r) => keep.has(targetPostId(r) as string));
    }
    const lookups = new Map<string, PostLookup>();
    const counts = { done: 0, unreachable: 0, forbidden: 0, rateLimited: 0 };
    for (const r of targets) {
      const id = targetPostId(r) as string;
      if (lookups.has(id)) continue;
      const l = await lookupPost(id);
      lookups.set(id, l);
      counts.done += 1;
      if (l.kind === 'unreachable') counts.unreachable += 1;
      if (l.kind === 'forbidden') counts.forbidden += 1;
      if (l.status === 429) counts.rateLimited += 1;
      const why = shouldAbort(counts);
      if (why) {
        console.error(`could-not-run: Patreon ${why} after ${counts.done} lookups — stopped, no plan written`);
        return 2;
      }
      if (counts.done % 250 === 0) console.log(`  … ${counts.done} posts looked up`);
      await new Promise((res) => setTimeout(res, LOOKUP_GAP_MS));
    }
    const decisions = planBackfill(targets, lookups);
    const { keyCounts, spellingOf } = existingSpellings(all);
    const skipped: Record<string, number> = {};
    const rows: SetDecision[] = [];
    for (const d of settable(decisions)) {
      const next = resolveSpelling(d, keyCounts, spellingOf, MIN_MODS_FOR_PAGE);
      if (next === null) {
        skipped['ambiguous-identity'] = (skipped['ambiguous-identity'] ?? 0) + 1;
        console.log(`  ambiguous: ${JSON.stringify(d.next)} (vanity ${JSON.stringify(d.vanity)} owns another page) — skipped`);
        continue;
      }
      if (next !== d.next) console.log(`  spelling: ${JSON.stringify(d.next)} → ${JSON.stringify(next)} (existing page)`);
      rows.push({ ...d, next });
    }
    for (const d of decisions) if (d.action === 'skip') skipped[d.reason] = (skipped[d.reason] ?? 0) + 1;
    const impact = impactOf(keyCounts, rows);
    for (const d of rows.slice(0, 15)) console.log(`  set ${d.id} post=${d.postId} ${JSON.stringify(d.prior)} → ${JSON.stringify(d.next)}`);
    console.log(
      `dry run: targets ${targets.length} · posts ${counts.done} · set ${rows.length} · skipped ${JSON.stringify(skipped)} · ` +
        `authors ${impact.distinctAuthors} · creator pages grown ${impact.pagesGrown}, new ${impact.pagesNew} · mods onto pages ${impact.modsOntoPages}`,
    );
    if (limit !== null) {
      console.log(`probe only (--limit=${limit}): no plan written`);
      console.log(`  new pages (probe): ${impact.newSlugs.join(', ')}`);
      return 0;
    }
    const plan: PlanFile = { experiment: 'E370', createdAt: new Date().toISOString(), rows, skipped, impact, applied: [] };
    writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
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
