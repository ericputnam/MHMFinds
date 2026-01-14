#!/usr/bin/env npx tsx
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check descriptions of items with both genders
  const bothGender = await prisma.mod.findMany({
    where: {
      genderOptions: { hasEvery: ['masculine', 'feminine'] },
      contentType: { in: ['tops', 'full-body', 'shoes', 'jewelry', 'accessories'] }
    },
    select: { id: true, title: true, description: true, contentType: true, genderOptions: true },
    take: 100
  });

  console.log('Items with both genders - checking descriptions:\n');

  const femalePatterns = /\bfemale\b|\bwoman\b|\bwomen\b|\bgirl\b|\bher\b|\bshe\b|\bladies\b|\bfeminine\b/i;
  const malePatterns = /\bmale\b|\bman\b|\bmen\b|\bboy\b|\bhis\b|\bhe\b|\bguys\b|\bmasculine\b/i;

  const toFixFeminine: typeof bothGender = [];

  for (const m of bothGender) {
    const desc = (m.description || '').toLowerCase();
    const hasFemaleRef = femalePatterns.test(desc);
    const hasMaleRef = malePatterns.test(desc);

    if (hasFemaleRef && !hasMaleRef) {
      toFixFeminine.push(m);
      console.log(`[${m.contentType}] ${m.title.slice(0, 50)}`);
      console.log(`  DESC: ${desc.slice(0, 120)}...`);
      console.log('');
    }
  }

  console.log(`\n=== Found ${toFixFeminine.length} items to fix to feminine-only ===\n`);

  // Fix them
  if (toFixFeminine.length > 0) {
    console.log('Fixing...');
    for (const m of toFixFeminine) {
      await prisma.mod.update({
        where: { id: m.id },
        data: { genderOptions: ['feminine'] }
      });
    }
    console.log(`Fixed ${toFixFeminine.length} items`);
  }

  // Check remaining
  const remaining = await prisma.mod.count({
    where: { genderOptions: { hasEvery: ['masculine', 'feminine'] } }
  });
  console.log(`\nRemaining with both: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
