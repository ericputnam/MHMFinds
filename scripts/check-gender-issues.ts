#!/usr/bin/env npx tsx
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all mods that have 'masculine' in genderOptions
  const masculineMods = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, genderOptions: true, description: true },
    orderBy: { title: 'asc' }
  });

  console.log('Total mods with masculine:', masculineMods.length);

  // Find ones that look feminine - use word boundaries to avoid false positives
  const femininePatterns = [
    /\bdress\b/i,
    /\bgown\b/i,
    /\bskirt\b/i,
    /\bblouse\b/i,
    /\bcorset\b/i,
    /\bbustier\b/i,
    /\bbikini\b/i,
    /\blingerie\b/i,
    /\bheels\b/i,
    /\bfemale\b/i,
    /\bwomen\b/i,
    /\bwoman\b/i,
    /\bgirl\b/i,
    /\bgirls\b/i,
    /\bfeminine\b/i,
    /\bpregnancy\b/i,
    /\bpregnant\b/i,
    /\bmaternity\b/i,
    /\bbridal\b/i,
    /\bbride\b/i,
    /\bprincess\b/i,
    /\bqueen\b/i,
    /\bgoddess\b/i,
  ];

  const malePatterns = [
    /\bmale\b/i,        // "male" but not "female"
    /\bmen's\b/i,
    /\bmens\b/i,
    /\bfor men\b/i,
    /\bmasculine\b/i,
    /\bboy\b/i,
    /\bboys\b/i,
    /\bguy\b/i,
    /\bguys\b/i,
    /\bbeard/i,
    /\bstubble\b/i,
    /\bmustache\b/i,
  ];

  const suspects = masculineMods.filter(m => {
    const title = m.title;
    // Has feminine keyword but no male keyword
    const hasFem = femininePatterns.some(p => p.test(title));
    const hasMale = malePatterns.some(p => p.test(title));
    return hasFem && !hasMale;
  });

  console.log('\nSuspect mods (feminine keywords but marked masculine):', suspects.length);
  console.log('\n');
  suspects.forEach(m => {
    console.log(`  - "${m.title}" | [${m.genderOptions.join(', ')}]`);
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
