#!/usr/bin/env npx tsx
/**
 * Aggressive gender fix - fixes ALL items that are incorrectly tagged masculine
 *
 * Strategy:
 * 1. Dresses/Makeup with ONLY [masculine] → change to [feminine] (unless explicitly male)
 * 2. Full-body/Tops/Bottoms with ONLY [masculine] → check for feminine indicators
 * 3. Items with no masculine keywords at all → likely should be feminine or unisex
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// If ANY of these appear, keep as masculine
const MALE_KEYWORDS = [
  'male', "men's", 'mens', 'for men', 'for boys', 'for guys',
  'masculine', 'masc frame', 'male frame',
  'boy ', 'boys', 'guy ', 'guys',
  'beard', 'facial hair', 'stubble', 'mustache',
  'boxer', 'briefs',
];

// Content types that are almost NEVER masculine-only in Sims CC
const TYPICALLY_FEMININE_TYPES = ['dresses', 'makeup', 'nails'];

// Content types that COULD be either, need more analysis
const NEUTRAL_TYPES = ['tops', 'bottoms', 'full-body', 'shoes', 'accessories', 'hair', 'skin', 'jewelry'];

// Feminine indicators for neutral types
const FEMININE_INDICATORS = [
  'dress', 'gown', 'skirt', 'blouse', 'corset', 'bustier',
  'bikini', 'swimsuit', 'lingerie', 'bra ',
  'crop top', 'halter', 'tube top', 'camisole',
  'heels', 'stiletto', 'pumps', 'mary jane',
  'lipstick', 'eyeshadow', 'mascara', 'eyeliner',
  'female', 'women', 'woman', 'girl', 'girls', 'ladies', 'feminine',
  'pregnancy', 'pregnant', 'maternity', 'bridal', 'bride',
  'princess', 'queen', 'goddess', 'ballerina', 'fairy',
];

function hasMaleKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return MALE_KEYWORDS.some(kw => lower.includes(kw));
}

function hasFeminineIndicator(text: string): boolean {
  const lower = text.toLowerCase();
  return FEMININE_INDICATORS.some(kw => lower.includes(kw));
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('🔍 Aggressive gender fix scan...\n');

  const toFix: { id: string; title: string; contentType: string | null; reason: string }[] = [];

  // PHASE 1: Fix typically feminine content types
  console.log('Phase 1: Dresses, Makeup, Nails with ONLY [masculine]...');

  const typicallyFeminine = await prisma.mod.findMany({
    where: {
      contentType: { in: TYPICALLY_FEMININE_TYPES },
      genderOptions: { equals: ['masculine'] },
    },
    select: { id: true, title: true, contentType: true, description: true },
  });

  for (const m of typicallyFeminine) {
    const text = m.title + ' ' + (m.description || '');
    if (!hasMaleKeyword(text)) {
      toFix.push({ id: m.id, title: m.title, contentType: m.contentType, reason: `${m.contentType} shouldn't be masculine-only` });
    }
  }

  console.log(`  Found ${toFix.length} items to fix\n`);

  // PHASE 2: Fix neutral types that have feminine indicators
  console.log('Phase 2: Neutral types (tops, bottoms, etc.) with feminine indicators...');

  const neutralTypes = await prisma.mod.findMany({
    where: {
      contentType: { in: NEUTRAL_TYPES },
      genderOptions: { equals: ['masculine'] },
    },
    select: { id: true, title: true, contentType: true, description: true },
  });

  let phase2Count = 0;
  for (const m of neutralTypes) {
    const text = m.title + ' ' + (m.description || '');
    if (!hasMaleKeyword(text) && hasFeminineIndicator(text)) {
      toFix.push({ id: m.id, title: m.title, contentType: m.contentType, reason: 'has feminine indicator' });
      phase2Count++;
    }
  }

  console.log(`  Found ${phase2Count} more items to fix\n`);

  // PHASE 3: Items with null contentType that have feminine indicators
  console.log('Phase 3: Null contentType items with feminine indicators...');

  const nullTypes = await prisma.mod.findMany({
    where: {
      contentType: null,
      genderOptions: { equals: ['masculine'] },
    },
    select: { id: true, title: true, contentType: true, description: true },
  });

  let phase3Count = 0;
  for (const m of nullTypes) {
    const text = m.title + ' ' + (m.description || '');
    if (!hasMaleKeyword(text) && hasFeminineIndicator(text)) {
      toFix.push({ id: m.id, title: m.title, contentType: m.contentType, reason: 'has feminine indicator' });
      phase3Count++;
    }
  }

  console.log(`  Found ${phase3Count} more items to fix\n`);

  // Summary
  console.log('=' .repeat(80));
  console.log(`TOTAL: ${toFix.length} items to change from [masculine] to [feminine]\n`);

  // Show examples
  console.log('Examples:');
  for (const m of toFix.slice(0, 30)) {
    console.log(`  📦 ${m.title}`);
    console.log(`     Type: ${m.contentType || 'null'} | Reason: ${m.reason}`);
  }
  if (toFix.length > 30) {
    console.log(`\n  ... and ${toFix.length - 30} more`);
  }

  console.log('\n' + '='.repeat(80));

  if (shouldFix) {
    console.log('\n🔧 Applying fixes...');

    let fixed = 0;
    for (const m of toFix) {
      await prisma.mod.update({
        where: { id: m.id },
        data: { genderOptions: ['feminine'] },
      });
      fixed++;
      if (fixed % 100 === 0) {
        console.log(`  Fixed ${fixed}/${toFix.length}...`);
      }
    }

    console.log(`\n✅ Fixed ${fixed} items - changed from [masculine] to [feminine]`);
  } else {
    console.log('\n💡 Run with --fix to apply:');
    console.log('   source .env.local && npx tsx scripts/fix-all-gender.ts --fix');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
