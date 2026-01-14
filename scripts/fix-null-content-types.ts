#!/usr/bin/env npx tsx
/**
 * Fix mods with null contentType by inferring from title keywords
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Content type inference rules - order matters (first match wins)
const CONTENT_TYPE_RULES: { patterns: RegExp[]; contentType: string }[] = [
  // Dresses first (before generic clothing)
  { patterns: [/\bdress(es)?\b/i, /\bgown\b/i], contentType: 'dresses' },

  // Hair
  { patterns: [/\bhair\b/i, /\bwig\b/i, /\bhairstyle\b/i], contentType: 'hair' },

  // Tops
  { patterns: [/\btop\b/i, /\btops\b/i, /\bshirt\b/i, /\bblouse\b/i, /\bsweater\b/i, /\bhoodie\b/i, /\bcardigan\b/i, /\bjacket\b/i, /\bcoat\b/i, /\bblazer\b/i, /\btank\b/i, /\bcrop\b/i, /\btee\b/i, /\bt-shirt\b/i, /\bvest\b/i, /\bapron\b/i, /\bcorset\b/i, /\bbustier\b/i], contentType: 'tops' },

  // Bottoms
  { patterns: [/\bjeans\b/i, /\bpants\b/i, /\bshorts\b/i, /\bleggings\b/i, /\bskirt\b/i, /\btrousers\b/i], contentType: 'bottoms' },

  // Full body
  { patterns: [/\bjumpsuit\b/i, /\boveralls\b/i, /\bbodysuit\b/i, /\buniform\b/i, /\boutfit\b/i, /\bcc set\b/i, /\bcc pack\b/i, /\bloungewear\b/i, /\bpj\b/i, /\bpajama/i, /\bathleticwear\b/i, /\bswimsuit\b/i, /\bbikini\b/i, /\bdungarees\b/i, /\boverall\b/i, /\bunderwear\b/i, /\btracksuit\b/i, /\bgym set\b/i], contentType: 'full-body' },

  // Shoes
  { patterns: [/\bshoe(s)?\b/i, /\bboot(s)?\b/i, /\bsneaker(s)?\b/i, /\bheel(s)?\b/i, /\bsandal(s)?\b/i, /\bslipper(s)?\b/i, /\bflat(s)?\b/i, /\bplatform(s)?\b/i, /\bwedges\b/i, /\bbirkenstocks\b/i, /\bflip-flops\b/i, /\bflipflops\b/i], contentType: 'shoes' },

  // Makeup
  { patterns: [/\bmakeup\b/i, /\blipstick\b/i, /\beyeshadow\b/i, /\bliner\b/i, /\bblush\b/i, /\bcontour\b/i, /\bfoundation\b/i, /\bmascara\b/i, /\bbrow(s)?\b/i, /\bcosmetic/i, /\bface\s*paint\b/i], contentType: 'makeup' },

  // Skin
  { patterns: [/\bskin\b/i, /\bskinblend\b/i, /\boverlay\b/i, /\bfreckles\b/i, /\bwrinkles\b/i, /\bbody preset\b/i], contentType: 'skin' },

  // Eyes
  { patterns: [/\beyes?\b/i, /\bcontact(s)?\b/i, /\biris\b/i], contentType: 'eyes' },

  // Nails
  { patterns: [/\bnails?\b/i, /\bmanicure\b/i], contentType: 'nails' },

  // Tattoos
  { patterns: [/\btattoo(s)?\b/i], contentType: 'tattoos' },

  // Glasses
  { patterns: [/\bglasses\b/i, /\bsunglasses\b/i, /\bspecs\b/i, /\beyewear\b/i], contentType: 'glasses' },

  // Jewelry
  { patterns: [/\bjewelry\b/i, /\bearring(s)?\b/i, /\bnecklace\b/i, /\bbracelet\b/i, /\bring(s)?\b/i, /\bpiercing(s)?\b/i], contentType: 'jewelry' },

  // Accessories (after jewelry)
  { patterns: [/\bhat\b/i, /\bcap\b/i, /\bscarf\b/i, /\bbag\b/i, /\bpurse\b/i, /\bgloves\b/i, /\bbelt\b/i, /\bwatch\b/i, /\bheadband\b/i, /\bheadwear\b/i, /\baccessor/i, /\bbow\b/i, /\bhairpin\b/i, /\bhair clip\b/i, /\btail\b/i, /\bears\b.*\b(cc|elf|mermaid)\b/i, /\bmermaid ears\b/i, /\bbraces\b/i, /\bgills\b/i, /\bwings\b/i, /\bhorns\b/i, /\bchalk bowl\b/i, /\bsocks\b/i], contentType: 'accessories' },

  // Poses
  { patterns: [/\bpose(s)?\b/i, /\bposepack\b/i], contentType: 'poses' },

  // Furniture
  { patterns: [/\bfurniture\b/i, /\bsofa\b/i, /\bbed\b/i, /\bchair\b/i, /\btable\b/i, /\bdesk\b/i, /\bshelf\b/i, /\bcoffin\b/i, /\bfireplace\b/i, /\bkitchen\b/i, /\bcounter\b/i, /\bcabinet\b/i, /\bnursery\s*set\b/i, /\broom\s*set\b/i, /\bliving\s*room\b/i, /\bvanity\b/i, /\bteens?\s*room\b/i, /\bkids?\s*room\b/i, /\bbedroom\b/i], contentType: 'furniture' },

  // Decor
  { patterns: [/\bdecor\b/i, /\bclutter\b/i, /\bplant(s)?\b/i, /\brug\b/i, /\bart\b/i, /\bpainting\b/i, /\bposter\b/i, /\blight(s)?\b/i, /\blamp\b/i, /\bcandle\b/i, /\bvase\b/i, /\bmirror\b/i, /\bneon\s*sign\b/i, /\bcontroller\b/i, /\bcake\s*set\b/i, /\bpotpourri\b/i, /\bpumpkin\b/i, /\bpatch\b/i, /\bportions?\s*set\b/i], contentType: 'decor' },

  // Lot (walls, floors, builds)
  { patterns: [/\bwall(paper)?(s)?\b/i, /\bfloor(s)?\b/i, /\bbuild\b/i, /\bhouse\b/i, /\blot\b/i, /\bbrick(s)?\b/i, /\btile(s)?\b/i, /\bterrain\b/i, /\bcarpet\b/i, /\bcastle\b/i, /\bdynasty\b/i, /\bshower\b/i, /\bpool\b/i, /\bdoor(s)?\b/i, /\bwindow(s)?\b/i], contentType: 'lot' },

  // Loading screens and CAS backgrounds
  { patterns: [/\bloading\s*screen\b/i], contentType: 'loading-screen' },
  { patterns: [/\bcas\s*background\b/i, /\bcas\s*room\b/i], contentType: 'cas-background' },

  // Gameplay mods
  { patterns: [/\bmod\b.*\b(gameplay|overhaul|tweak)\b/i, /\boverhaul\b/i, /\btrait\b/i, /\bcareer\b/i, /\baspiration\b/i, /\bwerewolf\b/i, /\bmermaid(s)?\s*mod\b/i, /\bevent\s*mod\b/i, /\btweak\b/i, /\bnanny\b/i, /\bstories\b/i, /\breunion\b/i, /\bget together\b/i, /\brelationship(s)?\s*mod\b/i, /\bmagic school\b/i, /\btry for baby\b/i, /\bchallenge\b/i, /\bsuccess\b/i, /\badd-ons\b/i, /\baddons\b/i], contentType: 'gameplay-mod' },

  // Script mods
  { patterns: [/\bscript\b/i, /\boverride\b/i, /\brecolor(s)?\b/i, /\bretexture\b/i, /\breplacement\b/i, /\bslider\b/i], contentType: 'script-mod' },

  // Preset
  { patterns: [/\bpreset(s)?\b/i, /\bsim download\b/i, /\bnose\s*presets\b/i], contentType: 'preset' },

  // Lot - additional patterns
  { patterns: [/\branch\b/i, /\bracecourse\b/i, /\bschool\b/i, /\bcompany\b/i, /\brestaurant\b/i, /\bcafe\b/i, /\bshop\b/i, /\bstore\b/i, /\binn\b/i, /\btavern\b/i], contentType: 'lot' },

  // Full body - additional patterns
  { patterns: [/\bclothes\s*cc\b/i, /\bcc\s*clothes\b/i, /\buniforms\b/i, /\bcollection\b/i, /\bjogger\s*set\b/i, /\bmini\s*pack\b/i, /\bstockings\b/i, /\bformal\s*set\b/i, /\barmor\b/i, /\bfemale\s*cc\b/i, /\bfitness\s*set\b/i], contentType: 'full-body' },

  // Decor - additional patterns
  { patterns: [/\bgaming\b.*\b(set|pad|mouse)\b/i, /\bmouse pad\b/i, /\bcorn\b/i, /\bfood\b/i, /\brecycler\b/i, /\bmonitor\b/i, /\bnautical\b/i], contentType: 'decor' },

  // Furniture - additional patterns
  { patterns: [/\bstudy\b/i], contentType: 'furniture' },

  // Gameplay mods - additional patterns
  { patterns: [/\bviolence\b/i, /\bfurious\b/i, /\blegend\b/i, /\bjump\b/i, /\bdiscover\s*university\b/i, /\buniversity\b/i], contentType: 'gameplay-mod' },

  // Pet accessories
  { patterns: [/\bdog\b/i, /\bcat\b/i, /\bpet\b/i, /\bcollar\b/i], contentType: 'pet-furniture' },

  // Accessories - additional
  { patterns: [/\bcyberware\b/i, /\bcyberpunk\b/i], contentType: 'accessories' },
];

function inferContentType(title: string, category?: string | null): string | null {
  // First try title patterns
  for (const rule of CONTENT_TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(title)) {
        return rule.contentType;
      }
    }
  }

  // Fall back to category-based inference
  if (category) {
    const cat = category.toLowerCase();
    if (cat.includes('build') || cat.includes('buy')) return 'lot';
    if (cat.includes('gameplay')) return 'gameplay-mod';
    if (cat.includes('script')) return 'script-mod';
    if (cat.includes('cas - hair')) return 'hair';
    if (cat.includes('cas - clothing')) return 'full-body';
    if (cat.includes('cas - makeup')) return 'makeup';
    if (cat.includes('cas - skin')) return 'skin';
    if (cat.includes('cas')) return 'full-body'; // generic CAS
  }

  return null;
}

async function main() {
  console.log('🔍 Finding mods with null contentType...\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: null },
    select: { id: true, title: true, category: true },
  });

  console.log(`Found ${mods.length} mods with null contentType\n`);

  const fixes: { mod: typeof mods[0]; newType: string }[] = [];
  const unfixed: typeof mods = [];

  for (const mod of mods) {
    const inferred = inferContentType(mod.title, mod.category);
    if (inferred) {
      fixes.push({ mod, newType: inferred });
    } else {
      unfixed.push(mod);
    }
  }

  console.log(`Can infer contentType for ${fixes.length} mods`);
  console.log(`Cannot infer for ${unfixed.length} mods\n`);

  // Show what we'll fix
  console.log('Preview of fixes (first 30):');
  for (const { mod, newType } of fixes.slice(0, 30)) {
    console.log(`  [${newType.padEnd(15)}] ${mod.title.slice(0, 60)}`);
  }
  if (fixes.length > 30) console.log(`  ... and ${fixes.length - 30} more\n`);

  // Show what we can't fix
  console.log('\nCould not infer (first 20):');
  for (const mod of unfixed.slice(0, 20)) {
    console.log(`  [${(mod.category || '?').padEnd(15)}] ${mod.title.slice(0, 60)}`);
  }
  if (unfixed.length > 20) console.log(`  ... and ${unfixed.length - 20} more\n`);

  // Apply fixes
  console.log('\n🔧 Applying fixes...');
  let fixed = 0;
  for (const { mod, newType } of fixes) {
    await prisma.mod.update({
      where: { id: mod.id },
      data: { contentType: newType },
    });
    fixed++;
    if (fixed % 50 === 0) console.log(`  Fixed ${fixed}/${fixes.length}...`);
  }

  console.log(`\n✅ Fixed ${fixed} mods`);

  // Final stats
  const remaining = await prisma.mod.count({ where: { contentType: null } });
  console.log(`Remaining mods with null contentType: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
