#!/usr/bin/env npx tsx
/**
 * Fix items with ONLY [masculine] to be unisex [masculine, feminine]
 * For CAS items without explicit male keywords, they should be available to both genders
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Explicit male keywords - if present, keep as masculine only
const MALE_KEYWORDS = [
  'male', "men's", 'mens', 'for men', 'for boys', 'for guys',
  'masculine', 'masc frame', 'male frame', 'male sim',
  'boy ', 'boys', 'guy ', 'guys', ' man ',
  'beard', 'facial hair', 'stubble', 'mustache', 'moustache',
  'boxer', 'briefs', "men's underwear",
];

// CAS content types that should be checked
const CAS_TYPES = [
  'hair', 'tops', 'bottoms', 'full-body', 'shoes', 'accessories',
  'jewelry', 'skin', 'eyes', 'glasses', 'tattoos', 'preset', 'cas-background',
];

function hasMaleKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return MALE_KEYWORDS.some(kw => lower.includes(kw));
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('🔍 Finding CAS items with ONLY [masculine] to make unisex...\n');

  // Get ALL CAS items with only [masculine]
  const items = await prisma.mod.findMany({
    where: {
      contentType: { in: CAS_TYPES },
      genderOptions: { equals: ['masculine'] },
    },
    select: { id: true, title: true, contentType: true, description: true },
  });

  console.log(`Found ${items.length} CAS items with ONLY [masculine]\n`);

  // Filter out items with explicit male keywords
  const toFix = items.filter(m => {
    const text = m.title + ' ' + (m.description || '');
    return !hasMaleKeyword(text);
  });

  console.log(`After filtering explicit male keywords: ${toFix.length} to change to unisex\n`);

  // Show examples
  console.log('Examples (will change [masculine] → [masculine, feminine]):');
  for (const m of toFix.slice(0, 25)) {
    console.log(`  📦 ${m.title} (${m.contentType})`);
  }
  if (toFix.length > 25) {
    console.log(`\n  ... and ${toFix.length - 25} more`);
  }

  console.log('\n' + '='.repeat(80));

  if (shouldFix) {
    console.log('\n🔧 Applying fixes...');

    let fixed = 0;
    for (const m of toFix) {
      await prisma.mod.update({
        where: { id: m.id },
        data: { genderOptions: ['masculine', 'feminine'] },
      });
      fixed++;
      if (fixed % 200 === 0) {
        console.log(`  Fixed ${fixed}/${toFix.length}...`);
      }
    }

    console.log(`\n✅ Changed ${fixed} items from [masculine] to [masculine, feminine] (unisex)`);
  } else {
    console.log('\n💡 Run with --fix to apply:');
    console.log('   source .env.local && npx tsx scripts/fix-to-unisex.ts --fix');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
