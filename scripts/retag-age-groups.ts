#!/usr/bin/env npx tsx
/**
 * Repair the infant / toddler / child axis of `Mod.ageGroups` from TITLES.
 *
 * Nova, 2026-09-21. Same shape as `scripts/retag-junk-build-facets.ts` and
 * `scripts/retag-null-content-types.ts`: dry run by default, a hard row cap,
 * an `--ids=` mode for narrow hand-audited fixes, and no writes to any field
 * other than the one named in the file name.
 *
 * The population is the UNION of:
 *   (a) rows tagged infant / toddler / child today  (752 on 2026-09-21), and
 *   (b) rows whose title supports one of those      (+362 not tagged at all),
 * because the substring bug in the old keyword extractor was bidirectional:
 * it invented kid tags from "Ra**ya**n" and "**tot**al" *and* it never looked
 * at titles that plainly said "Functional Infant Cribs" (473 downloads).
 *
 * Only the kid axis is rewritten. teen / young-adult / adult / elder /
 * all-ages values on the same row are preserved verbatim — see
 * `applyKidAxis()` in `lib/ageGroupRules.ts` for why that line is drawn there.
 *
 *   npx tsx scripts/retag-age-groups.ts                 # dry run (default)
 *   npx tsx scripts/retag-age-groups.ts --apply
 *   npx tsx scripts/retag-age-groups.ts --ids=abc,def   # narrow, hand-audited
 *   npx tsx scripts/retag-age-groups.ts --limit=200 --verbose
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { PrismaClient } from '@prisma/client';
import {
  KID_AGE_GROUPS,
  applyKidAxis,
  kidAxisChanges,
  kidAgeGroupsFromTitle,
} from '../lib/ageGroupRules';

/** Tier 0 hard limit from autonomy.md: never more than 5,000 rows per run. */
const MAX_ROWS = 5000;

type Row = {
  id: string;
  title: string;
  contentType: string | null;
  ageGroups: string[];
  downloadCount: number;
};

type Change = {
  row: Row;
  next: string[];
  kind: 'add' | 'strip' | 'rewrite';
};

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const verbose = argv.includes('--verbose');
  const idsArg = argv.find((a) => a.startsWith('--ids='));
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const ids = idsArg
    ? idsArg
        .slice('--ids='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : MAX_ROWS;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`--limit must be a positive number, got ${limitArg}`);
  }
  return { apply, verbose, ids, limit: Math.min(limit, MAX_ROWS) };
}

function classify(before: string[], next: string[]): Change['kind'] {
  const b = before.filter((a) => (KID_AGE_GROUPS as readonly string[]).includes(a));
  const a = next.filter((x) => (KID_AGE_GROUPS as readonly string[]).includes(x));
  if (b.length === 0) return 'add';
  if (a.length === 0) return 'strip';
  return 'rewrite';
}

async function main() {
  const { apply, verbose, ids, limit } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    // Safety filters match the collection pages' own query, so the numbers
    // printed here are the numbers a visitor sees on /games/sims-4/kids-cc/.
    const safety = {
      gameVersion: 'Sims 4',
      isVerified: true,
      isNSFW: false,
    } as const;

    let rows: Row[];
    if (ids) {
      rows = await prisma.mod.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          contentType: true,
          ageGroups: true,
          downloadCount: true,
        },
      });
      const missing = ids.filter((id) => !rows.some((r) => r.id === id));
      if (missing.length) {
        // A non-empty --ids list that matches nothing is a hard failure, not a
        // quiet pass (09-20 house rule on exclusion lists).
        throw new Error(`--ids named ${missing.length} id(s) that do not exist: ${missing.join(', ')}`);
      }
    } else {
      const all = await prisma.mod.findMany({
        where: safety,
        select: {
          id: true,
          title: true,
          contentType: true,
          ageGroups: true,
          downloadCount: true,
        },
        orderBy: { downloadCount: 'desc' },
      });
      rows = all.filter(
        (m) =>
          m.ageGroups.some((a) => (KID_AGE_GROUPS as readonly string[]).includes(a)) ||
          kidAgeGroupsFromTitle(m.title).length > 0,
      );
    }

    // Vacuity guard: this script exists because the kid axis is broken on
    // ~1,100 rows. A run that selects almost nothing means the query or the
    // rules failed to load, not that the catalog is clean.
    if (!ids && rows.length < 100) {
      throw new Error(
        `selected only ${rows.length} rows; expected >=100 in the kid-axis population — refusing to run`,
      );
    }

    const changes: Change[] = [];
    for (const row of rows) {
      if (!kidAxisChanges(row.ageGroups, row.title)) continue;
      const next = applyKidAxis(row.ageGroups, row.title);
      changes.push({ row, next, kind: classify(row.ageGroups, next) });
    }

    const counts = {
      add: changes.filter((c) => c.kind === 'add').length,
      strip: changes.filter((c) => c.kind === 'strip').length,
      rewrite: changes.filter((c) => c.kind === 'rewrite').length,
    };

    console.log(`\nageGroups kid-axis retag — ${apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`  population examined : ${rows.length}`);
    console.log(`  unchanged           : ${rows.length - changes.length}`);
    console.log(`  add (title says so) : ${counts.add}`);
    console.log(`  strip (title does not): ${counts.strip}`);
    console.log(`  rewrite             : ${counts.rewrite}`);

    const gridBefore = rows.filter((r) =>
      r.ageGroups.some((a) => (KID_AGE_GROUPS as readonly string[]).includes(a)),
    ).length;
    const gridAfter = rows.filter((r) => kidAgeGroupsFromTitle(r.title).length > 0).length;
    console.log(`  kid-tagged rows     : ${gridBefore} -> ${gridAfter}`);

    if (verbose) {
      for (const c of changes.slice(0, 60)) {
        console.log(
          `  [${c.kind.padEnd(7)}] ${String(c.row.downloadCount).padStart(5)} ${c.row.title.slice(0, 58).padEnd(58)} ${
            c.row.ageGroups.join('/') || '(none)'
          } -> ${c.next.join('/') || '(none)'}`,
        );
      }
      if (changes.length > 60) console.log(`  ... and ${changes.length - 60} more`);
    }

    if (changes.length > limit) {
      throw new Error(
        `${changes.length} changes exceeds the ${limit}-row cap; narrow with --ids= or --limit=`,
      );
    }

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to write.\n');
      return;
    }

    let written = 0;
    for (const c of changes) {
      await prisma.mod.update({
        where: { id: c.row.id },
        data: { ageGroups: c.next },
      });
      written++;
    }
    console.log(`\nApplied ${written} updates.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
