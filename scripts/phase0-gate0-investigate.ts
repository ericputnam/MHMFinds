/**
 * Phase 0 Gate 0 — Investigation follow-up
 *
 * Diagnoses:
 * 1. Why trait mods count is 0 (are traits tagged under a different contentType?)
 * 2. Whether "tattoos alone" is viable if "urban tattoos" composite is too thin
 * 3. Whether pregnancy/woohoo keyword hits have gameplay-mod contentType
 */

import './lib/setup-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SIMS4 = { gameVersion: 'Sims 4' };

async function main() {
  console.log('\n--- Investigation A: where are trait mods hiding? ---\n');

  // What contentTypes do mods with 'trait' in title/description use?
  const traitCandidates = await prisma.mod.findMany({
    where: {
      ...SIMS4,
      OR: [
        { title: { contains: 'trait', mode: 'insensitive' } },
        { description: { contains: 'trait', mode: 'insensitive' } },
      ],
    },
    select: { contentType: true },
    take: 5000,
  });
  console.log(`  Mods with "trait" in title/description: ${traitCandidates.length}`);

  const ctDist: Record<string, number> = {};
  for (const m of traitCandidates) {
    const k = m.contentType || '(null)';
    ctDist[k] = (ctDist[k] || 0) + 1;
  }
  const sorted = Object.entries(ctDist).sort((a, b) => b[1] - a[1]);
  console.log('  contentType distribution for trait candidates:');
  for (const [ct, n] of sorted.slice(0, 12)) {
    console.log(`    ${ct.padEnd(20)} ${n}`);
  }

  // What about gameplay-mod and script-mod totals?
  const gameplayCount = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'gameplay-mod' },
  });
  const scriptCount = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'script-mod' },
  });
  console.log(`\n  Total gameplay-mod:  ${gameplayCount}`);
  console.log(`  Total script-mod:    ${scriptCount}`);

  console.log('\n--- Investigation B: tattoos alone vs urban tattoos ---\n');

  const tattoosAll = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos' },
  });
  const tattoosStreetwear = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos', themes: { has: 'streetwear' } },
  });
  const tattoosGrunge = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos', themes: { has: 'grunge' } },
  });
  const tattoosGoth = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos', themes: { has: 'goth' } },
  });
  const tattoosAlpha = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos', visualStyle: 'alpha' },
  });
  const tattoosNoTheme = await prisma.mod.count({
    where: { ...SIMS4, contentType: 'tattoos', themes: { isEmpty: true } },
  });
  console.log(`  All tattoos:               ${tattoosAll}`);
  console.log(`  tattoos + streetwear:      ${tattoosStreetwear}`);
  console.log(`  tattoos + grunge:          ${tattoosGrunge}`);
  console.log(`  tattoos + goth:            ${tattoosGoth}`);
  console.log(`  tattoos + alpha (visual):  ${tattoosAlpha}`);
  console.log(`  tattoos with NO theme:     ${tattoosNoTheme}  <- backfill opportunity`);

  console.log('\n--- Investigation C: pregnancy/woohoo current contentType ---\n');

  const pregnancyDist: Record<string, number> = {};
  const pregnancySample = await prisma.mod.findMany({
    where: {
      ...SIMS4,
      OR: [
        { title: { contains: 'pregnan', mode: 'insensitive' } },
        { title: { contains: 'maternity', mode: 'insensitive' } },
      ],
    },
    select: { contentType: true },
    take: 500,
  });
  for (const m of pregnancySample) {
    const k = m.contentType || '(null)';
    pregnancyDist[k] = (pregnancyDist[k] || 0) + 1;
  }
  console.log(`  Pregnancy candidates (${pregnancySample.length}) contentType distribution:`);
  for (const [ct, n] of Object.entries(pregnancyDist).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${ct.padEnd(20)} ${n}`);
  }

  const woohooDist: Record<string, number> = {};
  const woohooSample = await prisma.mod.findMany({
    where: {
      ...SIMS4,
      OR: [
        { title: { contains: 'woohoo', mode: 'insensitive' } },
        { title: { contains: 'wicked', mode: 'insensitive' } },
      ],
    },
    select: { contentType: true },
    take: 500,
  });
  for (const m of woohooSample) {
    const k = m.contentType || '(null)';
    woohooDist[k] = (woohooDist[k] || 0) + 1;
  }
  console.log(`\n  Woohoo candidates (${woohooSample.length}) contentType distribution:`);
  for (const [ct, n] of Object.entries(woohooDist).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${ct.padEnd(20)} ${n}`);
  }

  console.log('\n--- Investigation D: full contentType distribution (top 30) ---\n');
  const all = await prisma.mod.groupBy({
    by: ['contentType'],
    where: SIMS4,
    _count: true,
    orderBy: { _count: { contentType: 'desc' } },
    take: 30,
  });
  for (const row of all) {
    console.log(`  ${(row.contentType || '(null)').padEnd(20)} ${row._count}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
