#!/usr/bin/env npx tsx
/**
 * FC-004: Fill null contentTypes using pattern matching
 *
 * Apply keyword patterns to mods missing contentType using title and description.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Content type inference rules - order matters (first match wins)
// Based on acceptance criteria patterns plus comprehensive list from existing script
const CONTENT_TYPE_RULES: { patterns: RegExp[]; contentType: string }[] = [
  // Hair patterns (from AC: hair, wig, updo, ponytail, braid, bangs)
  {
    patterns: [
      /\bhair\b/i, /\bwig\b/i, /\bupdo\b/i, /\bponytail\b/i,
      /\bbraid(s)?\b/i, /\bbang(s)?\b/i, /\bhairstyle\b/i,
      /\bcurl(s|y)?\b/i, /\bafro\b/i, /\bdreadlock(s)?\b/i,
      /\bhaircut\b/i, /\bmohawk\b/i, /\bbun\b/i, /\bpixie\b/i
    ],
    contentType: 'hair'
  },

  // Dresses (before tops/bottoms)
  {
    patterns: [/\bdress(es)?\b/i, /\bgown\b/i, /\bmini\s*dress\b/i, /\bmaxi\s*dress\b/i],
    contentType: 'dresses'
  },

  // Makeup patterns (from AC: makeup, lipstick, eyeshadow, blush, eyeliner)
  {
    patterns: [
      /\bmakeup\b/i, /\blipstick\b/i, /\beyeshadow\b/i, /\bblush\b/i,
      /\beyeliner\b/i, /\bliner\b/i, /\bcontour\b/i, /\bfoundation\b/i,
      /\bmascara\b/i, /\bbrow(s)?\b/i, /\bcosmetic/i, /\bface\s*paint\b/i,
      /\blip\s*gloss\b/i, /\bhighlighter\b/i
    ],
    contentType: 'makeup'
  },

  // Furniture patterns (from AC: sofa, chair, table, bed, desk, shelf)
  {
    patterns: [
      /\bfurniture\b/i, /\bsofa\b/i, /\bbed\b/i, /\bchair\b/i,
      /\btable\b/i, /\bdesk\b/i, /\bshelf\b/i, /\bshelves\b/i,
      /\bcoffin\b/i, /\bfireplace\b/i, /\bkitchen\b/i, /\bcounter\b/i,
      /\bcabinet\b/i, /\bnursery\s*set\b/i, /\broom\s*set\b/i,
      /\bliving\s*room\b/i, /\bvanity\b/i, /\bteens?\s*room\b/i,
      /\bkids?\s*room\b/i, /\bbedroom\b/i, /\bcouch\b/i, /\barmchair\b/i,
      /\bbookcase\b/i, /\bdresser\b/i, /\bwardrobe\b/i
    ],
    contentType: 'furniture'
  },

  // Tops
  {
    patterns: [
      /\btop\b/i, /\btops\b/i, /\bshirt\b/i, /\bblouse\b/i,
      /\bsweater\b/i, /\bhoodie\b/i, /\bcardigan\b/i, /\bjacket\b/i,
      /\bcoat\b/i, /\bblazer\b/i, /\btank\b/i, /\bcrop\b/i,
      /\btee\b/i, /\bt-shirt\b/i, /\bvest\b/i, /\bapron\b/i,
      /\bcorset\b/i, /\bbustier\b/i, /\bpullover\b/i, /\btunic\b/i
    ],
    contentType: 'tops'
  },

  // Bottoms
  {
    patterns: [
      /\bjeans\b/i, /\bpants\b/i, /\bshorts\b/i, /\bleggings\b/i,
      /\bskirt\b/i, /\btrousers\b/i, /\bcargos?\b/i, /\bchinos\b/i
    ],
    contentType: 'bottoms'
  },

  // Full body
  {
    patterns: [
      /\bjumpsuit\b/i, /\boveralls\b/i, /\bbodysuit\b/i, /\buniform\b/i,
      /\boutfit\b/i, /\bcc set\b/i, /\bcc pack\b/i, /\bloungewear\b/i,
      /\bpj\b/i, /\bpajama/i, /\bathleticwear\b/i, /\bswimsuit\b/i,
      /\bbikini\b/i, /\bdungarees\b/i, /\bunderwear\b/i, /\btracksuit\b/i,
      /\bgym set\b/i, /\blingerie\b/i, /\bonesie\b/i, /\bromper\b/i
    ],
    contentType: 'full-body'
  },

  // Shoes
  {
    patterns: [
      /\bshoe(s)?\b/i, /\bboot(s)?\b/i, /\bsneaker(s)?\b/i, /\bheel(s)?\b/i,
      /\bsandal(s)?\b/i, /\bslipper(s)?\b/i, /\bflat(s)?\b/i,
      /\bplatform(s)?\b/i, /\bwedges\b/i, /\bloafer(s)?\b/i
    ],
    contentType: 'shoes'
  },

  // Skin
  {
    patterns: [
      /\bskin\b/i, /\bskinblend\b/i, /\boverlay\b/i, /\bfreckles\b/i,
      /\bwrinkles\b/i, /\bbody preset\b/i, /\bskin detail\b/i
    ],
    contentType: 'skin'
  },

  // Eyes
  {
    patterns: [/\beyes?\b/i, /\bcontact(s)?\b/i, /\biris\b/i, /\beye\s*color\b/i],
    contentType: 'eyes'
  },

  // Nails
  {
    patterns: [/\bnails?\b/i, /\bmanicure\b/i, /\bnail\s*polish\b/i],
    contentType: 'nails'
  },

  // Tattoos
  { patterns: [/\btattoo(s)?\b/i], contentType: 'tattoos' },

  // Glasses
  {
    patterns: [/\bglasses\b/i, /\bsunglasses\b/i, /\bspecs\b/i, /\beyewear\b/i],
    contentType: 'glasses'
  },

  // Hats
  {
    patterns: [/\bhat\b/i, /\bhats\b/i, /\bcap\b/i, /\bbeanie\b/i, /\bberet\b/i],
    contentType: 'hats'
  },

  // Jewelry
  {
    patterns: [
      /\bjewelry\b/i, /\bjewellery\b/i, /\bearring(s)?\b/i, /\bnecklace\b/i,
      /\bbracelet\b/i, /\bring(s)?\b/i, /\bpiercing(s)?\b/i, /\bpendant\b/i,
      /\bchoker\b/i, /\banklet\b/i
    ],
    contentType: 'jewelry'
  },

  // Accessories (after jewelry)
  {
    patterns: [
      /\bscarf\b/i, /\bbag\b/i, /\bpurse\b/i, /\bgloves\b/i, /\bbelt\b/i,
      /\bwatch\b/i, /\bheadband\b/i, /\bheadwear\b/i, /\baccessor/i,
      /\bbow\b/i, /\bhairpin\b/i, /\bhair clip\b/i, /\btail\b/i,
      /\bbraces\b/i, /\bwings\b/i, /\bhorns\b/i, /\bsocks\b/i
    ],
    contentType: 'accessories'
  },

  // Poses
  {
    patterns: [/\bpose(s)?\b/i, /\bposepack\b/i, /\bpose\s*pack\b/i],
    contentType: 'poses'
  },

  // Decor
  {
    patterns: [
      /\bdecor\b/i, /\bclutter\b/i, /\bplant(s)?\b/i, /\brug\b/i,
      /\bart\b/i, /\bpainting\b/i, /\bposter\b/i, /\blight(s)?\b/i,
      /\blamp\b/i, /\bcandle\b/i, /\bvase\b/i, /\bmirror\b/i,
      /\bneon\s*sign\b/i, /\bfood\b/i, /\bpumpkin\b/i
    ],
    contentType: 'decor'
  },

  // Lot (walls, floors, builds)
  {
    patterns: [
      /\bwall(paper)?(s)?\b/i, /\bfloor(s)?\b/i, /\bbuild\b/i, /\bhouse\b/i,
      /\blot\b/i, /\bbrick(s)?\b/i, /\btile(s)?\b/i, /\bterrain\b/i,
      /\bcarpet\b/i, /\bcastle\b/i, /\bshower\b/i, /\bpool\b/i,
      /\bdoor(s)?\b/i, /\bwindow(s)?\b/i, /\broof\b/i, /\bfence\b/i
    ],
    contentType: 'lot'
  },

  // Loading screens and CAS backgrounds
  {
    patterns: [/\bloading\s*screen\b/i],
    contentType: 'loading-screen'
  },
  {
    patterns: [/\bcas\s*background\b/i, /\bcas\s*room\b/i],
    contentType: 'cas-background'
  },

  // Gameplay mods
  {
    patterns: [
      /\bmod\b.*\b(gameplay|overhaul|tweak)\b/i, /\boverhaul\b/i, /\btrait\b/i,
      /\bcareer\b/i, /\baspiration\b/i, /\btry for baby\b/i, /\bchallenge\b/i
    ],
    contentType: 'gameplay-mod'
  },

  // Script mods
  {
    patterns: [/\bscript\b/i, /\boverride\b/i, /\bslider\b/i, /\bpreset(s)?\b/i],
    contentType: 'script-mod'
  },

  // Preset
  {
    patterns: [/\bsim download\b/i, /\bnose\s*presets\b/i],
    contentType: 'preset'
  },
];

function inferContentType(title: string, description: string | null): string | null {
  // First try title patterns
  for (const rule of CONTENT_TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(title)) {
        return rule.contentType;
      }
    }
  }

  // Then try description patterns
  if (description) {
    for (const rule of CONTENT_TYPE_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(description)) {
          return rule.contentType;
        }
      }
    }
  }

  return null;
}

async function fixNullContentTypes() {
  console.log('🔧 FC-004: Fill null contentTypes using pattern matching\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: null },
    select: { id: true, title: true, description: true, category: true },
  });

  console.log(`Found ${mods.length} mods with null contentType\n`);

  const stats: Record<string, number> = {};
  const fixes: { id: string; newType: string; title: string }[] = [];
  const unfixed: { title: string; category: string | null }[] = [];

  for (const mod of mods) {
    const inferred = inferContentType(mod.title, mod.description);
    if (inferred) {
      fixes.push({ id: mod.id, newType: inferred, title: mod.title });
      stats[inferred] = (stats[inferred] || 0) + 1;
    } else {
      unfixed.push({ title: mod.title, category: mod.category });
    }
  }

  console.log('--- Inferred Content Types ---');
  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedStats) {
    console.log(`  ${type}: ${count}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Can infer: ${fixes.length}`);
  console.log(`  Cannot infer: ${unfixed.length}`);

  // Show unfixed items for logging
  if (unfixed.length > 0) {
    console.log('\n--- Unclassified Items (first 20) ---');
    for (const item of unfixed.slice(0, 20)) {
      console.log(`  - "${item.title.substring(0, 50)}..." (${item.category || 'no category'})`);
    }
    if (unfixed.length > 20) {
      console.log(`  ... and ${unfixed.length - 20} more`);
    }
  }

  // Apply fixes
  console.log('\n🔧 Applying updates...');
  let updated = 0;
  for (const fix of fixes) {
    await prisma.mod.update({
      where: { id: fix.id },
      data: { contentType: fix.newType }
    });
    updated++;
    if (updated % 10 === 0) {
      console.log(`  Progress: ${updated}/${fixes.length}`);
    }
  }

  console.log(`\n✅ Updated ${updated} mods`);

  // Verify
  const remaining = await prisma.mod.count({ where: { contentType: null } });
  console.log(`📊 Mods with null contentType remaining: ${remaining}`);

  await prisma.$disconnect();
}

fixNullContentTypes().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
