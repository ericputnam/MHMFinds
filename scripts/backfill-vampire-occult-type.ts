#!/usr/bin/env npx tsx
/**
 * Backfill the `vampire` occultType facet.
 *
 * Why: "sims 4 vampire cc" is a rising GSC query (~130+ impressions/mo, pos ~10)
 * but the occultTypes facet is empty in prod (0 mods), so no collection page can
 * be built on it. ~163 mods match "vampire" by keyword. Same rationale as the
 * body-preset backfill: build the facet properly instead of shipping a keyword
 * hack (see the pregnancy-mods deindexing lesson,
 * reports/rpm-dip-mitigation-2026-07-02.md).
 *
 * What it does:
 *   1. Mods whose TITLE mentions vampire → push 'vampire' onto occultTypes
 *      (high confidence). contentType is left untouched — occultTypes is a
 *      multi-select overlay, so a "Vampire Fangs" accessory stays an accessory.
 *   2. Description-only matches are medium confidence. Most mention vampires
 *      incidentally ("works on all occults, including vampires"), so they are
 *      NOT applied by default. The exceptions are CURATED_MEDIUM_IDS — hand-
 *      reviewed on 2026-07-03 (description context inspected for all 70
 *      candidates); only genuinely vampire-themed content made the cut.
 *
 * Usage:
 *   npx tsx scripts/backfill-vampire-occult-type.ts                    # Dry run
 *   npx tsx scripts/backfill-vampire-occult-type.ts --apply            # High + curated
 *   npx tsx scripts/backfill-vampire-occult-type.ts --apply --include-medium  # All (not recommended)
 *   npx tsx scripts/backfill-vampire-occult-type.ts --verbose
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const INCLUDE_MEDIUM = process.argv.includes('--include-medium');

const VAMPIRE_TITLE_RE = /\bvampir/i; // vampire, vampiric, vampira
// "The Vampire Diaries" style pop-culture references are still vampire-relevant;
// no negative list needed — but skip mods already tagged.

/**
 * Description-only matches that ARE genuinely vampire content, curated by
 * hand on 2026-07-03. Everything else in the medium pool was a generic
 * "compatible with all occults" preset or goth/Halloween item that merely
 * name-drops vampires.
 */
const CURATED_MEDIUM_IDS = new Set([
  'cmijndpkd00cwoxc8h3i1589h', // Vamire Lair: Haunted House — "Vampire" typo'd in the title
  'cmijjdml30082oxs3a1ns4n4t', // Coffin Mirror for Sims 4 — vampire décor per description
  'cmijjdif10081oxs3bokrz39k', // Alice from Twilight CC Hair — Twilight vampire character
  'cmijjeim3008joxs3b8mfjr1i', // Dracula's Castle Sims 4 Build — "where will your vampire live"
  'cmijjd6mo007voxs34elvqxo4', // Sims 4 CC Gravestones — "for your vampire sims lot"
  'cmijmtugc0070oxc8224i9l0j', // Supernatural Teeth Set — 10 fang designs for vampires
  'cmim8uszx00eeoxy8pvb82ol3', // Zenx Lipstick — includes a vampire-teeth version
]);

interface Candidate {
  id: string;
  title: string;
  confidence: 'high' | 'curated' | 'medium';
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${INCLUDE_MEDIUM ? ' (+medium)' : ''}\n`);

  const matches = await prisma.mod.findMany({
    where: {
      gameVersion: 'Sims 4',
      isNSFW: false,
      NOT: { occultTypes: { has: 'vampire' } },
      OR: [
        { title: { contains: 'vampir', mode: 'insensitive' } },
        { description: { contains: 'vampir', mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, description: true, occultTypes: true },
  });

  const candidates: Candidate[] = matches.map((m) => ({
    id: m.id,
    title: m.title,
    confidence: VAMPIRE_TITLE_RE.test(m.title)
      ? 'high'
      : CURATED_MEDIUM_IDS.has(m.id)
        ? 'curated'
        : 'medium',
  }));

  const high = candidates.filter((c) => c.confidence === 'high');
  const curated = candidates.filter((c) => c.confidence === 'curated');
  const medium = candidates.filter((c) => c.confidence === 'medium');
  console.log(
    `Candidates: ${high.length} high (title match), ${curated.length} curated (hand-reviewed), ${medium.length} medium (description only, skipped)\n`
  );

  if (VERBOSE || !APPLY) {
    const show = VERBOSE ? candidates : candidates.slice(0, 20);
    for (const c of show) console.log(`  [${c.confidence}] ${c.title.slice(0, 70)}`);
    if (!VERBOSE && candidates.length > 20) console.log(`  ... and ${candidates.length - 20} more (use --verbose)`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write changes.');
    return;
  }

  const toApply = INCLUDE_MEDIUM ? candidates : [...high, ...curated];
  let updated = 0;
  for (const c of toApply) {
    await prisma.mod.update({
      where: { id: c.id },
      data: { occultTypes: { push: 'vampire' } },
    });
    updated++;
  }
  console.log(`\nTagged ${updated} mods with occultTypes 'vampire'.`);

  const finalCount = await prisma.mod.count({
    where: { gameVersion: 'Sims 4', isNSFW: false, occultTypes: { has: 'vampire' } },
  });
  console.log(`Collection-page count (Sims 4, SFW, occultTypes has 'vampire'): ${finalCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
