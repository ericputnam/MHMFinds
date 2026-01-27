#!/usr/bin/env npx tsx
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

const CLOTHING_TYPES = ['hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes', 'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails', 'tattoos', 'glasses', 'hats'];

async function check() {
  console.log('Gender status by content type:\n');

  for (const ct of CLOTHING_TYPES) {
    const total = await prisma.mod.count({ where: { contentType: ct } });
    const emptyGender = await prisma.mod.count({
      where: { contentType: ct, genderOptions: { isEmpty: true } }
    });

    if (total > 0) {
      const pct = ((emptyGender / total) * 100).toFixed(1);
      console.log(`  ${ct}: ${emptyGender}/${total} empty (${pct}%)`);
    }
  }

  // Check what the existing gender distributions look like for dresses
  const dresses = await prisma.mod.findMany({
    where: { contentType: 'dresses', genderOptions: { isEmpty: false } },
    select: { genderOptions: true }
  });
  console.log('\nDresses with gender set - distribution:');
  const genderCounts: Record<string, number> = {};
  for (const d of dresses) {
    const key = d.genderOptions.sort().join(',') || 'empty';
    genderCounts[key] = (genderCounts[key] || 0) + 1;
  }
  console.log(genderCounts);

  // Check hair
  const hair = await prisma.mod.findMany({
    where: { contentType: 'hair', genderOptions: { isEmpty: false } },
    select: { genderOptions: true }
  });
  console.log('\nHair with gender set - distribution:');
  const hairCounts: Record<string, number> = {};
  for (const h of hair) {
    const key = h.genderOptions.sort().join(',') || 'empty';
    hairCounts[key] = (hairCounts[key] || 0) + 1;
  }
  console.log(hairCounts);

  await prisma.$disconnect();
}
check();
