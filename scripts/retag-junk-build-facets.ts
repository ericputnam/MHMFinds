#!/usr/bin/env npx tsx
/**
 * Re-tag the mis-detected `lighting` and `curtains` content-type facets.
 *
 * WHY (Nova, 2026-09-08 — ideas-inbox item carried from PR #51 / E17)
 * --------------------------------------------------------------------
 * Both facets are junk. Of the 140 mods tagged `lighting`, the top rows by
 * downloads were a kitchen set, a GShade preset, a living-room set, a skin
 * overlay and a 2010 Ford Crown Victoria Police Interceptor. Of the 7 tagged
 * `curtains`, none were window treatments — one was a nail set and one was a
 * male hair pack ("curtain bangs").
 *
 * Two root causes, both fixed in `lib/services/contentTypeDetector.ts` in the
 * same PR as this script:
 *
 *   1. `keywordToRegex` already appends an optional `(?:s|es)?` plural, so a
 *      rule listing BOTH 'light' and 'lights' scored TWO matches from the one
 *      word "lights". The description pass promotes anything with >= 2 matches
 *      to medium confidence, so a single incidental word in a build set's
 *      description was enough to relabel the whole mod. Fixed by deduping
 *      matched keywords by stem before counting.
 *   2. The bare adjective 'light' was a `lighting` keyword, so "Light To
 *      Medium Skintones" and "Light Up Gaming PC" matched. Removed, along with
 *      negatives for gshade/reshade/preset/skintone/overlay. `curtains` gained
 *      negatives for bangs/hair.
 *
 * RE-TAG POLICY (deliberately conservative)
 * -----------------------------------------
 * Description-only detection is what produced this mess, so this script does
 * NOT use it. For each affected row it re-runs the fixed detector on the
 * TITLE ALONE:
 *
 *   - medium/high confidence  -> write that content type
 *   - low / no match          -> write NULL
 *
 * NULL is the correct answer for "we do not know": the mod drops out of every
 * facet filter instead of polluting one, and `scripts/fix-null-content-types.ts`
 * already exists to repair nulls later with better signals. It is strictly
 * better than leaving a police car in the lighting filter.
 *
 * Seven rows where the automated result was hand-checked and found wrong are
 * corrected by id in OVERRIDES below. Every one was eyeballed against its
 * title on 2026-09-08.
 *
 * SAFETY (autonomy.md Tier 0 limits for catalog scripts)
 * ------------------------------------------------------
 *   - dry run is the DEFAULT; `--apply` is required to write
 *   - hard cap of 5,000 rows per run, enforced below
 *   - only rows whose CURRENT contentType is in --facets are ever touched
 *   - a row whose new type equals its old type is skipped, not rewritten
 *
 * Usage:
 *   npx tsx scripts/retag-junk-build-facets.ts                  # dry run
 *   npx tsx scripts/retag-junk-build-facets.ts --apply
 *   npx tsx scripts/retag-junk-build-facets.ts --facets=lighting --limit=50
 *   npx tsx scripts/retag-junk-build-facets.ts --facets=nails --ids=id1,id2   # only those rows
 *   npx tsx scripts/retag-junk-build-facets.ts --room-titled-cas            # E132, see below
 *   ... --rollback-out=reports/funnel/x.json   # write {id,title,from,to} before any write
 *   npx tsx scripts/retag-junk-build-facets.ts --holidays-untitled         # E154, see below
 *
 * Every run prints the STRIP list (rows leaving each current facet), the ADD
 * list (rows entering each new facet) and the filter's selectivity (facet
 * population -> rows in scope -> rows changing). A filter that changes 0 rows
 * is a question, not a pass (E147, 2026-09-30).
 *
 * --room-titled-cas (Rowan, 2026-09-28, E132)
 * -------------------------------------------
 * Population: every row typed as a Create-a-Sim content type
 * (`CAS_CONTENT_TYPES`) whose TITLE passes a title-only room rule
 * (bedroom / kitchen / bathroom). Each is re-decided by
 * `guardRoomTitledContentType` — title-only build/buy answer or NULL — unless
 * it is hand-audited, in which case the pin wins. It also reads back every
 * E120 pin and reports how many rows still hold their pinned value: those are
 * explicit no-ops, and a pin that has drifted is printed by id.
 * `--facets` is ignored in this mode.
 *
 * --holidays-untitled (Rowan, 2026-10-01, E154)
 * ---------------------------------------------
 * Population: every row typed `holidays` whose TITLE names no holiday
 * (`lib/holidaysContentTypeRules.ts`), plus every pinned `holidays` row. Each
 * is re-decided by `guardHolidaysContentType` — title-only detector answer at
 * medium/high confidence, or NULL — unless pinned, in which case the pin wins.
 * Rows whose title names a holiday are never loaded into scope. Reads back
 * every E154 pin. `--facets` is ignored in this mode.
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import {
  CAS_CONTENT_TYPES,
  detectContentTypeWithConfidence,
  guardRoomTitledContentType,
  guardHolidaysContentType,
  isRoomTitle,
} from '../lib/services/contentTypeDetector';
import { isHolidaysTitle } from '../lib/holidaysContentTypeRules';
import { HAND_AUDITED_CONTENT_TYPES } from './lib/hand-audited-content-types';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/** autonomy.md: catalog scripts touch at most 5,000 rows per run. */
const MAX_ROWS = 5000;

