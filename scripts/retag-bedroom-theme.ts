#!/usr/bin/env npx tsx
/**
 * Repair the `bedroom` element of `Mod.themes` from TITLES.
 *
 * Rowan, 2026-09-24. Same shape as `scripts/retag-halloween-theme.ts`: dry run
 * by default, a hard row cap, an `--ids=` mode for narrow hand-audited fixes,
 * and no writes to anything except the `bedroom` element of `themes` — every
 * other theme on the row is preserved (see `applyBedroomTheme()`).
 *
 * Population is the UNION of rows tagged `bedroom` today and rows whose
 * title supports it, because the description-inference bug was bidirectional.
 *
 *   npx tsx scripts/retag-bedroom-theme.ts             # dry run (default)
 *   npx tsx scripts/retag-bedroom-theme.ts --apply
 *   npx tsx scripts/retag-bedroom-theme.ts --ids=abc,def
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { BEDROOM_THEME, applyBedroomTheme, isBedroomTitle } from '../lib/bedroomThemeRules';

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
              { themes: { has: BEDROOM_THEME } },
              // Coarse prefilter; `isBedroomTitle()` is the real rule.
              ...['bed', 'mattress', 'dresser', 'headboard', 'night stand', 'nightstand'].map(
                (w) => ({ title: { contains: w, mode: 'insensitive' as const } }),
              ),
            ],
          },
      select: { id: true, title: true, themes: true, contentType: true, downloadCount: true, gameVersion: true, isNSFW: true },
      orderBy: { downloadCount: 'desc' },
    });
    if (rows.length > MAX_ROWS) throw new Error(`population ${rows.length} exceeds MAX_ROWS ${MAX_ROWS}`);

    const changes = rows
      .map((r) => ({ r, next: applyBedroomTheme(r.themes, r.title) }))
      .filter(({ r, next }) => next.includes(BEDROOM_THEME) !== r.themes.includes(BEDROOM_THEME));
    const added = changes.filter(({ next }) => next.includes(BEDROOM_THEME));
    const stripped = changes.filter(({ next }) => !next.includes(BEDROOM_THEME));
    const after = rows.filter((r) => isBedroomTitle(r.title));

    console.log(`population ${rows.length}; tagged before ${rows.filter((r) => r.themes.includes(BEDROOM_THEME)).length}; tagged after ${after.length}`);
    console.log(`add ${added.length}; strip ${stripped.length}; no-op ${rows.length - changes.length}`);
    console.log('--- ADD');
    for (const { r } of added) console.log(`  + ${r.downloadCount}\t${r.contentType}\t${r.gameVersion}${r.isNSFW ? ' NSFW' : ''}\t${r.title}\t${r.id}`);
    console.log('--- STRIP (top 60 by downloads)');
    for (const { r } of stripped.slice(0, 60)) console.log(`  - ${r.downloadCount}\t${r.contentType}\t${r.title}`);

    if (!apply) {
      console.log('\nDRY RUN — nothing written. Re-run with --apply.');
      return;
    }
    // Rollback artifact: every changed row's before/after themes, written
    // BEFORE the first write so a crash mid-apply still leaves the record.
    const backup = `reports/catalog/bedroom-theme-retag-${new Date().toISOString().slice(0, 10)}.csv`;
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
