/**
 * SAFE PRODUCTION DEPLOYMENT SCRIPT FOR FACETED TAXONOMY
 *
 * This script deploys the faceted taxonomy system safely to production.
 * It performs all operations in a controlled manner with verification steps.
 *
 * Usage:
 *   npx ts-node scripts/deploy-facets-safely.ts --check     # Verify schema compatibility
 *   npx ts-node scripts/deploy-facets-safely.ts --schema    # Apply schema changes only
 *   npx ts-node scripts/deploy-facets-safely.ts --seed      # Seed facet definitions only
 *   npx ts-node scripts/deploy-facets-safely.ts --migrate   # Run data migration (batched)
 *   npx ts-node scripts/deploy-facets-safely.ts --all       # Full deployment (with confirmations)
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment - try .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  const prefix = {
    info: '  ',
    success: '✓ ',
    warn: '⚠ ',
    error: '✗ ',
  }[type];
  console.log(`${prefix}${message}`);
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// STEP 1: SCHEMA CHECK
// ============================================

async function checkSchema(): Promise<boolean> {
  console.log('\n========================================');
  console.log('  STEP 1: SCHEMA COMPATIBILITY CHECK');
  console.log('========================================\n');

  try {
    // Check if we can connect
    await prisma.$connect();
    log('Database connection successful', 'success');

    // Check if mods table exists and get current schema
    const modCount = await prisma.mod.count();
    log(`Found ${modCount} mods in database`, 'info');

    // Check if facet columns already exist
    const sampleMod = await prisma.mod.findFirst({
      select: {
        id: true,
        contentType: true,
        visualStyle: true,
        themes: true,
      },
    }).catch(() => null);

    if (sampleMod !== null) {
      log('Facet columns already exist in schema', 'success');

      // Check if any mods have facet data
      const modsWithFacets = await prisma.mod.count({
        where: {
          OR: [
            { contentType: { not: null } },
            { themes: { isEmpty: false } },
          ],
        },
      });

      log(`${modsWithFacets} mods already have facet data`, 'info');
    } else {
      log('Facet columns do not exist yet - schema push required', 'warn');
    }

    // Check if FacetDefinition table exists
    const facetDefCount = await prisma.facetDefinition.count().catch(() => -1);
    if (facetDefCount >= 0) {
      log(`FacetDefinition table exists with ${facetDefCount} entries`, 'success');
    } else {
      log('FacetDefinition table does not exist yet', 'warn');
    }

    return true;
  } catch (error) {
    log(`Schema check failed: ${error}`, 'error');
    return false;
  }
}

// ============================================
// STEP 2: SEED FACET DEFINITIONS
// ============================================

async function seedFacetDefinitions(): Promise<boolean> {
  console.log('\n========================================');
  console.log('  STEP 2: SEED FACET DEFINITIONS');
  console.log('========================================\n');

  // Import seed data inline to avoid module issues
  const FACET_SEEDS = [
    // Content Type - CAS
    { facetType: 'contentType', value: 'hair', displayName: 'Hair', icon: '💇', color: '#F472B6', sortOrder: 1 },
    { facetType: 'contentType', value: 'makeup', displayName: 'Makeup', icon: '💄', color: '#FB7185', sortOrder: 2 },
    { facetType: 'contentType', value: 'skin', displayName: 'Skin', icon: '✨', color: '#FBBF24', sortOrder: 3 },
    { facetType: 'contentType', value: 'eyes', displayName: 'Eyes', icon: '👁️', color: '#60A5FA', sortOrder: 4 },
    { facetType: 'contentType', value: 'tattoos', displayName: 'Tattoos', icon: '🖋️', color: '#6B7280', sortOrder: 5 },
    { facetType: 'contentType', value: 'nails', displayName: 'Nails', icon: '💅', color: '#EC4899', sortOrder: 6 },
    { facetType: 'contentType', value: 'tops', displayName: 'Tops', icon: '👕', color: '#8B5CF6', sortOrder: 10 },
    { facetType: 'contentType', value: 'bottoms', displayName: 'Bottoms', icon: '👖', color: '#3B82F6', sortOrder: 11 },
    { facetType: 'contentType', value: 'dresses', displayName: 'Dresses', icon: '👗', color: '#EC4899', sortOrder: 12 },
    { facetType: 'contentType', value: 'full-body', displayName: 'Full Body', icon: '🎽', color: '#10B981', sortOrder: 13 },
    { facetType: 'contentType', value: 'shoes', displayName: 'Shoes', icon: '👟', color: '#F97316', sortOrder: 14 },
    { facetType: 'contentType', value: 'accessories', displayName: 'Accessories', icon: '👜', color: '#A855F7', sortOrder: 20 },
    { facetType: 'contentType', value: 'jewelry', displayName: 'Jewelry', icon: '💎', color: '#06B6D4', sortOrder: 21 },
    { facetType: 'contentType', value: 'glasses', displayName: 'Glasses', icon: '👓', color: '#64748B', sortOrder: 22 },
    { facetType: 'contentType', value: 'hats', displayName: 'Hats', icon: '🎩', color: '#78716C', sortOrder: 23 },
    // Content Type - Build/Buy
    { facetType: 'contentType', value: 'furniture', displayName: 'Furniture', icon: '🛋️', color: '#92400E', sortOrder: 30 },
    { facetType: 'contentType', value: 'lighting', displayName: 'Lighting', icon: '💡', color: '#FCD34D', sortOrder: 31 },
    { facetType: 'contentType', value: 'decor', displayName: 'Decor', icon: '🖼️', color: '#F87171', sortOrder: 32 },
    { facetType: 'contentType', value: 'clutter', displayName: 'Clutter', icon: '📚', color: '#A78BFA', sortOrder: 33 },
    { facetType: 'contentType', value: 'kitchen', displayName: 'Kitchen', icon: '🍳', color: '#34D399', sortOrder: 34 },
    { facetType: 'contentType', value: 'bathroom', displayName: 'Bathroom', icon: '🛁', color: '#60A5FA', sortOrder: 35 },
    { facetType: 'contentType', value: 'outdoor', displayName: 'Outdoor', icon: '🌳', color: '#22C55E', sortOrder: 37 },
    { facetType: 'contentType', value: 'plants', displayName: 'Plants', icon: '🪴', color: '#4ADE80', sortOrder: 38 },
    // Content Type - Other
    { facetType: 'contentType', value: 'poses', displayName: 'Poses', icon: '🤸', color: '#F97316', sortOrder: 50 },
    { facetType: 'contentType', value: 'gameplay-mod', displayName: 'Gameplay Mod', icon: '🎮', color: '#6366F1', sortOrder: 52 },
    { facetType: 'contentType', value: 'script-mod', displayName: 'Script Mod', icon: '📜', color: '#8B5CF6', sortOrder: 53 },
    { facetType: 'contentType', value: 'trait', displayName: 'Trait', icon: '🏷️', color: '#14B8A6', sortOrder: 54 },
    { facetType: 'contentType', value: 'career', displayName: 'Career', icon: '💼', color: '#0EA5E9', sortOrder: 55 },
    { facetType: 'contentType', value: 'food', displayName: 'Food & Recipes', icon: '🍕', color: '#F59E0B', sortOrder: 56 },
    { facetType: 'contentType', value: 'lot', displayName: 'Lot', icon: '🏠', color: '#84CC16', sortOrder: 57 },
    // Visual Style
    { facetType: 'visualStyle', value: 'alpha', displayName: 'Alpha CC', icon: '✨', color: '#EC4899', sortOrder: 1 },
    { facetType: 'visualStyle', value: 'maxis-match', displayName: 'Maxis Match', icon: '🎨', color: '#8B5CF6', sortOrder: 2 },
    { facetType: 'visualStyle', value: 'semi-maxis', displayName: 'Semi-Maxis', icon: '🎭', color: '#6366F1', sortOrder: 3 },
    // Themes - Seasonal
    { facetType: 'themes', value: 'christmas', displayName: 'Christmas', icon: '🎄', color: '#DC2626', sortOrder: 1 },
    { facetType: 'themes', value: 'halloween', displayName: 'Halloween', icon: '🎃', color: '#F97316', sortOrder: 2 },
    { facetType: 'themes', value: 'valentines', displayName: "Valentine's", icon: '💕', color: '#EC4899', sortOrder: 3 },
    { facetType: 'themes', value: 'summer', displayName: 'Summer', icon: '☀️', color: '#FBBF24', sortOrder: 5 },
    { facetType: 'themes', value: 'fall', displayName: 'Fall', icon: '🍂', color: '#D97706', sortOrder: 6 },
    { facetType: 'themes', value: 'winter', displayName: 'Winter', icon: '❄️', color: '#60A5FA', sortOrder: 7 },
    { facetType: 'themes', value: 'spring', displayName: 'Spring', icon: '🌸', color: '#F472B6', sortOrder: 8 },
    // Themes - Aesthetics
    { facetType: 'themes', value: 'cottagecore', displayName: 'Cottagecore', icon: '🌾', color: '#A3E635', sortOrder: 10 },
    { facetType: 'themes', value: 'y2k', displayName: 'Y2K', icon: '💿', color: '#E879F9', sortOrder: 11 },
    { facetType: 'themes', value: 'goth', displayName: 'Goth', icon: '🖤', color: '#1F2937', sortOrder: 12 },
    { facetType: 'themes', value: 'modern', displayName: 'Modern', icon: '🏢', color: '#6B7280', sortOrder: 14 },
    { facetType: 'themes', value: 'vintage', displayName: 'Vintage', icon: '📻', color: '#D4A574', sortOrder: 15 },
    { facetType: 'themes', value: 'fantasy', displayName: 'Fantasy', icon: '🧙', color: '#7C3AED', sortOrder: 16 },
    { facetType: 'themes', value: 'romantic', displayName: 'Romantic', icon: '🌹', color: '#F43F5E', sortOrder: 18 },
    { facetType: 'themes', value: 'minimalist', displayName: 'Minimalist', icon: '⬜', color: '#E5E7EB', sortOrder: 19 },
    { facetType: 'themes', value: 'cozy', displayName: 'Cozy', icon: '🧸', color: '#FDE68A', sortOrder: 26 },
    // Age Groups
    { facetType: 'ageGroups', value: 'toddler', displayName: 'Toddler', icon: '🧒', color: '#FBBF24', sortOrder: 2 },
    { facetType: 'ageGroups', value: 'child', displayName: 'Child', icon: '👧', color: '#F97316', sortOrder: 3 },
    { facetType: 'ageGroups', value: 'teen', displayName: 'Teen', icon: '🧑', color: '#EF4444', sortOrder: 4 },
    { facetType: 'ageGroups', value: 'adult', displayName: 'Adult', icon: '🧑‍💼', color: '#8B5CF6', sortOrder: 6 },
    { facetType: 'ageGroups', value: 'elder', displayName: 'Elder', icon: '👵', color: '#6B7280', sortOrder: 7 },
    { facetType: 'ageGroups', value: 'all-ages', displayName: 'All Ages', icon: '👨‍👩‍👧‍👦', color: '#10B981', sortOrder: 8 },
    // Gender Options
    { facetType: 'genderOptions', value: 'masculine', displayName: 'Masculine', icon: '♂️', color: '#3B82F6', sortOrder: 1 },
    { facetType: 'genderOptions', value: 'feminine', displayName: 'Feminine', icon: '♀️', color: '#EC4899', sortOrder: 2 },
    { facetType: 'genderOptions', value: 'unisex', displayName: 'Unisex', icon: '⚧️', color: '#8B5CF6', sortOrder: 3 },
  ];

  try {
    let created = 0;
    let updated = 0;

    for (const seed of FACET_SEEDS) {
      const existing = await prisma.facetDefinition.findUnique({
        where: {
          facetType_value: {
            facetType: seed.facetType,
            value: seed.value,
          },
        },
      });

      if (existing) {
        await prisma.facetDefinition.update({
          where: { id: existing.id },
          data: {
            displayName: seed.displayName,
            icon: seed.icon,
            color: seed.color,
            sortOrder: seed.sortOrder,
          },
        });
        updated++;
      } else {
        await prisma.facetDefinition.create({ data: seed });
        created++;
      }
    }

    log(`Created ${created} new facet definitions`, 'success');
    log(`Updated ${updated} existing facet definitions`, 'success');

    return true;
  } catch (error) {
    log(`Failed to seed facet definitions: ${error}`, 'error');
    return false;
  }
}

// ============================================
// STEP 3: MIGRATE MOD DATA (BATCHED)
// ============================================

async function migrateModData(batchSize: number = 50): Promise<boolean> {
  console.log('\n========================================');
  console.log('  STEP 3: MIGRATE MOD DATA');
  console.log('========================================\n');

  // Dynamic import of the facet extractor
  const { aiFacetExtractor } = await import('../lib/services/aiFacetExtractor');

  try {
    // Count mods that need migration
    const totalMods = await prisma.mod.count();
    const modsWithFacets = await prisma.mod.count({
      where: { contentType: { not: null } },
    });
    const modsNeedingMigration = totalMods - modsWithFacets;

    log(`Total mods: ${totalMods}`, 'info');
    log(`Already have facets: ${modsWithFacets}`, 'info');
    log(`Need migration: ${modsNeedingMigration}`, 'info');

    if (modsNeedingMigration === 0) {
      log('No mods need migration!', 'success');
      return true;
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;
    let skip = 0;

    while (true) {
      // Get batch of mods without facets
      const mods = await prisma.mod.findMany({
        where: { contentType: null },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          tags: true,
        },
        take: batchSize,
        skip: 0, // Always take from start since we're filtering by contentType: null
      });

      if (mods.length === 0) break;

      for (const mod of mods) {
        try {
          const facets = await aiFacetExtractor.extractFacets(
            mod.title,
            mod.description,
            mod.tags,
            mod.category
          );

          if (facets.contentType || facets.themes.length > 0) {
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
            updated++;
          }

          processed++;

          // Rate limiting
          await sleep(30);
        } catch (error) {
          errors++;
          log(`Error processing mod ${mod.id}: ${error}`, 'error');
        }
      }

      // Progress update
      const pct = (((modsWithFacets + processed) / totalMods) * 100).toFixed(1);
      console.log(`  Progress: ${modsWithFacets + processed}/${totalMods} (${pct}%) - ${updated} updated, ${errors} errors`);

      // Safety check - stop if too many errors
      if (errors > 50) {
        log('Too many errors, stopping migration', 'error');
        return false;
      }
    }

    log(`Migration complete: ${updated} mods updated, ${errors} errors`, 'success');
    return true;
  } catch (error) {
    log(`Migration failed: ${error}`, 'error');
    return false;
  }
}

// ============================================
// MAIN DEPLOYMENT FLOW
// ============================================

async function main() {
  const args = process.argv.slice(2);

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  FACETED TAXONOMY - SAFE PRODUCTION DEPLOYMENT     ║');
  console.log('╚════════════════════════════════════════════════════╝');

  if (args.includes('--check')) {
    await checkSchema();
  } else if (args.includes('--seed')) {
    const ok = await checkSchema();
    if (ok) await seedFacetDefinitions();
  } else if (args.includes('--migrate')) {
    const ok = await checkSchema();
    if (ok) {
      const confirmed = await confirm('This will update mod data. Continue?');
      if (confirmed) {
        await migrateModData();
      } else {
        log('Migration cancelled', 'warn');
      }
    }
  } else if (args.includes('--all')) {
    // Full deployment with confirmations
    log('Starting full deployment...', 'info');

    // Step 1: Check
    const schemaOk = await checkSchema();
    if (!schemaOk) {
      log('Schema check failed. Please run: npx prisma db push', 'error');
      process.exit(1);
    }

    // Step 2: Seed (safe, always ok to run)
    const seedOk = await seedFacetDefinitions();
    if (!seedOk) {
      log('Seeding failed', 'error');
      process.exit(1);
    }

    // Step 3: Migrate (needs confirmation)
    const confirmed = await confirm('Ready to migrate mod data. This is safe but will take time. Continue?');
    if (confirmed) {
      await migrateModData();
    } else {
      log('Data migration skipped. You can run it later with --migrate', 'warn');
    }

    console.log('\n========================================');
    console.log('  DEPLOYMENT COMPLETE');
    console.log('========================================\n');
  } else {
    console.log(`
Usage:
  npx ts-node scripts/deploy-facets-safely.ts --check     # Verify schema
  npx ts-node scripts/deploy-facets-safely.ts --seed      # Seed facet definitions
  npx ts-node scripts/deploy-facets-safely.ts --migrate   # Migrate mod data
  npx ts-node scripts/deploy-facets-safely.ts --all       # Full deployment

Recommended order:
  1. npx prisma db push                              # Apply schema changes
  2. npx ts-node scripts/deploy-facets-safely.ts --check   # Verify
  3. npx ts-node scripts/deploy-facets-safely.ts --seed    # Seed definitions
  4. npx ts-node scripts/deploy-facets-safely.ts --migrate # Migrate data
`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
