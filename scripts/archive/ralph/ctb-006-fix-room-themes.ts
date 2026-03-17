#!/usr/bin/env npx tsx
/**
 * CTB-006: Fix Room-Based Furniture/Decor Mods
 *
 * Adds room themes to furniture and decor mods that have room keywords in title.
 * Uses the detectRoomThemes function from contentTypeDetector.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-006-fix-room-themes.ts
 * 2. Find mods with 'bathroom' in title - add 'bathroom' to themes
 * 3. Find mods with 'kitchen' in title - add 'kitchen' to themes
 * 4. Find mods with 'bedroom' in title - add 'bedroom' to themes
 * 5. Find mods with 'living room' in title - add 'living-room' to themes
 * 6. Find mods with 'dining' in title - add 'dining-room' to themes
 * 7. Find mods with 'office' or 'study' in title - add 'office' to themes
 * 8. Find mods with 'kids' or 'child' room in title - add 'kids-room' to themes
 * 9. Find mods with 'nursery' or 'baby' room in title - add 'nursery' to themes
 * 10. Do NOT duplicate existing themes
 * 11. Dry run first, apply with --fix flag
 * 12. npm run type-check passes
 *
 * Usage:
 *   npx tsx scripts/ralph/ctb-006-fix-room-themes.ts          # Dry run (preview changes)
 *   npx tsx scripts/ralph/ctb-006-fix-room-themes.ts --fix    # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { detectRoomThemes } from '../../lib/services/contentTypeDetector';

const prisma = new PrismaClient();

// Check for --fix flag
const applyFixes = process.argv.includes('--fix');

interface ModWithThemes {
  id: string;
  title: string;
  description: string | null;
  themes: string[];
  contentType: string | null;
}

interface ThemeUpdate {
  modId: string;
  title: string;
  contentType: string | null;
  existingThemes: string[];
  detectedThemes: string[];
  newThemes: string[];
}

const BATCH_SIZE = 1000; // Process mods in batches to avoid 5MB response limit

async function findModsNeedingRoomThemes(): Promise<ThemeUpdate[]> {
  console.log('Querying mods in batches to detect room themes...\n');

  const updates: ThemeUpdate[] = [];
  let totalProcessed = 0;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch mods in batches, excluding description to reduce response size
    // We'll only use title for room detection since room keywords are typically in titles
    const mods: ModWithThemes[] = await prisma.mod.findMany({
      select: {
        id: true,
        title: true,
        description: false, // Skip description to reduce response size
        themes: true,
        contentType: true,
      },
      skip,
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    }) as unknown as ModWithThemes[];

    if (mods.length === 0) {
      hasMore = false;
      break;
    }

    totalProcessed += mods.length;
    console.log(`  Processing batch: ${skip + 1} - ${skip + mods.length} (${totalProcessed} total)`);

    for (const mod of mods) {
      // Detect room themes from title only (description skipped to avoid query size limit)
      const detectedThemes = detectRoomThemes(mod.title);

      if (detectedThemes.length === 0) {
        continue;
      }

      // Find new themes that aren't already in the mod's themes array
      const existingThemes = mod.themes || [];
      const newThemes = detectedThemes.filter(theme => !existingThemes.includes(theme));

      if (newThemes.length > 0) {
        updates.push({
          modId: mod.id,
          title: mod.title,
          contentType: mod.contentType,
          existingThemes,
          detectedThemes,
          newThemes,
        });
      }
    }

    skip += BATCH_SIZE;

    if (mods.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\nProcessed ${totalProcessed} total mods.\n`);

  return updates;
}

async function applyThemeUpdates(updates: ThemeUpdate[]): Promise<void> {
  console.log(`\nApplying ${updates.length} theme updates...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    try {
      const updatedThemes = [...update.existingThemes, ...update.newThemes];

      await prisma.mod.update({
        where: { id: update.modId },
        data: { themes: updatedThemes },
      });

      successCount++;
      console.log(`  [UPDATED] "${update.title.substring(0, 50)}..." - Added: ${update.newThemes.join(', ')}`);
    } catch (error) {
      errorCount++;
      console.error(`  [ERROR] "${update.title.substring(0, 50)}..." - ${error}`);
    }
  }

  console.log(`\nApplied ${successCount} updates successfully.`);
  if (errorCount > 0) {
    console.log(`${errorCount} updates failed.`);
  }
}

function printUpdatesSummary(updates: ThemeUpdate[]): void {
  // Group by detected theme for summary
  const themeGroups: Record<string, ThemeUpdate[]> = {
    bathroom: [],
    kitchen: [],
    bedroom: [],
    'living-room': [],
    'dining-room': [],
    office: [],
    'kids-room': [],
    nursery: [],
    outdoor: [],
  };

  for (const update of updates) {
    for (const theme of update.newThemes) {
      if (themeGroups[theme]) {
        themeGroups[theme].push(update);
      }
    }
  }

  console.log('='.repeat(70));
  console.log('ROOM THEME DETECTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Mode: ${applyFixes ? 'APPLYING FIXES' : 'DRY RUN (use --fix to apply)'}`);
  console.log(`Total mods needing theme updates: ${updates.length}`);
  console.log('');

  // Print by theme
  for (const [theme, mods] of Object.entries(themeGroups)) {
    if (mods.length > 0) {
      console.log(`\n${theme.toUpperCase()} (${mods.length} mods):`);
      console.log('-'.repeat(50));

      // Show first 10 examples
      const examples = mods.slice(0, 10);
      for (const mod of examples) {
        const existingStr = mod.existingThemes.length > 0 ? ` [existing: ${mod.existingThemes.join(', ')}]` : '';
        const contentTypeStr = mod.contentType ? ` (${mod.contentType})` : '';
        console.log(`  - "${mod.title.substring(0, 60)}..."${contentTypeStr}${existingStr}`);
      }

      if (mods.length > 10) {
        console.log(`  ... and ${mods.length - 10} more`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('BREAKDOWN BY THEME:');
  console.log('='.repeat(70));

  for (const [theme, mods] of Object.entries(themeGroups)) {
    console.log(`  ${theme}: ${mods.length} mods`);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('CTB-006: Fix Room-Based Furniture/Decor Mods');
  console.log('='.repeat(70));
  console.log(`Mode: ${applyFixes ? 'APPLY FIXES' : 'DRY RUN'}`);
  console.log('');

  try {
    // Find all mods needing room theme updates
    const updates = await findModsNeedingRoomThemes();

    if (updates.length === 0) {
      console.log('No mods found that need room theme updates.');
      console.log('All mods either have no room keywords or already have the appropriate themes.');
      return;
    }

    // Print summary
    printUpdatesSummary(updates);

    // Apply fixes if --fix flag is provided
    if (applyFixes) {
      await applyThemeUpdates(updates);

      // Verification
      console.log('\n' + '='.repeat(70));
      console.log('VERIFICATION');
      console.log('='.repeat(70));

      // Sample verification: check a few updated mods
      const sampleIds = updates.slice(0, 5).map(u => u.modId);
      const verifiedMods = await prisma.mod.findMany({
        where: { id: { in: sampleIds } },
        select: { id: true, title: true, themes: true },
      });

      console.log('\nSample of updated mods:');
      for (const mod of verifiedMods) {
        console.log(`  - "${mod.title.substring(0, 50)}..." -> themes: [${mod.themes.join(', ')}]`);
      }
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('DRY RUN COMPLETE');
      console.log('='.repeat(70));
      console.log(`\nTo apply these ${updates.length} updates, run:`);
      console.log('  npx tsx scripts/ralph/ctb-006-fix-room-themes.ts --fix');
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error('CTB-006 failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
