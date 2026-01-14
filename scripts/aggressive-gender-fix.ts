#!/usr/bin/env npx tsx
/**
 * Aggressive gender fix - remove masculine from obviously feminine items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Feminine brands/names that should never be masculine
const FEMININE_TITLE_PATTERNS = [
  /\bbarbie\b/i,
  /\blip\s*(kit|gloss|stick|liner|color|balm)\b/i,
  /\blips\b/i,
  /\beyeshadow\b/i,
  /\bmascara\b/i,
  /\beyeliner\b/i,
  /\bblush\b/i,
  /\bnail\s*(art|polish|color)\b/i,
  /\bdress\b/i,
  /\bgown\b/i,
  /\bskirt\b/i,
  /\bbikini\b/i,
  /\blingerie\b/i,
  /\bheels\b/i,
  /\bpumps\b/i,
  /\bcorset\b/i,
  /\bbustier\b/i,
  /\bbra\b/i,
  /\bpanties\b/i,
  /\bmaternity\b/i,
  /\bpregnancy\b/i,
  /\bbridal\b/i,
  /\bbride\b/i,
  /\bprincess\b/i,
  /\bfemale\b/i,
  /\bwomen'?s?\b/i,
  /\bgirl'?s?\b/i,
  /\bladies\b/i,
  /\bfeminine\b/i,
  /\bcropped\b/i,
  /\bhalter\b/i,
  /\bsundress\b/i,
  /\bromper\b/i,
  /\bmaxi\b/i,
  /\bmidi\b/i,
  /\bpeplum\b/i,
  /\bwrap\s*(dress|top)\b/i,
];

// Skip if title contains these (masculine indicators)
const MASCULINE_TITLE_PATTERNS = [
  /\bmale\b/i,
  /\bmen'?s?\b/i,
  /\bboy'?s?\b/i,
  /\bmasculine\b/i,
  /\bbeard\b/i,
  /\bmustache\b/i,
  /\bgoatee\b/i,
];

async function main() {
  console.log('🔧 AGGRESSIVE GENDER FIX\n');

  const mods = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, description: true, genderOptions: true }
  });

  console.log(`Checking ${mods.length} masculine items...\n`);

  let fixed = 0;
  const fixes: string[] = [];

  for (const mod of mods) {
    const title = mod.title;

    // Skip if has masculine indicators
    if (MASCULINE_TITLE_PATTERNS.some(p => p.test(title))) {
      continue;
    }

    // Check if title has feminine indicators
    if (FEMININE_TITLE_PATTERNS.some(p => p.test(title))) {
      fixes.push(title);
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      fixed++;
    }
  }

  console.log('Fixed items:');
  fixes.slice(0, 30).forEach(t => console.log('  ' + t.slice(0, 60)));
  if (fixes.length > 30) console.log(`  ... and ${fixes.length - 30} more`);

  console.log(`\n✅ Fixed ${fixed} items to feminine-only`);

  // Final stats
  const mascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  const femCount = await prisma.mod.count({ where: { genderOptions: { has: 'feminine' } } });
  console.log(`\nMasculine: ${mascCount}, Feminine: ${femCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
