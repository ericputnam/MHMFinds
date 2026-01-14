#!/usr/bin/env npx tsx
/**
 * Vision-Based Facet Migration Script
 *
 * This script re-processes all mods using the vision-based facet extractor
 * to fix the poor accuracy of the previous text-only extraction.
 *
 * Prerequisites:
 * 1. Ollama installed and running: https://ollama.ai
 * 2. Vision model pulled: `ollama pull llama3.2-vision`
 *
 * Usage:
 *   npx tsx scripts/migrate-with-vision.ts                    # Process all mods
 *   npx tsx scripts/migrate-with-vision.ts --test             # Test with 10 mods
 *   npx tsx scripts/migrate-with-vision.ts --clear            # Clear existing facets first
 *   npx tsx scripts/migrate-with-vision.ts --batch=50         # Set batch size
 *   npx tsx scripts/migrate-with-vision.ts --skip=100         # Skip first N mods (resume)
 *   npx tsx scripts/migrate-with-vision.ts --only-empty       # Only process mods without contentType
 *   npx tsx scripts/migrate-with-vision.ts --text-only        # Use text-only extraction (no vision)
 */

import { PrismaClient } from '@prisma/client';
import { VisionFacetExtractor } from '../lib/services/visionFacetExtractor.js';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const shouldClear = args.includes('--clear');
const onlyEmpty = args.includes('--only-empty');
const textOnly = args.includes('--text-only');
const batchArg = args.find(a => a.startsWith('--batch='));
const skipArg = args.find(a => a.startsWith('--skip='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;
const skipCount = skipArg ? parseInt(skipArg.split('=')[1]) : 0;

// Stats tracking
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  visionUsed: 0,
  textFallback: 0,
  startTime: Date.now(),
};

async function checkOllamaConnection(): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    const models = data.models || [];
    const hasVisionModel = models.some((m: any) =>
      m.name.includes('llama3.2-vision') || m.name.includes('llava')
    );

    if (!hasVisionModel) {
      console.error('\n❌ No vision model found!');
      console.error('   Install with: ollama pull llama3.2-vision');
      console.error('   Or: ollama pull llava\n');
      return false;
    }

    console.log(`✅ Ollama connected at ${ollamaUrl}`);
    console.log(`   Vision models: ${models.filter((m: any) =>
      m.name.includes('vision') || m.name.includes('llava')
    ).map((m: any) => m.name).join(', ')}`);

    return true;
  } catch (error) {
    console.error('\n❌ Cannot connect to Ollama!');
    console.error('   Make sure Ollama is running: ollama serve');
    console.error(`   Tried: ${ollamaUrl}\n`);
    return false;
  }
}

async function clearFacets() {
  console.log('\n🗑️  Clearing existing facet data...');

  const result = await prisma.mod.updateMany({
    data: {
      contentType: null,
      visualStyle: null,
      themes: [],
      ageGroups: [],
      genderOptions: [],
    },
  });

  console.log(`   Cleared facets from ${result.count} mods\n`);
}

