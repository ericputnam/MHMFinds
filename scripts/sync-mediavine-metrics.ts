/**
 * Sync Mediavine Revenue
 *
 * Usage: npm run agent:mediavine-sync [date]
 *
 * Environment Variables Required:
 * - MEDIAVINE_EMAIL: Your Mediavine dashboard email
 * - MEDIAVINE_PASSWORD: Your Mediavine dashboard password
 * - MEDIAVINE_TOTP_SECRET: Your 2FA TOTP secret (base32 encoded)
 */

import { mediavineConnector } from '../lib/services/mediavineConnector';

async function main() {
  const dateArg = process.argv[2];
  const targetDate = dateArg ? new Date(dateArg) : new Date();
  targetDate.setDate(targetDate.getDate() - 1); // Default to yesterday

  console.log(`\n=== Mediavine Revenue Sync ===`);
  console.log(`Date: ${targetDate.toISOString().split('T')[0]}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Check required environment variables
  if (!process.env.MEDIAVINE_EMAIL || !process.env.MEDIAVINE_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   - MEDIAVINE_EMAIL');
    console.error('   - MEDIAVINE_PASSWORD');
    console.error('   - MEDIAVINE_TOTP_SECRET (for 2FA)');
    process.exit(1);
  }

  try {
    const result = await mediavineConnector.syncRevenueToDatabase(targetDate);

    console.log(`\n=== Results ===`);
    console.log(`Days updated: ${result.daysUpdated}`);
    console.log(`Pages updated: ${result.pagesUpdated}`);
    console.log(`\n✅ Sync complete!`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
