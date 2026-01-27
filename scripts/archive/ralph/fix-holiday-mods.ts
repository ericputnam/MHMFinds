#!/usr/bin/env npx tsx
/**
 * Fix Holiday Mods Script
 *
 * Creates a 'holidays' FacetDefinition for contentType and recategorizes
 * mods that contain holiday keywords in their title/description.
 *
 * Holiday Keywords:
 * - NYE, New Year, New Years
 * - Christmas, Xmas
 * - Halloween
 * - Valentine, Valentines
 * - Easter
 * - Thanksgiving
 * - Holiday, Holidays
 * - Festive
 * - Winter Holiday, Summer Holiday
 *
 * Usage:
 *   npx tsx scripts/ralph/fix-holiday-mods.ts         # Dry run (preview changes)
 *   npx tsx scripts/ralph/fix-holiday-mods.ts --fix   # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--fix');

// Holiday keywords for SQL ILIKE patterns
const HOLIDAY_KEYWORDS = [
  // New Year
  'new year',
  'new years',
  "new year's",
  'nye',
  // Christmas
  'christmas',
  'xmas',
  'x-mas',
  // Halloween
  'halloween',
  // Valentine
  'valentine',
  'valentines',
  // Easter
  'easter',
  // Thanksgiving
  'thanksgiving',
  // Generic
  'holiday',
  'holidays',
  'festive',
];

interface HolidayMatch {
  id: string;
  title: string;
  currentContentType: string | null;
  matchedKeyword: string;
}

/**
 * Create the 'holidays' FacetDefinition if it doesn't exist
 */
async function createHolidaysFacet(): Promise<void> {
  console.log('Creating/verifying holidays FacetDefinition...\n');

  const result = await prisma.facetDefinition.upsert({
    where: {
      facetType_value: {
        facetType: 'contentType',
        value: 'holidays',
      },
    },
    create: {
      facetType: 'contentType',
      value: 'holidays',
      displayName: 'Holidays',
      description: 'Holiday-themed content including Christmas, Halloween, Easter, and other festive items',
      icon: '🎉',
      color: '#EF4444', // red-500
      sortOrder: 50,
      isActive: true,
    },
    update: {},
  });

  console.log(`  FacetDefinition for 'holidays' contentType: ${result.displayName}`);
  console.log(`  ID: ${result.id}`);
  console.log(`  Sort Order: ${result.sortOrder}`);
  console.log(`  Active: ${result.isActive}`);
}

/**
 * Find mods with holiday keywords using database-level filtering
 */
async function findHolidayMods(): Promise<HolidayMatch[]> {
  console.log('\nSearching for mods with holiday keywords...\n');

  const holidayMods: HolidayMatch[] = [];
  const seenIds = new Set<string>();

  // Query for each keyword to avoid large result sets
  for (const keyword of HOLIDAY_KEYWORDS) {
    const pattern = `%${keyword}%`;

    const mods = await prisma.mod.findMany({
      where: {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        contentType: true,
      },
    });

    for (const mod of mods) {
      if (!seenIds.has(mod.id)) {
        seenIds.add(mod.id);
        holidayMods.push({
          id: mod.id,
          title: mod.title,
          currentContentType: mod.contentType,
          matchedKeyword: keyword,
        });
      }
    }
  }

  return holidayMods;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Fix Holiday Mods Script');
  console.log('='.repeat(70));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'FIX MODE (applying changes)'}`);
  console.log('='.repeat(70) + '\n');

  // Step 1: Create the holidays FacetDefinition
  if (!DRY_RUN) {
    await createHolidaysFacet();
  } else {
    console.log('[DRY RUN] Would create holidays FacetDefinition:');
    console.log('  facetType: contentType');
    console.log('  value: holidays');
    console.log('  displayName: Holidays');
    console.log('  sortOrder: 50');
    console.log('  isActive: true\n');
  }

  // Step 2: Find holiday mods
  const holidayMods = await findHolidayMods();

  console.log(`  Found ${holidayMods.length} mods with holiday keywords\n`);

  if (holidayMods.length === 0) {
    console.log('No holiday mods found. Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  // Group by current contentType for reporting
  const byContentType = new Map<string, HolidayMatch[]>();
  for (const mod of holidayMods) {
    const key = mod.currentContentType || 'null';
    if (!byContentType.has(key)) {
      byContentType.set(key, []);
    }
    byContentType.get(key)!.push(mod);
  }

  console.log('--- Breakdown by Current Content Type ---');
  byContentType.forEach((mods, contentType) => {
    console.log(`  ${contentType}: ${mods.length} mods`);
  });

  // Count how many already have 'holidays' contentType
  const alreadyHolidays = holidayMods.filter(m => m.currentContentType === 'holidays');
  const needsUpdate = holidayMods.filter(m => m.currentContentType !== 'holidays');

  console.log(`\n--- Update Summary ---`);
  console.log(`  Already have 'holidays' contentType: ${alreadyHolidays.length}`);
  console.log(`  Will be updated to 'holidays': ${needsUpdate.length}`);

  // Show sample of mods that will be updated
  console.log('\n--- Sample Mods to Update (first 20) ---');
  for (const mod of needsUpdate.slice(0, 20)) {
    const titlePreview = mod.title.length > 50
      ? mod.title.substring(0, 50) + '...'
      : mod.title;
    console.log(`\n  "${titlePreview}"`);
    console.log(`    Current: ${mod.currentContentType || 'null'} -> holidays`);
    console.log(`    Keyword: ${mod.matchedKeyword}`);
  }
  if (needsUpdate.length > 20) {
    console.log(`\n  ... and ${needsUpdate.length - 20} more mods`);
  }

  // Step 3: Apply updates (if not dry run)
  if (!DRY_RUN) {
    console.log('\n' + '='.repeat(70));
    console.log('APPLYING CHANGES');
    console.log('='.repeat(70) + '\n');

    // First ensure the facet exists
    await createHolidaysFacet();

    // Use a bulk update with updateMany for efficiency
    const modIds = needsUpdate.map(m => m.id);

    // Process in batches of 500 to avoid issues
    const BATCH_SIZE = 500;
    let updatedCount = 0;

    for (let i = 0; i < modIds.length; i += BATCH_SIZE) {
      const batch = modIds.slice(i, i + BATCH_SIZE);

      const result = await prisma.mod.updateMany({
        where: {
          id: { in: batch },
        },
        data: {
          contentType: 'holidays',
        },
      });

      updatedCount += result.count;
      console.log(`  Updated batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} mods (total: ${updatedCount})`);
    }

    console.log(`\n  Total mods updated: ${updatedCount}`);

    // Verification
    console.log('\n--- Verification ---');
    const finalCount = await prisma.mod.count({
      where: { contentType: 'holidays' },
    });
    console.log(`  Mods with contentType='holidays' in database: ${finalCount}`);
    console.log(`  Expected: ${alreadyHolidays.length + needsUpdate.length}`);

    if (finalCount === alreadyHolidays.length + needsUpdate.length) {
      console.log('  Verification PASSED');
    } else {
      console.log('  Verification FAILED - counts do not match');
    }
  } else {
    console.log('\n' + '='.repeat(70));
    console.log('DRY RUN COMPLETE');
    console.log('='.repeat(70));
    console.log('\nTo apply these changes, run with --fix flag:');
    console.log('  npx tsx scripts/ralph/fix-holiday-mods.ts --fix');
  }

  console.log('\n' + '='.repeat(70));
  console.log('Script Complete');
  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
