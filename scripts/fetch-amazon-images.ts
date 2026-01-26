/**
 * Fetch Amazon Product Images
 *
 * Scrapes actual product image URLs from Amazon product pages.
 * Uses random delays and user agent rotation to avoid blocking.
 *
 * Usage: npx tsx scripts/fetch-amazon-images.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// User agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract ASIN from affiliate URL
function extractAsin(affiliateUrl: string): string | null {
  const match = affiliateUrl.match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

// Fetch product page and extract main image URL
async function fetchProductImage(asin: string): Promise<string | null> {
  const url = `https://www.amazon.com/dp/${asin}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.log(`    HTTP ${response.status} for ${asin}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try multiple selectors for the main product image
    let imageUrl: string | null = null;

    // Method 1: Main image landing container
    const landingImage = $('#landingImage').attr('src') || $('#landingImage').attr('data-old-hires');
    if (landingImage && !landingImage.includes('sprite')) {
      imageUrl = landingImage;
    }

    // Method 2: Image block image
    if (!imageUrl) {
      const imgBlockImage = $('#imgBlkFront').attr('src') || $('#imgBlkFront').attr('data-a-dynamic-image');
      if (imgBlockImage) {
        // data-a-dynamic-image is JSON with multiple sizes
        if (imgBlockImage.startsWith('{')) {
          try {
            const images = JSON.parse(imgBlockImage);
            const urls = Object.keys(images);
            if (urls.length > 0) {
              // Get the largest image
              imageUrl = urls[urls.length - 1];
            }
          } catch {
            imageUrl = null;
          }
        } else {
          imageUrl = imgBlockImage;
        }
      }
    }

    // Method 3: Main image from data-a-dynamic-image attribute
    if (!imageUrl) {
      const dynamicImage = $('#landingImage').attr('data-a-dynamic-image');
      if (dynamicImage) {
        try {
          const images = JSON.parse(dynamicImage);
          const urls = Object.keys(images);
          if (urls.length > 0) {
            imageUrl = urls[urls.length - 1];
          }
        } catch {
          imageUrl = null;
        }
      }
    }

    // Method 4: Any image in the image gallery
    if (!imageUrl) {
      const galleryImage = $('img[data-image-index="0"]').attr('src');
      if (galleryImage && !galleryImage.includes('sprite')) {
        imageUrl = galleryImage;
      }
    }

    // Method 5: OG image meta tag
    if (!imageUrl) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        imageUrl = ogImage;
      }
    }

    // Clean up the URL - get a good size
    if (imageUrl) {
      // Convert to a reasonable size (500px)
      imageUrl = imageUrl.replace(/\._[A-Z]{2}\d+_\./, '._AC_SX500_.');
      imageUrl = imageUrl.replace(/\._S[LXY]\d+_\./, '._AC_SX500_.');
    }

    return imageUrl;
  } catch (error) {
    console.log(`    Error fetching ${asin}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchImages() {
  console.log('Fetching Amazon product images...\n');

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
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    const asin = extractAsin(offer.affiliateUrl);

    if (!asin) {
      console.log(`[${i + 1}/${offers.length}] Skipped (no ASIN): ${offer.name}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${offers.length}] Fetching: ${offer.name} (${asin})`);

    const imageUrl = await fetchProductImage(asin);

    if (imageUrl) {
      try {
        await prisma.affiliateOffer.update({
          where: { id: offer.id },
          data: { imageUrl },
        });
        console.log(`    Updated with: ${imageUrl.substring(0, 60)}...`);
        updated++;
      } catch (error) {
        console.log(`    DB Error:`, error instanceof Error ? error.message : error);
        failed++;
      }
    } else {
      console.log(`    Failed to get image`);
      failed++;
    }

    // Random delay between requests (2-5 seconds)
    if (i < offers.length - 1) {
      const delay = 2000 + Math.random() * 3000;
      await sleep(delay);
    }
  }

  console.log('\n=== Image Fetch Complete ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
}

fetchImages()
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
