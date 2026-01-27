#!/usr/bin/env npx tsx
/**
 * TC-004: Clean up Halloween theme false positives
 *
 * Remove Halloween theme from mods that are not actually Halloween-related.
 * Valid Halloween: halloween, spooky, witch, ghost, pumpkin, skeleton, zombie, haunted, trick or treat
 * Invalid Halloween: just dark/black colors, just goth aesthetic (goth is separate), just fall/autumn
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Halloween indicators - must be explicitly Halloween-related
const VALID_HALLOWEEN_PATTERNS = [
  /\bhalloween\b/i,                   // halloween
  /\bhallowe'en\b/i,                  // hallowe'en (alternate spelling)
  /\bspooky\b/i,                      // spooky
  /\bspook(s|ed)?\b/i,                // spook, spooks, spooked
  /\bwitch(es|y)?\b/i,                // witch, witches, witchy
  /\bghost(s|ly)?\b/i,                // ghost, ghosts, ghostly
  /\bpumpkin(s)?\b/i,                 // pumpkin, pumpkins
  /\bjack[-\s]?o[-\s]?lantern\b/i,    // jack-o-lantern, jack o lantern
  /\bskeleton(s)?\b/i,                // skeleton, skeletons
  /\bskull(s)?\b/i,                   // skull, skulls
  /\bzombie(s)?\b/i,                  // zombie, zombies
  /\bhaunted\b/i,                     // haunted
  /\bhaunt(s|ing)?\b/i,               // haunt, haunts, haunting
  /\btrick\s*(or|&)\s*treat\b/i,      // trick or treat, trick & treat
  /\bhorror\b/i,                      // horror
  /\bscary\b/i,                       // scary
  /\bcreepy\b/i,                      // creepy
  /\beerie\b/i,                       // eerie
  /\bfrightening\b/i,                 // frightening
  /\bterrifying\b/i,                  // terrifying
  /\bmonster(s)?\b/i,                 // monster, monsters
  /\bfrankenstein\b/i,                // frankenstein
  /\bdracula\b/i,                     // dracula
  /\bvampire\b/i,                     // vampire
  /\bmummy\b/i,                       // mummy (in Halloween context)
  /\bwerewolf\b/i,                    // werewolf
  /\bwerewolves\b/i,                  // werewolves
  /\bcoffin(s)?\b/i,                  // coffin, coffins
  /\btombstone(s)?\b/i,               // tombstone, tombstones
  /\bgrave(s|yard|stone)?\b/i,        // grave, graves, graveyard, gravestone
  /\bcemetery\b/i,                    // cemetery
  /\bbat(s)?\b(?!\s*(room|h))/i,      // bat, bats (but not bathroom/bath)
  /\bspider(s|web)?\b/i,              // spider, spiders, spiderweb
  /\bcobweb(s)?\b/i,                  // cobweb, cobwebs
  /\bweb(s)?\b/i,                     // web, webs (spiderweb context)
  /\bcandy\s*corn\b/i,                // candy corn
  /\bcauldron(s)?\b/i,                // cauldron, cauldrons
  /\bpotion(s)?\b/i,                  // potion, potions (in spooky context)
  /\bbroomstick(s)?\b/i,              // broomstick, broomsticks
  /\bbroom(s)?\b(?!\s*(closet|room))/i, // broom (not closet/room)
  /\bblack\s*cat\b/i,                 // black cat
  /\bowl(s)?\b/i,                     // owl, owls (in spooky context)
  /\braven(s)?\b/i,                   // raven, ravens
  /\bcrow(s)?\b/i,                    // crow, crows
  /\boct(ober)?\s*31\b/i,             // oct 31, october 31
  /\b31st\s*of\s*oct/i,               // 31st of october
  /\bcostume(s)?\s*(party)?\b/i,      // costume, costumes, costume party
  /\bmask(s|ed)?\b/i,                 // mask, masks, masked
  /\bcarve[d]?\s*pumpkin\b/i,         // carved pumpkin
  /\bfright\s*night\b/i,              // fright night
  /\ball\s*hallows\b/i,               // all hallows
  /\bdead\s*(of\s*night|rising)?\b/i, // dead of night, dead rising
  /\bundead\b/i,                      // undead
  /\bbone(s|y)?\b/i,                  // bone, bones, boney
  /\bcrypt\b/i,                       // crypt
  /\bdemonic\b/i,                     // demonic
  /\bdemon(s)?\b/i,                   // demon, demons
  /\bdevil(s|ish)?\b/i,               // devil, devils, devilish
];

// Words that alone shouldn't count as Halloween
// (goth aesthetic, fall/autumn, dark colors are separate)
const GENERIC_WORDS = [
  /\bgoth(ic)?\b/i,                   // goth/gothic alone (separate theme)
  /\bdark\b/i,                        // dark alone
  /\bblack\b/i,                       // black color alone
  /\bautumn\b/i,                      // autumn alone (fall theme)
  /\bfall\b/i,                        // fall alone
  /\borange\b/i,                      // orange color alone
  /\bpurple\b/i,                      // purple color alone
  /\bnight\b/i,                       // night alone
  /\bmidnight\b/i,                    // midnight alone
  /\bmoon\b/i,                        // moon alone
  /\bfoggy?\b/i,                      // fog/foggy alone
  /\bmist(y)?\b/i,                    // mist/misty alone
  /\bmystic(al)?\b/i,                 // mystic/mystical alone
  /\bmagic(al)?\b/i,                  // magic/magical alone
  /\bpunk\b/i,                        // punk alone (goth-related)
  /\bgrunge\b/i,                      // grunge alone
  /\bedgy\b/i,                        // edgy alone
  /\bvictorian\b/i,                   // victorian alone
  /\bvintage\b/i,                     // vintage alone
  /\boccult\b/i,                      // occult alone (could be gameplay, not seasonal)
];

interface ValidationResult {
  isValid: boolean;
  reason: string;
  matches: string[];
}

/**
 * Validate if a mod should have the Halloween theme
 */
