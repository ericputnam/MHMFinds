#!/usr/bin/env npx tsx
/**
 * Fix ALL items with feminine keywords to be feminine-only
 * Targets items with "dress", "gown", "skirt", "women", "girl", etc. in title/description
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Strong feminine keywords - if in title, should be feminine only
const FEMININE_TITLE_KEYWORDS = [
  'dress', 'gown', 'skirt', 'blouse', 'corset', 'bustier',
  'bikini', 'swimsuit', 'lingerie',
  'heels', 'stiletto', 'pumps',
  'lipstick', 'eyeshadow', 'mascara', 'eyeliner',
  'female', 'women', 'woman', 'girl', 'girls', 'ladies', 'feminine',
  'pregnancy', 'pregnant', 'maternity', 'bridal', 'bride',
  'princess', 'queen', 'goddess', 'ballerina',
];

// Male keywords - keep as-is if present
const MALE_KEYWORDS = ['male', "men's", 'mens', 'for men', 'masculine', 'boy', 'guy', 'beard'];

async function main() {
  console.log('🔍 Fixing items with feminine keywords to feminine-only...\n');

  // Find ALL items that have masculine AND have feminine keywords in title
  const items = await prisma.mod.findMany({
    where: {
      genderOptions: { has: 'masculine' },
    },
    select: { id: true, title: true, description: true, contentType: true, genderOptions: true },
  });

  console.log(`Total items with masculine: ${items.length}`);

  const toFix: typeof items = [];

  for (const item of items) {
    const titleLower = item.title.toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const fullText = titleLower + ' ' + descLower;

    // Check for male keywords first - skip if present
    const hasMale = MALE_KEYWORDS.some(kw => fullText.includes(kw));
    if (hasMale) continue;

    // Check for feminine keywords in TITLE (strong signal)
    const hasFemTitle = FEMININE_TITLE_KEYWORDS.some(kw => titleLower.includes(kw));
    if (hasFemTitle) {
      toFix.push(item);
    }
  }

  console.log(`Items with feminine title keywords: ${toFix.length} to change to feminine-only\n`);

  // Show examples
  for (const item of toFix.slice(0, 20)) {
    const femKey = FEMININE_TITLE_KEYWORDS.find(kw => item.title.toLowerCase().includes(kw));
    console.log(`  📦 ${item.title}`);
    console.log(`     Type: ${item.contentType} | Keyword: "${femKey}"`);
    console.log(`     [${item.genderOptions.join(', ')}] → [feminine]`);
  }
  if (toFix.length > 20) console.log(`\n  ... and ${toFix.length - 20} more`);

  // Apply fix
  console.log('\n🔧 Applying...');
  let fixed = 0;
  for (const item of toFix) {
    await prisma.mod.update({
      where: { id: item.id },
      data: { genderOptions: ['feminine'] },
    });
    fixed++;
    if (fixed % 100 === 0) console.log(`  Fixed ${fixed}/${toFix.length}...`);
  }

  console.log(`\n✅ Fixed ${fixed} items to [feminine] only`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
