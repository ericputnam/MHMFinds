#!/usr/bin/env npx tsx
/**
 * Repair the `halloween` element of `Mod.themes` from TITLES.
 *
 * Rowan, 2026-09-23. Same shape as `scripts/retag-age-groups.ts`: dry run by
 * default, a hard row cap, an `--ids=` mode for narrow hand-audited fixes, and
 * no writes to anything except the `halloween` element of `themes` — every
 * other theme on the row is preserved (see `applyHalloweenTheme()`).
 *
 * Population is the UNION of rows tagged `halloween` today and rows whose
 * title supports it, because the description-inference bug was bidirectional.
 *
 *   npx tsx scripts/retag-halloween-theme.ts             # dry run (default)
 *   npx tsx scripts/retag-halloween-theme.ts --apply
 *   npx tsx scripts/retag-halloween-theme.ts --ids=abc,def
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { HALLOWEEN_THEME, applyHalloweenTheme, isHalloweenTitle } from '../lib/halloweenThemeRules';

/** Tier 0 hard limit from autonomy.md: never more than 5,000 rows per run. */
const MAX_ROWS = 5000;

async function main() {
  const args = process.argv.slice(2);
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
              { themes: { has: HALLOWEEN_THEME } },
              // Coarse prefilter; `isHalloweenTitle()` is the real rule.
              ...['hallowe', 'spook', 'simblreen', 'lantern', 'trick', 'haunt', 'ghost', 'skeleton', 'zombie', 'pumpkin', 'horror', 'creepy', 'frankenstein', 'candy', 'samhain', 'hallows'].map(
                (w) => ({ title: { contains: w, mode: 'insensitive' as const } }),
              ),
            ],
          },
      select: { id: true, title: true, themes: true, downloadCount: true, gameVersion: true, isNSFW: true },
      orderBy: { downloadCount: 'desc' },
    });
    if (rows.length > MAX_ROWS) throw new Error(`population ${rows.length} exceeds MAX_ROWS ${MAX_ROWS}`);

    const changes = rows
      .map((r) => ({ r, next: applyHalloweenTheme(r.themes, r.title) }))
      .filter(({ r, next }) => next.includes(HALLOWEEN_THEME) !== r.themes.includes(HALLOWEEN_THEME));
    const added = changes.filter(({ next }) => next.includes(HALLOWEEN_THEME));
    const stripped = changes.filter(({ next }) => !next.includes(HALLOWEEN_THEME));
    const after = rows.filter((r) => isHalloweenTitle(r.title));

    console.log(`population ${rows.length}; tagged before ${rows.filter((r) => r.themes.includes(HALLOWEEN_THEME)).length}; tagged after ${after.length}`);
    console.log(`add ${added.length}; strip ${stripped.length}; no-op ${rows.length - changes.length}`);
    console.log('--- ADD');
    for (const { r } of added) console.log(`  + ${r.downloadCount}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}\t${r.id}`);
    console.log('--- STRIP (top 40 by downloads)');
    for (const { r } of stripped.slice(0, 40)) console.log(`  - ${r.downloadCount}\t${r.title}`);

    if (!apply) {
      console.log('\nDRY RUN — nothing written. Re-run with --apply.');
      return;
    }
    // Rollback artifact: every changed row's before/after themes, written
    // BEFORE the first write so a crash mid-apply still leaves the record.
    const backup = `reports/catalog/halloween-theme-retag-${new Date().toISOString().slice(0, 10)}.csv`;
    mkdirSync(dirname(backup), { recursive: true });
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    writeFileSync(
      backup,
      ['id,title,themes_before,themes_after']
        .concat(changes.map(({ r, next }) => [r.id, esc(r.title), esc(r.themes.join('|')), esc(next.join('|'))].join(',')))
        .join('\n') + '\n',
    );
    console.log(`backup written: ${backup} (${changes.length} rows)`);
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
