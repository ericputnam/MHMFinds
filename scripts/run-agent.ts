#!/usr/bin/env npx tsx
/**
 * Monetization Agent Runner
 *
 * Main entry point for running monetization agent jobs.
 *
 * Usage:
 *   npm run agent full            - Run all jobs in sequence
 *   npm run agent ga4_sync        - Sync GA4 metrics
 *   npm run agent mediavine_sync  - Sync Mediavine revenue
 *   npm run agent affiliate_scan  - Scan for affiliate opportunities
 *   npm run agent rpm_analysis    - Run RPM analysis
 *   npm run agent forecast        - Generate revenue forecast
 *   npm run agent cleanup         - Expire old opportunities
 *   npm run agent auto_execute    - Execute approved auto-actions
 *   npm run agent report          - Show status report
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { agentOrchestrator, JobType } from '@/lib/services/agentOrchestrator';
import { prisma } from '@/lib/prisma';

const VALID_JOBS: JobType[] = [
  'full',
  'ga4_sync',
  'mediavine_sync',
  'affiliate_scan',
  'rpm_analysis',
  'forecast',
  'cleanup',
  'auto_execute',
  'report',
];

async function main() {
  const [command] = process.argv.slice(2);

  if (!command || !VALID_JOBS.includes(command as JobType)) {
    console.log('\n=== MHMFinds Monetization Agent ===');
    console.log('');
    console.log('Usage: npm run agent <job>');
    console.log('');
    console.log('Available jobs:');
    console.log('  full            - Run all jobs in sequence');
    console.log('  ga4_sync        - Sync GA4 traffic metrics');
    console.log('  mediavine_sync  - Sync Mediavine revenue data');
    console.log('  affiliate_scan  - Scan for affiliate opportunities');
    console.log('  rpm_analysis    - Analyze RPM performance');
    console.log('  forecast        - Generate revenue forecasts');
    console.log('  cleanup         - Expire old opportunities');
    console.log('  auto_execute    - Execute approved auto-actions');
    console.log('  report          - Show status report');
    console.log('');
    process.exit(0);
  }

  const job = command as JobType;

  console.log(`\n🤖 Monetization Agent - Running ${job}`);
  console.log('═══════════════════════════════════════');

  const startTime = Date.now();
  const result = await agentOrchestrator.runJob(job);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n───────────────────────────────────────');

  if (result.success) {
    console.log(`  ✅ Job completed successfully`);
  } else {
    console.log(`  ❌ Job failed: ${result.error}`);
  }

  if (result.itemsProcessed !== undefined) {
    console.log(`  📦 Items processed: ${result.itemsProcessed}`);
  }

  if (result.opportunitiesFound !== undefined) {
    console.log(`  💡 Opportunities found: ${result.opportunitiesFound}`);
  }

  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
