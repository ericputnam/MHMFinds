#!/usr/bin/env npx tsx
/**
 * TC-003: Clean up Christmas theme false positives
 *
 * Remove Christmas theme from mods that are not actually Christmas-related.
 * Valid Christmas: christmas, xmas, santa, reindeer, ornament, tree (christmas tree), gift, holiday decor
 * Invalid Christmas: just winter/snow (winter is separate), just cozy, just red/green colors
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Christmas indicators - must be explicitly Christmas-related
const VALID_CHRISTMAS_PATTERNS = [
  /\bchristmas\b/i,                   // christmas
  /\bxmas\b/i,                        // xmas
  /\bx-mas\b/i,                       // x-mas
  /\bsanta\b/i,                       // santa
  /\bsanta\s*claus\b/i,               // santa claus
  /\bfather\s*christmas\b/i,          // father christmas
  /\bkris\s*kringle\b/i,              // kris kringle
  /\breindeer\b/i,                    // reindeer
  /\brudolph\b/i,                     // rudolph
  /\bornament(s)?\b/i,                // ornament, ornaments
  /\bchristmas\s*tree\b/i,            // christmas tree
  /\bxmas\s*tree\b/i,                 // xmas tree
  /\bholiday\s*tree\b/i,              // holiday tree
  /\btinsel\b/i,                      // tinsel
  /\bgarland\b/i,                     // garland (Christmas specific context)
  /\bwreath\b/i,                      // wreath
  /\bstocking(s)?\b/i,                // stocking, stockings
  /\belf\b/i,                         // elf
  /\belves\b/i,                       // elves
  /\bnutcracker\b/i,                  // nutcracker
  /\bsnowman\b/i,                     // snowman
  /\bsnowmen\b/i,                     // snowmen
  /\bgingerbread\b/i,                 // gingerbread
  /\bcandy\s*cane\b/i,                // candy cane
  /\bjingle\s*bell(s)?\b/i,           // jingle bells
  /\bsleigh\b/i,                      // sleigh
  /\bmistletoe\b/i,                   // mistletoe
  /\bcarol(s|ing)?\b/i,               // carol, carols, caroling
  /\badvent\b/i,                      // advent
  /\byule(tide)?\b/i,                 // yule, yuletide
  /\bnoel\b/i,                        // noel
  /\bfestive\s*(season|holiday|decor|decoration)\b/i, // festive season/holiday/decor
  /\bdec(ember)?\s*25/i,              // dec 25, december 25
  /\b25th\s*of\s*dec/i,               // 25th of december
  /\bholiday\s*(gift|present|decor|decoration|lights?)\b/i, // holiday gifts/decor/lights
  /\bchristmas\s*(gift|present|decor|decoration|lights?|sweater|pajamas?|party)\b/i, // christmas items
  /\bugly\s*sweater\b/i,              // ugly sweater (Christmas tradition)
  /\bholiday\s*sweater\b/i,           // holiday sweater
];

// Words that alone shouldn't count as Christmas
// (winter, snow, cozy alone are separate themes)
const GENERIC_WORDS = [
  /\bwinter\b/i,                      // winter alone is not Christmas
  /\bsnow(y)?\b/i,                    // snow/snowy alone
  /\bcozy\b/i,                        // cozy alone
  /\bwarm\b/i,                        // warm alone
  /\bred\b/i,                         // red color alone
  /\bgreen\b/i,                       // green color alone
  /\bfrosty\b/i,                      // frosty alone (unless snowman context)
  /\bice\b/i,                         // ice alone
  /\bicicle(s)?\b/i,                  // icicles alone
  /\bfireplace\b/i,                   // fireplace alone
  /\bholiday\b/i,                     // holiday alone (could be any holiday)
  /\bfestive\b/i,                     // festive alone
  /\bcold\b/i,                        // cold alone
  /\bsweater\b/i,                     // sweater alone (without christmas/holiday context)
];

interface ValidationResult {
  isValid: boolean;
  reason: string;
  matches: string[];
}

/**
 * Validate if a mod should have the Christmas theme
 */
function validateChristmas(
  title: string,
  description: string | null,
  tags: string[]
): ValidationResult {
  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  // Check for valid Christmas patterns
  for (const pattern of VALID_CHRISTMAS_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length > 0) {
    return {
      isValid: true,
      reason: `Valid Christmas indicators found: ${matches.join(', ')}`,
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
      reason: `Only generic words found (${genericMatches.join(', ')}) - not Christmas specific`,
      matches: [],
    };
  }

  // No indicators at all
  return {
    isValid: false,
    reason: 'No Christmas indicators found',
    matches: [],
  };
}

async function cleanupChristmas() {
  console.log('🔧 TC-003: Clean up Christmas theme false positives\n');

  // Find all mods with 'christmas' theme
  const modsWithChristmas = await prisma.mod.findMany({
    where: {
      themes: { has: 'christmas' },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  console.log(`📊 Found ${modsWithChristmas.length} mods with 'christmas' theme\n`);

  if (modsWithChristmas.length === 0) {
    console.log('✅ No mods with christmas theme found!');
    await prisma.$disconnect();
    return;
  }

  // Validate each mod
  const validMods: typeof modsWithChristmas = [];
  const invalidMods: { mod: (typeof modsWithChristmas)[0]; validation: ValidationResult }[] = [];

  for (const mod of modsWithChristmas) {
    const validation = validateChristmas(mod.title, mod.description, mod.tags);
    if (validation.isValid) {
      validMods.push(mod);
    } else {
      invalidMods.push({ mod, validation });
    }
  }

  console.log('--- Validation Results ---');
  console.log(`  Valid Christmas mods: ${validMods.length}`);
  console.log(`  Invalid (to be removed): ${invalidMods.length}\n`);

  // Show sample of valid mods
  console.log('--- Sample Valid Mods (keeping christmas) ---');
  for (const mod of validMods.slice(0, 5)) {
    console.log(`  ✓ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
  }
  if (validMods.length > 5) {
    console.log(`  ... and ${validMods.length - 5} more valid mods`);
  }

  // Show sample of invalid mods
  console.log('\n--- Sample Invalid Mods (removing christmas) ---');
  for (const { mod, validation } of invalidMods.slice(0, 15)) {
    console.log(`\n  ✗ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    Reason: ${validation.reason}`);
  }
  if (invalidMods.length > 15) {
    console.log(`\n  ... and ${invalidMods.length - 15} more invalid mods`);
  }

  // Apply fixes
  console.log('\n🔧 Removing christmas theme from invalid mods...');
  let removedCount = 0;

  for (const { mod } of invalidMods) {
    const newThemes = mod.themes.filter((t) => t !== 'christmas');
    await prisma.mod.update({
      where: { id: mod.id },
      data: { themes: newThemes },
    });
    removedCount++;
  }

  console.log(`\n✅ Removed christmas theme from ${removedCount} mods`);

  // Verify - re-count
  const remainingCount = await prisma.mod.count({
    where: {
      themes: { has: 'christmas' },
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`  Before: ${modsWithChristmas.length} mods with christmas`);
  console.log(`  Removed: ${removedCount}`);
  console.log(`  After: ${remainingCount} mods with christmas`);
  console.log(`  Expected: ${validMods.length}`);

  if (remainingCount === validMods.length) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n⚠️ Count mismatch - please investigate');
  }

  await prisma.$disconnect();
}

cleanupChristmas().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