async function processMod(
  mod: { id: string; title: string; description: string | null; thumbnail: string | null; tags: string[]; category: string | null },
  extractor: VisionFacetExtractor,
  useVision: boolean
): Promise<boolean> {
  try {
    let facets;

    if (useVision && mod.thumbnail) {
      try {
        facets = await extractor.extractFacets(
          mod.thumbnail,
          mod.title,
          mod.description,
          mod.tags,
          mod.category
        );
        stats.visionUsed++;
      } catch (visionError) {
        // Fall back to text-only
        facets = await extractor.extractFacets(
          null,
          mod.title,
          mod.description,
          mod.tags,
          mod.category
        );
        stats.textFallback++;
      }
    } else {
      // Text-only extraction
      facets = await extractor.extractFacets(
        null,
        mod.title,
        mod.description,
        mod.tags,
        mod.category
      );
      stats.textFallback++;
    }

    // Update the mod
    await prisma.mod.update({
      where: { id: mod.id },
      data: {
        contentType: facets.contentType,
        visualStyle: facets.visualStyle,
        themes: facets.themes,
        ageGroups: facets.ageGroups,
        genderOptions: facets.genderOptions,
      },
    });

    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${mod.title} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function printProgress() {
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.processed / (elapsed / 1000);
  const remaining = stats.total - stats.processed;
  const eta = remaining / rate * 1000;

  console.log(`\n📊 Progress: ${stats.processed}/${stats.total} (${((stats.processed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ✅ Success: ${stats.success}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   👁️  Vision: ${stats.visionUsed} | 📝 Text: ${stats.textFallback}`);
  console.log(`   ⏱️  Elapsed: ${formatDuration(elapsed)} | ETA: ${formatDuration(eta)}`);
  console.log(`   📈 Rate: ${rate.toFixed(2)} mods/sec\n`);
}

async function main() {
  console.log('\n🔮 Vision-Based Facet Migration');
  console.log('================================\n');

  // Configuration summary
  console.log('Configuration:');
  console.log(`   Mode: ${isTest ? 'TEST (10 mods)' : 'FULL'}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Skip first: ${skipCount}`);
  console.log(`   Only empty: ${onlyEmpty}`);
  console.log(`   Vision: ${textOnly ? 'DISABLED (text-only)' : 'ENABLED'}`);
  console.log(`   Clear first: ${shouldClear}`);

  // Check Ollama if using vision
  if (!textOnly) {
    const ollamaOk = await checkOllamaConnection();
    if (!ollamaOk) {
      console.log('\n💡 You can run with --text-only to skip vision analysis\n');
      process.exit(1);
    }
  }

  // Clear existing facets if requested
  if (shouldClear) {
    await clearFacets();
  }

  // Build the query
  const whereClause: any = {};
  if (onlyEmpty) {
    whereClause.contentType = null;
  }

  // Get total count
  const totalCount = await prisma.mod.count({ where: whereClause });
  const limit = isTest ? 10 : totalCount;
  stats.total = Math.min(limit, totalCount - skipCount);

  console.log(`\n📦 Found ${totalCount} mods, processing ${stats.total} (skip=${skipCount})\n`);

  if (stats.total === 0) {
    console.log('No mods to process!');
    await prisma.$disconnect();
    return;
  }

  // Create the extractor
  const extractor = new VisionFacetExtractor();

  // Process in batches
  let offset = skipCount;

  while (stats.processed < stats.total) {
    const mods = await prisma.mod.findMany({
      where: whereClause,
      skip: offset,
      take: batchSize,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        tags: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (mods.length === 0) break;

    console.log(`\n🔄 Processing batch (${offset + 1} - ${offset + mods.length})...`);

    for (const mod of mods) {
      // Skip if already has contentType and onlyEmpty is false
      // (this shouldn't happen due to query, but safety check)

      const shortTitle = mod.title.length > 50 ? mod.title.substring(0, 50) + '...' : mod.title;
      process.stdout.write(`   ${stats.processed + 1}. ${shortTitle}... `);

      const success = await processMod(mod, extractor, !textOnly);
      stats.processed++;

      if (success) {
        stats.success++;
        console.log('✅');
      } else {
        stats.failed++;
        console.log('❌');
      }

      // Small delay to avoid overwhelming the API
      if (!textOnly) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    offset += mods.length;
    printProgress();

    // Longer delay between batches when using vision
    if (!textOnly && stats.processed < stats.total) {
      console.log('   ⏳ Cooling down...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  console.log('\n========================================');
  console.log('🎉 Migration Complete!');
  console.log('========================================');
  console.log(`   Total processed: ${stats.processed}`);
  console.log(`   Successful: ${stats.success}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Vision used: ${stats.visionUsed}`);
  console.log(`   Text fallback: ${stats.textFallback}`);
  console.log(`   Total time: ${formatDuration(Date.now() - stats.startTime)}`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\n💥 Migration failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