const DEFAULT_FACETS = ['lighting', 'curtains'];

/**
 * Hand-audited corrections, keyed by mod id, for rows where title-only
 * detection lands on the wrong facet. First reviewed 2026-09-08.
 * `null` means "clear the content type" — the title does not support any facet.
 *
 * Moved to `scripts/lib/hand-audited-content-types.ts` on 2026-09-10 so that
 * `retag-null-content-types.ts` honours the same audit; without it, that script
 * re-tagged "Green Lantern - Injustice" as `lighting` — the exact junk this
 * script had just cleared.
 */
const OVERRIDES = HAND_AUDITED_CONTENT_TYPES;

type Row = { id: string; title: string; contentType: string | null; downloadCount: number };
type Change = { row: Row; to: string | null; reason: string };

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const verbose = argv.includes('--verbose');
  const facetsArg = argv.find(a => a.startsWith('--facets='));
  const limitArg = argv.find(a => a.startsWith('--limit='));
  const idsArg = argv.find(a => a.startsWith('--ids='));
  const facets = facetsArg ? facetsArg.slice('--facets='.length).split(',').filter(Boolean) : DEFAULT_FACETS;
  const parsedLimit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : MAX_ROWS;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 0), MAX_ROWS) : MAX_ROWS;
  // `--ids=` narrows the run to specific rows. A facet-wide re-tag is the
  // right tool when the detector is wrong about a whole *class* (lighting,
  // curtains, jewelry); it is the wrong tool when a handful of individual
  // rows are wrong for a handful of different reasons, because every other
  // row in the facet is then re-decided by title alone for no reason. The
  // facet filter still applies on top of this, so an id in another facet is
  // ignored rather than rewritten.
  const ids = idsArg ? idsArg.slice('--ids='.length).split(',').map(s => s.trim()).filter(Boolean) : null;
  const roomTitledCas = argv.includes('--room-titled-cas');
  const holidaysUntitled = argv.includes('--holidays-untitled');
  if (roomTitledCas && ids) throw new Error('--room-titled-cas and --ids= are separate modes; pass one.');
  if (holidaysUntitled && (ids || roomTitledCas)) throw new Error('--holidays-untitled is its own mode; pass it alone.');
  const rollbackArg = argv.find(a => a.startsWith('--rollback-out='));
  const rollbackOut = rollbackArg ? rollbackArg.slice('--rollback-out='.length) : null;
  const modeFacets = roomTitledCas ? Array.from(CAS_CONTENT_TYPES) : holidaysUntitled ? ['holidays'] : facets;
  return { apply, verbose, facets: modeFacets, limit, ids, roomTitledCas, holidaysUntitled, rollbackOut };
}

/** Decide the new content type for one row. Exported shape kept simple for testing. */
function decide(row: Row, roomTitledCas = false, holidaysUntitled = false): Change {
  const override = OVERRIDES[row.id];
  if (override) {
    return { row, to: override.contentType, reason: `override: ${override.why}` };
  }

  if (holidaysUntitled) {
    // E154: only the `holidays` answer is in question; the guard answers it.
    const to = guardHolidaysContentType(row.title, row.contentType) ?? null;
    return { row, to, reason: to ? 'holidays: title names no holiday; title-only type' : 'holidays: title names no holiday; NULL beats a guess' };
  }

  if (roomTitledCas) {
    // E132: never re-detect from scratch here — only the room-titled CAS
    // answer is in question, and the guard answers exactly that.
    const to = guardRoomTitledContentType(row.title, row.contentType) ?? null;
    return { row, to, reason: to ? 'room-titled: CAS suppressed, title names a build/buy type' : 'room-titled: CAS suppressed, NULL beats a guess' };
  }

  // Title only. Description-only inference is exactly what mis-tagged these rows.
  const result = detectContentTypeWithConfidence(row.title || '');
  if (result.confidence === 'low' || !result.contentType) {
    return { row, to: null, reason: `title gives no confident facet (${result.reasoning})` };
  }
  return { row, to: result.contentType, reason: result.reasoning ?? 'title match' };
}

