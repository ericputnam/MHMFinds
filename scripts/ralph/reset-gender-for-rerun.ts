#!/usr/bin/env npx tsx
/**
 * Reset gender options to empty for clothing mods that were incorrectly set
 * so we can re-run FC-003 with the fixed detection logic.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLOTHING_CONTENT_TYPES = [
  'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes',
  'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails',
  'tattoos', 'glasses', 'hats'
];

async function reset() {
  console.log('Resetting gender options for re-run...\n');

  // Find all mods that have both masculine and feminine (likely incorrect)
  // These were probably set incorrectly due to 'female' containing 'male'
  const toReset = await prisma.mod.findMany({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      genderOptions: { hasEvery: ['masculine', 'feminine'] }
    },
    select: { id: true, genderOptions: true }
  });

  // Also find masculine-only items that might be wrong
  const mascOnly = await prisma.mod.findMany({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      genderOptions: { equals: ['masculine'] }
    },
    select: { id: true }
  });

  console.log(`Found ${toReset.length} mods with both genders (potentially incorrect)`);
  console.log(`Found ${mascOnly.length} mods with masculine only`);

  // Reset all to empty so we can re-run
  const allIds = [...toReset.map(m => m.id), ...mascOnly.map(m => m.id)];

  const result = await prisma.mod.updateMany({
    where: { id: { in: allIds } },
    data: { genderOptions: [] }
  });

  console.log(`Reset ${result.count} mods to empty genderOptions`);

  await prisma.$disconnect();
}

reset().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
