/**
 * Migration script: Convert categories/tags to faceted taxonomy
 *
 * Usage:
 *   npx ts-node scripts/migrate-to-facets.ts --test     # Test with 20 mods (no writes)
 *   npx ts-node scripts/migrate-to-facets.ts --dry-run  # Full dry run (no writes)
 *   npx ts-node scripts/migrate-to-facets.ts --run      # Full migration
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { aiFacetExtractor, ExtractedFacets, FACET_VALUES } from '../lib/services/aiFacetExtractor';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface MigrationStats {
  total: number;
  processed: number;
  updated: number;
  errors: number;
  facetCounts: {
    contentType: Record<string, number>;
    visualStyle: Record<string, number>;
    themes: Record<string, number>;
    ageGroups: Record<string, number>;
    genderOptions: Record<string, number>;
  };
}

const stats: MigrationStats = {
  total: 0,
  processed: 0,
  updated: 0,
  errors: 0,
  facetCounts: {
    contentType: {},
    visualStyle: {},
    themes: {},
    ageGroups: {},
    genderOptions: {},
  },
};

function updateStats(facets: ExtractedFacets) {
  if (facets.contentType) {
    stats.facetCounts.contentType[facets.contentType] =
      (stats.facetCounts.contentType[facets.contentType] || 0) + 1;
  }
  if (facets.visualStyle) {
    stats.facetCounts.visualStyle[facets.visualStyle] =
      (stats.facetCounts.visualStyle[facets.visualStyle] || 0) + 1;
  }
  facets.themes.forEach(t => {
    stats.facetCounts.themes[t] = (stats.facetCounts.themes[t] || 0) + 1;
  });
  facets.ageGroups.forEach(a => {
    stats.facetCounts.ageGroups[a] = (stats.facetCounts.ageGroups[a] || 0) + 1;
  });
  facets.genderOptions.forEach(g => {
    stats.facetCounts.genderOptions[g] = (stats.facetCounts.genderOptions[g] || 0) + 1;
  });
}

async function migrateMod(
  mod: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    tags: string[];
  },
  dryRun: boolean
): Promise<boolean> {
  try {
    // Extract facets
    const facets = await aiFacetExtractor.extractFacets(
      mod.title,
      mod.description,
      mod.tags,
      mod.category
    );

    updateStats(facets);

    // Skip if no meaningful facets extracted
    if (!facets.contentType && facets.themes.length === 0) {
      return false;
    }

    if (!dryRun) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: {
          contentType: facets.contentType,
          visualStyle: facets.visualStyle,
          themes: facets.themes,
          ageGroups: facets.ageGroups,
          genderOptions: facets.genderOptions,
          occultTypes: facets.occultTypes,
          packRequirements: facets.packRequirements,
        },
      });
    }

    return true;
  } catch (error) {
    console.error(`  Error processing mod ${mod.id}:`, error);
    return false;
  }
}

async function runMigration(options: { test?: boolean; dryRun?: boolean }) {
  const { test = false, dryRun = false } = options;

  console.log('\n========================================');
  console.log('  FACET MIGRATION');
  console.log('========================================');
  console.log(`Mode: ${test ? 'TEST (20 mods)' : dryRun ? 'DRY RUN' : 'FULL MIGRATION'}`);
  console.log('');

  // Get mods to process
  const limit = test ? 20 : undefined;
  const mods = await prisma.mod.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      tags: true,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  stats.total = mods.length;
  console.log(`Processing ${mods.length} mods...\n`);

  const BATCH_SIZE = 10;
  for (let i = 0; i < mods.length; i += BATCH_SIZE) {
    const batch = mods.slice(i, i + BATCH_SIZE);

    for (const mod of batch) {
      const updated = await migrateMod(mod, dryRun || test);
      stats.processed++;

      if (updated) {
        stats.updated++;
        if (test || stats.updated <= 10) {
          console.log(`  ✓ ${mod.title.substring(0, 50)}`);
        }
      }

      // Rate limiting for AI calls
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Progress update
    const pct = ((stats.processed / stats.total) * 100).toFixed(1);
    if (!test && stats.processed % 100 === 0) {
      console.log(`  Progress: ${stats.processed}/${stats.total} (${pct}%)`);
    }
  }

  // Print results
  console.log('\n========================================');
  console.log('  MIGRATION RESULTS');
  console.log('========================================');
  console.log(`Total mods:     ${stats.total}`);
  console.log(`Processed:      ${stats.processed}`);
  console.log(`Updated:        ${stats.updated}`);
  console.log(`Errors:         ${stats.errors}`);

  console.log('\n--- Content Type Distribution ---');
  const sortedContentTypes = Object.entries(stats.facetCounts.contentType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  sortedContentTypes.forEach(([type, count]) => {
    console.log(`  ${type.padEnd(20)} ${count}`);
  });

  console.log('\n--- Visual Style Distribution ---');
  Object.entries(stats.facetCounts.visualStyle)
    .sort((a, b) => b[1] - a[1])
    .forEach(([style, count]) => {
      console.log(`  ${style.padEnd(20)} ${count}`);
    });

  console.log('\n--- Top Themes ---');
  const sortedThemes = Object.entries(stats.facetCounts.themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  sortedThemes.forEach(([theme, count]) => {
    console.log(`  ${theme.padEnd(20)} ${count}`);
  });

  console.log('\n--- Age Groups ---');
  Object.entries(stats.facetCounts.ageGroups)
    .sort((a, b) => b[1] - a[1])
    .forEach(([age, count]) => {
      console.log(`  ${age.padEnd(20)} ${count}`);
    });

  console.log('\n--- Gender Options ---');
  Object.entries(stats.facetCounts.genderOptions)
    .sort((a, b) => b[1] - a[1])
    .forEach(([gender, count]) => {
      console.log(`  ${gender.padEnd(20)} ${count}`);
    });

  if (dryRun || test) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
    console.log('   Run with --run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
  }

  await prisma.$disconnect();
}

// Parse arguments
const args = process.argv.slice(2);
if (args.includes('--test')) {
  runMigration({ test: true }).catch(console.error);
} else if (args.includes('--dry-run')) {
  runMigration({ dryRun: true }).catch(console.error);
} else if (args.includes('--run')) {
  runMigration({}).catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npx ts-node scripts/migrate-to-facets.ts --test     # Test with 20 mods');
  console.log('  npx ts-node scripts/migrate-to-facets.ts --dry-run  # Full dry run');
  console.log('  npx ts-node scripts/migrate-to-facets.ts --run      # Full migration');
}
