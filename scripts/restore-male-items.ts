#!/usr/bin/env npx tsx
/**
 * Restore masculine gender to items that have "male" in title
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Restoring masculine to items with "male" in title...\n');

  // Find items with "male" in title that are currently feminine-only
  const maleItems = await prisma.mod.findMany({
    where: {
      title: { contains: 'male', mode: 'insensitive' },
      genderOptions: { equals: ['feminine'] },
      NOT: { title: { contains: 'female', mode: 'insensitive' } }
    },
    select: { id: true, title: true, genderOptions: true }
  });

  console.log(`Found ${maleItems.length} items with "male" incorrectly set to feminine-only\n`);

  for (const mod of maleItems) {
    console.log(`  Restoring: ${mod.title.slice(0, 50)}`);
    await prisma.mod.update({
      where: { id: mod.id },
      data: { genderOptions: ['masculine'] }
    });
  }

  console.log(`\n✅ Restored ${maleItems.length} items to masculine`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
