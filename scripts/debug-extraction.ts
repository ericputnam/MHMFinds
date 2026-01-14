#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function matchesAny(text: string, phrases: string[]): boolean {
  return phrases.some(phrase => text.includes(phrase.toLowerCase()));
}

async function main() {
  const mod = await prisma.mod.findFirst({
    where: { title: 'Christmas Freestyle Nail Set' },
    select: { id: true, title: true, description: true, tags: true, category: true }
  });

  if (!mod) {
    console.log('NOT FOUND');
    return;
  }

  const parts: string[] = [];
  parts.push(`TITLE: ${mod.title}`);
  if (mod.description) {
    const cleanDesc = mod.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
    parts.push(`DESCRIPTION: ${cleanDesc}`);
  }
  if (mod.tags.length > 0) {
    parts.push(`EXISTING TAGS: ${mod.tags.join(', ')}`);
  }
  if (mod.category) {
    parts.push(`EXISTING CATEGORY: ${mod.category}`);
  }

  const text = parts.join('\n').toLowerCase();

  console.log('=== TEXT CONTEXT ===');
  console.log(text);
  console.log('');
  console.log('=== ORDER CHECK ===');

  // Check tops first (in order)
  const topsWords = ['sweater', 'sweaters', 'hoodie', 'hoodies', 'cardigan', 'shirt', 'top ', ' top', 'tops', 'blouse', 'jacket', 'coat', 'tshirt', 't-shirt', 'tank top', 'crop top', 'tee '];
  for (const word of topsWords) {
    if (text.includes(word)) {
      const idx = text.indexOf(word);
      console.log(`TOPS MATCH: '${word}' at: '${text.substring(Math.max(0, idx - 10), idx + word.length + 10)}'`);
    }
  }

  // Check nails
  const nailsWords = ['nails', 'nail polish', 'manicure', 'nail art', 'nail set', 'fingernail'];
  for (const word of nailsWords) {
    if (text.includes(word)) {
      console.log(`NAILS MATCH: '${word}'`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
