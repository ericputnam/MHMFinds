#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { VisionFacetExtractor } from '../lib/services/visionFacetExtractor.js';

const prisma = new PrismaClient();
const extractor = new VisionFacetExtractor();

async function main() {
  // Get all mods that need fixing
  const mods = await prisma.mod.findMany({
    where: {
      OR: [
        { title: 'Santa Sweaters' },
        { title: 'Infant Elf Sleeper' },
      ]
    },
    select: { id: true, title: true, description: true, tags: true, category: true, contentType: true }
  });

  console.log(`Found ${mods.length} mods to fix\n`);

  for (const mod of mods) {
    console.log(`${mod.title} (${mod.id.substring(0, 8)}...):`);
    console.log(`  Before: ${mod.contentType}`);

    const facets = await extractor.extractFacets(null, mod.title, mod.description, mod.tags, mod.category);
    console.log(`  Extracted: ${facets.contentType}`);

    await prisma.mod.update({
      where: { id: mod.id },
      data: {
        contentType: facets.contentType,
        visualStyle: facets.visualStyle,
        themes: facets.themes,
        ageGroups: facets.ageGroups,
        genderOptions: facets.genderOptions,
      }
    });

    const updated = await prisma.mod.findFirst({
      where: { id: mod.id },
      select: { contentType: true }
    });
    console.log(`  After: ${updated?.contentType}\n`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
