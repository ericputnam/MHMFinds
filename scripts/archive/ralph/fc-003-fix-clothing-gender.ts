#!/usr/bin/env npx tsx
/**
 * FC-003: Fix clothing gender using existing tags
 *
 * Uses tags, title, and description to correctly assign gender to clothing items.
 * Falls back to content type defaults (e.g., dresses -> feminine).
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clothing-related contentTypes that CAN have gender
const CLOTHING_CONTENT_TYPES = [
  'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes',
  'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails',
  'tattoos', 'glasses', 'hats'
];

// Gender keywords - using regex patterns to match whole words
// IMPORTANT: Order matters - check feminine before masculine to avoid 'female' matching 'male'
const FEMININE_PATTERNS = [
  /\bfemale\b/i,
  /\bwomen\b/i,
  /\bwoman\b/i,
  /\bfeminine\b/i,
  /\bgirls?\b/i,
  /\bladies\b/i,
  /\blady\b/i,
  /\bfemme\b/i,
  /\bfemale frame\b/i,
  /\bfeminine frame\b/i,
  /\bf frame\b/i,
  /\bfor females\b/i,
  /\bfor women\b/i,
  /\bfemale only\b/i,
];

const MASCULINE_PATTERNS = [
  /\bmale\b/i,
  /\bmen\b/i,
  /\bman\b/i,
  /\bmasculine\b/i,
  /\bboys?\b/i,
  /\bguys?\b/i,
  /\bmasc\b/i,
  /\bmale frame\b/i,
  /\bmasculine frame\b/i,
  /\bm frame\b/i,
  /\bfor males\b/i,
  /\bfor men\b/i,
  /\bmale only\b/i,
];

const UNISEX_PATTERNS = [
  /\bunisex\b/i,
  /\bboth frames\b/i,
  /\ball frames\b/i,
  /\bboth genders\b/i,
  /\bmale and female\b/i,
  /\bfemale and male\b/i,
  /\bmen and women\b/i,
  /\bwomen and men\b/i,
  /\ball genders\b/i,
];

// Content types that are typically feminine
const TYPICALLY_FEMININE_TYPES = ['dresses', 'nails'];

// Content types that are typically unisex (available to both)
const TYPICALLY_UNISEX_TYPES = ['makeup', 'skin', 'eyes', 'glasses', 'tattoos'];

/**
 * Determine gender from text content
 */
function detectGenderFromText(text: string): 'feminine' | 'masculine' | 'both' | null {
  // Check for unisex first
  if (UNISEX_PATTERNS.some(pattern => pattern.test(text))) {
    return 'both';
  }

  const hasFeminine = FEMININE_PATTERNS.some(pattern => pattern.test(text));
  const hasMasculine = MASCULINE_PATTERNS.some(pattern => pattern.test(text));

  if (hasFeminine && hasMasculine) return 'both';
  if (hasFeminine) return 'feminine';
  if (hasMasculine) return 'masculine';
  return null;
}

/**
 * Get gender options array from detection result
 */
function genderToOptions(gender: 'feminine' | 'masculine' | 'both' | null): string[] | null {
  switch (gender) {
    case 'feminine': return ['feminine'];
    case 'masculine': return ['masculine'];
    case 'both': return ['masculine', 'feminine'];
    default: return null;
  }
}

async function fixClothingGender() {
  console.log('🔧 FC-003: Fix clothing gender using existing tags\n');

  // Find all clothing mods with empty genderOptions
  const clothingMods = await prisma.mod.findMany({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      genderOptions: { isEmpty: true }
    },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      contentType: true
    }
  });

  console.log(`Found ${clothingMods.length} clothing mods with empty genderOptions\n`);

  const stats = {
    fromTags: 0,
    fromTitle: 0,
    fromDescription: 0,
    fromContentType: 0,
    unresolved: 0,
    feminine: 0,
    masculine: 0,
    both: 0
  };

  const updates: { id: string; genderOptions: string[]; source: string }[] = [];

  for (const mod of clothingMods) {
    let genderOptions: string[] | null = null;
    let source = '';

    // Priority 1: Check tags
    const tagsText = mod.tags.join(' ');
    const tagGender = detectGenderFromText(tagsText);
    if (tagGender) {
      genderOptions = genderToOptions(tagGender);
      source = 'tags';
      stats.fromTags++;
    }

    // Priority 2: Check title
    if (!genderOptions && mod.title) {
      const titleGender = detectGenderFromText(mod.title);
      if (titleGender) {
        genderOptions = genderToOptions(titleGender);
        source = 'title';
        stats.fromTitle++;
      }
    }

    // Priority 3: Check description
    if (!genderOptions && mod.description) {
      const descGender = detectGenderFromText(mod.description);
      if (descGender) {
        genderOptions = genderToOptions(descGender);
        source = 'description';
        stats.fromDescription++;
      }
    }

    // Priority 4: Fall back to content type defaults
    if (!genderOptions && mod.contentType) {
      if (TYPICALLY_FEMININE_TYPES.includes(mod.contentType)) {
        genderOptions = ['feminine'];
        source = 'contentType-default';
        stats.fromContentType++;
      } else if (TYPICALLY_UNISEX_TYPES.includes(mod.contentType)) {
        // For makeup/skin/eyes, they're often unisex in Sims 4
        // but we can't be sure without explicit indication
        // Leave them empty for now to be safe
      }
    }

    if (genderOptions) {
      updates.push({ id: mod.id, genderOptions, source });

      // Track gender distribution
      if (genderOptions.length === 1) {
        if (genderOptions[0] === 'feminine') stats.feminine++;
        else if (genderOptions[0] === 'masculine') stats.masculine++;
      } else if (genderOptions.length >= 2) {
        stats.both++;
      }
    } else {
      stats.unresolved++;
    }
  }

  console.log('--- Update Summary ---');
  console.log(`  From tags: ${stats.fromTags}`);
  console.log(`  From title: ${stats.fromTitle}`);
  console.log(`  From description: ${stats.fromDescription}`);
  console.log(`  From content type default: ${stats.fromContentType}`);
  console.log(`  Unresolved (left empty): ${stats.unresolved}`);
  console.log('');
  console.log('--- Gender Distribution ---');
  console.log(`  Feminine only: ${stats.feminine}`);
  console.log(`  Masculine only: ${stats.masculine}`);
  console.log(`  Both (unisex): ${stats.both}`);
  console.log('');

  // Apply updates in batches
  console.log(`Applying ${updates.length} updates...`);

  let updated = 0;
  for (const update of updates) {
    await prisma.mod.update({
      where: { id: update.id },
      data: { genderOptions: update.genderOptions }
    });
    updated++;

    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated}/${updates.length}`);
    }
  }

  console.log(`\n✅ Updated ${updated} mods`);

  // Verify results
  const remainingEmpty = await prisma.mod.count({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      genderOptions: { isEmpty: true }
    }
  });

  console.log(`\n📊 Clothing mods with empty genderOptions remaining: ${remainingEmpty}`);

  // Show sample of unresolved items
  if (stats.unresolved > 0) {
    console.log('\n--- Sample Unresolved Items ---');
    const unresolved = await prisma.mod.findMany({
      where: {
        contentType: { in: CLOTHING_CONTENT_TYPES },
        genderOptions: { isEmpty: true }
      },
      select: { title: true, contentType: true },
      take: 10
    });
    for (const mod of unresolved) {
      console.log(`  - "${mod.title?.substring(0, 50)}..." (${mod.contentType})`);
    }
  }

  await prisma.$disconnect();
}

fixClothingGender().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
