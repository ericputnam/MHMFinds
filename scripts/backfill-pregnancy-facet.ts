#!/usr/bin/env npx tsx
/**
 * Backfill contentType='pregnancy' for keyword-matching Sims 4 mods.
 *
 * Part of Revenue Pivot Initiative 1 (see lib/collections.ts). Before
 * this runs, the /games/sims-4/pregnancy-mods collection page uses a
 * `__pregnancy_keyword__` magic fallback in buildWhereClause. After
 * this runs, the facet is real and the magic fallback can be removed.
 *
 * Selection criteria (matches scripts/phase0-gate0-facet-counts.ts):
 *   - gameVersion = 'Sims 4'
 *   - title contains 'pregnan' OR 'maternity' (case-insensitive)
 *     OR description contains 'pregnan'
 *   - contentType is NOT already 'pregnancy' (idempotent)
 *
 * Usage:
 *   npx tsx scripts/backfill-pregnancy-facet.ts            # Dry run
 *   npx tsx scripts/backfill-pregnancy-facet.ts --apply    # Apply changes
 *   npx tsx scripts/backfill-pregnancy-facet.ts --apply --verbose
 *
 * Re-running is safe — the filter excludes already-tagged mods.
 */

import './lib/setup-env';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

const PREGNANCY_WHERE = {
  gameVersion: 'Sims 4',
  contentType: { not: 'pregnancy' as string | null },
  OR: [
    { title: { contains: 'pregnan', mode: 'insensitive' as const } },
    { title: { contains: 'maternity', mode: 'insensitive' as const } },
    { description: { contains: 'pregnan', mode: 'insensitive' as const } },
  ],
};

async function main() {
  console.log('\n============================================================');
  console.log('  Backfill: contentType=pregnancy for Sims 4 mods');
  console.log('============================================================\n');
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟡 DRY RUN'}`);
  console.log(`Verbose: ${VERBOSE}\n`);

  const candidates = await prisma.mod.findMany({
    where: PREGNANCY_WHERE,
    select: {
      id: true,
      title: true,
      contentType: true,
      description: true,
    },
  });

  console.log(`Found ${candidates.length} candidate mods to retag.\n`);

  // Show contentType distribution so we can sanity-check what we're
  // about to overwrite. Most hits should currently be null, poses,
  // gameplay-mod, or dresses.
  const dist: Record<string, number> = {};
  for (const m of candidates) {
    const k = m.contentType || '(null)';
    dist[k] = (dist[k] || 0) + 1;
  }
  console.log('  Current contentType distribution:');
  for (const [ct, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${ct.padEnd(20)} ${n}`);
  }
  console.log('');

  if (VERBOSE) {
    console.log('  Sample titles (first 15):');
    for (const m of candidates.slice(0, 15)) {
      const curr = m.contentType || '(null)';
      console.log(`    [${curr.padEnd(14)}] ${m.title.slice(0, 80)}`);
    }
    console.log('');
  }

  if (!APPLY) {
    console.log('DRY RUN complete. Re-run with --apply to write changes.\n');
    await prisma.$disconnect();
    return;
  }

  // Apply in a single updateMany — the filter is already safe.
  const result = await prisma.mod.updateMany({
    where: PREGNANCY_WHERE,
    data: { contentType: 'pregnancy' },
  });

  console.log(`✅ Updated ${result.count} mods to contentType='pregnancy'.\n`);

  // Verify
  const verifyCount = await prisma.mod.count({
    where: { gameVersion: 'Sims 4', contentType: 'pregnancy' },
  });
  console.log(`   Verification: ${verifyCount} Sims 4 mods now tagged pregnancy.\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
