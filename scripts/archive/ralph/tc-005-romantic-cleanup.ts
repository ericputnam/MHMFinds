#!/usr/bin/env npx tsx
/**
 * TC-005: Clean up Romantic theme - remove from non-romantic items
 *
 * Romantic theme is over-applied - clean up false positives.
 * Valid Romantic: romantic poses, wedding, date night, couple items, soft feminine aesthetic
 * Invalid Romantic: Valentine's-specific (use valentines), random furniture, non-romantic clothing
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Romantic indicators - explicitly romantic aesthetic/purpose
const VALID_ROMANTIC_PATTERNS = [
  /\bromantic\b/i,                   // romantic explicitly stated
  /\bromance\b/i,                    // romance
  /\bcouple(s)?\b/i,                 // couple, couples
  /\bwedding\b/i,                    // wedding
  /\bbride\b/i,                      // bride
  /\bbridal\b/i,                     // bridal
  /\bgroom\b/i,                      // groom
  /\bmarriage\b/i,                   // marriage
  /\bmarried\b/i,                    // married
  /\bengagement\b/i,                 // engagement
  /\bengaged\b/i,                    // engaged
  /\bproposal\b/i,                   // proposal
  /\bdate\s*night\b/i,               // date night
  /\bdating\b/i,                     // dating
  /\bhoneymoon\b/i,                  // honeymoon
  /\banniversary\b/i,                // anniversary
  /\blove\s*(story|letter|song)\b/i, // love story, love letter, love song
  /\bin\s*love\b/i,                  // in love
  /\bfall(ing)?\s*in\s*love\b/i,     // falling in love
  /\bkiss(ing|es)?\b/i,              // kiss, kissing, kisses
  /\bhug(ging|s)?\b/i,               // hug, hugging, hugs
  /\bcuddle\b/i,                     // cuddle
  /\bcuddling\b/i,                   // cuddling
  /\bsnuggle\b/i,                    // snuggle
  /\bembrace\b/i,                    // embrace
  /\bintimate\b/i,                   // intimate
  /\bintimacy\b/i,                   // intimacy
  /\baffection(ate)?\b/i,            // affection, affectionate
  /\bsweetheart\b/i,                 // sweetheart
  /\bdarling\b/i,                    // darling
  /\bbeloved\b/i,                    // beloved
  /\bsoulmate\b/i,                   // soulmate
  /\bpassion(ate)?\b/i,              // passion, passionate
  /\bsexy\b/i,                       // sexy
  /\bseductive\b/i,                  // seductive
  /\bsensual\b/i,                    // sensual
  /\bflirty\b/i,                     // flirty
  /\bflirt(ing|s)?\b/i,              // flirt, flirting, flirts
  /\bcandle\s*lit\b/i,               // candle lit
  /\bcandlelight\b/i,                // candlelight
  /\bcandles?\b.*dinner\b/i,         // candle dinner, candles dinner
  /\bdinner\b.*\bcandles?\b/i,       // dinner candle
  /\brose\s*petals?\b/i,             // rose petals
  /\bbed\s*of\s*roses\b/i,           // bed of roses
  /\bpose(s)?\b.*\b(couple|romantic|love)\b/i, // poses with couple/romantic/love
  /\b(couple|romantic|love)\b.*\bpose(s)?\b/i, // couple/romantic/love poses
  /\blingerie\b/i,                   // lingerie
  /\bnightgown\b/i,                  // nightgown
  /\bnegligee\b/i,                   // negligee
  /\bvalentine\b/i,                  // valentine (also romantic)
  /\bfirst\s*date\b/i,               // first date
  /\bblind\s*date\b/i,               // blind date
  /\bwoohoo\b/i,                     // woohoo (Sims romantic action)
  /\btry\s*for\s*baby\b/i,           // try for baby
];

// Content types that are more likely to be legitimately romantic
const ROMANTIC_CONTENT_TYPES = [
  'poses',
  'animations',
];

// Words/patterns that alone shouldn't count as romantic
const GENERIC_WORDS = [
  /\blove\b/i,                       // love alone (could be "I love this", brand name, etc.)
  /\bheart(s)?\b/i,                  // heart alone (Valentine's uses this, not romantic per se)
  /\bred\b/i,                        // red color alone
  /\bpink\b/i,                       // pink color alone
  /\bbeautiful\b/i,                  // beautiful alone
  /\bpretty\b/i,                     // pretty alone
  /\belegant\b/i,                    // elegant alone
  /\bfeminine\b/i,                   // feminine alone (separate attribute)
  /\bsoft\b/i,                       // soft alone
  /\bdelicate\b/i,                   // delicate alone
  /\bgraceful\b/i,                   // graceful alone
  /\bfloral\b/i,                     // floral alone
  /\bflower(s)?\b/i,                 // flower alone
  /\brose(s)?\b/i,                   // roses alone (without petals context)
  /\bsweet\b/i,                      // sweet alone
  /\blovely\b/i,                     // lovely alone
  /\bcharming\b/i,                   // charming alone
  /\bdress(es)?\b/i,                 // dress alone
  /\bgown\b/i,                       // gown alone
  /\bveil\b/i,                       // veil alone
  /\blace\b/i,                       // lace alone
  /\bsatin\b/i,                      // satin alone
  /\bsilk\b/i,                       // silk alone
  /\bbed(room)?\b/i,                 // bed/bedroom alone
  /\bpillow(s)?\b/i,                 // pillow alone
  /\bblanket\b/i,                    // blanket alone
];

interface ValidationResult {
  isValid: boolean;
  reason: string;
  matches: string[];
}

/**
 * Validate if a mod should have the Romantic theme
 */
