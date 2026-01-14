#!/usr/bin/env npx tsx
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allMods = await prisma.mod.findMany({
    select: { id: true, title: true, genderOptions: true, contentType: true, description: true }
  });

  console.log('Total mods:', allMods.length);

  // How many have both masculine AND feminine?
  const bothMascFem = allMods.filter(m =>
    m.genderOptions.includes('masculine') && m.genderOptions.includes('feminine')
  );

  console.log('\nMods with BOTH masculine AND feminine:', bothMascFem.length);
  console.log('\nSamples:');
  bothMascFem.slice(0, 30).forEach(m => {
    console.log('  [' + (m.contentType || '?').padEnd(12) + '] ' + m.title.slice(0, 50));
  });

  // Check contentType mismatches - recipes
  const badRecipes = allMods.filter(m => {
    const title = m.title.toLowerCase();
    return title.includes('recipe') && m.contentType !== 'gameplay-mod' && m.contentType !== null;
  });
  console.log('\n\nRecipes with wrong contentType:', badRecipes.length);
  badRecipes.slice(0, 10).forEach(m => {
    console.log('  [' + (m.contentType || '?').padEnd(12) + '] ' + m.title);
  });

  // Check contentType mismatches - fireplaces
  const badFireplaces = allMods.filter(m => {
    const title = m.title.toLowerCase();
    const goodTypes = ['decor', 'furniture', 'lot', null];
    return title.includes('fireplace') && !goodTypes.includes(m.contentType);
  });
  console.log('\nFireplaces with wrong contentType:', badFireplaces.length);
  badFireplaces.slice(0, 10).forEach(m => {
    console.log('  [' + (m.contentType || '?').padEnd(12) + '] ' + m.title);
  });

  // Check jewelry that looks wrong
  const badJewelry = allMods.filter(m => {
    const title = m.title.toLowerCase();
    const notJewelry = ['house', 'lamp', 'light', 'recipe', 'mod', 'room', 'wall', 'decor', 'farmhouse', 'cooking', 'streamer'];
    return m.contentType === 'jewelry' && notJewelry.some(kw => title.includes(kw));
  });
  console.log('\nFalse "jewelry" items:', badJewelry.length);
  badJewelry.slice(0, 15).forEach(m => {
    console.log('  ' + m.title);
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
