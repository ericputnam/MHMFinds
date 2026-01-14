#!/usr/bin/env npx tsx
/**
 * FC-005: Fill null visualStyles using keyword detection
 *
 * Assign visualStyle based on common indicators in title/description/tags.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Alpha indicators (from AC: alpha, realistic, hq, high quality, 4k)
const ALPHA_PATTERNS = [
  /\balpha\b/i,
  /\brealistic\b/i,
  /\bhq\b/i,
  /\bhigh\s*quality\b/i,
  /\b4k\b/i,
  /\bultra\s*hd\b/i,
  /\bphotorealistic\b/i,
  /\bhd\b/i,
];

// Maxis-match indicators (from AC: maxis match, maxis-match, mm, bgc, base game compatible)
const MAXIS_MATCH_PATTERNS = [
  /\bmaxis\s*match\b/i,
  /\bmaxis-match\b/i,
  /\bmm\b/i,
  /\bbgc\b/i,
  /\bbase\s*game\s*compatible\b/i,
  /\bea\s*style\b/i,
  /\bea-style\b/i,
  /\bclayified\b/i,
];

// Semi-maxis patterns
const SEMI_MAXIS_PATTERNS = [
  /\bsemi\s*maxis\b/i,
  /\bsemi-maxis\b/i,
];

function inferVisualStyle(title: string, description: string | null, tags: string[]): string | null {
  const text = title + ' ' + (description || '') + ' ' + tags.join(' ');

  // Check for semi-maxis first (most specific)
  if (SEMI_MAXIS_PATTERNS.some(p => p.test(text))) {
    return 'semi-maxis';
  }

  // Check for maxis-match (before alpha since it's more specific)
  if (MAXIS_MATCH_PATTERNS.some(p => p.test(text))) {
    return 'maxis-match';
  }

  // Check for alpha
  if (ALPHA_PATTERNS.some(p => p.test(text))) {
    return 'alpha';
  }

  // Don't guess - return null if no clear indicator
  return null;
}

async function fixNullVisualStyles() {
  console.log('🔧 FC-005: Fill null visualStyles using keyword detection\n');

  const mods = await prisma.mod.findMany({
    where: { visualStyle: null },
    select: { id: true, title: true, description: true, tags: true },
  });

  console.log(`Found ${mods.length} mods with null visualStyle\n`);

  const stats = {
    alpha: 0,
    'maxis-match': 0,
    'semi-maxis': 0,
    unresolved: 0
  };

  const fixes: { id: string; newStyle: string; title: string }[] = [];

  for (const mod of mods) {
    const inferred = inferVisualStyle(mod.title, mod.description, mod.tags);
    if (inferred) {
      fixes.push({ id: mod.id, newStyle: inferred, title: mod.title });
      stats[inferred as keyof typeof stats]++;
    } else {
      stats.unresolved++;
    }
  }

  console.log('--- Inferred Visual Styles ---');
  console.log(`  alpha: ${stats.alpha}`);
  console.log(`  maxis-match: ${stats['maxis-match']}`);
  console.log(`  semi-maxis: ${stats['semi-maxis']}`);
  console.log(`  unresolved (left null): ${stats.unresolved}`);

  // Show sample fixes
  if (fixes.length > 0) {
    console.log('\n--- Sample Fixes (first 15) ---');
    for (const fix of fixes.slice(0, 15)) {
      console.log(`  [${fix.newStyle.padEnd(11)}] "${fix.title.substring(0, 50)}"`);
    }
  }

  // Apply updates
  console.log('\n🔧 Applying updates...');
  let updated = 0;
  for (const fix of fixes) {
    await prisma.mod.update({
      where: { id: fix.id },
      data: { visualStyle: fix.newStyle }
    });
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated}/${fixes.length}`);
    }
  }

  console.log(`\n✅ Updated ${updated} mods`);

  // Verify
  const remaining = await prisma.mod.count({ where: { visualStyle: null } });
  console.log(`📊 Mods with null visualStyle remaining: ${remaining}`);

  await prisma.$disconnect();
}

fixNullVisualStyles().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
