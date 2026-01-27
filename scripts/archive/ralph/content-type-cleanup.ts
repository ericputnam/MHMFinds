#!/usr/bin/env npx tsx
/**
 * Content Type Deep Cleanup
 *
 * Audits and fixes all contentType misclassifications according to prd.json specs.
 * CT-001 through CT-015: Fix each contentType
 * CT-016: Generate summary report
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Track all changes across all content types
interface Change {
  modId: string;
  title: string;
  oldContentType: string;
  newContentType: string;
  reason: string;
}

interface ContentTypeStats {
  contentType: string;
  audited: number;
  fixed: number;
  changes: Change[];
}

const allStats: ContentTypeStats[] = [];

// ============================================================
// Pattern definitions for each content type
// ============================================================

// Hair indicators
const HAIR_PATTERNS = [
  /\bhair\b/i,
  /\bhairstyle\b/i,
  /\bwig\b/i,
  /\bponytail\b/i,
  /\bbraid\b/i,
  /\bupdo\b/i,
  /\bbangs\b/i,
  /\blocks\b/i,
  /\bcurls\b/i,
  /\bbob\b/i,
  /\bpixie\b/i,
  /\bafro\b/i,
  /\bdreads\b/i,
  /\bdreadlocks\b/i,
  /\bmohawk\b/i,
  /\bundercut\b/i,
  /\bbun\b/i,
  /\bhairdo\b/i,
];

const NOT_HAIR_PATTERNS = [
  /\bchristmas\s+tree\b/i,
  /\bxmas\s+tree\b/i,
  /\bset\b/i,
  /\bfurniture\b/i,
  /\bdecor\b/i,
  /\baccessory\b/i,
  /\bclothing\b/i,
  /\blot\b/i,
  /\bpose\b/i,
  /\bhouse\b/i,
  /\bhome\b/i,
  /\bsofa\b/i,
  /\bcouch\b/i,
  /\btable\b/i,
  /\bchair\b/i,
  /\bbed\b/i,
];

// Tops indicators
const TOPS_PATTERNS = [
  /\btop\b/i,
  /\bshirt\b/i,
  /\bblouse\b/i,
  /\bsweater\b/i,
  /\bhoodie\b/i,
  /\btee\b/i,
  /\bt-shirt\b/i,
  /\btank\b/i,
  /\bcrop\s+top\b/i,
  /\bcardigan\b/i,
  /\bjacket\b/i,
  /\bcoat\b/i,
  /\bblazer\b/i,
  /\bvest\b/i,
  /\bturtleneck\b/i,
  /\bpullover\b/i,
  /\bcrewneck\b/i,
  /\bsweatshirt\b/i,
];

// Dress indicators
const DRESS_PATTERNS = [
  /\bdress\b/i,
  /\bgown\b/i,
  /\bmaxi\b/i,
  /\bmini\s+dress\b/i,
  /\bsundress\b/i,
  /\bwedding\s+dress\b/i,
  /\bball\s+gown\b/i,
  /\bcocktail\s+dress\b/i,
  /\beveryday\s+dress\b/i,
];

// Full body indicators
const FULL_BODY_PATTERNS = [
  /\boutfit\b/i,
  /\bfull\s+body\b/i,
  /\bjumpsuit\b/i,
  /\bromper\b/i,
  /\bonesie\b/i,
  /\bbodysuit\b/i,
  /\buniform\b/i,
  /\bcostume\b/i,
  /\bsuit\b/i,
  /\boverall\b/i,
  /\bcomplete\s+outfit\b/i,
];

// Bottoms indicators
const BOTTOMS_PATTERNS = [
  /\bpants\b/i,
  /\bjeans\b/i,
  /\bshorts\b/i,
  /\bskirt\b/i,
  /\bleggings\b/i,
  /\btrousers\b/i,
  /\bjoggers\b/i,
  /\bsweatpants\b/i,
  /\bslacks\b/i,
  /\bcapris\b/i,
  /\bcargos\b/i,
  /\bchinos\b/i,
];

// Accessories indicators
const ACCESSORIES_PATTERNS = [
  /\baccessory\b/i,
  /\baccessories\b/i,
  /\bbag\b/i,
  /\bpurse\b/i,
  /\bbelt\b/i,
  /\bscarf\b/i,
  /\bgloves\b/i,
  /\bwatch\b/i,
  /\bheadband\b/i,
  /\bbow\b/i,
  /\bribbon\b/i,
  /\bhairpin\b/i,
  /\bhair\s+clip\b/i,
  /\bbackpack\b/i,
  /\bclutch\b/i,
];

// Jewelry indicators
const JEWELRY_PATTERNS = [
  /\bjewelry\b/i,
  /\bjewellery\b/i,
  /\bnecklace\b/i,
  /\bbracelet\b/i,
  /\bring\b/i,
  /\bearrings?\b/i,
  /\bpendant\b/i,
  /\bchain\b/i,
  /\banklet\b/i,
  /\bpiercing\b/i,
  /\bchoker\b/i,
  /\bbrooch\b/i,
];

// Furniture indicators
const FURNITURE_PATTERNS = [
  /\bsofa\b/i,
  /\bcouch\b/i,
  /\bchair\b/i,
  /\btable\b/i,
  /\bdesk\b/i,
  /\bbed\b/i,
  /\bdresser\b/i,
  /\bshelf\b/i,
  /\bcabinet\b/i,
  /\bwardrobe\b/i,
  /\bbookcase\b/i,
  /\bnightstand\b/i,
  /\bottoman\b/i,
  /\bbench\b/i,
  /\bstool\b/i,
  /\barmchair\b/i,
];

// Decor indicators
const DECOR_PATTERNS = [
  /\bdecor\b/i,
  /\bdecoration\b/i,
  /\bwall\s+art\b/i,
  /\bpainting\b/i,
  /\bsculpture\b/i,
  /\bvase\b/i,
  /\bcandle\b/i,
  /\bframe\b/i,
  /\bornament\b/i,
  /\bposter\b/i,
  /\bmirror\b/i,
  /\bclock\b/i,
];

// Lot indicators
const LOT_PATTERNS = [
  /\blot\b/i,
  /\bhouse\b/i,
  /\bhome\b/i,
  /\bapartment\b/i,
  /\bbuilding\b/i,
  /\bvenue\b/i,
  /\brestaurant\b/i,
  /\bbar\b/i,
  /\bcafe\b/i,
  /\bshop\b/i,
  /\bmansion\b/i,
  /\bcottage\b/i,
  /\bfarmhouse\b/i,
  /\blibrary\b/i,
  /\bmuseum\b/i,
  /\bgym\b/i,
  /\bspa\b/i,
  /\bclub\b/i,
];

// Poses indicators
const POSES_PATTERNS = [
  /\bpose\b/i,
  /\bposes\b/i,
  /\bpose\s+pack\b/i,
  /\banimation\b/i,
  /\bgallery\s+pose\b/i,
  /\bcas\s+pose\b/i,
  /\bcouple\s+pose\b/i,
  /\bfamily\s+pose\b/i,
  /\bselfie\s+pose\b/i,
];

// Makeup indicators
const MAKEUP_PATTERNS = [
  /\bmakeup\b/i,
  /\bmake-up\b/i,
  /\blipstick\b/i,
  /\beyeshadow\b/i,
  /\bblush\b/i,
  /\beyeliner\b/i,
  /\bmascara\b/i,
  /\bfoundation\b/i,
  /\bcontour\b/i,
  /\bhighlighter\b/i,
  /\blip\s+gloss\b/i,
  /\bbrow\b/i,
  /\beyebrow\b/i,
];

// Shoes indicators
const SHOES_PATTERNS = [
  /\bshoes?\b/i,
  /\bboots?\b/i,
  /\bsneakers?\b/i,
  /\bheels?\b/i,
  /\bsandals?\b/i,
  /\bflats?\b/i,
  /\bloafers?\b/i,
  /\bslippers?\b/i,
  /\bfootwear\b/i,
  /\bpumps\b/i,
  /\bwedges?\b/i,
  /\bplatform\b/i,
  /\bstiletto\b/i,
  /\bconverse\b/i,
  /\btimbs?\b/i,
  /\bnikе?\b/i,
  /\bjordans?\b/i,
];

// Skin indicators
const SKIN_PATTERNS = [
  /\bskin\b/i,
  /\bskin\s+overlay\b/i,
  /\bskin\s+detail\b/i,
  /\bfreckles\b/i,
  /\bmoles?\b/i,
  /\bbirthmark\b/i,
  /\bwrinkles\b/i,
  /\bbody\s+hair\b/i,
  /\bskin\s+texture\b/i,
  /\bskin\s+blend\b/i,
  /\bskinblend\b/i,
];

// Gameplay mod indicators
const GAMEPLAY_MOD_PATTERNS = [
  /\bmod\b/i,
  /\bscript\b/i,
  /\bgameplay\b/i,
  /\btweak\b/i,
  /\bcheat\b/i,
  /\bfix\b/i,
  /\boverride\b/i,
  /\btrait\b/i,
  /\bcareer\b/i,
  /\baspiration\b/i,
  /\btuning\b/i,
];

// ============================================================
// Helper functions
// ============================================================

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function determineCorrectContentType(title: string, description: string, tags: string[]): string | null {
  const text = `${title} ${description || ''} ${tags.join(' ')}`.toLowerCase();

  // Check each content type in priority order
  // More specific types first

  if (matchesPatterns(text, POSES_PATTERNS)) return 'poses';
  if (matchesPatterns(text, LOT_PATTERNS) && !matchesPatterns(text, FURNITURE_PATTERNS)) return 'lot';
  if (matchesPatterns(text, GAMEPLAY_MOD_PATTERNS) &&
      !matchesPatterns(text, HAIR_PATTERNS) &&
      !matchesPatterns(text, TOPS_PATTERNS) &&
      !matchesPatterns(text, DRESS_PATTERNS)) return 'gameplay-mod';

  // Clothing types
  if (matchesPatterns(text, DRESS_PATTERNS)) return 'dresses';
  if (matchesPatterns(text, FULL_BODY_PATTERNS)) return 'full-body';
  if (matchesPatterns(text, TOPS_PATTERNS)) return 'tops';
  if (matchesPatterns(text, BOTTOMS_PATTERNS)) return 'bottoms';
  if (matchesPatterns(text, SHOES_PATTERNS)) return 'shoes';
  if (matchesPatterns(text, JEWELRY_PATTERNS)) return 'jewelry';
  if (matchesPatterns(text, ACCESSORIES_PATTERNS)) return 'accessories';
  if (matchesPatterns(text, HAIR_PATTERNS)) return 'hair';
  if (matchesPatterns(text, MAKEUP_PATTERNS)) return 'makeup';
  if (matchesPatterns(text, SKIN_PATTERNS)) return 'skin';

  // Build/Buy types
  if (matchesPatterns(text, FURNITURE_PATTERNS)) return 'furniture';
  if (matchesPatterns(text, DECOR_PATTERNS)) return 'decor';

  return null;
}

// ============================================================
// CT-001: Fix Hair contentType misclassifications
// ============================================================

async function fixHairContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-001: Fix Hair contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'hair' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='hair'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check if this is actually hair
    const hasHairIndicator = matchesPatterns(text, HAIR_PATTERNS);
    const hasNotHairIndicator = matchesPatterns(text, NOT_HAIR_PATTERNS);

    if (!hasHairIndicator || hasNotHairIndicator) {
      // Determine correct content type
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);

      if (correctType && correctType !== 'hair') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'hair',
          newContentType: correctType,
          reason: `Title/description indicates ${correctType}, not hair`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'hair',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-002: Fix Tops contentType misclassifications
// ============================================================

async function fixTopsContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-002: Fix Tops contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'tops' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='tops'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check if it's actually a dress
    if (matchesPatterns(text, DRESS_PATTERNS) && !matchesPatterns(text, TOPS_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'tops',
        newContentType: 'dresses',
        reason: 'Contains "dress" in title/description'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'dresses' }
      });
      continue;
    }

    // Check if it's a full outfit
    if (matchesPatterns(text, FULL_BODY_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'tops',
        newContentType: 'full-body',
        reason: 'Indicates full outfit/body'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'full-body' }
      });
      continue;
    }

    // Check for other misclassifications
    const hasTopIndicator = matchesPatterns(text, TOPS_PATTERNS);
    if (!hasTopIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'tops') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'tops',
          newContentType: correctType,
          reason: `No top indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType} (${c.reason})`);
    });
  }

  return {
    contentType: 'tops',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-003: Fix Dresses contentType misclassifications
// ============================================================

async function fixDressesContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-003: Fix Dresses contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'dresses' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='dresses'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check if it's actually a romper or jumpsuit (full-body)
    if (/\bromper\b/i.test(text) || /\bjumpsuit\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'dresses',
        newContentType: 'full-body',
        reason: 'Romper/jumpsuit should be full-body'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'full-body' }
      });
      continue;
    }

    // Check for other misclassifications
    const hasDressIndicator = matchesPatterns(text, DRESS_PATTERNS);
    if (!hasDressIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'dresses') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'dresses',
          newContentType: correctType,
          reason: `No dress indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'dresses',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-004: Fix Full Body contentType misclassifications
// ============================================================

async function fixFullBodyContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-004: Fix Full Body contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'full-body' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='full-body'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check if it's actually just a dress (single piece)
    if (matchesPatterns(text, DRESS_PATTERNS) && !matchesPatterns(text, FULL_BODY_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'full-body',
        newContentType: 'dresses',
        reason: 'Single dress, not full outfit'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'dresses' }
      });
      continue;
    }

    // Check for other misclassifications
    const hasFullBodyIndicator = matchesPatterns(text, FULL_BODY_PATTERNS);
    if (!hasFullBodyIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'full-body') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'full-body',
          newContentType: correctType,
          reason: `No full-body indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'full-body',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-005: Fix Bottoms contentType misclassifications
// ============================================================

async function fixBottomsContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-005: Fix Bottoms contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'bottoms' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='bottoms'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    const hasBottomsIndicator = matchesPatterns(text, BOTTOMS_PATTERNS);
    if (!hasBottomsIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'bottoms') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'bottoms',
          newContentType: correctType,
          reason: `No bottoms indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'bottoms',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-006: Fix Accessories contentType misclassifications
// ============================================================

async function fixAccessoriesContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-006: Fix Accessories contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'accessories' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='accessories'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check if it's actually jewelry
    if (matchesPatterns(text, JEWELRY_PATTERNS) && !matchesPatterns(text, ACCESSORIES_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'accessories',
        newContentType: 'jewelry',
        reason: 'Jewelry item, not generic accessory'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'jewelry' }
      });
      continue;
    }

    // Check for furniture/decor misclassifications
    if (matchesPatterns(text, FURNITURE_PATTERNS) || matchesPatterns(text, DECOR_PATTERNS)) {
      const correctType = matchesPatterns(text, FURNITURE_PATTERNS) ? 'furniture' : 'decor';
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'accessories',
        newContentType: correctType,
        reason: `Build/buy item, not CAS accessory`
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: correctType }
      });
      continue;
    }

    // Check for glasses and hats
    if (/\bglasses\b/i.test(text) || /\bsunglasses\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'accessories',
        newContentType: 'glasses',
        reason: 'Glasses have separate category'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'glasses' }
      });
      continue;
    }

    if (/\bhat\b/i.test(text) || /\bcap\b/i.test(text) || /\bbeanie\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'accessories',
        newContentType: 'hats',
        reason: 'Hats have separate category'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'hats' }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'accessories',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-007: Fix Furniture contentType misclassifications
// ============================================================

async function fixFurnitureContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-007: Fix Furniture contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'furniture' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='furniture'`);

  const changes: Change[] = [];

  // Decor items that got tagged as furniture
  const decorPatterns = [
    /\bplant\b/i,
    /\brug\b/i,
    /\blighting\b/i,
    /\blamp\b/i,
    /\blight\b/i,
    /\bcandle\b/i,
    /\bvase\b/i,
    /\bpainting\b/i,
    /\bposter\b/i,
    /\bwall\s+art\b/i,
    /\bsculpture\b/i,
    /\bornament\b/i,
    /\bdecor\b/i,
  ];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for poses misclassified as furniture
    if (matchesPatterns(text, POSES_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'furniture',
        newContentType: 'poses',
        reason: 'Pose pack, not furniture'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'poses' }
      });
      continue;
    }

    // Check for clothing misclassified as furniture
    if (matchesPatterns(text, DRESS_PATTERNS) || matchesPatterns(text, TOPS_PATTERNS)) {
      const correctType = matchesPatterns(text, DRESS_PATTERNS) ? 'dresses' : 'tops';
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'furniture',
        newContentType: correctType,
        reason: 'CAS item, not furniture'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: correctType }
      });
      continue;
    }

    // Check for decor items
    if (decorPatterns.some(p => p.test(text)) && !matchesPatterns(text, FURNITURE_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'furniture',
        newContentType: 'decor',
        reason: 'Decorative item, not functional furniture'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'decor' }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'furniture',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-008: Fix Decor contentType misclassifications
// ============================================================

async function fixDecorContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-008: Fix Decor contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'decor' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='decor'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for functional furniture misclassified as decor
    if (matchesPatterns(text, FURNITURE_PATTERNS) && !matchesPatterns(text, DECOR_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'decor',
        newContentType: 'furniture',
        reason: 'Functional furniture, not decorative'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'furniture' }
      });
      continue;
    }

    // Check for plants (separate category in some schemas)
    if (/\bplant\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'decor',
        newContentType: 'plants',
        reason: 'Plants have separate category'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'plants' }
      });
      continue;
    }

    // Check for lighting
    if (/\blighting\b/i.test(text) || /\blamp\b/i.test(text) || /\blight\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'decor',
        newContentType: 'lighting',
        reason: 'Lighting has separate category'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'lighting' }
      });
      continue;
    }

    // Check for clutter
    if (/\bclutter\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'decor',
        newContentType: 'clutter',
        reason: 'Clutter has separate category'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'clutter' }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'decor',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-009: Fix Lot contentType misclassifications
// ============================================================

async function fixLotContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-009: Fix Lot contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'lot' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='lot'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    const hasLotIndicator = matchesPatterns(text, LOT_PATTERNS);

    // Check for furniture/decor mistakenly tagged as lot
    if (!hasLotIndicator && matchesPatterns(text, FURNITURE_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'lot',
        newContentType: 'furniture',
        reason: 'Single furniture item, not a lot'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'furniture' }
      });
      continue;
    }

    // Check for poses
    if (matchesPatterns(text, POSES_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'lot',
        newContentType: 'poses',
        reason: 'Pose pack, not lot'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'poses' }
      });
      continue;
    }

    // Check for CAS items
    if (matchesPatterns(text, HAIR_PATTERNS) || matchesPatterns(text, DRESS_PATTERNS)) {
      const correctType = matchesPatterns(text, HAIR_PATTERNS) ? 'hair' : 'dresses';
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'lot',
        newContentType: correctType,
        reason: 'CAS item, not lot'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: correctType }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'lot',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-010: Fix Poses contentType misclassifications
// ============================================================

async function fixPosesContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-010: Fix Poses contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'poses' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='poses'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    const hasPoseIndicator = matchesPatterns(text, POSES_PATTERNS);

    if (!hasPoseIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'poses') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'poses',
          newContentType: correctType,
          reason: `No pose indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'poses',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-011: Fix Makeup contentType misclassifications
// ============================================================

async function fixMakeupContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-011: Fix Makeup contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'makeup' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='makeup'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for skin overlay misclassified as makeup
    if (/\bskin\s+overlay\b/i.test(text) || /\bskinblend\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'makeup',
        newContentType: 'skin',
        reason: 'Skin overlay, not makeup'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'skin' }
      });
      continue;
    }

    // Check for tattoos
    if (/\btattoo\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'makeup',
        newContentType: 'tattoos',
        reason: 'Tattoo, not makeup'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'tattoos' }
      });
      continue;
    }

    // Check for freckles/moles (skin details)
    if (/\bfreckles\b/i.test(text) || /\bmoles?\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'makeup',
        newContentType: 'skin',
        reason: 'Skin detail (freckles/moles), not makeup'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'skin' }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'makeup',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-012: Fix Shoes contentType misclassifications
// ============================================================

async function fixShoesContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-012: Fix Shoes contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'shoes' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='shoes'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    const hasShoesIndicator = matchesPatterns(text, SHOES_PATTERNS);

    // Check for socks (could be accessories)
    if (/\bsocks?\b/i.test(text) && !hasShoesIndicator) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'shoes',
        newContentType: 'accessories',
        reason: 'Socks are accessories, not shoes'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'accessories' }
      });
      continue;
    }

    if (!hasShoesIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'shoes') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'shoes',
          newContentType: correctType,
          reason: `No shoes indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'shoes',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-013: Fix Jewelry contentType misclassifications
// ============================================================

async function fixJewelryContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-013: Fix Jewelry contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'jewelry' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='jewelry'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for watches (could be accessories)
    if (/\bwatch\b/i.test(text) && !matchesPatterns(text, JEWELRY_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'jewelry',
        newContentType: 'accessories',
        reason: 'Watch is accessory, not jewelry'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'accessories' }
      });
      continue;
    }

    const hasJewelryIndicator = matchesPatterns(text, JEWELRY_PATTERNS);
    if (!hasJewelryIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'jewelry') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'jewelry',
          newContentType: correctType,
          reason: `No jewelry indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'jewelry',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-014: Fix Skin contentType misclassifications
// ============================================================

async function fixSkinContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-014: Fix Skin contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'skin' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='skin'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for makeup misclassified as skin
    if (matchesPatterns(text, MAKEUP_PATTERNS) && !matchesPatterns(text, SKIN_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'skin',
        newContentType: 'makeup',
        reason: 'Makeup item, not skin'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'makeup' }
      });
      continue;
    }

    // Check for tattoos
    if (/\btattoo\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'skin',
        newContentType: 'tattoos',
        reason: 'Tattoo, not skin overlay'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'tattoos' }
      });
      continue;
    }

    const hasSkinIndicator = matchesPatterns(text, SKIN_PATTERNS);
    if (!hasSkinIndicator) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'skin') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'skin',
          newContentType: correctType,
          reason: `No skin indicator, detected as ${correctType}`
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
      }
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'skin',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-015: Fix Gameplay Mod contentType misclassifications
// ============================================================

async function fixGameplayModContentType(): Promise<ContentTypeStats> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CT-015: Fix Gameplay Mod contentType misclassifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: 'gameplay-mod' },
    select: { id: true, title: true, description: true, tags: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods with contentType='gameplay-mod'`);

  const changes: Change[] = [];

  for (const mod of mods) {
    const text = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for CAS items misclassified as gameplay mod
    if (matchesPatterns(text, HAIR_PATTERNS) || matchesPatterns(text, DRESS_PATTERNS) ||
        matchesPatterns(text, TOPS_PATTERNS) || matchesPatterns(text, SHOES_PATTERNS)) {
      const correctType = determineCorrectContentType(mod.title, mod.description || '', mod.tags);
      if (correctType && correctType !== 'gameplay-mod') {
        changes.push({
          modId: mod.id,
          title: mod.title,
          oldContentType: 'gameplay-mod',
          newContentType: correctType,
          reason: 'CAS item, not gameplay mod'
        });

        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: correctType }
        });
        continue;
      }
    }

    // Check for build/buy items
    if (matchesPatterns(text, FURNITURE_PATTERNS) || matchesPatterns(text, DECOR_PATTERNS)) {
      const correctType = matchesPatterns(text, FURNITURE_PATTERNS) ? 'furniture' : 'decor';
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'gameplay-mod',
        newContentType: correctType,
        reason: 'Build/buy item, not gameplay mod'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: correctType }
      });
      continue;
    }

    // Check for poses
    if (matchesPatterns(text, POSES_PATTERNS)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'gameplay-mod',
        newContentType: 'poses',
        reason: 'Pose pack, not gameplay mod'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'poses' }
      });
      continue;
    }

    // Check for presets
    if (/\bpreset\b/i.test(text)) {
      changes.push({
        modId: mod.id,
        title: mod.title,
        oldContentType: 'gameplay-mod',
        newContentType: 'preset',
        reason: 'Preset, not gameplay mod'
      });

      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: 'preset' }
      });
    }
  }

  console.log(`Fixed: ${changes.length} misclassified mods`);

  if (changes.length > 0) {
    console.log('\nSample changes:');
    changes.slice(0, 5).forEach(c => {
      console.log(`  - "${c.title.substring(0, 40)}..." → ${c.newContentType}`);
    });
  }

  return {
    contentType: 'gameplay-mod',
    audited: mods.length,
    fixed: changes.length,
    changes
  };
}

// ============================================================
// CT-016: Generate Summary Report
// ============================================================

function generateSummaryReport(stats: ContentTypeStats[]): void {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                  CONTENT TYPE CLEANUP SUMMARY REPORT                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  let totalAudited = 0;
  let totalFixed = 0;

  // Table header
  console.log('┌────────────────────┬──────────────┬──────────────┐');
  console.log('│ Content Type       │ Audited      │ Fixed        │');
  console.log('├────────────────────┼──────────────┼──────────────┤');

  for (const stat of stats) {
    const ctPadded = stat.contentType.padEnd(18);
    const auditedPadded = stat.audited.toString().padStart(12);
    const fixedPadded = stat.fixed.toString().padStart(12);
    console.log(`│ ${ctPadded} │${auditedPadded} │${fixedPadded} │`);
    totalAudited += stat.audited;
    totalFixed += stat.fixed;
  }

  console.log('├────────────────────┼──────────────┼──────────────┤');
  const totalPadded = 'TOTAL'.padEnd(18);
  const totalAuditedPadded = totalAudited.toString().padStart(12);
  const totalFixedPadded = totalFixed.toString().padStart(12);
  console.log(`│ ${totalPadded} │${totalAuditedPadded} │${totalFixedPadded} │`);
  console.log('└────────────────────┴──────────────┴──────────────┘\n');

  // Calculate accuracy improvement
  const accuracyImprovement = totalAudited > 0 ? ((totalFixed / totalAudited) * 100).toFixed(2) : '0';
  console.log(`Accuracy Improvement: ${accuracyImprovement}% of audited mods were corrected`);

  // Collect all changes for pattern analysis
  const allChanges: Change[] = [];
  for (const stat of stats) {
    allChanges.push(...stat.changes);
  }

  // Find most common misclassification patterns
  const patternCounts = new Map<string, number>();
  for (const change of allChanges) {
    const pattern = `${change.oldContentType} → ${change.newContentType}`;
    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  }

  const topPatterns = Array.from(patternCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n--- Top 10 Most Common Misclassification Patterns ---');
  topPatterns.forEach(([pattern, count], i) => {
    console.log(`  ${i + 1}. ${pattern}: ${count} occurrences`);
  });

  // Save detailed report to file
  const reportPath = path.join(__dirname, 'content-type-cleanup-report.txt');
  const reportLines = [
    '═══════════════════════════════════════════════════════════════',
    '           CONTENT TYPE CLEANUP SUMMARY REPORT',
    `           Generated: ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════════════════════',
    '',
    'SUMMARY BY CONTENT TYPE:',
    '─────────────────────────────────────────────────────────────',
  ];

  for (const stat of stats) {
    reportLines.push(`${stat.contentType}: Audited ${stat.audited}, Fixed ${stat.fixed}`);
  }

  reportLines.push('');
  reportLines.push(`TOTAL: Audited ${totalAudited}, Fixed ${totalFixed}`);
  reportLines.push(`Accuracy Improvement: ${accuracyImprovement}%`);
  reportLines.push('');
  reportLines.push('TOP 10 MISCLASSIFICATION PATTERNS:');
  reportLines.push('─────────────────────────────────────────────────────────────');

  topPatterns.forEach(([pattern, count], i) => {
    reportLines.push(`${i + 1}. ${pattern}: ${count} occurrences`);
  });

  reportLines.push('');
  reportLines.push('ALL CHANGES MADE:');
  reportLines.push('─────────────────────────────────────────────────────────────');

  for (const change of allChanges) {
    reportLines.push(`[${change.modId}] "${change.title.substring(0, 50)}..."`);
    reportLines.push(`  ${change.oldContentType} → ${change.newContentType}: ${change.reason}`);
    reportLines.push('');
  }

  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// ============================================================
// Main execution
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║             CONTENT TYPE DEEP CLEANUP - FULL EXECUTION               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Run all content type fixes
    allStats.push(await fixHairContentType());
    allStats.push(await fixTopsContentType());
    allStats.push(await fixDressesContentType());
    allStats.push(await fixFullBodyContentType());
    allStats.push(await fixBottomsContentType());
    allStats.push(await fixAccessoriesContentType());
    allStats.push(await fixFurnitureContentType());
    allStats.push(await fixDecorContentType());
    allStats.push(await fixLotContentType());
    allStats.push(await fixPosesContentType());
    allStats.push(await fixMakeupContentType());
    allStats.push(await fixShoesContentType());
    allStats.push(await fixJewelryContentType());
    allStats.push(await fixSkinContentType());
    allStats.push(await fixGameplayModContentType());

    // Generate summary report (CT-016)
    generateSummaryReport(allStats);

    console.log('\n✅ All content type cleanup tasks completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
