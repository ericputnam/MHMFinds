#!/usr/bin/env npx tsx
/**
 * GA4 Metrics Sync Script
 *
 * Syncs Google Analytics 4 data to the MonetizationMetric table.
 *
 * Usage:
 *   npm run agent:ga4-sync           # Sync yesterday's data
 *   npm run agent:ga4-sync -- --days 7  # Sync last 7 days
 *
 * Required Environment Variables:
 *   GA4_PROPERTY_ID - GA4 property ID
 *   GA4_SERVICE_ACCOUNT_KEY - Base64-encoded service account JSON
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { ga4Connector } from '@/lib/services/ga4Connector';
import { prisma } from '@/lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  let days = 1;

  // Parse --days argument
  const daysIndex = args.indexOf('--days');
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    days = parseInt(args[daysIndex + 1]) || 1;
  }

  console.log('\n📊 GA4 Metrics Sync');
  console.log('═══════════════════════════════════════');

  // Check environment variables
  if (!process.env.GA4_PROPERTY_ID) {
    console.error('❌ GA4_PROPERTY_ID environment variable not set');
    console.log('\nTo set up GA4 integration:');
    console.log('  1. Create a service account in Google Cloud Console');
    console.log('  2. Add it to your GA4 property with Viewer access');
    console.log('  3. Download the JSON key and base64 encode it');
    console.log('  4. Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_KEY env vars');
    process.exit(1);
  }

  if (!process.env.GA4_SERVICE_ACCOUNT_KEY) {
    console.error('❌ GA4_SERVICE_ACCOUNT_KEY environment variable not set');
    process.exit(1);
  }

  console.log(`  Syncing ${days} day(s) of metrics...\n`);

  let totalSynced = 0;
  const errors: string[] = [];

  for (let i = days; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dateStr = date.toISOString().split('T')[0];

    try {
      console.log(`  Processing ${dateStr}...`);
      const count = await ga4Connector.syncMetricsToDatabase(date);
      console.log(`    ✅ Synced ${count} pages`);
      totalSynced += count;
    } catch (error) {
      const errorMsg = `${dateStr}: ${String(error)}`;
      errors.push(errorMsg);
      console.log(`    ❌ Error: ${String(error)}`);
    }
  }

  console.log('\n───────────────────────────────────────');
  console.log(`  Total pages synced: ${totalSynced}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
  }
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
