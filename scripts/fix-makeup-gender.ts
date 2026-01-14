#!/usr/bin/env npx tsx
/**
 * Fix makeup items that should be feminine-only
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Makeup items that should be feminine
const FEMININE_MAKEUP_PATTERNS = [
  /\blipstick\b/i,
  /\blips\b/i,
  /\blip\s*(gloss|liner|color)\b/i,
  /\beyeshadow\b/i,
  /\bmascara\b/i,
  /\beyeliner\b/i,
  /\bblush\b/i,
  /\bfoundation\b/i,
  /\bcontour\b/i,
  /\bhighlighter\b/i,
  /\bgloss\b/i,
  /\bnail\s*(polish|art|color)\b/i,
];

// Skip if description mentions both genders
const BOTH_GENDERS_PATTERN = /\b(male and female|female and male|for (both|all) (genders|sims)|unisex)\b/i;

async function main() {
  console.log('🔧 Fixing makeup gender issues...\n');

  // Find all makeup items with masculine
  const makeupMods = await prisma.mod.findMany({
    where: {
      genderOptions: { has: 'masculine' },
      contentType: 'makeup',
    },
    select: { id: true, title: true, description: true, genderOptions: true }
  });

  console.log(`Found ${makeupMods.length} makeup items with masculine\n`);

  let fixed = 0;
  for (const mod of makeupMods) {
    const text = mod.title + ' ' + (mod.description || '');

    // Skip if it mentions both genders explicitly
    if (BOTH_GENDERS_PATTERN.test(text)) {
      continue;
    }

    // Check if it has feminine makeup keywords
    const isFeminineMakeup = FEMININE_MAKEUP_PATTERNS.some(p => p.test(text));

    if (isFeminineMakeup) {
      console.log(`  Fixing: ${mod.title.slice(0, 50)}`);
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} makeup items to feminine-only`);

  // Also fix jewelry that should be feminine
  console.log('\n🔧 Fixing jewelry gender issues...\n');

  const jewelryMods = await prisma.mod.findMany({
    where: {
      genderOptions: { has: 'masculine' },
      contentType: 'jewelry',
    },
    select: { id: true, title: true, description: true, genderOptions: true }
  });

  console.log(`Found ${jewelryMods.length} jewelry items with masculine\n`);

  let jewelryFixed = 0;
  const FEMININE_JEWELRY = [
    /\bearring/i,
    /\bnecklace/i,
    /\bbracelet/i,
    /\bring\b/i,
    /\bpendant/i,
    /\bbrooch/i,
    /\banklet/i,
    /\bchoker/i,
  ];

  for (const mod of jewelryMods) {
    const text = mod.title + ' ' + (mod.description || '');

    if (BOTH_GENDERS_PATTERN.test(text)) {
      continue;
    }

    const isFeminineJewelry = FEMININE_JEWELRY.some(p => p.test(text));
    if (isFeminineJewelry) {
      console.log(`  Fixing: ${mod.title.slice(0, 50)}`);
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      jewelryFixed++;
    }
  }

  console.log(`\n✅ Fixed ${jewelryFixed} jewelry items to feminine-only`);

  // Final count
  const mascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  console.log(`\nRemaining masculine items: ${mascCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