function validateRomantic(
  title: string,
  description: string | null,
  tags: string[],
  contentType: string | null
): ValidationResult {
  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  // Check for valid Romantic patterns
  for (const pattern of VALID_ROMANTIC_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length > 0) {
    return {
      isValid: true,
      reason: `Valid romantic indicators found: ${matches.join(', ')}`,
      matches,
    };
  }

  // Poses and animations content types get a pass if they have any romantic-adjacent content
  if (contentType && ROMANTIC_CONTENT_TYPES.includes(contentType)) {
    // Check if title/description suggests couple or romantic poses
    if (/\b(pair|duo|together|two)\b/i.test(combinedText)) {
      return {
        isValid: true,
        reason: `${contentType} with couple/pair context`,
        matches: ['poses/animations content type'],
      };
    }
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
      reason: `Only generic words found (${genericMatches.slice(0, 5).join(', ')}${genericMatches.length > 5 ? '...' : ''}) - not explicitly romantic`,
      matches: [],
    };
  }

  // No indicators at all
  return {
    isValid: false,
    reason: 'No romantic indicators found',
    matches: [],
  };
}

async function cleanupRomantic() {
  console.log('🔧 TC-005: Clean up Romantic theme false positives\n');

  // Find all mods with 'romantic' theme
  const modsWithRomantic = await prisma.mod.findMany({
    where: {
      themes: { has: 'romantic' },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true, contentType: true },
  });

  console.log(`📊 Found ${modsWithRomantic.length} mods with 'romantic' theme\n`);

  if (modsWithRomantic.length === 0) {
    console.log('✅ No mods with romantic theme found!');
    await prisma.$disconnect();
    return;
  }

  // Validate each mod
  const validMods: typeof modsWithRomantic = [];
  const invalidMods: { mod: (typeof modsWithRomantic)[0]; validation: ValidationResult }[] = [];

  for (const mod of modsWithRomantic) {
    const validation = validateRomantic(mod.title, mod.description, mod.tags, mod.contentType);
    if (validation.isValid) {
      validMods.push(mod);
    } else {
      invalidMods.push({ mod, validation });
    }
  }

  console.log('--- Validation Results ---');
  console.log(`  Valid romantic mods: ${validMods.length}`);
  console.log(`  Invalid (to be removed): ${invalidMods.length}\n`);

  // Show sample of valid mods
  console.log('--- Sample Valid Mods (keeping romantic) ---');
  for (const mod of validMods.slice(0, 10)) {
    console.log(`  ✓ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
  }
  if (validMods.length > 10) {
    console.log(`  ... and ${validMods.length - 10} more valid mods`);
  }

  // Show sample of invalid mods
  console.log('\n--- Sample Invalid Mods (removing romantic) ---');
  for (const { mod, validation } of invalidMods.slice(0, 20)) {
    console.log(`\n  ✗ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    ContentType: ${mod.contentType || 'null'}`);
    console.log(`    Reason: ${validation.reason}`);
  }
  if (invalidMods.length > 20) {
    console.log(`\n  ... and ${invalidMods.length - 20} more invalid mods`);
  }

  // Apply fixes
  console.log('\n🔧 Removing romantic theme from invalid mods...');
  let removedCount = 0;

  for (const { mod } of invalidMods) {
    const newThemes = mod.themes.filter((t) => t !== 'romantic');
    await prisma.mod.update({
      where: { id: mod.id },
      data: { themes: newThemes },
    });
    removedCount++;
  }

  console.log(`\n✅ Removed romantic theme from ${removedCount} mods`);

  // Verify - re-count
  const remainingCount = await prisma.mod.count({
    where: {
      themes: { has: 'romantic' },
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`  Before: ${modsWithRomantic.length} mods with romantic`);
  console.log(`  Removed: ${removedCount}`);
  console.log(`  After: ${remainingCount} mods with romantic`);
  console.log(`  Expected: ${validMods.length}`);

  if (remainingCount === validMods.length) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n⚠️ Count mismatch - please investigate');
  }

  await prisma.$disconnect();
}

cleanupRomantic().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
