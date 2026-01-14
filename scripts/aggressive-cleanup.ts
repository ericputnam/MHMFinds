#!/usr/bin/env npx tsx
/**
 * Aggressive cleanup - fix content types and remove gender from non-clothing items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Items that should have NO gender (they're objects, not clothing)
const NO_GENDER_KEYWORDS = [
  'preset', 'gshade', 'reshade', 'lamp', 'light', 'chair', 'table', 'sofa',
  'bed', 'furniture', 'decor', 'clutter', 'rug', 'curtain', 'plant', 'shelf',
  'cabinet', 'counter', 'kitchen', 'bathroom', 'menu', 'mod', 'computer',
  'jar', 'pan', 'pot', 'recipe', 'food', 'meal', 'dinner', 'breakfast',
  'lunch', 'dessert', 'cake', 'cookie', 'pie', 'pose', 'animation',
  'wall', 'floor', 'door', 'window', 'roof', 'terrain', 'lot', 'house',
  'apartment', 'build', 'room', 'fireplace', 'coffin', 'candle', 'mirror',
  'painting', 'art', 'poster', 'frame', 'screen', 'loading', 'background',
  'override', 'replacement', 'trait', 'aspiration', 'career', 'event',
  'onesie', 'pajama', 'pj'  // often for all ages/genders
];

// Fix content type based on title
const CONTENT_TYPE_FIXES: { pattern: RegExp; contentType: string }[] = [
  { pattern: /\bhair(style)?\b/i, contentType: 'hair' },
  { pattern: /\bchair\b/i, contentType: 'furniture' },
  { pattern: /\blamp\b/i, contentType: 'decor' },
  { pattern: /\blight\b/i, contentType: 'decor' },
  { pattern: /\bpreset\b/i, contentType: 'preset' },
  { pattern: /\bgshade\b/i, contentType: 'preset' },
  { pattern: /\breshade\b/i, contentType: 'preset' },
  { pattern: /\brecipe\b/i, contentType: 'gameplay-mod' },
  { pattern: /\bfood\b/i, contentType: 'decor' },
  { pattern: /\bpose\b/i, contentType: 'poses' },
  { pattern: /\bcoffin\b/i, contentType: 'furniture' },
  { pattern: /\bjeans\b/i, contentType: 'bottoms' },
  { pattern: /\bpants\b/i, contentType: 'bottoms' },
  { pattern: /\bshorts\b/i, contentType: 'bottoms' },
  { pattern: /\bboots?\b/i, contentType: 'shoes' },
  { pattern: /\bsneakers?\b/i, contentType: 'shoes' },
  { pattern: /\bshoes?\b/i, contentType: 'shoes' },
  { pattern: /\beyelash/i, contentType: 'makeup' },
  { pattern: /\blash(es)?\b/i, contentType: 'makeup' },
  { pattern: /\beyebrow/i, contentType: 'makeup' },
  { pattern: /\bbrow\b/i, contentType: 'makeup' },
  { pattern: /\bskin\b/i, contentType: 'skin' },
  { pattern: /\boverlay\b/i, contentType: 'skin' },
  { pattern: /\beyes?\b/i, contentType: 'eyes' },
  { pattern: /\bcleavage\b/i, contentType: 'skin' },
];

async function main() {
  console.log('🔧 AGGRESSIVE CLEANUP\n');

  const mods = await prisma.mod.findMany({
    select: { id: true, title: true, contentType: true, genderOptions: true, tags: true }
  });

  console.log(`Processing ${mods.length} mods...\n`);

  let genderRemoved = 0;
  let contentTypeFixed = 0;
  let madeOnlyFeminine = 0;

  for (const mod of mods) {
    const titleLower = mod.title.toLowerCase();
    const updates: { genderOptions?: string[]; contentType?: string } = {};

    // Check if should have no gender
    const shouldHaveNoGender = NO_GENDER_KEYWORDS.some(k => titleLower.includes(k));

    if (shouldHaveNoGender && mod.genderOptions.length > 0) {
      // But keep gender for actual clothing items
      const isClothing = /\b(shirt|top|dress|pants|jeans|skirt|jacket|coat|sweater|hoodie)\b/i.test(titleLower);
      if (!isClothing) {
        updates.genderOptions = [];
        genderRemoved++;
      }
    }

    // Fix content type
    for (const fix of CONTENT_TYPE_FIXES) {
      if (fix.pattern.test(mod.title) && mod.contentType !== fix.contentType) {
        // Don't change if current type seems more specific
        const currentType = mod.contentType || '';
        if (!['hair', 'makeup', 'skin', 'eyes', 'shoes', 'bottoms'].includes(currentType)) {
          updates.contentType = fix.contentType;
          contentTypeFixed++;
          break;
        }
      }
    }

    // If still has masculine but looks feminine, make feminine only
    if (!updates.genderOptions && mod.genderOptions.includes('masculine')) {
      const feminineIndicators = /\b(vanessa|aurora|isabella|baby tee|biker shorts|cleavage)\b/i;
      if (feminineIndicators.test(titleLower) && !titleLower.includes('male')) {
        updates.genderOptions = ['feminine'];
        madeOnlyFeminine++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: updates
      });
    }
  }

  console.log(`Gender removed from ${genderRemoved} non-clothing items`);
  console.log(`Content type fixed for ${contentTypeFixed} items`);
  console.log(`Made ${madeOnlyFeminine} items feminine-only`);

  // Final stats
  const mascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  const both = await prisma.mod.count({ where: { genderOptions: { hasEvery: ['masculine', 'feminine'] } } });
  const empty = await prisma.mod.count({ where: { genderOptions: { equals: [] } } });

  console.log('\n=== FINAL STATS ===');
  console.log('With masculine:', mascCount);
  console.log('Both M+F:', both);
  console.log('No gender:', empty);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
