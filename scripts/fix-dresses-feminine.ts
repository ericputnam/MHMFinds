#!/usr/bin/env npx tsx
/**
 * Fix ALL dresses to be feminine-only (unless explicitly male)
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MALE_KEYWORDS = ['male', "men's", 'mens', 'for men', 'masculine', 'boy', 'guy', 'beard'];

async function main() {
  console.log('🔍 Fixing dresses to feminine-only...\n');

  // Find ALL dresses that have masculine in their gender
  const dresses = await prisma.mod.findMany({
    where: {
      contentType: 'dresses',
      genderOptions: { has: 'masculine' },
    },
    select: { id: true, title: true, description: true, genderOptions: true },
  });

  console.log(`Found ${dresses.length} dresses with masculine tag`);

  // Filter to ones WITHOUT male keywords
  const toFix = dresses.filter(d => {
    const text = (d.title + ' ' + (d.description || '')).toLowerCase();
    const hasMale = MALE_KEYWORDS.some(kw => text.includes(kw));
    return !hasMale;
  });

  console.log(`Without male keywords: ${toFix.length} to change to feminine-only\n`);

  // Show examples
  for (const d of toFix.slice(0, 10)) {
    console.log(`  - ${d.title}: [${d.genderOptions.join(', ')}] → [feminine]`);
  }
  if (toFix.length > 10) console.log(`  ... and ${toFix.length - 10} more`);

  // Apply fix
  console.log('\n🔧 Applying...');
  let fixed = 0;
  for (const d of toFix) {
    await prisma.mod.update({
      where: { id: d.id },
      data: { genderOptions: ['feminine'] },
    });
    fixed++;
  }

  console.log(`\n✅ Fixed ${fixed} dresses to [feminine] only`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
