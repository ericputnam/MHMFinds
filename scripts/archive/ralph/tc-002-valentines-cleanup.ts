#!/usr/bin/env npx tsx
/**
 * TC-002: Clean up Valentine's theme false positives
 *
 * Remove Valentine's theme from mods that are not actually Valentine's-related.
 * Valid Valentine's: valentine, heart-themed, cupid, love-themed seasonal items
 * Invalid Valentine's: just romantic (romantic is separate theme), just red/pink colors, wedding items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Valentine's indicators - must be explicitly Valentine's/heart-themed
const VALID_VALENTINES_PATTERNS = [
  /\bvalentine'?s?\b/i,           // valentine, valentines, valentine's
  /\bvalentine'?s?\s*day\b/i,     // valentine's day
  /\bcupid\b/i,                   // cupid
  /\blove\s*day\b/i,              // love day
  /\bsweetheart\b/i,              // sweetheart
  /\bsweet\s*heart\b/i,           // sweet heart
  /\bxoxo\b/i,                    // xoxo
  /\bhugs?\s*(and|&|n)\s*kisses?\b/i, // hugs and kisses
  /\bhearts?\s*(pattern|print|motif|shaped?|decor|decoration)\b/i, // heart pattern/print/decor
  /\bheart\s*(themed?|design|garland|wreath|box|card)\b/i, // heart themed items
  /\blove\s*(letter|note|card|potion)\b/i, // love letters/notes
  /\bfeb(ruary)?\s*14/i,          // feb 14
  /\b14th\s*of\s*feb/i,           // 14th of feb
  /\bbe\s*my\s*valentine\b/i,     // be my valentine
  /\blove\s*struck\b/i,           // lovestruck
  /\bcandy\s*heart\b/i,           // candy hearts
  /\blovey\s*dovey\b/i,           // lovey dovey
];

// Things that should NOT trigger Valentine's
const INVALID_INDICATORS = [
  /\bwedding\b/i,                 // wedding is not Valentine's
  /\bbride\b/i,                   // bride
  /\bgroom\b/i,                   // groom
  /\bmarriage\b/i,                // marriage
  /\bengagement\b/i,              // engagement
];

// Words that alone shouldn't count as Valentine's
// (romantic, love, heart in isolation are too generic)
const GENERIC_WORDS = [
  /\bromantic\b/i,                // romantic alone is not Valentine's
  /\blove\b/i,                    // love alone is too generic
  /\bheart\b/i,                   // single heart mention is generic
  /\bred\b/i,                     // red color
  /\bpink\b/i,                    // pink color
  /\brose(s)?\b/i,                // roses alone
];

interface ValidationResult {
  isValid: boolean;
  reason: string;
  matches: string[];
}

/**
 * Validate if a mod should have the Valentine's theme
 */
function validateValentines(
  title: string,
  description: string | null,
  tags: string[]
): ValidationResult {
  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  // Check for invalid indicators first (wedding, etc.)
  for (const pattern of INVALID_INDICATORS) {
    const match = combinedText.match(pattern);
    if (match) {
      return {
        isValid: false,
        reason: `Contains wedding/marriage indicator: ${match[0]}`,
        matches: [],
      };
    }
  }

  // Check for valid Valentine's patterns
  for (const pattern of VALID_VALENTINES_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length > 0) {
    return {
      isValid: true,
      reason: `Valid Valentine's indicators found: ${matches.join(', ')}`,
      matches,
    };
  }

  // If no valid patterns but has generic words, it's likely a false positive
  const genericMatches: string[] = [];
  for (const pattern of GENERIC_WORDS) {
    const match = combinedText.match(pattern);
    if (match) {
      genericMatches.push(match[0]);
    }
  }

  if (genericMatches.length > 0) {
    return {
      isValid: false,
      reason: `Only generic words found (${genericMatches.join(', ')}) - not Valentine's specific`,
      matches: [],
    };
  }

  // No indicators at all
  return {
    isValid: false,
    reason: 'No Valentine\'s indicators found',
    matches: [],
  };
}

async function cleanupValentines() {
  console.log('🔧 TC-002: Clean up Valentine\'s theme false positives\n');

  // Find all mods with 'valentines' theme
  const modsWithValentines = await prisma.mod.findMany({
    where: {
      themes: { has: 'valentines' },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  console.log(`📊 Found ${modsWithValentines.length} mods with 'valentines' theme\n`);

  if (modsWithValentines.length === 0) {
    console.log('✅ No mods with valentines theme found!');
    await prisma.$disconnect();
    return;
  }

  // Validate each mod
  const validMods: typeof modsWithValentines = [];
  const invalidMods: { mod: (typeof modsWithValentines)[0]; validation: ValidationResult }[] = [];

  for (const mod of modsWithValentines) {
    const validation = validateValentines(mod.title, mod.description, mod.tags);
    if (validation.isValid) {
      validMods.push(mod);
    } else {
      invalidMods.push({ mod, validation });
    }
  }

  console.log('--- Validation Results ---');
  console.log(`  Valid Valentine's mods: ${validMods.length}`);
  console.log(`  Invalid (to be removed): ${invalidMods.length}\n`);

  // Show sample of valid mods
  console.log('--- Sample Valid Mods (keeping valentines) ---');
  for (const mod of validMods.slice(0, 5)) {
    console.log(`  ✓ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
  }
  if (validMods.length > 5) {
    console.log(`  ... and ${validMods.length - 5} more valid mods`);
  }

  // Show sample of invalid mods
  console.log('\n--- Sample Invalid Mods (removing valentines) ---');
  for (const { mod, validation } of invalidMods.slice(0, 15)) {
    console.log(`\n  ✗ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    Reason: ${validation.reason}`);
  }
  if (invalidMods.length > 15) {
    console.log(`\n  ... and ${invalidMods.length - 15} more invalid mods`);
  }

  // Apply fixes
  console.log('\n🔧 Removing valentines theme from invalid mods...');
  let removedCount = 0;

  for (const { mod } of invalidMods) {
    const newThemes = mod.themes.filter((t) => t !== 'valentines');
    await prisma.mod.update({
      where: { id: mod.id },
      data: { themes: newThemes },
    });
    removedCount++;
  }

  console.log(`\n✅ Removed valentines theme from ${removedCount} mods`);

  // Verify - re-count
  const remainingCount = await prisma.mod.count({
    where: {
      themes: { has: 'valentines' },
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`  Before: ${modsWithValentines.length} mods with valentines`);
  console.log(`  Removed: ${removedCount}`);
  console.log(`  After: ${remainingCount} mods with valentines`);
  console.log(`  Expected: ${validMods.length}`);

  if (remainingCount === validMods.length) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n⚠️ Count mismatch - please investigate');
  }

  await prisma.$disconnect();
}

cleanupValentines().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
