#!/usr/bin/env npx tsx
/**
 * FINAL comprehensive gender fix with proper word boundary matching
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Male keywords - using regex word boundaries
const MALE_PATTERNS = [
  /\bmale\b/i,        // "male" but not "female"
  /\bmen's\b/i,
  /\bmens\b/i,
  /\bfor men\b/i,
  /\bmasculine\b/i,
  /\bmasc\s/i,
  /\bboy\b/i,
  /\bboys\b/i,
  /\bguy\b/i,
  /\bguys\b/i,
  /\bbeard/i,
  /\bstubble\b/i,
  /\bmustache\b/i,
];

// Feminine keywords in title
const FEMININE_PATTERNS = [
  /\bdress\b/i,
  /\bgown\b/i,
  /\bskirt\b/i,
  /\bblouse\b/i,
  /\bcorset\b/i,
  /\bbustier\b/i,
  /\bbikini\b/i,
  /\bswimsuit\b/i,
  /\blingerie\b/i,
  /\bheels\b/i,
  /\bstiletto/i,
  /\bpumps\b/i,
  /\blipstick\b/i,
  /\beyeshadow\b/i,
  /\bmascara\b/i,
  /\beyeliner\b/i,
  /\bfemale\b/i,
  /\bwomen\b/i,
  /\bwoman\b/i,
  /\bgirl\b/i,
  /\bgirls\b/i,
  /\bladies\b/i,
  /\bfeminine\b/i,
  /\bpregnancy\b/i,
  /\bpregnant\b/i,
  /\bmaternity\b/i,
  /\bbridal\b/i,
  /\bbride\b/i,
  /\bprincess\b/i,
  /\bqueen\b/i,
  /\bgoddess\b/i,
  /\bballerina\b/i,
];

function hasMaleKeyword(text: string): boolean {
  return MALE_PATTERNS.some(pattern => pattern.test(text));
}

function hasFeminineKeyword(text: string): boolean {
  return FEMININE_PATTERNS.some(pattern => pattern.test(text));
}

async function main() {
  console.log('🔍 FINAL gender fix with word boundary matching...\n');

  // Find ALL items that have masculine
  const items = await prisma.mod.findMany({
    where: {
      genderOptions: { has: 'masculine' },
    },
    select: { id: true, title: true, description: true, contentType: true, genderOptions: true },
  });

  console.log(`Total items with masculine: ${items.length}`);

  const toFix: { item: typeof items[0]; reason: string }[] = [];

  for (const item of items) {
    const titleAndDesc = item.title + ' ' + (item.description || '');

    // Check for male keywords - skip if present (using regex)
    if (hasMaleKeyword(titleAndDesc)) continue;

    // Check for feminine keywords in title or description
    if (hasFeminineKeyword(item.title)) {
      const match = FEMININE_PATTERNS.find(p => p.test(item.title));
      toFix.push({ item, reason: `title: ${match?.source}` });
    } else if (hasFeminineKeyword(item.description || '')) {
      const match = FEMININE_PATTERNS.find(p => p.test(item.description || ''));
      toFix.push({ item, reason: `desc: ${match?.source}` });
    }
  }

  console.log(`Items with feminine keywords (no male): ${toFix.length} to change to feminine-only\n`);

  // Show examples
  console.log('Examples:');
  for (const { item, reason } of toFix.slice(0, 25)) {
    console.log(`  📦 ${item.title}`);
    console.log(`     [${item.genderOptions.join(', ')}] → [feminine] (${reason})`);
  }
  if (toFix.length > 25) console.log(`\n  ... and ${toFix.length - 25} more`);

  // Apply fix
  console.log('\n🔧 Applying...');
  let fixed = 0;
  for (const { item } of toFix) {
    await prisma.mod.update({
      where: { id: item.id },
      data: { genderOptions: ['feminine'] },
    });
    fixed++;
    if (fixed % 100 === 0) console.log(`  Fixed ${fixed}/${toFix.length}...`);
  }

  console.log(`\n✅ Fixed ${fixed} items to [feminine] only`);

  // Summary
  const newMascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  const newFemCount = await prisma.mod.count({ where: { genderOptions: { has: 'feminine' } } });
  console.log(`\nNew counts: Masculine=${newMascCount}, Feminine=${newFemCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
