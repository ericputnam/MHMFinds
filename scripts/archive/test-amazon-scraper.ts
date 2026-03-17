/**
 * Test script for Amazon Scraper Service
 *
 * Usage: npx tsx scripts/test-amazon-scraper.ts
 */

import {
  scrapeProduct,
  scrapeAsinsFromPage,
  formatAffiliateUrl,
  extractAsin,
  createAffiliateLinks,
  AMAZON_DISCOVERY_PAGES,
} from '../lib/services/amazonScraperService';

async function main() {
  console.log('\n🛒 Amazon Scraper Test\n');

  // Test 1: Extract ASIN from URLs
  console.log('--- Test 1: Extract ASIN ---');
  const testUrls = [
    'https://www.amazon.com/dp/B0C5R7K3N2',
    'https://www.amazon.com/gp/product/B08N5PJ1RH',
    'https://www.amazon.com/Some-Product-Name/dp/B0CKWZ9M8Q/ref=sr_1_1',
    'B0CKWZ9M8Q',
  ];
  for (const url of testUrls) {
    const asin = extractAsin(url);
    console.log(`  ${url.slice(0, 50)}... -> ${asin}`);
  }
  console.log();

  // Test 2: Generate affiliate links
  console.log('--- Test 2: Generate Affiliate Links ---');
  const asins = ['B0C5R7K3N2', 'B08N5PJ1RH', 'B0CKWZ9M8Q'];
  const links = createAffiliateLinks(asins);
  for (const link of links) {
    console.log(`  ${link.asin}: ${link.url}`);
  }
  console.log();

  // Test 3: Scrape a single product
  console.log('--- Test 3: Scrape Single Product ---');
  // Using a well-known product ASIN (Kindle Paperwhite)
  const testAsin = 'B0CFPJYX2P';
  console.log(`  Scraping ASIN: ${testAsin}...`);
  const product = await scrapeProduct(testAsin);
  if (product) {
    console.log(`  Title: ${product.title?.substring(0, 60)}...`);
    console.log(`  Price: $${product.price || 'N/A'}`);
    console.log(`  Rating: ${product.rating || 'N/A'} stars (${product.reviewCount || 'N/A'} reviews)`);
    console.log(`  Brand: ${product.brand || 'N/A'}`);
    console.log(`  Affiliate URL: ${product.affiliateUrl}`);
    console.log(`  Image: ${product.imageUrl?.substring(0, 60)}...`);
  } else {
    console.log('  Failed to scrape product');
  }
  console.log();

  // Test 4: Scrape ASINs from a deals page
  console.log('--- Test 4: Scrape ASINs from Page ---');
  console.log('  Scraping Movers & Shakers Beauty page...');
  const discoveredAsins = await scrapeAsinsFromPage(AMAZON_DISCOVERY_PAGES.moversBeauty);
  console.log(`  Found ${discoveredAsins.length} ASINs`);
  if (discoveredAsins.length > 0) {
    console.log(`  First 5 ASINs: ${discoveredAsins.slice(0, 5).join(', ')}`);
    console.log(`  Sample affiliate link: ${formatAffiliateUrl(discoveredAsins[0])}`);
  }
  console.log();

  // Test 5: Show available discovery pages
  console.log('--- Test 5: Available Discovery Pages ---');
  for (const [key, url] of Object.entries(AMAZON_DISCOVERY_PAGES)) {
    console.log(`  ${key}: ${url.substring(0, 60)}...`);
  }

  console.log('\n✅ Test complete!\n');
}

main().catch(console.error);
