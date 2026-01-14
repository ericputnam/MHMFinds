#!/usr/bin/env npx tsx
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEM_PATTERNS = [
  /\bfemale\b/i, /\bdress\b/i, /\bgown\b/i, /\bskirt\b/i, /\bblouse\b/i,
  /\bwomen\b/i, /\bwoman\b/i, /\bgirl\b/i, /\bgirls\b/i, /\bfeminine\b/i,
  /\bheels\b/i, /\bearring/i, /\bnecklace\b/i, /\bbracelet\b/i,
  /\blipstick\b/i, /\bmascara\b/i, /\beyeshadow\b/i, /\beyeliner\b/i,
  /\bbikini\b/i, /\bswimsuit\b/i, /\blingerie\b/i, /\bcorset\b/i,
  /\bbow\b/i, /\bpearl\b/i, /\bprincess\b/i, /\bqueen\b/i,
  /\bsanta\s+dress/i, /\bchristmas\s+dress/i, /\bholiday\s+dress/i,
];

const MALE_PATTERNS = [
  /\bmale\b/i, /\bmen's\b/i, /\bmens\b/i, /\bmasculine\b/i,
  /\bbeard/i, /\bstubble\b/i, /\bfor men\b/i, /\bfor guys\b/i,
];

function hasFem(text: string): boolean {
  return FEM_PATTERNS.some(p => p.test(text));
}

function hasMale(text: string): boolean {
  return MALE_PATTERNS.some(p => p.test(text));
}

async function main() {
  const items = await prisma.mod.findMany({
    where: { genderOptions: { has: 'masculine' } },
    select: { id: true, title: true, description: true, genderOptions: true }
  });

  console.log(`Checking ${items.length} items with masculine...`);

  const toFix: typeof items = [];
  for (const item of items) {
    const text = item.title + ' ' + (item.description || '');
    if (hasFem(text) && !hasMale(text)) {
      toFix.push(item);
    }
  }

  console.log(`Found ${toFix.length} items to fix`);

  for (const item of toFix.slice(0, 20)) {
    const femMatch = FEM_PATTERNS.find(p => p.test(item.title + ' ' + (item.description || '')));
    console.log(`  - ${item.title} (${femMatch?.source})`);
  }
  if (toFix.length > 20) console.log(`  ... and ${toFix.length - 20} more`);

  console.log('\nApplying fixes...');
  let fixed = 0;
  for (const item of toFix) {
    await prisma.mod.update({
      where: { id: item.id },
      data: { genderOptions: ['feminine'] }
    });
    fixed++;
  }

  console.log(`\nFixed ${fixed} items to feminine-only`);
  await prisma.$disconnect();
}

main().catch(console.error);
