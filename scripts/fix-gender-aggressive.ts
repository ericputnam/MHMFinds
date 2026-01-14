#!/usr/bin/env npx tsx
/**
 * Aggressive gender fix script
 * Finds items tagged "masculine" that clearly should be feminine based on content
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Strong feminine indicators - ONLY strong signals, no ambiguous terms
// We check TITLE first (strong) then description (weaker)
const TITLE_FEMININE_INDICATORS = [
  // Clothing types in TITLE - very strong signal
  'dress', 'gown', 'skirt', 'blouse', 'lingerie', 'bustier', 'corset',
  'bikini', 'swimsuit', 'bodysuit', 'romper', 'jumpsuit',
  'crop top', 'halter top', 'tube top', 'camisole',
  'leggings', 'tights', 'stockings',
  // Explicit gender in title
  'female', 'women', 'woman', 'girl', 'girls', 'ladies', 'feminine',
  // Makeup in title
  'lipstick', 'eyeshadow', 'mascara', 'eyeliner',
  // Shoes in title
  'heels', 'high heel', 'stiletto', 'pumps', 'mary jane',
  // Life stages in title
  'pregnancy', 'pregnant', 'maternity', 'bridal', 'bride',
  // Aesthetic in title
  'princess', 'ballerina', 'queen', 'goddess', 'girly',
];

// Description indicators - need to be more careful, only use definitive terms
const DESC_FEMININE_INDICATORS = [
  'for women', 'for girls', 'for ladies', 'for female',
  'female frame', 'feminine frame', 'female body', 'female sim',
  'women only', 'girls only', 'ladies only',
  'mini skirt', 'pencil skirt', 'pleated skirt',
  'bodycon dress', 'cocktail dress', 'evening gown', 'prom dress',
];

// Male indicators - if present, keep masculine
const MASCULINE_INDICATORS = [
  'male', "men's", "mens", 'masculine', 'masc ',
  ' boy', 'boys', ' guy', 'guys', ' man ', 'gentleman',
  'beard', 'facial hair', 'stubble', 'mustache',
  'boxer', 'briefs', 'for men', 'for boys', 'for guys',
];

// Unisex indicators
const UNISEX_INDICATORS = [
  'unisex', 'both genders', 'all genders', 'any gender',
  'male and female', 'female and male',
];

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('🔍 Finding masculine items that should be feminine...\n');

  // Find ALL items tagged masculine
  const mascItems = await prisma.mod.findMany({
    where: {
      genderOptions: { has: 'masculine' },
    },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      genderOptions: true,
    },
  });

  console.log(`Total masculine items: ${mascItems.length}`);

  const needsFix: typeof mascItems = [];

  for (const m of mascItems) {
    const titleLower = m.title.toLowerCase();
    const descLower = (m.description || '').toLowerCase();
    const fullText = titleLower + ' ' + descLower;

    // Skip items that already have feminine or unisex (intentional)
    if (m.genderOptions.includes('feminine')) continue;
    if (m.genderOptions.includes('unisex')) continue;

    // Check for masculine indicators (if present, skip)
    const mascMatch = MASCULINE_INDICATORS.find(f => fullText.includes(f));
    if (mascMatch) continue;

    // Check for unisex indicators (if present, skip)
    const unisexMatch = UNISEX_INDICATORS.find(f => fullText.includes(f));
    if (unisexMatch) continue;

    // Check TITLE for feminine indicators (strong signal)
    const titleFemMatch = TITLE_FEMININE_INDICATORS.find(f => titleLower.includes(f));
    if (titleFemMatch) {
      needsFix.push({ ...m, _reason: `title:"${titleFemMatch}"` } as any);
      continue;
    }

    // Check description for strong feminine indicators
    const descFemMatch = DESC_FEMININE_INDICATORS.find(f => descLower.includes(f));
    if (descFemMatch) {
      needsFix.push({ ...m, _reason: `desc:"${descFemMatch}"` } as any);
      continue;
    }
  }

  console.log(`Items needing fix: ${needsFix.length}\n`);

  if (needsFix.length === 0) {
    console.log('✅ No issues found!');
    await prisma.$disconnect();
    return;
  }

  // Show examples
  console.log('Examples of items to fix:');
  console.log('='.repeat(80));
  for (const m of needsFix.slice(0, 30)) {
    console.log(`\n  📦 ${m.title}`);
    console.log(`     ContentType: ${m.contentType || 'null'}`);
    console.log(`     Current gender: [${m.genderOptions.join(', ')}]`);
    console.log(`     Feminine indicator: "${(m as any)._reason}"`);
    console.log(`     → Will change to: [feminine]`);
  }

  if (needsFix.length > 30) {
    console.log(`\n  ... and ${needsFix.length - 30} more`);
  }

  console.log('\n' + '='.repeat(80));

  if (shouldFix) {
    console.log('\n🔧 Applying fixes...');

    let fixed = 0;
    for (const m of needsFix) {
      await prisma.mod.update({
        where: { id: m.id },
        data: { genderOptions: ['feminine'] },
      });
      fixed++;
    }

    console.log(`✅ Fixed ${fixed} mods - changed from masculine to feminine.`);
  } else {
    console.log('\n💡 Run with --fix to apply these fixes:');
    console.log('   source .env.local && npx tsx scripts/fix-gender-aggressive.ts --fix');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
