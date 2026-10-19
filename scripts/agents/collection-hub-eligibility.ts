#!/usr/bin/env npx tsx
/**
 * READ-ONLY hub-eligibility read (Sage, E238, 2026-10-19). Never writes.
 *
 * Mirrors the hub page's own selection — `buildWhereClause(filter)` +
 * `gameVersion` + `isNSFW: false`, ordered `downloadCount desc, createdAt desc`
 * (app/games/[game]/[topic]/page.tsx) — so the grade is on the grid a visitor
 * would see, not on a count. Prints the rule, then the top-N table, then the
 * verdict; with a watchlist it also prints each watchlist row's current
 * `isNSFW` regardless of the page filter, so a flag pass can be read as a diff.
 *
 *   npx tsx scripts/agents/collection-hub-eligibility.ts --content-type=gameplay-mod,script-mod,career --family=gameplay --watchlist=gameplay
 *   npx tsx scripts/agents/collection-hub-eligibility.ts --slug=eyes-cc            # grade an existing registry entry
 *   npx tsx scripts/agents/collection-hub-eligibility.ts --content-type=lot --top=30 --min-rows=20
 */
import '../lib/setup-env';

import { prisma } from '../../lib/prisma';
import { buildWhereClause, getCollection, type CollectionFacetQuery } from '../../lib/collections';
import {
  DEFAULT_RULE,
  GAMEPLAY_ADULT_WATCHLIST,
  formatGrade,
  formatRule,
  gradeHub,
  type HubRow,
  type HubRule,
} from './collection-hub-eligibility-lib';

function arg(name: string): string | undefined {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : undefined;
}

async function main() {
  const slug = arg('slug');
  const game = arg('game') ?? 'Sims 4';
  const gameSlug = arg('game-slug') ?? 'sims-4';
  const family = arg('family') as 'gameplay' | undefined;
  const watchlistName = arg('watchlist');
  const rule: HubRule = {
    minRows: Number(arg('min-rows') ?? DEFAULT_RULE.minRows),
    topN: Number(arg('top') ?? DEFAULT_RULE.topN),
  };

  let filter: CollectionFacetQuery;
  let label: string;
  if (slug) {
    const c = getCollection(gameSlug, slug);
    if (!c) throw new Error(`no registry entry ${gameSlug}/${slug}`);
    filter = c.filter;
    label = `/games/${gameSlug}/${slug}/ (registry, expectedCount ${c.expectedCount})`;
  } else {
    const ct = arg('content-type');
    if (!ct) throw new Error('pass --slug=<registry slug> or --content-type=a,b,c');
    const types = ct.split(',').map((s) => s.trim()).filter(Boolean);
    filter = types.length === 1 ? { contentType: types[0] } : { contentTypeIn: types };
    label = `candidate contentType ${types.join('+')}`;
  }

  const watchlist = watchlistName === 'gameplay' ? GAMEPLAY_ADULT_WATCHLIST : [];

  console.log(`Hub eligibility read — ${label} — ${new Date().toISOString().slice(0, 16)}Z`);
  console.log(formatRule(rule, family));
  console.log('');

  const where = { ...buildWhereClause(filter), gameVersion: game, isNSFW: false };
  const orderBy = [{ downloadCount: 'desc' as const }, { createdAt: 'desc' as const }];
  const [top, totalSfw] = await Promise.all([
    prisma.mod.findMany({
      where,
      orderBy,
      take: rule.topN,
      select: { id: true, title: true, contentType: true, isNSFW: true, downloadCount: true },
    }),
    prisma.mod.count({ where }),
  ]);

  const rows: HubRow[] = top.map((m) => ({
    id: m.id,
    title: m.title,
    contentType: m.contentType,
    isNSFW: m.isNSFW,
    downloadCount: m.downloadCount ?? 0,
  }));

  console.log(`TOP ${rows.length} (page order: downloadCount desc, createdAt desc)`);
  rows.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(3)}. ${String(r.downloadCount).padStart(6)} ${r.contentType ?? '-'} | ${r.id} | ${r.title}`);
  });
  console.log('');

  const grade = gradeHub(rows, totalSfw, { rule, family, watchlist });
  console.log(formatGrade(grade));

  if (watchlist.length > 0) {
    const flags = await prisma.mod.findMany({
      where: { id: { in: watchlist.map((w) => w.id) } },
      select: { id: true, title: true, isNSFW: true, contentType: true },
    });
    const byId = new Map(flags.map((f) => [f.id, f]));
    const flagged = watchlist.filter((w) => byId.get(w.id)?.isNSFW === true).length;
    console.log('');
    console.log(`WATCHLIST ${watchlist.length} ids · isNSFW=true ${flagged} · missing ${watchlist.filter((w) => !byId.has(w.id)).length}`);
    for (const w of watchlist) {
      const f = byId.get(w.id);
      console.log(`  ${w.id} ${w.label.padEnd(18)} isNSFW=${f ? String(f.isNSFW) : 'MISSING'} contentType=${f?.contentType ?? '-'}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
