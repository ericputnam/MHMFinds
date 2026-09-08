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
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import { detectContentTypeWithConfidence } from '../lib/services/contentTypeDetector';

/** autonomy.md: catalog scripts touch at most 5,000 rows per run. */
const MAX_ROWS = 5000;

const DEFAULT_FACETS = ['lighting', 'curtains'];

/**
 * Hand-audited corrections, keyed by mod id, for rows where title-only
 * detection lands on the wrong facet. Reviewed 2026-09-08. `null` means
 * "clear the content type" — the title does not support any facet.
 */
const OVERRIDES: Record<string, { contentType: string | null; why: string }> = {
  // detector reads "Crown" (hats rule) out of "Crown Victoria"
  cmsmclm4800tqoxeu90ps0m8x: { contentType: 'vehicles', why: '2010 Ford Crown Victoria Police Interceptor is a car' },
  // "Mirror" (furniture rule) outranks "Boots" by rule priority
  cmmvaqe1h007joxzg06n11j35: { contentType: 'shoes', why: 'Lollipop Mirror Boots are shoes, not a mirror' },
  // title misspells "Lightning Bolt" as "Lighting Bolt"
  cmkylj0q00143oxhco3tj9fd5: { contentType: 'jewelry', why: 'Neon Lighting Bolt Earrings are earrings' },
  // "Lantern" is a real light-fixture keyword; this is a superhero costume
  cmsmczfbc0115oxeu8gxj9o8h: { contentType: null, why: 'Green Lantern - Injustice is a character costume, not a lantern' },
  // "Home" (lot rule) matches, but this is a career pack
  cmsmbyry300hcoxeugu1vn5w0: { contentType: 'career', why: 'Careers - Funeral Home and Cemetery is a career mod' },
  // "Beauty" (makeup rule) matches; this is a commercial build set
  cmil0qqyv002goxeeotn4bc55: { contentType: 'furniture', why: 'Mid Century Modern Beauty Salon is a build/buy set' },
  // "Build" (lot rule) matches; a "build set" is CC, not a downloadable lot
  cmijocccm00r7oxc8a9nqtzvv: { contentType: null, why: 'Vibe Build Set is CC of unknown type, not a lot' },
};

type Row = { id: string; title: string; contentType: string | null; downloadCount: number };
type Change = { row: Row; to: string | null; reason: string };

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const verbose = argv.includes('--verbose');
  const facetsArg = argv.find(a => a.startsWith('--facets='));
  const limitArg = argv.find(a => a.startsWith('--limit='));
  const facets = facetsArg ? facetsArg.slice('--facets='.length).split(',').filter(Boolean) : DEFAULT_FACETS;
  const parsedLimit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : MAX_ROWS;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 0), MAX_ROWS) : MAX_ROWS;
  return { apply, verbose, facets, limit };
}

/** Decide the new content type for one row. Exported shape kept simple for testing. */
function decide(row: Row): Change {
  const override = OVERRIDES[row.id];
  if (override) {
    return { row, to: override.contentType, reason: `override: ${override.why}` };
  }

  // Title only. Description-only inference is exactly what mis-tagged these rows.
  const result = detectContentTypeWithConfidence(row.title || '');
  if (result.confidence === 'low' || !result.contentType) {
    return { row, to: null, reason: `title gives no confident facet (${result.reasoning})` };
  }
  return { row, to: result.contentType, reason: result.reasoning ?? 'title match' };
}

async function main() {
  const { apply, verbose, facets, limit } = parseArgs();

  console.log('='.repeat(72));
  console.log(`Re-tag junk build facets — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Facets: ${facets.join(', ')} · row cap: ${limit}`);
  console.log('='.repeat(72));

  const rows: Row[] = await prisma.mod.findMany({
    where: { contentType: { in: facets } },
    select: { id: true, title: true, contentType: true, downloadCount: true },
    orderBy: { downloadCount: 'desc' },
    take: limit,
  });

  console.log(`\nLoaded ${rows.length} rows.\n`);
  if (rows.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const changes: Change[] = [];
  let unchanged = 0;

  for (const row of rows) {
    const change = decide(row);
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

  console.log('\n' + '-'.repeat(72));
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
