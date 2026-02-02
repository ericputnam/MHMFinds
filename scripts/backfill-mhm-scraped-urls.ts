/**
 * Backfill MHM Scraped URLs
 *
 * This script queries the database for all mods sourced from MustHaveMods.com
 * and adds their source URLs to the scraped-urls CSV file.
 *
 * This prevents re-scraping pages we've already processed.
 *
 * Usage:
 *   npx tsx scripts/backfill-mhm-scraped-urls.ts
 *   npx tsx scripts/backfill-mhm-scraped-urls.ts --dry-run
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

const CSV_PATH = path.join(process.cwd(), 'data', 'mhm-scraped-urls.csv');

interface ScrapedUrlEntry {
  url: string;
  lastScraped: Date;
  modsFound: number;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('📄 Backfill MHM Scraped URLs');
  console.log('='.repeat(60));
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  }

  // Step 1: Load existing CSV entries
  const existingEntries = new Map<string, ScrapedUrlEntry>();

  if (fs.existsSync(CSV_PATH)) {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n');

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [url, lastScraped, modsFound] = line.split(',');
      if (url && lastScraped) {
        existingEntries.set(url, {
          url,
          lastScraped: new Date(lastScraped),
          modsFound: parseInt(modsFound) || 0,
        });
      }
    }

    console.log(`📄 Loaded ${existingEntries.size} existing entries from CSV\n`);
  } else {
    console.log('📄 No existing CSV file found, will create new one\n');
  }

  // Step 2: Query database for all MustHaveMods.com mods
  console.log('🔍 Querying database for MustHaveMods.com mods...\n');

  const mods = await prisma.mod.findMany({
    where: {
      source: 'MustHaveMods.com',
    },
    select: {
      sourceUrl: true,
      createdAt: true,
    },
  });

  console.log(`   Found ${mods.length} mods from MustHaveMods.com\n`);

  // Step 3: Group mods by sourceUrl and count
  const urlCounts = new Map<string, { count: number; oldestDate: Date }>();

  for (const mod of mods) {
    if (!mod.sourceUrl) continue;

    const existing = urlCounts.get(mod.sourceUrl);
    if (existing) {
      existing.count++;
      if (mod.createdAt < existing.oldestDate) {
        existing.oldestDate = mod.createdAt;
      }
    } else {
      urlCounts.set(mod.sourceUrl, {
        count: 1,
        oldestDate: mod.createdAt,
      });
    }
  }

  console.log(`   Found ${urlCounts.size} unique source URLs\n`);

  // Step 4: Merge with existing entries
  let newCount = 0;
  let updatedCount = 0;

  for (const [url, data] of urlCounts) {
    const existing = existingEntries.get(url);

    if (!existing) {
      // New entry
      existingEntries.set(url, {
        url,
        lastScraped: data.oldestDate,
        modsFound: data.count,
      });
      newCount++;
    } else if (data.count > existing.modsFound) {
      // Update if we have more mods now
      existing.modsFound = data.count;
      updatedCount++;
    }
  }

  console.log(`📊 Results:`);
  console.log(`   New URLs to add: ${newCount}`);
  console.log(`   URLs updated: ${updatedCount}`);
  console.log(`   Total URLs in CSV: ${existingEntries.size}\n`);

  // Step 5: Write CSV
  if (!isDryRun && (newCount > 0 || updatedCount > 0)) {
    // Ensure data directory exists
    const dataDir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Build CSV content
    let csvContent = 'url,lastScraped,modsFound\n';

    // Sort by URL for consistent output
    const sortedEntries = Array.from(existingEntries.values()).sort((a, b) =>
      a.url.localeCompare(b.url)
    );

    for (const entry of sortedEntries) {
      csvContent += `${entry.url},${entry.lastScraped.toISOString()},${entry.modsFound}\n`;
    }

    fs.writeFileSync(CSV_PATH, csvContent);
    console.log(`✅ Wrote ${existingEntries.size} entries to ${CSV_PATH}\n`);
  } else if (isDryRun) {
    console.log('🔍 DRY RUN - Would write changes to CSV\n');

    // Show sample of new entries
    if (newCount > 0) {
      console.log('Sample of new entries that would be added:');
      let shown = 0;
      for (const [url, data] of urlCounts) {
        if (!existingEntries.has(url) || shown >= 5) continue;
        console.log(`   ${url} (${data.count} mods)`);
        shown++;
        if (shown >= 5) {
          console.log(`   ... and ${newCount - 5} more`);
          break;
        }
      }
    }
  } else {
    console.log('ℹ️  No changes needed\n');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
