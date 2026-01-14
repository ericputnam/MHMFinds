#!/usr/bin/env npx tsx
/**
 * COMPREHENSIVE gender fix - be aggressive about removing masculine from feminine items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Content types that should ALWAYS be feminine (unless male in title)
const FEMININE_CONTENT_TYPES = ['makeup', 'nails', 'dresses', 'jewelry'];

// Title keywords that indicate feminine
const FEMININE_TITLE_KEYWORDS = [
  'dress', 'gown', 'skirt', 'blouse', 'corset', 'bustier', 'bikini', 'lingerie',
  'heels', 'pumps', 'stiletto', 'lipstick', 'eyeshadow', 'mascara', 'eyeliner',
  'blush', 'lip gloss', 'lip kit', 'nail', 'lace front', 'unit', 'wig', 'closure',
  'install', 'bra', 'panties', 'thong', 'stockings', 'garter', 'maternity',
  'pregnancy', 'pregnant', 'bridal', 'bride', 'princess', 'queen', 'goddess',
  'cropped', 'halter', 'sundress', 'romper', 'peplum', 'tunic', 'mini skirt',
  'maxi', 'midi', 'bodycon', 'babydoll', 'negligee', 'camisole', 'teddy',
  'female', 'women', 'woman', 'girl', 'ladies', 'feminine', 'barbie',
  'lashes', 'eyelash', '3d lash', 'falsies'
];

// Title keywords that indicate masculine - SKIP these
const MASCULINE_TITLE_KEYWORDS = [
  'male', 'men', 'man', 'boy', 'masculine', 'beard', 'mustache', 'goatee',
  'stubble', 'facial hair'
];

function shouldBeFeminineOnly(mod: {
  title: string;
  contentType: string | null;
  tags: string[];
  description: string | null;
}): boolean {
  const titleLower = mod.title.toLowerCase();
  const descLower = (mod.description || '').toLowerCase();
  const tagsLower = mod.tags.map(t => t.toLowerCase());

  // If has masculine keywords in title, keep masculine
  if (MASCULINE_TITLE_KEYWORDS.some(k => titleLower.includes(k))) {
    return false;
  }

  // If content type is typically feminine
  if (mod.contentType && FEMININE_CONTENT_TYPES.includes(mod.contentType)) {
    return true;
  }

  // If has feminine keywords in title
  if (FEMININE_TITLE_KEYWORDS.some(k => titleLower.includes(k))) {
    return true;
  }

  // If has 'female' tag but NOT 'male' tag
  if (tagsLower.includes('female') && !tagsLower.includes('male')) {
    return true;
  }

  // If description mentions feminine things without mentioning male
  const descHasFeminine = FEMININE_TITLE_KEYWORDS.some(k => descLower.includes(k));
  const descHasMasculine = MASCULINE_TITLE_KEYWORDS.some(k => descLower.includes(k));
  if (descHasFeminine && !descHasMasculine) {
    // But skip if desc explicitly says "for both" or "male and female"
    if (/\b(male and female|female and male|for both|unisex)\b/i.test(descLower)) {
      return false;
    }
    return true;
  }

  return false;
}

async function main() {
  console.log('🔧 COMPREHENSIVE GENDER FIX\n');

  const mods = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, contentType: true, tags: true, description: true, genderOptions: true }
  });

  console.log(`Checking ${mods.length} items with masculine...\n`);

  let fixed = 0;
  const fixedItems: string[] = [];

  for (const mod of mods) {
    if (shouldBeFeminineOnly(mod)) {
      fixedItems.push(`[${mod.contentType || '?'}] ${mod.title}`);
      await prisma.mod.update({
        where: { id: mod.id },
        data: { genderOptions: ['feminine'] }
      });
      fixed++;
    }
  }

  console.log('Fixed items (first 50):');
  fixedItems.slice(0, 50).forEach(t => console.log('  ' + t.slice(0, 70)));
  if (fixedItems.length > 50) console.log(`  ... and ${fixedItems.length - 50} more`);

  console.log(`\n✅ Fixed ${fixed} items to feminine-only`);

  // Final stats
  const mascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  const mascOnly = await prisma.mod.count({
    where: { genderOptions: { has: 'masculine' }, NOT: { genderOptions: { has: 'feminine' } } }
  });
  const both = await prisma.mod.count({
    where: { genderOptions: { hasEvery: ['masculine', 'feminine'] } }
  });
  const femCount = await prisma.mod.count({ where: { genderOptions: { has: 'feminine' } } });

  console.log('\n=== FINAL STATS ===');
  console.log('Total with masculine:', mascCount);
  console.log('Masculine only:', mascOnly);
  console.log('Both M+F:', both);
  console.log('Feminine:', femCount);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
