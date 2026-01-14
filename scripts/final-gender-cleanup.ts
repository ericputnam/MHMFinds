#!/usr/bin/env npx tsx
/**
 * Final gender cleanup - fix all remaining both-gender items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEMALE_NAMES = [
  'isabella', 'charlotte', 'amelia', 'lena', 'vanessa', 'aurora', 'sophia',
  'olivia', 'emma', 'mia', 'luna', 'ava', 'ella', 'aria', 'chloe', 'lily',
  'hannah', 'grace', 'zoe', 'nora', 'riley', 'layla', 'zoey', 'penelope',
  'lillian', 'addison', 'ellie', 'stella', 'leah', 'savannah', 'audrey',
  'maya', 'claire', 'skylar', 'paisley', 'evelyn', 'brooklyn', 'bella',
  'jessica', 'sarah', 'ashley', 'emily', 'samantha', 'amanda', 'nicole',
  'jennifer', 'elizabeth', 'stephanie', 'heather', 'michelle', 'amber',
  'megan', 'rachel', 'lauren', 'melissa', 'brittany', 'tiffany', 'kayla',
  'anna', 'victoria', 'natalie', 'katherine', 'rebecca', 'maria', 'julia',
  'kimberly', 'alexandra', 'kelly', 'christina', 'nancy', 'ruth', 'karen',
  'betty', 'dorothy', 'helen', 'sandra', 'donna', 'carol', 'diane', 'sharon'
];

async function main() {
  console.log('🔧 FINAL GENDER CLEANUP\n');

  const both = await prisma.mod.findMany({
    where: { genderOptions: { hasEvery: ['masculine', 'feminine'] } },
    select: { id: true, title: true, contentType: true, tags: true, description: true }
  });

  console.log(`Processing ${both.length} items with both genders...\n`);

  let madeEmpty = 0;
  let madeFeminine = 0;

  for (const mod of both) {
    const titleLower = mod.title.toLowerCase();
    const descLower = (mod.description || '').toLowerCase();
    const tagsLower = mod.tags.map(t => t.toLowerCase());
    const hasMaleKeyword = titleLower.includes('male') || descLower.includes(' male ');
    const hasFemaleKeyword = titleLower.includes('female') || tagsLower.includes('female');

    // Skip skin overlays - they're usually universal
    if (mod.contentType === 'skin') continue;

    // Skip items with explicit "male" keyword
    if (hasMaleKeyword && !hasFemaleKeyword) continue;

    // Items that should have NO gender (non-clothing)
    const isNonClothing = ['preset', 'gameplay-mod', 'script-mod', 'lot', 'decor',
      'furniture', 'clutter', 'poses', 'loading-screen', 'cas-background'].includes(mod.contentType || '');

    if (isNonClothing) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: [] }
      });
      madeEmpty++;
      continue;
    }

    // Items with female names -> feminine only
    if (FEMALE_NAMES.some(n => titleLower.includes(n)) && !hasMaleKeyword) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      madeFeminine++;
      continue;
    }

    // Items with female tag but not male tag -> feminine only
    if (tagsLower.includes('female') && !tagsLower.includes('male')) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      madeFeminine++;
      continue;
    }

    // Makeup, nails, jewelry, dresses without male keyword -> feminine
    if (['makeup', 'nails', 'jewelry', 'dresses'].includes(mod.contentType || '')) {
      if (!hasMaleKeyword) {
        await prisma.mod.update({
          where: { id: mod.id },
          data: { genderOptions: ['feminine'] }
        });
        madeFeminine++;
        continue;
      }
    }

    // Eyes content type without male keyword -> feminine (usually lashes, etc.)
    if (mod.contentType === 'eyes' && !hasMaleKeyword) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      madeFeminine++;
      continue;
    }

    // Accessories that look like non-clothing -> remove gender
    if (mod.contentType === 'accessories') {
      const isActualAccessory = /\bhat\b|\bbag\b|\bscarf\b|\bgloves\b|\bjewelry\b|\bearring|\bnecklace|\bbracelet/.test(titleLower);
      if (!isActualAccessory) {
        await prisma.mod.update({
          where: { id: mod.id },
          data: { genderOptions: [] }
        });
        madeEmpty++;
        continue;
      }
    }
  }

  console.log(`Made ${madeEmpty} items have no gender`);
  console.log(`Made ${madeFeminine} items feminine-only`);

  // Final stats
  const remaining = await prisma.mod.count({ where: { genderOptions: { hasEvery: ['masculine', 'feminine'] } } });
  const mascTotal = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });

  console.log(`\n=== FINAL ===`);
  console.log(`Remaining with both: ${remaining}`);
  console.log(`Total with masculine: ${mascTotal}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
