/**
 * Retire Amazon Affiliates Script
 *
 * Part of the affiliate catalog pivot from physical Amazon products to
 * digital offers (see scripts/import-digital-affiliate-products.ts).
 *
 * Deactivates any active `partner: 'amazon'` rows in AffiliateOffer.
 * Rows are NOT deleted — they're kept so existing AffiliateClick /
 * AffiliateEarning foreign keys and click-history reporting stay intact.
 *
 * IMPORTANT: As of this writing, production `affiliate_offers` is EMPTY
 * (the old Amazon import was never run/persisted), so under normal
 * circumstances this script is a no-op. It is written to be idempotent
 * and safe to run repeatedly / defensively (e.g. in case an Amazon import
 * is ever re-run or restored from a backup before this pivot is complete).
 *
 * Usage:
 *   npx tsx scripts/retire-amazon-affiliates.ts             # apply
 *   npx tsx scripts/retire-amazon-affiliates.ts --dry-run    # count only, no writes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

// Scripts can't use Prisma Accelerate URLs reliably for fresh schema — prefer the direct
// connection when available (Accelerate's schema cache lags behind migrations).
if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function retireAmazonAffiliates() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`Retiring active Amazon affiliate offers${isDryRun ? ' (DRY RUN)' : ''}...`);

  const matchCount = await prisma.affiliateOffer.count({
    where: { partner: 'amazon', isActive: true },
  });

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would deactivate ${matchCount} active Amazon offer(s).`);
    console.log('No changes made. Re-run without --dry-run to apply.');
    return;
  }

  const result = await prisma.affiliateOffer.updateMany({
    where: { partner: 'amazon', isActive: true },
    data: { isActive: false },
  });

  console.log(`\nDeactivated ${result.count} active Amazon offer(s).`);
  console.log('Rows were kept (not deleted) to preserve click-history foreign keys.');

  if (result.count === 0) {
    console.log(
      '\nNote: 0 rows affected is expected right now — the affiliate_offers table has no persisted Amazon rows to retire. This script is idempotent and safe to re-run.'
    );
  }
}

retireAmazonAffiliates()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
