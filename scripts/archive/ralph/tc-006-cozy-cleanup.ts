#!/usr/bin/env npx tsx
/**
 * TC-006: Clean up Cozy theme - remove from non-cozy items
 *
 * Cozy theme is over-applied - clean up false positives.
 * Valid Cozy: sweaters, blankets, warm lighting, fireplace, soft textures, hygge aesthetic
 * Invalid Cozy: random furniture, non-cozy clothing, summer items
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Cozy indicators - explicitly cozy aesthetic/items
const VALID_COZY_PATTERNS = [
  /\bcozy\b/i,                       // cozy explicitly stated
  /\bcosy\b/i,                       // cosy (British spelling)
  /\bhygge\b/i,                      // hygge (Danish cozy concept)
  /\bsweater(s)?\b/i,                // sweater, sweaters
  /\bjumper(s)?\b/i,                 // jumper (British sweater)
  /\bcardigan(s)?\b/i,               // cardigan, cardigans
  /\bknit(ted|wear)?\b/i,            // knit, knitted, knitwear
  /\bcrochet(ed)?\b/i,               // crochet, crocheted
  /\bwool(en|ly)?\b/i,               // wool, woolen, woolly
  /\bcashmere\b/i,                   // cashmere
  /\bfleece\b/i,                     // fleece
  /\bblanket(s)?\b/i,                // blanket, blankets
  /\bthrow\s*(blanket)?\b/i,         // throw, throw blanket
  /\bquilt(s|ed)?\b/i,               // quilt, quilts, quilted
  /\bduvet(s)?\b/i,                  // duvet, duvets
  /\bcomforter(s)?\b/i,              // comforter, comforters
  /\bfireplace(s)?\b/i,              // fireplace, fireplaces
  /\bfire\s*place(s)?\b/i,           // fire place
  /\bhearth(s)?\b/i,                 // hearth, hearths
  /\bmantle\s*(piece)?\b/i,          // mantle, mantle piece
  /\bwood\s*(burn(ing|er)|stove)\b/i, // wood burning, wood stove, woodburner
  /\bwarm(th|ing)?\b/i,              // warm, warmth, warming
  /\bsnug(gle|gly)?\b/i,             // snug, snuggle, snuggly
  /\bcuddle\b/i,                     // cuddle
  /\bcuddly\b/i,                     // cuddly
  /\bcandle(s|lit)?\b/i,             // candle, candles, candlelit
  /\bfairy\s*lights?\b/i,            // fairy light, fairy lights
  /\bstring\s*lights?\b/i,           // string light, string lights
  /\btwinkling\b/i,                  // twinkling
  /\bfluffy\b/i,                     // fluffy
  /\bplush\b/i,                      // plush
  /\bfur(ry)?\b/i,                   // fur, furry
  /\bfaux\s*fur\b/i,                 // faux fur
  /\bshearling\b/i,                  // shearling
  /\bsherpa\b/i,                     // sherpa
  /\bvelvet(y)?\b/i,                 // velvet, velvety
  /\bchenille\b/i,                   // chenille
  /\bhot\s*(cocoa|chocolate)\b/i,    // hot cocoa, hot chocolate
  /\bhot\s*drink\b/i,                // hot drink
  /\bwarm\s*drink\b/i,               // warm drink
  /\btea\s*(cup|pot|time)\b/i,       // teacup, teapot, teatime
  /\bcoffee\s*(mug|cup)\b/i,         // coffee mug, coffee cup
  /\bmug(s)?\b/i,                    // mug, mugs
  /\bslipper(s)?\b/i,                // slipper, slippers
  /\bpajama(s)?\b/i,                 // pajama, pajamas
  /\bpyjama(s)?\b/i,                 // pyjama, pyjamas (British)
  /\brobe(s)?\b/i,                   // robe, robes
  /\blounge(wear)?\b/i,              // lounge, loungewear
  /\breading\s*(nook|corner)\b/i,    // reading nook, reading corner
  /\bbook\s*nook\b/i,                // book nook
  /\bwindow\s*seat\b/i,              // window seat
  /\brustic\b/i,                     // rustic
  /\bcabin\b/i,                      // cabin
  /\blodge\b/i,                      // lodge
  /\bchalet\b/i,                     // chalet
  /\bcottage\b/i,                    // cottage
  /\bfarmhouse\b/i,                  // farmhouse
  /\bbeanie(s)?\b/i,                 // beanie, beanies
  /\bscarf\b/i,                      // scarf
  /\bscarves\b/i,                    // scarves
  /\bmitt(en|s)?\b/i,                // mitten, mittens, mitts
  /\bglove(s)?\b/i,                  // glove, gloves (winter context)
  /\bearmuff(s)?\b/i,                // earmuff, earmuffs
  /\bboot(s|ie|ies)?\b/i,            // boot, boots, bootie, booties
  /\bugg(s)?\b/i,                    // ugg, uggs
  /\bsock(s)?\b/i,                   // sock, socks
  /\bhoodie(s)?\b/i,                 // hoodie, hoodies
  /\bsweatshirt(s)?\b/i,             // sweatshirt, sweatshirts
  /\bsweatpant(s)?\b/i,              // sweatpant, sweatpants
  /\bjogger(s)?\b/i,                 // jogger, joggers
  /\bcomfort(able|y)?\b/i,           // comfort, comfortable, comfy
  /\brelax(ed|ing)?\b/i,             // relax, relaxed, relaxing
  /\bautumn(al)?\b/i,                // autumn, autumnal
  /\bfall\b/i,                       // fall (season)
  /\bwinter(y)?\b/i,                 // winter, wintery
  /\bchristmas\b/i,                  // christmas (inherently cozy)
  /\bholiday\b/i,                    // holiday
  /\boversize[d]?\b/i,               // oversize, oversized
  /\bcushion(s)?\b/i,                // cushion, cushions
  /\bpillow(s)?\b/i,                 // pillow, pillows
  /\bpouf(s|fe)?\b/i,                // pouf, poufs, pouffe
  /\bottoman(s)?\b/i,                // ottoman, ottomans
  /\bbean\s*bag\b/i,                 // bean bag
  /\bpapasan\b/i,                    // papasan (cozy chair)
  /\bhangout\b/i,                    // hangout
  /\bnest(ed|ing|y)?\b/i,            // nest, nested, nesting, nesty
  /\bcocooning\b/i,                  // cocooning
  /\bchunky\s*(knit|sweater|blanket)\b/i, // chunky knit/sweater/blanket
  /\blaying\b/i,                     // laying (in bed context)
  /\bsnow(y|flake)?\b/i,             // snow, snowy, snowflake
];

// Words that alone shouldn't count as cozy
const GENERIC_WORDS = [
  /\bsoft\b/i,                       // soft alone (common descriptor)
  /\bbed(room)?\b/i,                 // bed/bedroom alone
  /\bsofa\b/i,                       // sofa alone
  /\bcouch\b/i,                      // couch alone
  /\bchair\b/i,                      // chair alone
  /\bliving\s*room\b/i,              // living room alone
  /\bhome\b/i,                       // home alone
  /\bneutral\b/i,                    // neutral alone
  /\bearth(y|tones?)?\b/i,           // earth, earthy, earthtones
  /\bnatural\b/i,                    // natural alone
  /\bsimple\b/i,                     // simple alone
  /\bminimalist\b/i,                 // minimalist alone
  /\bmodern\b/i,                     // modern alone
  /\bnice\b/i,                       // nice alone
  /\bcute\b/i,                       // cute alone
  /\blovely\b/i,                     // lovely alone
  /\bclassic\b/i,                    // classic alone
  /\btimeless\b/i,                   // timeless alone
  /\blight(s|ing)?\b/i,              // light, lights, lighting alone
  /\bbrown\b/i,                      // brown color alone
  /\bbeige\b/i,                      // beige color alone
  /\bcream\b/i,                      // cream color alone
  /\btan\b/i,                        // tan color alone
  /\bwood(en)?\b/i,                  // wood, wooden alone
  /\bcotton\b/i,                     // cotton alone
  /\blinen\b/i,                      // linen alone
];

interface ValidationResult {
  isValid: boolean;
  reason: string;
  matches: string[];
}

/**
 * Validate if a mod should have the Cozy theme
 */
