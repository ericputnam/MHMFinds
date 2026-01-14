#!/usr/bin/env npx tsx
/**
 * Fix gender using TITLE as primary signal
 * If TITLE has feminine keyword and NO male keyword in TITLE, make feminine
 * (Ignore description mentions of "male" if title is clearly feminine)
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.production' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TITLE_FEM_PATTERNS = [
  /\bfemale\b/i, /\bdress\b/i, /\bgown\b/i, /\bskirt\b/i, /\bblouse\b/i,
  /\bwomen\b/i, /\bwoman\b/i, /\bgirl\b/i, /\bgirls\b/i, /\bfeminine\b/i,
  /\bheels\b/i, /\bearring/i, /\bnecklace\b/i, /\bbracelet\b/i,
  /\blipstick\b/i, /\bmascara\b/i, /\beyeshadow\b/i, /\beyeliner\b/i,
  /\bbikini\b/i, /\bswimsuit\b/i, /\blingerie\b/i, /\bcorset\b/i,
  /\bbow\b/i, /\bprincess\b/i, /\bqueen\b/i, /\bgoddess\b/i,
];

const TITLE_MALE_PATTERNS = [
  /\bmale\b/i, /\bmen's\b/i, /\bmens\b/i, /\bmasculine\b/i,
  /\bbeard/i, /\bfor men\b/i, /\bfor guys\b/i, /\bboy\b/i,
];

async function main() {
  const items = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, description: true, genderOptions: true }
  });

  console.log(`Checking ${items.length} items with masculine...`);

  const toFix: { item: typeof items[0]; reason: string }[] = [];

  for (const item of items) {
    const title = item.title;

    // Check TITLE ONLY for this pass
    const titleHasFem = TITLE_FEM_PATTERNS.some(p => p.test(title));
    const titleHasMale = TITLE_MALE_PATTERNS.some(p => p.test(title));

    // If title has feminine keyword and NO male keyword in title, fix it
    if (titleHasFem && !titleHasMale) {
      const match = TITLE_FEM_PATTERNS.find(p => p.test(title));
      toFix.push({ item, reason: match?.source || 'unknown' });
    }
  }

  console.log(`Found ${toFix.length} items with feminine TITLE keywords\n`);

  for (const { item, reason } of toFix.slice(0, 30)) {
    console.log(`  📦 ${item.title}`);
    console.log(`     [${item.genderOptions.join(', ')}] → [feminine] (${reason})`);
  }
  if (toFix.length > 30) console.log(`\n  ... and ${toFix.length - 30} more`);

  console.log('\n🔧 Applying fixes...');
  let fixed = 0;
  for (const { item } of toFix) {
    await prisma.mod.update({
      where: { id: item.id },
      data: { genderOptions: ['feminine'] }
    });
    fixed++;
  }

  console.log(`\n✅ Fixed ${fixed} items to [feminine] only`);
  await prisma.$disconnect();
}

main().catch(console.error);
