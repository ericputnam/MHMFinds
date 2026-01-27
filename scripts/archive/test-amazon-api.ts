/**
 * Test script for Amazon Creators API
 *
 * Usage: npx tsx scripts/test-amazon-api.ts
 */

// Load env FIRST before any imports that use env vars
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set env vars explicitly to ensure they're available for the module
process.env.AMAZON_CREATORS_CREDENTIAL_ID = process.env.AMAZON_CREATORS_CREDENTIAL_ID;
process.env.AMAZON_CREATORS_CREDENTIAL_SECRET = process.env.AMAZON_CREATORS_CREDENTIAL_SECRET;
process.env.AMAZON_CREATORS_APPLICATION_ID = process.env.AMAZON_CREATORS_APPLICATION_ID;
process.env.AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;

async function main() {
  // Dynamic import to ensure env vars are loaded first
  const {
    searchProducts,
    getItem,
    isConfigured,
    formatAffiliateUrl,
    extractAsin,
  } = await import('../lib/services/amazonCreatorsApiService');
  console.log('\n🛒 Amazon Creators API Test\n');

  // Check configuration
  if (!isConfigured()) {
    console.error('❌ Amazon Creators API credentials not configured.');
    console.log('\nAdd these to .env.local:');
    console.log('  AMAZON_CREATORS_CREDENTIAL_ID=your_credential_id');
    console.log('  AMAZON_CREATORS_CREDENTIAL_SECRET=your_credential_secret');
    console.log('  AMAZON_PARTNER_TAG=musthavemod04-20');
    process.exit(1);
  }

  console.log('✓ Credentials configured\n');

  // Test 1: Extract ASIN from URL
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

  // Test 2: Search for products
  console.log('--- Test 2: Search Products ---');
  try {
    const products = await searchProducts({
      keywords: 'butterfly hair clips',
      searchIndex: 'Beauty',
      minPrice: 5,
      maxPrice: 30,
      itemCount: 5,
    });

    if (products.length === 0) {
      console.log('  No products found (this may indicate API issues)');
    } else {
      console.log(`  Found ${products.length} products:\n`);
      for (const p of products) {
        console.log(`  - ${p.title.slice(0, 60)}...`);
        console.log(`    ASIN: ${p.asin} | Price: $${p.price || 'N/A'} | Brand: ${p.brand || 'N/A'}`);
        console.log(`    Affiliate URL: ${formatAffiliateUrl(p.asin)}`);
        console.log(`    Image: ${p.imageUrl.slice(0, 60)}...`);
        console.log();
      }
    }
  } catch (error) {
    console.error('  Search failed:', error);
  }

  // Test 3: Get item by ASIN (using a known ASIN)
  console.log('--- Test 3: Get Item by ASIN ---');
  try {
    // Use an ASIN from the search results or a known one
    const testAsin = 'B08N5PJ1RH'; // Example ASIN
    const item = await getItem(testAsin);

    if (item) {
      console.log(`  Found: ${item.title}`);
      console.log(`  Price: $${item.price || 'N/A'}`);
      console.log(`  Brand: ${item.brand || 'N/A'}`);
      console.log(`  URL: ${item.detailPageUrl}`);
    } else {
      console.log(`  Item not found for ASIN: ${testAsin}`);
    }
  } catch (error) {
    console.error('  GetItem failed:', error);
  }

  console.log('\n✅ Test complete!\n');
}

main().catch(console.error);
