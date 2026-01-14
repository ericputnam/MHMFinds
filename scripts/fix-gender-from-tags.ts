#!/usr/bin/env npx tsx
/**
 * Fix gender based on tags - if has 'female' tag but not 'male' tag, make feminine only
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing gender based on tags...\n');

  // Find items with 'female' tag but masculine gender
  const allMods = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, tags: true, genderOptions: true }
  });

  let fixed = 0;
  const fixes: string[] = [];

  for (const mod of allMods) {
    const tags = mod.tags.map(t => t.toLowerCase());
    const hasFemaleTag = tags.includes('female');
    const hasMaleTag = tags.includes('male');

    // If has female tag but NOT male tag, make feminine only
    if (hasFemaleTag && !hasMaleTag) {
      fixes.push(mod.title);
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

  console.log(`\n✅ Fixed ${fixed} items to feminine-only based on tags`);

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
