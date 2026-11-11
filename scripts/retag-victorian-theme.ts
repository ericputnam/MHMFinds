#!/usr/bin/env npx tsx
/**
 * Set the `victorian` element of `Mod.themes` from TITLES.
 *
 * Rowan, 2026-11-11 (E393). Same shape as the gallery-pose retag script (E296): dry run
 * by default, unknown flags rejected, a hard row cap, an `--ids=` mode for narrow hand-audited fixes,
 * and no writes to anything except the `victorian` element of `themes` — every
 * other theme on the row is preserved (see `applyVictorianTheme()`).
 *
 * Population is the UNION of rows tagged `victorian` today and rows whose
 * title supports it, so a later re-run also strips a row a rule change drops.
 *
 *   npx tsx scripts/retag-victorian-theme.ts             # dry run (default)
 *   npx tsx scripts/retag-victorian-theme.ts --apply
 *   npx tsx scripts/retag-victorian-theme.ts --ids=abc,def
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { VICTORIAN_THEME, applyVictorianTheme, isVictorianTitle } from '../lib/victorianThemeRules';

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
              { themes: { has: VICTORIAN_THEME } },
              // Coarse prefilter; `isVictorianTitle()` is the real rule.
              { title: { contains: 'victorian', mode: 'insensitive' as const } },
            ],
          },
      select: { id: true, title: true, themes: true, contentType: true, downloadCount: true, gameVersion: true, isNSFW: true },
      orderBy: { downloadCount: 'desc' },
    });
    if (rows.length > MAX_ROWS) throw new Error(`population ${rows.length} exceeds MAX_ROWS ${MAX_ROWS}`);

    const changes = rows
      .map((r) => ({ r, next: applyVictorianTheme(r.themes, r.title) }))
      .filter(({ r, next }) => next.includes(VICTORIAN_THEME) !== r.themes.includes(VICTORIAN_THEME));
    const added = changes.filter(({ next }) => next.includes(VICTORIAN_THEME));
    const stripped = changes.filter(({ next }) => !next.includes(VICTORIAN_THEME));
    const after = rows.filter((r) => isVictorianTitle(r.title));

    console.log(`population ${rows.length}; tagged before ${rows.filter((r) => r.themes.includes(VICTORIAN_THEME)).length}; tagged after ${after.length}`);
    console.log(`add ${added.length}; strip ${stripped.length}; no-op ${rows.length - changes.length}`);
    console.log('--- ADD');
    for (const { r } of added) console.log(`  + ${r.downloadCount}\t${r.contentType}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}\t${r.id}`);
    console.log('--- STRIP');
    for (const { r } of stripped) console.log(`  - ${r.downloadCount}\t${r.contentType}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}`);

    // Rollback artifact: every changed row's before/after themes. Written on the
    // dry run too, so the plan can be committed and reviewed before --apply, and
    // rewritten BEFORE the first write so a crash mid-apply still leaves the record.
    // A no-op run (e.g. the read-back after --apply) must never overwrite the
    // rollback file of the run that did change rows — that happened on
    // 2026-11-09 with the heels-shaped copy of this script, and the CSV had to
    // be rebuilt from the database.
    if (changes.length === 0) {
      console.log('no changes — backup not written (an earlier run\'s rollback file is left intact).');
      return;
    }
    const backup = `reports/funnel/victorian-theme-retag-${new Date().toISOString().slice(0, 10)}.csv`;
    mkdirSync(dirname(backup), { recursive: true });
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    writeFileSync(
      backup,
      ['id,title,themes_before,themes_after']
        .concat(changes.map(({ r, next }) => [r.id, esc(r.title), esc(r.themes.join('|')), esc(next.join('|'))].join(',')))
        .join('\n') + '\n',
    );
    console.log(`backup written: ${backup} (${changes.length} rows)`);
    if (!apply) {
      console.log('\nDRY RUN — no database writes. Re-run with --apply.');
      return;
    }
    let n = 0;
    for (const { r, next } of changes) {
      await prisma.mod.update({ where: { id: r.id }, data: { themes: next } });
      n++;
    }
    console.log(`\nAPPLIED ${n} row updates (themes only).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
