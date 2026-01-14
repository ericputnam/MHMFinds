#!/usr/bin/env npx tsx
/**
 * FC-002: Remove gender from non-clothing items
 *
 * Non-clothing items (furniture, food, gameplay-mod, etc.) should not have gender.
 * This script identifies mods where contentType is NOT clothing-related and
 * sets their genderOptions to an empty array.
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

async function removeGenderFromNonClothing() {
  console.log('🔧 FC-002: Remove gender from non-clothing items\n');

  // Find all non-clothing mods that have gender set
  const modsToFix = await prisma.mod.findMany({
    where: {
      AND: [
        { genderOptions: { isEmpty: false } },
        {
          OR: [
            { contentType: null },
            { contentType: { notIn: CLOTHING_CONTENT_TYPES } }
          ]
        }
      ]
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      genderOptions: true
    }
  });

  console.log(`Found ${modsToFix.length} non-clothing mods with gender set:\n`);

  // Log details of each mod before fixing
  for (const mod of modsToFix) {
    console.log(`  - "${mod.title.substring(0, 50)}..." (${mod.contentType || 'null'}) [${mod.genderOptions.join(', ')}]`);
  }

  if (modsToFix.length === 0) {
    console.log('\n✅ No non-clothing mods with gender found. Nothing to fix.');
    await prisma.$disconnect();
    return;
  }

  // Update all matching mods to have empty genderOptions
  const modIds = modsToFix.map(m => m.id);

  const result = await prisma.mod.updateMany({
    where: {
      id: { in: modIds }
    },
    data: {
      genderOptions: []
    }
  });

  console.log(`\n✅ Updated ${result.count} mods - removed gender from non-clothing items`);

  // Verify the fix
  const remainingBad = await prisma.mod.count({
    where: {
      AND: [
        { genderOptions: { isEmpty: false } },
        {
          OR: [
            { contentType: null },
            { contentType: { notIn: CLOTHING_CONTENT_TYPES } }
          ]
        }
      ]
    }
  });

  console.log(`\n📊 Verification: ${remainingBad} non-clothing mods with gender remaining (should be 0)`);

  await prisma.$disconnect();
}

removeGenderFromNonClothing().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
