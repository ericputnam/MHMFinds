/**
 * Sync Mediavine Revenue
 *
 * Usage:
 *   npm run agent:mediavine-sync [date]           - Sync single day via browser automation
 *   npm run agent:mediavine-sync --days=7        - Sync last 7 days via browser automation
 *   npm run agent:mediavine-sync csv <path>      - Import from manually downloaded CSV
 *   npm run agent:mediavine-sync today           - Get today's estimated revenue
 *
 * Environment Variables Required (for browser automation):
 * - MEDIAVINE_EMAIL: Your Mediavine dashboard email
 * - MEDIAVINE_PASSWORD: Your Mediavine dashboard password
 * - MEDIAVINE_TOTP_SECRET: Your 2FA TOTP secret (base32 encoded)
 */

import { mediavineConnector, MediavineManualImport } from '../lib/services/mediavineConnector';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(`\n=== Mediavine Revenue Sync ===`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Handle CSV import mode
  if (command === 'csv') {
    const csvPath = args[1];
    if (!csvPath) {
      console.error('Usage: npm run agent:mediavine-sync csv <path-to-csv>');
      console.error('Example: npm run agent:mediavine-sync csv /tmp/mediavine.csv');
      process.exit(1);
    }

    console.log(`Importing from CSV: ${csvPath}`);
    try {
      const result = await MediavineManualImport.importFromCSV(csvPath);
      console.log(`\n=== Results ===`);
      console.log(`Rows imported: ${result.rowsImported}`);
      console.log(`Total revenue: $${result.totalRevenue.toFixed(2)}`);
      console.log(`\nSync complete!`);
    } catch (error) {
      console.error('\nCSV import failed:', error);
      process.exit(1);
    }
    return;
  }

  // Handle today's revenue quick check
  if (command === 'today') {
    checkEnvVars();
    console.log('Fetching today\'s revenue estimate...');
    try {
      const result = await mediavineConnector.getTodayRevenue();
      console.log(`\n=== Today's Estimated Revenue ===`);
      console.log(`Revenue: $${result.revenue.toFixed(2)}`);
      console.log(`RPM: $${result.rpm.toFixed(2)}`);
      console.log(`Impressions: ${result.impressions.toLocaleString()}`);
    } catch (error) {
      console.error('\nFailed to fetch today\'s revenue:', error);
      process.exit(1);
    }
    return;
  }

  // Check for --days flag for range sync
  const daysArg = args.find(a => a.startsWith('--days='));
  if (daysArg) {
    checkEnvVars();
    const days = parseInt(daysArg.split('=')[1]) || 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`Syncing ${days} days of revenue data...`);
    console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    try {
      const result = await mediavineConnector.syncDateRange(startDate, endDate);
      console.log(`\n=== Results ===`);
      console.log(`Days updated: ${result.daysUpdated}`);
      console.log(`Pages updated: ${result.pagesUpdated}`);
      console.log(`Total revenue: $${result.totalRevenue.toFixed(2)}`);
      console.log(`\nSync complete!`);
    } catch (error) {
      console.error('\nSync failed:', error);
      process.exit(1);
    }
    return;
  }

  // Default: sync single day via browser automation
  checkEnvVars();

  const dateArg = args[0];
  const targetDate = dateArg ? new Date(dateArg) : new Date();
  if (!dateArg) {
    targetDate.setDate(targetDate.getDate() - 1); // Default to yesterday
  }

  console.log(`Syncing revenue for: ${targetDate.toISOString().split('T')[0]}`);

  try {
    const result = await mediavineConnector.syncRevenueToDatabase(targetDate);

    console.log(`\n=== Results ===`);
    console.log(`Days updated: ${result.daysUpdated}`);
    console.log(`Pages updated: ${result.pagesUpdated}`);
    console.log(`\nSync complete!`);
  } catch (error) {
    console.error('\nSync failed:', error);
    process.exit(1);
  }
}

function checkEnvVars() {
  if (!process.env.MEDIAVINE_EMAIL || !process.env.MEDIAVINE_PASSWORD) {
    console.error('Missing required environment variables:');
    console.error('   - MEDIAVINE_EMAIL');
    console.error('   - MEDIAVINE_PASSWORD');
    console.error('   - MEDIAVINE_TOTP_SECRET (for 2FA)');
    console.error('\nFor manual import without browser automation, use:');
    console.error('   npm run agent:mediavine-sync csv /path/to/mediavine.csv');
    process.exit(1);
  }
}

main();
