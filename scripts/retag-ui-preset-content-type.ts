#!/usr/bin/env npx tsx
/**
 * Move GShade / ReShade visual presets to contentType `ui-preset` from TITLES.
 *
 * Rowan, 2026-10-25 (E272). Same shape as `scripts/retag-kitchen-theme.ts`: dry
 * run by default, unknown flags rejected, a hard row cap, an `--ids=` mode for
 * narrow hand-audited fixes, and no writes to anything except `contentType`.
 *
 * Population is the UNION of rows typed `ui-preset` today and rows whose title
 * contains "shade" (coarse prefilter; `isUiPresetTitle()` is the real rule), so
 * the pass is bidirectional: ADD rows the title supports, STRIP (→ NULL) rows
 * typed `ui-preset` without title evidence. Hand-audited rows are reported and
 * never overridden — a pin that disagrees with the rule is a conflict to read,
 * not a row to write.
 *
 *   npx tsx scripts/retag-ui-preset-content-type.ts             # dry run (default)
 *   npx tsx scripts/retag-ui-preset-content-type.ts --apply
 *   npx tsx scripts/retag-ui-preset-content-type.ts --ids=abc,def
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { UI_PRESET_CONTENT_TYPE, applyUiPresetContentType, isUiPresetTitle } from '../lib/uiPresetRules';
import { handAuditedContentType } from './lib/hand-audited-content-types';
import { OFF_TYPE_RE } from './agents/collection-hub-eligibility-lib';

/** Tier 0 hard limit from autonomy.md: never more than 5,000 rows per run. */
const MAX_ROWS = 5000;

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => a !== '--apply' && !a.startsWith('--ids='));
  if (unknown.length) throw new Error(`unknown flag(s): ${unknown.join(' ')} — accepted: --apply, --ids=`);
  const apply = args.includes('--apply');
  const idsArg = args.find((a) => a.startsWith('--ids='));
  const ids = idsArg ? idsArg.slice('--ids='.length).split(',').filter(Boolean) : null;

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.mod.findMany({
      where: ids
        ? { id: { in: ids } }
        : {
            OR: [
              { contentType: UI_PRESET_CONTENT_TYPE },
              { title: { contains: 'shade', mode: 'insensitive' } },
            ],
          },
      select: {
        id: true,
        title: true,
        contentType: true,
        downloadCount: true,
        gameVersion: true,
        isNSFW: true,
        sourceUrl: true,
      },
      orderBy: { downloadCount: 'desc' },
    });
    if (rows.length > MAX_ROWS) throw new Error(`population ${rows.length} exceeds MAX_ROWS ${MAX_ROWS}`);

    const planned = rows.map((r) => ({ r, next: applyUiPresetContentType(r.contentType, r.title), pin: handAuditedContentType(r.id) }));
    const conflicts = planned.filter(({ r, next, pin }) => pin && next !== r.contentType && pin.contentType !== next);
    const changes = planned.filter(({ r, next, pin }) => next !== r.contentType && !(pin && pin.contentType !== next));
    const added = changes.filter(({ next }) => next === UI_PRESET_CONTENT_TYPE);
    const stripped = changes.filter(({ next }) => next !== UI_PRESET_CONTENT_TYPE);
    const supported = rows.filter((r) => isUiPresetTitle(r.title));
    const sfwSims4 = supported.filter((r) => r.gameVersion === 'Sims 4' && !r.isNSFW);

    console.log(
      `population ${rows.length}; typed ${UI_PRESET_CONTENT_TYPE} before ${rows.filter((r) => r.contentType === UI_PRESET_CONTENT_TYPE).length}; title-supported ${supported.length} (SFW Sims 4 ${sfwSims4.length})`,
    );
    console.log(`add ${added.length}; strip ${stripped.length}; pinned conflicts ${conflicts.length}; no-op ${rows.length - changes.length - conflicts.length}`);
    const byBefore = new Map<string, number>();
    for (const { r } of added) byBefore.set(r.contentType ?? 'NULL', (byBefore.get(r.contentType ?? 'NULL') ?? 0) + 1);
    console.log(`add by current type: ${Array.from(byBefore.entries()).map(([t, n]) => `${t}:${n}`).join(' ')}`);
    const gshade = supported.filter((r) => /g-?shade/i.test(r.title)).length;
    console.log(`title words: gshade ${gshade}, reshade-only ${supported.length - gshade}`);

    console.log('--- ADD (→ ui-preset)');
    for (const { r } of added) console.log(`  + ${r.downloadCount}\t${r.contentType ?? 'NULL'}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}\t${r.id}`);
    console.log('--- STRIP (ui-preset → NULL)');
    for (const { r } of stripped) console.log(`  - ${r.downloadCount}\t${r.contentType}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}\t${r.id}`);
    console.log('--- PINNED CONFLICTS (not written; read these)');
    for (const { r, next, pin } of conflicts) console.log(`  ! ${r.contentType ?? 'NULL'} → ${next ?? 'NULL'} but pinned ${pin!.contentType}: ${r.title}\t${r.id}\t${pin!.why}`);

    // Leg (c) of the hub grade, on the exact rows the page will hold.
    const offRe = OFF_TYPE_RE['ui-preset'];
    const offHits = sfwSims4.filter((r) => offRe.test(r.title));
    console.log(`--- OFF_TYPE_RE['ui-preset'] hits among title-supported SFW Sims 4 rows: ${offHits.length}`);
    for (const r of offHits) console.log(`  ? ${r.title}`);

    // URL-map replay (information only): rows whose source post is a GShade /
    // ReShade post, by current type — the ingest fallback for these posts now
    // reads `ui-preset`; stored rows are never re-typed at ingest (E161).
    const urlRows = rows.filter((r) => /gshade|reshade/i.test(r.sourceUrl ?? ''));
    const urlByType = new Map<string, number>();
    for (const r of urlRows) urlByType.set(r.contentType ?? 'NULL', (urlByType.get(r.contentType ?? 'NULL') ?? 0) + 1);
    console.log(`--- rows from a gshade/reshade post URL (within population): ${urlRows.length} — ${Array.from(urlByType.entries()).map(([t, n]) => `${t}:${n}`).join(' ')}`);

    // Rollback artifact: every changed row's before/after type. Written on the
    // dry run too, and BEFORE the first write. Never written when there is
    // nothing to change, and never over an existing file: on 2026-10-25 a
    // post-apply dry run (add 0 / strip 0) overwrote the 95-row backup of the
    // apply that had just happened with an empty one. A later run on the
    // same day gets a time-suffixed name instead.
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    if (changes.length === 0) {
      console.log('backup not written: no changes (an existing backup is left untouched)');
    } else {
      const day = new Date().toISOString().slice(0, 10);
      let backup = `reports/funnel/ui-preset-retag-${day}.csv`;
      if (existsSync(backup)) backup = `reports/funnel/ui-preset-retag-${day}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.csv`;
      mkdirSync(dirname(backup), { recursive: true });
      writeFileSync(
        backup,
        ['id,title,contentType_before,contentType_after']
          .concat(changes.map(({ r, next }) => [r.id, esc(r.title), r.contentType ?? '', next ?? ''].join(',')))
          .join('\n') + '\n',
      );
      console.log(`backup written: ${backup} (${changes.length} rows)`);
    }
    if (!apply) {
      console.log('\nDRY RUN — no database writes. Re-run with --apply.');
      return;
    }
    let n = 0;
    for (const { r, next } of changes) {
      await prisma.mod.update({ where: { id: r.id }, data: { contentType: next } });
      n++;
    }
    console.log(`\nAPPLIED ${n} row updates (contentType only).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