async function main() {
  const { apply, verbose, facets, limit, ids, roomTitledCas, holidaysUntitled, rollbackOut } = parseArgs();

  console.log('='.repeat(72));
  console.log(`Re-tag junk build facets — ${apply ? 'APPLY' : 'DRY RUN'}${roomTitledCas ? ' — room-titled CAS (E132)' : ''}${holidaysUntitled ? ' — untitled holidays (E154)' : ''}`);
  console.log(`Facets: ${facets.join(', ')} · row cap: ${limit}`);
  if (ids) console.log(`Restricted to ${ids.length} id(s): ${ids.join(', ')}`);
  console.log('='.repeat(72));

  const loaded: Row[] = await prisma.mod.findMany({
    where: { contentType: { in: facets }, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, title: true, contentType: true, downloadCount: true },
    orderBy: { downloadCount: 'desc' },
    // The room filter runs in code, so the CAS population is read whole and
    // the 5,000-row write cap is enforced on the filtered set below.
    take: roomTitledCas || holidaysUntitled ? 25000 : limit, // bounded read: catalog is ~16.6k rows
  });

  // --room-titled-cas: keep only rows the guard would move (or that are pinned).
  const rows: Row[] = roomTitledCas
    ? loaded
        .filter(r => isRoomTitle(r.title))
        .filter(r => OVERRIDES[r.id] || guardRoomTitledContentType(r.title, r.contentType) !== r.contentType)
        .slice(0, limit)
    : holidaysUntitled
      ? loaded.filter(r => OVERRIDES[r.id] || !isHolidaysTitle(r.title)).slice(0, limit)
      : loaded;

  console.log(`\nLoaded ${loaded.length} rows${roomTitledCas ? `; ${rows.length} room-titled CAS rows in scope` : ''}${holidaysUntitled ? `; ${rows.length} untitled-or-pinned holidays rows in scope; ${loaded.length - rows.length} title-supported rows untouched` : ''}.\n`);

  if (holidaysUntitled) {
    // Read back every E154 pin: after an apply each must hold its pinned value.
    const pinIds = Object.keys(OVERRIDES).filter(id => OVERRIDES[id].why.startsWith('E154 '));
    const pinned = await prisma.mod.findMany({ where: { id: { in: pinIds } }, select: { id: true, contentType: true } });
    const drifted = pinned.filter(p => p.contentType !== OVERRIDES[p.id].contentType);
    console.log(`E154 pins: ${pinIds.length} · found ${pinned.length} · at pinned value ${pinned.length - drifted.length} · not yet / drifted ${drifted.length}`);
    if (pinned.length !== pinIds.length) console.log(`    MISSING ${pinIds.length - pinned.length} pinned id(s) from the catalog`);
  }

  if (roomTitledCas) {
    // Read back every E120 pin: each must still hold its pinned value (a no-op).
    const pinIds = Object.keys(OVERRIDES).filter(id => OVERRIDES[id].why.startsWith('E120 '));
    const pinned = await prisma.mod.findMany({
      where: { id: { in: pinIds } },
      select: { id: true, contentType: true },
    });
    const drifted = pinned.filter(p => p.contentType !== OVERRIDES[p.id].contentType);
    console.log(`E120 pins: ${pinIds.length} · found ${pinned.length} · at pinned value (no-op) ${pinned.length - drifted.length} · drifted ${drifted.length}`);
    for (const d of drifted) console.log(`    DRIFT ${d.id}: now ${d.contentType}, pin ${OVERRIDES[d.id].contentType}`);
    if (pinned.length !== pinIds.length) console.log(`    MISSING ${pinIds.length - pinned.length} pinned id(s) from the catalog`);
  }

  // A non-empty --ids list that matches nothing (or only some of it) is a
  // hard failure, not a quiet pass: the id does not exist, sits outside
  // --facets, or was already fixed — and the operator must know which.
  // (Rowan, 2026-09-27, E120.)
  if (ids) {
    const loaded = new Set(rows.map(r => r.id));
    const missing = ids.filter(id => !loaded.has(id));
    if (missing.length > 0) {
      await prisma.$disconnect();
      throw new Error(
        `--ids named ${missing.length} id(s) not loaded (absent, outside --facets, or over --limit): ${missing.join(', ')}`,
      );
    }
    const unpinned = rows.filter(r => !OVERRIDES[r.id]);
    if (unpinned.length > 0) {
      // --ids is the hand-audited mode; an unpinned row would silently fall
      // through to title-only re-detection, which is the facet-wide tool.
      await prisma.$disconnect();
      throw new Error(
        `--ids named ${unpinned.length} row(s) with no entry in hand-audited-content-types.ts: ${unpinned.map(r => r.id).join(', ')}`,
      );
    }
  }

  if (rows.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const changes: Change[] = [];
  let unchanged = 0;

  for (const row of rows) {
    const change = decide(row, roomTitledCas, holidaysUntitled);
    if (change.to === row.contentType) {
      unchanged++;
      continue;
    }
    changes.push(change);
  }

  // Group by destination so the diff reads as "what moves where".
  const byTarget = new Map<string, Change[]>();
  for (const c of changes) {
    const key = c.to ?? '(null)';
    const list = byTarget.get(key) ?? [];
    list.push(c);
    byTarget.set(key, list);
  }

  const ordered = Array.from(byTarget.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [target, list] of ordered) {
    console.log(`\n--> ${target}  (${list.length})`);
    const shown = verbose ? list : list.slice(0, 8);
    for (const c of shown) {
      console.log(`    ${c.row.contentType} -> ${target}  [${c.row.downloadCount} dl]  ${c.row.title.slice(0, 68)}`);
      if (verbose) console.log(`        ${c.reason}`);
    }
    if (!verbose && list.length > shown.length) {
      console.log(`    ... ${list.length - shown.length} more (use --verbose)`);
    }
  }

  // STRIP / ADD lists and selectivity (E147): read both directions, and never
  // take "changed 0" as a pass without knowing how many rows the filter saw.
  const population = await prisma.mod.count({ where: { contentType: { in: facets } } });
  const strip = new Map<string, number>();
  const add = new Map<string, number>();
  for (const c of changes) {
    const from = c.row.contentType ?? '(null)';
    strip.set(from, (strip.get(from) ?? 0) + 1);
    const to = c.to ?? '(null)';
    add.set(to, (add.get(to) ?? 0) + 1);
  }
  const fmt = (m: Map<string, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ') || '(none)';
  console.log('\n' + '-'.repeat(72));
  console.log(`STRIP (leaving) : ${fmt(strip)}`);
  console.log(`ADD   (entering): ${fmt(add)}`);
  const pct = (n: number, d: number) => (d > 0 ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
  console.log(
    `Selectivity     : facet population ${population} -> in scope ${rows.length} (${pct(rows.length, population)})` +
      ` -> changing ${changes.length} (${pct(changes.length, rows.length)} of scope); unchanged/pinned no-op ${unchanged}`,
  );
  if (changes.length === 0) console.log('WARNING: the filter changes 0 rows — check it can see the field it tests.');
  if (rollbackOut) {
    mkdirSync(dirname(rollbackOut), { recursive: true });
    writeFileSync(
      rollbackOut,
      JSON.stringify(
        { writtenAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', facets, rows: changes.map(c => ({ id: c.row.id, title: c.row.title, from: c.row.contentType, to: c.to })) },
        null,
        1,
      ) + '\n',
    );
    console.log(`Rollback file   : ${rollbackOut} (${changes.length} rows, prior values in "from")`);
  }
  console.log('-'.repeat(72));
  console.log(`Rows examined : ${rows.length}`);
  console.log(`Unchanged     : ${unchanged}`);
  console.log(`To change     : ${changes.length}`);
  console.log(`  cleared to null : ${byTarget.get('(null)')?.length ?? 0}`);
  console.log('-'.repeat(72));

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.');
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  for (const [target, list] of ordered) {
    const ids = list.map(c => c.row.id);
    const result = await prisma.mod.updateMany({
      where: { id: { in: ids } },
      data: { contentType: target === '(null)' ? null : target },
    });
    written += result.count;
    console.log(`wrote ${result.count} -> ${target}`);
  }

  console.log(`\nDone. ${written} rows updated.`);
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