function validateCozy(
  title: string,
  description: string | null,
  tags: string[]
): ValidationResult {
  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  // Check for valid Cozy patterns
  for (const pattern of VALID_COZY_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length > 0) {
    return {
      isValid: true,
      reason: `Valid cozy indicators found: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`,
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
      reason: `Only generic words found (${genericMatches.slice(0, 5).join(', ')}${genericMatches.length > 5 ? '...' : ''}) - not explicitly cozy`,
      matches: [],
    };
  }

  // No indicators at all
  return {
    isValid: false,
    reason: 'No cozy indicators found',
    matches: [],
  };
}

async function cleanupCozy() {
  console.log('🔧 TC-006: Clean up Cozy theme false positives\n');

  // Find all mods with 'cozy' theme
  const modsWithCozy = await prisma.mod.findMany({
    where: {
      themes: { has: 'cozy' },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true, contentType: true },
  });

  console.log(`📊 Found ${modsWithCozy.length} mods with 'cozy' theme\n`);

  if (modsWithCozy.length === 0) {
    console.log('✅ No mods with cozy theme found!');
    await prisma.$disconnect();
    return;
  }

  // Validate each mod
  const validMods: typeof modsWithCozy = [];
  const invalidMods: { mod: (typeof modsWithCozy)[0]; validation: ValidationResult }[] = [];

  for (const mod of modsWithCozy) {
    const validation = validateCozy(mod.title, mod.description, mod.tags);
    if (validation.isValid) {
      validMods.push(mod);
    } else {
      invalidMods.push({ mod, validation });
    }
  }

  console.log('--- Validation Results ---');
  console.log(`  Valid cozy mods: ${validMods.length}`);
  console.log(`  Invalid (to be removed): ${invalidMods.length}\n`);

  // Show sample of valid mods
  console.log('--- Sample Valid Mods (keeping cozy) ---');
  for (const mod of validMods.slice(0, 10)) {
    console.log(`  ✓ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
  }
  if (validMods.length > 10) {
    console.log(`  ... and ${validMods.length - 10} more valid mods`);
  }

  // Show sample of invalid mods
  console.log('\n--- Sample Invalid Mods (removing cozy) ---');
  for (const { mod, validation } of invalidMods.slice(0, 20)) {
    console.log(`\n  ✗ "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    ContentType: ${mod.contentType || 'null'}`);
    console.log(`    Reason: ${validation.reason}`);
  }
  if (invalidMods.length > 20) {
    console.log(`\n  ... and ${invalidMods.length - 20} more invalid mods`);
  }

  // Apply fixes
  console.log('\n🔧 Removing cozy theme from invalid mods...');
  let removedCount = 0;

  for (const { mod } of invalidMods) {
    const newThemes = mod.themes.filter((t) => t !== 'cozy');
    await prisma.mod.update({
      where: { id: mod.id },
      data: { themes: newThemes },
    });
    removedCount++;
  }

  console.log(`\n✅ Removed cozy theme from ${removedCount} mods`);

  // Verify - re-count
  const remainingCount = await prisma.mod.count({
    where: {
      themes: { has: 'cozy' },
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`  Before: ${modsWithCozy.length} mods with cozy`);
  console.log(`  Removed: ${removedCount}`);
  console.log(`  After: ${remainingCount} mods with cozy`);
  console.log(`  Expected: ${validMods.length}`);

  if (remainingCount === validMods.length) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n⚠️ Count mismatch - please investigate');
  }

  await prisma.$disconnect();
}

cleanupCozy().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
