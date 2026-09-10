#!/usr/bin/env npx tsx
/**
 * Re-run the content-type detector, TITLE ONLY, over rows that have no
 * content type at all.
 *
 * WHY (Nova, 2026-09-10 — E33)
 * ----------------------------
 * 455 of 16,384 catalog rows have `contentType = NULL`. A row with no content
 * type appears in no collection page, no facet filter and no `/games/*` grid —
 * it is in the database and invisible to the site. Two things produced them:
 *
 *   1. The 486 rows backfilled on 2026-09-09 (PR #73) included 81 from the
 *      four "mods" listicles (social-media, phone, funeral, moving, romance,
 *      map-replacement, plumbob...). The detector had no nouns for the three
 *      things a gameplay mod is usually named after — a career, an aspiration
 *      or a trait — so it returned nothing. Fixed in
 *      `lib/services/contentTypeDetector.ts` in this same PR.
 *   2. The 84 rows the 2026-09-08 junk-facet repair (PR #61) deliberately
 *      cleared to NULL, plus older rows that predate several keyword
 *      expansions. Those rules exist now; nothing has ever re-run them.
 *
 * WHY NOT `scripts/fix-null-content-types.ts`
 * -------------------------------------------
 * That script exists and targets the same rows, but it feeds
 * `description + tags` to the detector and then falls through to
 * `inferFromContextClues()`, whose patterns include "a title containing
 * 'Collection' is full-body", "a title containing 'Set' at the end is
 * full-body" and "a title containing 'mod' is a gameplay mod". Description-
 * and shape-based inference is exactly what put a Ford Crown Victoria in the
 * `lighting` facet (2026-09-08). This script uses the title and nothing else,
 * and accepts a much lower fill rate in exchange for not inventing facets.
 *
 * POLICY
 * ------
 *   - title only, no description, no tags, no category, no shape heuristics
 *   - medium/high confidence writes; low/no-match leaves the row NULL
 *   - a NULL row is never made worse: this script only ever writes a value
 *     where there was none, and never overwrites an existing content type
 *
 * SAFETY (autonomy.md Tier 0 limits for catalog scripts)
 * ------------------------------------------------------
 *   - dry run is the DEFAULT; `--apply` is required to write
 *   - hard cap of 5,000 rows per run, enforced below
 *   - the WHERE clause is `contentType: null`, so no tagged row can be touched
 *
 * Usage:
 *   npx tsx scripts/retag-null-content-types.ts                # dry run
 *   npx tsx scripts/retag-null-content-types.ts --verbose      # every row
 *   npx tsx scripts/retag-null-content-types.ts --apply
 *   npx tsx scripts/retag-null-content-types.ts --limit=50 --apply
 *
 * Rollback: the rows written by one run all had `contentType = NULL` before
 * it, so the inverse is
 *   UPDATE "mods" SET "contentType" = NULL WHERE id IN (<ids printed below>);
 * Run with --verbose and keep the output before applying.
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import { detectContentTypeWithConfidence } from '../lib/services/contentTypeDetector';
import { handAuditedContentType } from './lib/hand-audited-content-types';

/** autonomy.md: catalog scripts touch at most 5,000 rows per run. */
const MAX_ROWS = 5000;

type Row = { id: string; title: string; downloadCount: number };
type Change = { row: Row; to: string; reason: string };

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const verbose = argv.includes('--verbose');
  const limitArg = argv.find(a => a.startsWith('--limit='));
  const parsed = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : MAX_ROWS;
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), MAX_ROWS) : MAX_ROWS;
  return { apply, verbose, limit };
}

/**
 * Listicle scrapes leave a leading rank number on some titles
 * ("7 Kehlani Puffs"). Strip it before detection, exactly as
 * `fix-null-content-types.ts` does, so the number is not treated as a word.
 */
function cleanTitle(title: string): string {
  return (title || '').replace(/^\d+\s+/, '').trim();
}

/** Decide the new content type for one row, from its title alone. */
function decide(row: Row): Change | null {
  // A human has already looked at some of these rows. Their answer wins —
  // including "no facet is right", which leaves the row NULL. Without this,
  // the title-only pass re-tagged "Green Lantern - Injustice God Among Us"
  // as `lighting` (the word "Lantern"), which is precisely what the
  // 2026-09-08 junk-facet repair had cleared.
  const audited = handAuditedContentType(row.id);
  if (audited) {
    if (audited.contentType === null) return null;
    return { row, to: audited.contentType, reason: `hand-audited: ${audited.why}` };
  }

  const result = detectContentTypeWithConfidence(cleanTitle(row.title));
  if (result.confidence === 'low' || !result.contentType) return null;
  return { row, to: result.contentType, reason: result.reasoning ?? 'title match' };
}

async function main() {
  const { apply, verbose, limit } = parseArgs();

  console.log('='.repeat(72));
  console.log(`Re-tag NULL content types (title only) — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Row cap: ${limit}`);
  console.log('='.repeat(72));

  const before = await prisma.mod.count({ where: { contentType: null } });
  const total = await prisma.mod.count();
  console.log(`\nCatalog: ${total} mods · NULL contentType before: ${before}\n`);

  const rows: Row[] = await prisma.mod.findMany({
    where: { contentType: null },
    select: { id: true, title: true, downloadCount: true },
    orderBy: { downloadCount: 'desc' },
    take: limit,
  });

  console.log(`Loaded ${rows.length} rows.\n`);
  if (rows.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const changes: Change[] = [];
  let stillUnknown = 0;
  for (const row of rows) {
    const change = decide(row);
    if (!change) {
      stillUnknown++;
      continue;
    }
    changes.push(change);
  }

  // Group by destination so the diff reads as "what moves where".
  const byTarget = new Map<string, Change[]>();
  for (const c of changes) {
    const list = byTarget.get(c.to) ?? [];
    list.push(c);
    byTarget.set(c.to, list);
  }

  const ordered = Array.from(byTarget.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [target, list] of ordered) {
    console.log(`\n--> ${target}  (${list.length})`);
    const shown = verbose ? list : list.slice(0, 8);
    for (const c of shown) {
      console.log(`    null -> ${target}  [${c.row.downloadCount} dl]  ${c.row.title.slice(0, 62)}`);
      if (verbose) console.log(`        id=${c.row.id}  ${c.reason}`);
    }
    if (!verbose && list.length > shown.length) {
      console.log(`    ... ${list.length - shown.length} more (use --verbose)`);
    }
  }

  console.log('\n' + '-'.repeat(72));
  console.log(`Rows examined  : ${rows.length}`);
  console.log(`Still unknown  : ${stillUnknown} (title supports no facet — left NULL)`);
  console.log(`To change      : ${changes.length}`);
  console.log(`NULL after     : ${before - changes.length} (projected)`);
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
      // contentType is re-asserted as null so a row tagged by a concurrent
      // job between the read and the write is not overwritten.
      where: { id: { in: ids }, contentType: null },
      data: { contentType: target },
    });
    written += result.count;
    console.log(`wrote ${result.count} -> ${target}`);
  }

  const after = await prisma.mod.count({ where: { contentType: null } });
  console.log(`\nDone. ${written} rows updated. NULL contentType: ${before} -> ${after}`);
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
