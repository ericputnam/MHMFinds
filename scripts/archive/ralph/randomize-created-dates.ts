#!/usr/bin/env npx tsx
/**
 * Randomize Published Dates Script
 *
 * Spreads out the publishedAt timestamps for bulk-imported mods to make the
 * public "Newest" view look like organic growth rather than bulk import.
 *
 * - publishedAt: Used by public API for "newest" sorting (gets randomized)
 * - createdAt: Preserved for admin to see actual import order
 *
 * Usage:
 *   npx tsx scripts/ralph/randomize-created-dates.ts         # Dry run (preview)
 *   npx tsx scripts/ralph/randomize-created-dates.ts --fix   # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--fix');

// Configuration
const SOURCE_TO_RANDOMIZE = 'MustHaveMods.com';
const MONTHS_TO_SPREAD = 2; // Spread over past 2 months
const BATCH_SIZE = 500;

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate sequential dates spread over N months
 * Returns dates from newest to oldest
 */
function generateSequentialDates(count: number, months: number): Date[] {
  const now = new Date();
  const msInMonth = 30 * 24 * 60 * 60 * 1000;
  const totalMs = months * msInMonth;
  const msPerMod = totalMs / count;

  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    // Spread evenly with small random variance (±12 hours)
    const baseMs = i * msPerMod;
    const variance = (Math.random() - 0.5) * 24 * 60 * 60 * 1000; // ±12 hours
    const date = new Date(now.getTime() - baseMs + variance);

    // Random time of day
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(Math.floor(Math.random() * 60));

    dates.push(date);
  }
  return dates;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Randomize Published Dates Script');
  console.log('='.repeat(70));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'FIX MODE (applying changes)'}`);
  console.log(`Source: ${SOURCE_TO_RANDOMIZE}`);
  console.log(`Spread over: ${MONTHS_TO_SPREAD} months`);
  console.log('');
  console.log('NOTE: This updates publishedAt (public "Newest" view)');
  console.log('      createdAt is preserved (admin import order)');
  console.log('='.repeat(70) + '\n');

  // Get all mods with the target source
  const mods = await prisma.mod.findMany({
    where: { source: SOURCE_TO_RANDOMIZE },
    select: { id: true, title: true, publishedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${mods.length} mods with source "${SOURCE_TO_RANDOMIZE}"\n`);

  if (mods.length === 0) {
    console.log('No mods to update.');
    await prisma.$disconnect();
    return;
  }

  // Check current publishedAt distribution
  const dateDistribution = new Map<string, number>();
  for (const mod of mods) {
    const dateKey = (mod.publishedAt || mod.createdAt).toISOString().split('T')[0];
    dateDistribution.set(dateKey, (dateDistribution.get(dateKey) || 0) + 1);
  }

  console.log('--- Current publishedAt Distribution ---');
  const sortedDates = Array.from(dateDistribution.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  sortedDates.slice(0, 10).forEach(([date, count]) => {
    console.log(`  ${date}: ${count} mods`);
  });
  if (sortedDates.length > 10) {
    console.log(`  ... and ${sortedDates.length - 10} more dates`);
  }

  // Shuffle mods to mix up categories, then assign sequential dates
  console.log('\n--- Shuffling Mods & Generating Sequential Dates ---');
  console.log('(This ensures variety in "Newest" view - no category clumps)\n');

  const shuffledMods = shuffleArray(mods);
  const sequentialDates = generateSequentialDates(shuffledMods.length, MONTHS_TO_SPREAD);

  const updates: { id: string; title: string; newDate: Date }[] = shuffledMods.map((mod, i) => ({
    id: mod.id,
    title: mod.title,
    newDate: sequentialDates[i],
  }));

  // Show new distribution preview
  const newDistribution = new Map<string, number>();
  for (const update of updates) {
    const monthKey = update.newDate.toISOString().slice(0, 7); // YYYY-MM
    newDistribution.set(monthKey, (newDistribution.get(monthKey) || 0) + 1);
  }

  console.log('\nNew distribution by month:');
  const sortedMonths = Array.from(newDistribution.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  sortedMonths.forEach(([month, count]) => {
    console.log(`  ${month}: ${count} mods`);
  });

  // Sample of what "Newest" will show (first 20 mods by date)
  const sortedByNewest = [...updates].sort((a, b) => b.newDate.getTime() - a.newDate.getTime());
  console.log('\n--- Preview: "Newest" view (first 20) ---');
  sortedByNewest.slice(0, 20).forEach(update => {
    const titlePreview = update.title.length > 50 ? update.title.slice(0, 50) + '...' : update.title;
    console.log(`  ${update.newDate.toISOString().split('T')[0]} - ${titlePreview}`);
  });

  if (!DRY_RUN) {
    console.log('\n' + '='.repeat(70));
    console.log('APPLYING CHANGES');
    console.log('='.repeat(70) + '\n');

    let updatedCount = 0;

    // Process in batches
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      // Use transaction for each batch - update publishedAt (not createdAt)
      await prisma.$transaction(
        batch.map(update =>
          prisma.mod.update({
            where: { id: update.id },
            data: { publishedAt: update.newDate },
          })
        )
      );

      updatedCount += batch.length;
      console.log(`  Updated batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} mods (total: ${updatedCount})`);
    }

    console.log(`\n✅ Total mods updated: ${updatedCount}`);
  } else {
    console.log('\n' + '='.repeat(70));
    console.log('DRY RUN COMPLETE');
    console.log('='.repeat(70));
    console.log('\nTo apply these changes, run with --fix flag:');
    console.log('  npx tsx scripts/ralph/randomize-created-dates.ts --fix');
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