function validateHalloween(
  title: string,
  description: string | null,
  tags: string[]
): ValidationResult {
  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  // Check for valid Halloween patterns
  for (const pattern of VALID_HALLOWEEN_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length > 0) {
    return {
      isValid: true,
      reason: `Valid Halloween indicators found: ${matches.join(', ')}`,
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
      reason: `Only generic words found (${genericMatches.join(', ')}) - not Halloween specific`,
      matches: [],
    };
  }

  // No indicators at all
  return {
    isValid: false,
    reason: 'No Halloween indicators found',
    matches: [],
  };
}

async function cleanupHalloween() {
  console.log('🔧 TC-004: Clean up Halloween theme false positives\n');

  // Find all mods with 'halloween' theme
  const modsWithHalloween = await prisma.mod.findMany({
    where: {
      themes: { has: 'halloween' },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  console.log(`📊 Found ${modsWithHalloween.length} mods with 'halloween' theme\n`);

  if (modsWithHalloween.length === 0) {
    console.log('✅ No mods with halloween theme found!');
    await prisma.$disconnect();
    return;
  }

  // Validate each mod
  const validMods: typeof modsWithHalloween = [];
  const invalidMods: { mod: (typeof modsWithHalloween)[0]; validation: ValidationResult }[] = [];

  for (const mod of modsWithHalloween) {
    const validation = validateHalloween(mod.title, mod.description, mod.tags);
    if (validation.isValid) {
      validMods.push(mod);
    } else {
      invalidMods.push({ mod, validation });
    }
  }

  console.log('--- Validation Results ---');
  console.log(`  Valid Halloween mods: ${validMods.length}`);
  console.log(`  Invalid (to be removed): ${invalidMods.length}\n`);

  // Show sample of valid mods
  console.log('--- Sample Valid Mods (keeping halloween) ---');
  for (const mod of validMods.slice(0, 5)) {
    console.log(`  ✓ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
  }
  if (validMods.length > 5) {
    console.log(`  ... and ${validMods.length - 5} more valid mods`);
  }

  // Show sample of invalid mods
  console.log('\n--- Sample Invalid Mods (removing halloween) ---');
  for (const { mod, validation } of invalidMods.slice(0, 15)) {
    console.log(`\n  ✗ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    Reason: ${validation.reason}`);
  }
  if (invalidMods.length > 15) {
    console.log(`\n  ... and ${invalidMods.length - 15} more invalid mods`);
  }

  // Apply fixes
  console.log('\n🔧 Removing halloween theme from invalid mods...');
  let removedCount = 0;

  for (const { mod } of invalidMods) {
    const newThemes = mod.themes.filter((t) => t !== 'halloween');
    await prisma.mod.update({
      where: { id: mod.id },
      data: { themes: newThemes },
    });
    removedCount++;
  }

  console.log(`\n✅ Removed halloween theme from ${removedCount} mods`);

  // Verify - re-count
  const remainingCount = await prisma.mod.count({
    where: {
      themes: { has: 'halloween' },
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`  Before: ${modsWithHalloween.length} mods with halloween`);
  console.log(`  Removed: ${removedCount}`);
  console.log(`  After: ${remainingCount} mods with halloween`);
  console.log(`  Expected: ${validMods.length}`);

  if (remainingCount === validMods.length) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n⚠️ Count mismatch - please investigate');
  }

  await prisma.$disconnect();
}

cleanupHalloween().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
