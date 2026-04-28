/**
 * Phase 0 Gate 0 — Verify mod counts per target facet
 *
 * For PRD: tasks/prd-revenue-pivot/PRD-revenue-pivot.md
 *
 * Checks that each of the 10 target collection page topics has enough
 * Sims 4 mods assigned to be a viable Pinterest landing page.
 *
 * Minimum viable per collection page: 40 mods.
 * Stretch: 100+ mods for dense, scroll-rewarding visual grid.
 *
 * Usage:
 *   npx tsx scripts/phase0-gate0-facet-counts.ts
 */

import './lib/setup-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MIN_VIABLE = 40;
const STRETCH = 100;

type TopicQuery = {
  id: number;
  label: string;
  where: any;
  complexity: 'simple' | 'composite' | 'missing';
};

const SIMS4 = { gameVersion: 'Sims 4' };

const TOPICS: TopicQuery[] = [
  {
    id: 1,
    label: 'Pregnancy mods',
    complexity: 'missing',
    // No pregnancy facet yet — probe by title/description keywords as a
    // sanity check on how many candidate mods exist for backfill.
    where: {
      ...SIMS4,
      OR: [
        { title: { contains: 'pregnan', mode: 'insensitive' } },
        { description: { contains: 'pregnan', mode: 'insensitive' } },
        { title: { contains: 'maternity', mode: 'insensitive' } },
      ],
    },
  },
  {
    id: 2,
    label: 'Trait mods',
    complexity: 'simple',
    where: { ...SIMS4, contentType: 'trait' },
  },
  {
    id: 3,
    label: 'Clutter / CC finds',
    complexity: 'simple',
    where: { ...SIMS4, contentType: 'clutter' },
  },
  {
    id: 4,
    label: 'Hair CC',
    complexity: 'simple',
    where: { ...SIMS4, contentType: 'hair' },
  },
  {
    id: 5,
    label: 'Urban tattoos (tattoos + streetwear theme)',
    complexity: 'composite',
    where: {
      ...SIMS4,
      contentType: 'tattoos',
      themes: { has: 'streetwear' },
    },
  },
  {
    id: 6,
    label: 'Skin details',
    complexity: 'simple',
    where: { ...SIMS4, contentType: 'skin' },
  },
  {
    id: 7,
    label: 'Male clothes CC',
    complexity: 'composite',
    where: {
      ...SIMS4,
      contentType: { in: ['tops', 'bottoms', 'dresses', 'full-body', 'shoes'] },
      genderOptions: { has: 'masculine' },
    },
  },
  {
    id: 8,
    label: 'Female clothes CC',
    complexity: 'composite',
    where: {
      ...SIMS4,
      contentType: { in: ['tops', 'bottoms', 'dresses', 'full-body', 'shoes'] },
      genderOptions: { has: 'feminine' },
    },
  },
  {
    id: 9,
    label: 'Furniture CC',
    complexity: 'simple',
    where: { ...SIMS4, contentType: 'furniture' },
  },
  {
    id: 10,
    label: 'Woohoo mods',
    complexity: 'missing',
    // No woohoo facet — probe by keywords, deferred pending ad policy.
    where: {
      ...SIMS4,
      OR: [
        { title: { contains: 'woohoo', mode: 'insensitive' } },
        { title: { contains: 'wicked', mode: 'insensitive' } },
        { description: { contains: 'woohoo', mode: 'insensitive' } },
      ],
    },
  },
];

// Sanity checks that are not topics but help diagnose DB health.
const SANITY = [
  {
    label: 'Total Sims 4 mods in DB',
    where: SIMS4,
  },
  {
    label: 'Sims 4 mods with contentType set',
    where: { ...SIMS4, contentType: { not: null } },
  },
  {
    label: 'Sims 4 mods with at least one theme',
    where: { ...SIMS4, themes: { isEmpty: false } },
  },
  {
    label: 'Sims 4 mods with at least one genderOption',
    where: { ...SIMS4, genderOptions: { isEmpty: false } },
  },
  {
    label: 'Total mods (all games)',
    where: {},
  },
];

function statusBadge(count: number, complexity: string): string {
  if (complexity === 'missing') return count >= MIN_VIABLE ? '⚠️ CANDIDATES' : '❌ NEEDS-BACKFILL';
  if (count >= STRETCH) return '✅ STRETCH';
  if (count >= MIN_VIABLE) return '✅ VIABLE';
  if (count >= 10) return '⚠️ THIN';
  return '❌ EMPTY';
}

async function main() {
  console.log('\n============================================================');
  console.log('  PHASE 0 GATE 0 — Mod counts per target facet');
  console.log('============================================================\n');
  console.log(`Minimum viable per page: ${MIN_VIABLE}`);
  console.log(`Stretch goal per page:   ${STRETCH}\n`);

  console.log('--- Sanity checks ---');
  for (const s of SANITY) {
    const n = await prisma.mod.count({ where: s.where });
    console.log(`  ${s.label.padEnd(45)} ${n.toLocaleString()}`);
  }

  console.log('\n--- Target collection page topics ---\n');
  console.log('  # | Topic                                         | Count   | Complexity | Status');
  console.log('  --|------------------------------------------------|---------|------------|------------------');

  const results: Array<{ id: number; label: string; count: number; complexity: string; status: string }> = [];

  for (const t of TOPICS) {
    const count = await prisma.mod.count({ where: t.where });
    const status = statusBadge(count, t.complexity);
    results.push({ id: t.id, label: t.label, count, complexity: t.complexity, status });
    console.log(
      `  ${String(t.id).padStart(2)} | ${t.label.padEnd(46)} | ${String(count).padStart(7)} | ${t.complexity.padEnd(10)} | ${status}`,
    );
  }

  // Summary
  const viable = results.filter((r) => r.count >= MIN_VIABLE && r.complexity !== 'missing').length;
  const missingButCandidates = results.filter((r) => r.complexity === 'missing' && r.count >= MIN_VIABLE).length;
  const thin = results.filter((r) => r.count >= 10 && r.count < MIN_VIABLE && r.complexity !== 'missing').length;
  const empty = results.filter((r) => r.count < 10).length;

  console.log('\n--- Summary ---');
  console.log(`  Immediately viable (facet set, count >= ${MIN_VIABLE}): ${viable} / 10`);
  console.log(`  Missing facet but ${MIN_VIABLE}+ candidate mods exist:   ${missingButCandidates} / 10`);
  console.log(`  Thin (facet set, count 10-${MIN_VIABLE - 1}):            ${thin} / 10`);
  console.log(`  Empty/near-empty (<10 mods):                           ${empty} / 10`);

  // Recommendation
  console.log('\n--- Recommendation ---');
  const totalViableAfterBackfill = viable + missingButCandidates;
  if (totalViableAfterBackfill >= 8) {
    console.log(`  ✅ GO: ${totalViableAfterBackfill}/10 topics are viable after backfill work.`);
    console.log(`     Proceed with Phase 1 template build.`);
  } else if (totalViableAfterBackfill >= 5) {
    console.log(`  ⚠️  PARTIAL: Only ${totalViableAfterBackfill}/10 topics are viable.`);
    console.log(`     Consider swapping thin/empty topics for alternative blog listicles.`);
  } else {
    console.log(`  ❌ BLOCKED: Only ${totalViableAfterBackfill}/10 topics viable.`);
    console.log(`     DB coverage is too thin for the collection page strategy.`);
    console.log(`     Root cause investigation needed before any template work.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
