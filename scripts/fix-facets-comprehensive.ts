#!/usr/bin/env npx tsx
/**
 * Comprehensive facet fix - fixes both contentType and gender misclassifications
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============ CONTENT TYPE FIXES ============
// Keywords that OVERRIDE current contentType
const CONTENT_TYPE_OVERRIDES: { patterns: RegExp[]; contentType: string }[] = [
  // Recipes -> gameplay-mod
  { patterns: [/\brecipe\b/i], contentType: 'gameplay-mod' },

  // Fireplaces -> decor
  { patterns: [/\bfireplace\b/i], contentType: 'decor' },

  // Houses/lots
  { patterns: [/\bhouse\b/i, /\bfarmhouse\b/i, /\bhome\b/i, /\bestate\b/i, /\bmansion\b/i, /\bcastle\b/i], contentType: 'lot' },

  // Lamps/lights -> decor
  { patterns: [/\blamp\b/i, /\bceiling\s*light\b/i, /\blight\s*fixture\b/i, /\bchandelier\b/i], contentType: 'decor' },

  // Walls -> lot
  { patterns: [/\bwall\b/i, /\bwallpaper\b/i], contentType: 'lot' },

  // Rooms/furniture sets -> furniture
  { patterns: [/\broom\b/i, /\bnursery\b/i, /\bliving\s*room\b/i, /\bbedroom\b/i], contentType: 'furniture' },

  // Rugs -> decor
  { patterns: [/\brug\b/i], contentType: 'decor' },

  // Decor items
  { patterns: [/\bdecor\b/i, /\bdecorations?\b/i, /\bclutter\b/i], contentType: 'decor' },

  // Mods
  { patterns: [/\bmod\b/i, /\boverhaul\b/i, /\btrait\b/i], contentType: 'gameplay-mod' },

  // Pose packs
  { patterns: [/\bpose\s*pack\b/i, /\bposes\b/i], contentType: 'poses' },

  // TV units, furniture
  { patterns: [/\btv\s*unit\b/i, /\bfurniture\b/i, /\bsofa\b/i, /\bbed\b/i, /\btable\b/i], contentType: 'furniture' },

  // Outdoor -> lot or decor
  { patterns: [/\boutdoor\b/i], contentType: 'decor' },
];

// ============ GENDER FIXES ============
// Keywords that indicate FEMININE ONLY (remove masculine)
const FEMININE_ONLY_PATTERNS = [
  /\bdress(es)?\b/i,
  /\bgowns?\b/i,
  /\bskirts?\b/i,
  /\bblouse\b/i,
  /\bcorset\b/i,
  /\bbustier\b/i,
  /\bbikinis?\b/i,
  /\blingerie\b/i,
  /\bheels\b/i,
  /\bpumps\b/i,
  /\bstiletto/i,
  /\bfemale\b/i,
  /\bwomen\b/i,
  /\bwoman\b/i,
  /\bgirls?\b/i,
  /\bladies\b/i,
  /\bfeminine\b/i,
  /\bpregnancy\b/i,
  /\bpregnant\b/i,
  /\bmaternity\b/i,
  /\bbridal\b/i,
  /\bbride\b/i,
  /\bprincess\b/i,
  /\bqueen\b/i,
  /\bgoddess\b/i,
  /\bmini\s*skirts?\b/i,
  /\bcrop\s*tops?\b/i,
  /\bcropped\b/i,
  /\bhalter\b/i,
  /\bsundress\b/i,
  /\brompers?\b/i,
  /\bmaxi\b/i,
  /\bmidi\b/i,
  /\bpeplum\b/i,
  /\btunics?\b/i,
  /\bwrap\s*(dress|top)\b/i,
  /\bbras?\b/i,
  /\bpanties\b/i,
  /\bthongs?\b/i,
  /\bstockings\b/i,
  /\bgarter\b/i,
  /\blipstick\b/i,
  /\beyeshadow\b/i,
  /\bmascara\b/i,
  /\beyeliner\b/i,
  /\bnail\s*(polish|art)\b/i,
  /\bknee-high\b/i,
  /\babove-the-knee\b/i,
];

// Keywords that indicate MASCULINE content
const MASCULINE_PATTERNS = [
  /\bmale\b/i,
  /\bmen's\b/i,
  /\bmens\b/i,
  /\bfor\s*men\b/i,
  /\bmasculine\b/i,
  /\bboy\b/i,
  /\bboys\b/i,
  /\bguy\b/i,
  /\bguys\b/i,
  /\bbeard/i,
  /\bstubble\b/i,
  /\bmustache\b/i,
  /\bgoatee\b/i,
];

// Content types that are typically feminine-only
const FEMININE_CONTENT_TYPES = ['jewelry', 'nails', 'dresses'];

// Content types that should NOT have gender (they're objects, not clothing)
const NON_GENDERED_CONTENT_TYPES = ['lot', 'decor', 'furniture', 'gameplay-mod', 'script-mod', 'loading-screen', 'cas-background', 'poses', 'clutter', 'pet-furniture'];

function shouldOverrideContentType(title: string, currentType: string | null): string | null {
  for (const rule of CONTENT_TYPE_OVERRIDES) {
    if (rule.patterns.some(p => p.test(title))) {
      return rule.contentType;
    }
  }
  return null;
}

function shouldBeFeminineOnly(title: string, description: string | null, contentType: string | null): boolean {
  const text = title + ' ' + (description || '');
  const desc = (description || '').toLowerCase();

  // If it has masculine keywords, it's not feminine-only
  if (MASCULINE_PATTERNS.some(p => p.test(text))) {
    return false;
  }

  // If description mentions both male and female, keep both
  if (/\bfemale\b.*\bmale\b|\bmale\b.*\bfemale\b/i.test(desc)) {
    return false;
  }

  // If it has feminine keywords in title, it's feminine-only
  if (FEMININE_ONLY_PATTERNS.some(p => p.test(title))) {
    return true;
  }

  // Also check description for feminine keywords
  if (FEMININE_ONLY_PATTERNS.some(p => p.test(desc))) {
    return true;
  }

  // If it's a typically feminine content type without male keywords, make it feminine-only
  if (contentType && FEMININE_CONTENT_TYPES.includes(contentType)) {
    return true;
  }

  return false;
}

function shouldHaveNoGender(contentType: string | null): boolean {
  return contentType !== null && NON_GENDERED_CONTENT_TYPES.includes(contentType);
}

async function main() {
  console.log('🔧 COMPREHENSIVE FACET FIX\n');

  const mods = await prisma.mod.findMany({
    select: { id: true, title: true, description: true, contentType: true, genderOptions: true }
  });

  console.log(`Total mods: ${mods.length}\n`);

  let contentTypeFixes = 0;
  let genderFixes = 0;

  for (const mod of mods) {
    const updates: { contentType?: string; genderOptions?: string[] } = {};

    // Check for contentType override
    const newContentType = shouldOverrideContentType(mod.title, mod.contentType);
    if (newContentType && newContentType !== mod.contentType) {
      updates.contentType = newContentType;
    }

    const effectiveContentType = newContentType || mod.contentType;

    // Check for gender fixes
    const hasMasculine = mod.genderOptions.includes('masculine');
    const hasFeminine = mod.genderOptions.includes('feminine');

    // If it's a non-gendered content type, clear gender options
    if (shouldHaveNoGender(effectiveContentType) && mod.genderOptions.length > 0) {
      updates.genderOptions = [];
    }
    // If it should be feminine-only but has masculine
    else if (hasMasculine && shouldBeFeminineOnly(mod.title, mod.description, effectiveContentType)) {
      updates.genderOptions = ['feminine'];
    }
    // If gender is empty but should be feminine (clothing items with feminine keywords)
    else if (mod.genderOptions.length === 0 && shouldBeFeminineOnly(mod.title, mod.description, effectiveContentType)) {
      updates.genderOptions = ['feminine'];
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: updates,
      });

      if (updates.contentType) {
        contentTypeFixes++;
        if (contentTypeFixes <= 20) {
          console.log(`📦 ContentType: "${mod.title.slice(0, 40)}" ${mod.contentType} → ${updates.contentType}`);
        }
      }
      if (updates.genderOptions) {
        genderFixes++;
        if (genderFixes <= 20) {
          console.log(`👤 Gender: "${mod.title.slice(0, 40)}" [${mod.genderOptions}] → [${updates.genderOptions}]`);
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${contentTypeFixes} contentType issues`);
  console.log(`✅ Fixed ${genderFixes} gender issues`);

  // Final stats
  console.log('\n--- Final Distribution ---');

  const mascCount = await prisma.mod.count({ where: { genderOptions: { has: 'masculine' } } });
  const femCount = await prisma.mod.count({ where: { genderOptions: { has: 'feminine' } } });
  console.log(`Masculine: ${mascCount}`);
  console.log(`Feminine: ${femCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
