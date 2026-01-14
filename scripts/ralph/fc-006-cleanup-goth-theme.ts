#!/usr/bin/env npx tsx
/**
 * FC-006: Clean up false positive goth theme tags
 *
 * Remove goth theme from mods that are not actually goth aesthetic.
 * Valid goth: gothic, goth, vampire, dark romantic, victorian dark, punk
 * Invalid goth: just dark colors, dark wood, any random dark item
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid goth indicators in TITLE - strong evidence of goth aesthetic
const VALID_GOTH_TITLE_PATTERNS = [
  // Explicit goth terms
  /\bgoth\b/i,
  /\bgothic\b/i,
  // Vampire/dark romantic
  /\bvampire\b/i,
  /\bvampiric\b/i,
  /\bdracula\b/i,
  /\bvictorian\s*dark\b/i,
  /\bdark\s*romantic\b/i,
  // Punk/grunge
  /\bpunk\b/i,
  /\bgrunge\b/i,
  /\bemo\b/i,
  // Occult/horror
  /\bwitch(y|es|craft)?\b/i,
  /\boccult\b/i,
  /\bdemon(ic)?\b/i,
  /\bdevil\b/i,
  /\bsatanic\b/i,
  // Death/macabre
  /\bskull\b/i,
  /\bskeleton\b/i,
  /\bcoffin\b/i,
  /\bcemetery\b/i,
  /\bgraveyard\b/i,
  /\btombstone\b/i,
  /\bmacabre\b/i,
  /\bmorbid\b/i,
  /\bcorpse\b/i,
  /\bundead\b/i,
  // Spooky/horror
  /\bhaunted\b/i,
  /\bhorror\b/i,
  /\bcreepy\b/i,
  /\bspooky\b/i,
  /\bsinister\b/i,
  /\bnightmare\b/i,
  // Dark creatures
  /\braven\b/i,
  /\bcrow\b/i,
  /\bbat\b/i,
  /\bspider\b/i,
  // Gothic architecture/style
  /\bcrypt\b/i,
  /\bdungeon\b/i,
  /\bcastle\b/i,
  /\bmanor\b/i,
  /\bmansion\b/i,
  // Dark aesthetic
  /\bdarkness\b/i,
  /\bmidnight\b/i,
  /\bshadow(s|y)?\b/i,
  /\bblack\s*widow\b/i,
  /\bphantom\b/i,
  /\bghost\b/i,
  /\bvoid\b/i,
  /\babyss\b/i,
];

// Valid goth indicators in DESCRIPTION - weaker evidence but still valid
const VALID_GOTH_DESC_PATTERNS = [
  /\bgothic\s*(style|aesthetic|fashion|look)\b/i,
  /\bgoth\s*(style|aesthetic|fashion|look)\b/i,
  /\bvampire\b/i,
  /\bskull\b/i,
  /\boccult\b/i,
  /\bmacabre\b/i,
  /\bwitchcraft\b/i,
  /\bpentagram\b/i,
  /\bdark\s*aesthetic\b/i,
  /\bdark\s*academia\b/i,
];

// Phrases that use "goth" in a non-definitive way (versatility context)
const NON_GOTH_PHRASES = [
  'to goth',           // "from natural to goth"
  'or goth',           // "casual or goth"
  'and goth',          // "preppy and goth"
  'even goth',         // "even goth looks"
  'style goth',        // "style it goth"
  'styled goth',       // "can be styled goth"
  'look goth',         // "can look goth"
  'goes goth',         // "goes with goth"
  'with goth',         // "pair with goth"
  'for goth',          // "perfect for goth"
  'any goth',          // "any goth look"
  'your goth',         // "your goth style"
];

/**
 * Analyze if a mod is actually goth aesthetic
 */
function isValidGoth(title: string, description: string | null): { valid: boolean; reason: string } {
  // Check title first (strongest signal)
  for (const pattern of VALID_GOTH_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return { valid: true, reason: `Title matches goth pattern: ${pattern.source}` };
    }
  }

  // Check description
  if (description) {
    const descLower = description.toLowerCase();

    // Check if "goth" is used in a versatility context (NOT actually goth)
    const hasNonGothPhrase = NON_GOTH_PHRASES.some(phrase => descLower.includes(phrase));
    if (descLower.includes('goth') && hasNonGothPhrase) {
      return { valid: false, reason: `"goth" used in versatility context (e.g., "from X to goth")` };
    }

    // Check for strong goth indicators in description
    for (const pattern of VALID_GOTH_DESC_PATTERNS) {
      if (pattern.test(description)) {
        return { valid: true, reason: `Description matches goth pattern: ${pattern.source}` };
      }
    }
  }

  // No valid goth indicators found
  return { valid: false, reason: `No goth aesthetic indicators in title or description` };
}

async function cleanupGothTheme() {
  console.log('🔧 FC-006: Clean up false positive goth theme tags\n');

  // Find all mods with 'goth' in themes
  const gothMods = await prisma.mod.findMany({
    where: {
      themes: { has: 'goth' }
    },
    select: {
      id: true,
      title: true,
      description: true,
      themes: true
    }
  });

  console.log(`Found ${gothMods.length} mods with 'goth' theme\n`);

  const validGoth: { id: string; title: string; reason: string }[] = [];
  const invalidGoth: { id: string; title: string; reason: string }[] = [];

  for (const mod of gothMods) {
    const analysis = isValidGoth(mod.title, mod.description);
    if (analysis.valid) {
      validGoth.push({ id: mod.id, title: mod.title, reason: analysis.reason });
    } else {
      invalidGoth.push({ id: mod.id, title: mod.title, reason: analysis.reason });
    }
  }

  console.log('--- Analysis Results ---');
  console.log(`  Valid goth (keeping): ${validGoth.length}`);
  console.log(`  Invalid goth (removing): ${invalidGoth.length}`);

  // Show sample of items being removed
  if (invalidGoth.length > 0) {
    console.log('\n--- Sample Items with Goth Removed (first 20) ---');
    for (const item of invalidGoth.slice(0, 20)) {
      console.log(`  - "${item.title.substring(0, 50)}..."`);
      console.log(`    Reason: ${item.reason}`);
    }
    if (invalidGoth.length > 20) {
      console.log(`  ... and ${invalidGoth.length - 20} more`);
    }
  }

  // Apply removals
  console.log('\n🔧 Removing goth from invalid items...');
  let removed = 0;
  for (const item of invalidGoth) {
    const mod = await prisma.mod.findUnique({
      where: { id: item.id },
      select: { themes: true }
    });

    if (mod) {
      const newThemes = mod.themes.filter(t => t !== 'goth');
      await prisma.mod.update({
        where: { id: item.id },
        data: { themes: newThemes }
      });
      removed++;

      if (removed % 50 === 0) {
        console.log(`  Progress: ${removed}/${invalidGoth.length}`);
      }
    }
  }

  console.log(`\n✅ Removed goth from ${removed} mods`);

  // Verify
  const remainingGoth = await prisma.mod.count({
    where: { themes: { has: 'goth' } }
  });
  console.log(`📊 Mods with goth theme remaining: ${remainingGoth}`);

  await prisma.$disconnect();
}

cleanupGothTheme().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
