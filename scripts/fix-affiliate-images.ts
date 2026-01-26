/**
 * Fix Affiliate Product Images
 *
 * Updates affiliate offers with correct Amazon product image URLs.
 * Uses the Amazon product advertising image widget format which works reliably.
 *
 * Usage: npx tsx scripts/fix-affiliate-images.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extract ASIN from affiliate URL
function extractAsin(affiliateUrl: string): string | null {
  const match = affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

// Generate a working Amazon product image URL
function getAmazonImageUrl(asin: string): string {
  // This format works for Amazon product images
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}._AC_SX300_.jpg`;
}

async function fixImages() {
  console.log('Fixing affiliate product images...\n');

  // Get all affiliate offers from Amazon
  const offers = await prisma.affiliateOffer.findMany({
    where: {
      partner: 'amazon',
    },
    select: {
      id: true,
      name: true,
      affiliateUrl: true,
      imageUrl: true,
    },
  });

  console.log(`Found ${offers.length} Amazon affiliate offers\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const offer of offers) {
    const asin = extractAsin(offer.affiliateUrl);

    if (!asin) {
      console.log(`  Skipped (no ASIN): ${offer.name}`);
      skipped++;
      continue;
    }

    const newImageUrl = getAmazonImageUrl(asin);

    // Only update if the URL is different or broken
    if (offer.imageUrl === newImageUrl) {
      console.log(`  Skipped (same URL): ${offer.name}`);
      skipped++;
      continue;
    }

    try {
      await prisma.affiliateOffer.update({
        where: { id: offer.id },
        data: { imageUrl: newImageUrl },
      });
      console.log(`  Updated: ${offer.name} (${asin})`);
      updated++;
    } catch (error) {
      console.error(`  Error updating ${offer.name}:`, error);
      errors++;
    }
  }

  console.log('\n=== Image Fix Complete ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

fixImages()
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
