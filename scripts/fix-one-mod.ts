#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { VisionFacetExtractor } from '../lib/services/visionFacetExtractor.js';

const prisma = new PrismaClient();
const extractor = new VisionFacetExtractor();

async function main() {
  const titles = ['Christmas Lingerie Set', 'Christmas Freestyle Nail Set'];

  for (const title of titles) {
    const mod = await prisma.mod.findFirst({
      where: { title },
      select: { id: true, title: true, description: true, tags: true, category: true, contentType: true }
    });

    if (!mod) {
      console.log(`${title}: NOT FOUND`);
      continue;
    }

    console.log(`\n${title}:`);
    console.log(`  Before: ${mod.contentType}`);
    console.log(`  Tags: ${mod.tags.join(', ')}`);
    console.log(`  Category: ${mod.category}`);

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
    console.log(`  After: ${updated?.contentType}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
