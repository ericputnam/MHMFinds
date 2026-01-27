/**
 * Test Affiliate Product Research
 *
 * Usage: npx tsx scripts/test-affiliate-research.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  researchProducts,
  discoverTrendingProducts,
  researchSimsRelatedProducts,
  isPerplexityConfigured,
} from '../lib/services/affiliateProductResearch';

async function main() {
  console.log('\n🔍 Affiliate Product Research Test\n');

  // Check configuration
  if (!isPerplexityConfigured()) {
    console.error('❌ PERPLEXITY_API_KEY not configured in .env.local');
    console.log('\nTo test Perplexity research, add:');
    console.log('  PERPLEXITY_API_KEY=your_api_key\n');
    console.log('Continuing with Amazon trending discovery only...\n');
  } else {
    console.log('✓ Perplexity API configured\n');
  }

  // Test 1: Discover trending products from Amazon
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Test 1: Discover Trending Beauty Products (Amazon Movers & Shakers)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const trending = await discoverTrendingProducts('moversBeauty', 5);
  console.log(`Strategy: ${trending.searchStrategy}`);
  console.log(`Found: ${trending.totalFound} products\n`);

  for (const product of trending.products) {
    console.log(`📦 ${product.title?.substring(0, 60)}...`);
    console.log(`   ASIN: ${product.asin}`);
    console.log(`   Price: $${product.price || 'N/A'}`);
    console.log(`   Rating: ${product.rating || 'N/A'} ⭐ (${product.reviewCount || 'N/A'} reviews)`);
    console.log(`   🔗 ${product.affiliateUrl}`);
    console.log();
  }

  // Test 2: Perplexity research (if configured)
  if (isPerplexityConfigured()) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Test 2: Perplexity Research - "butterfly hair clips"');
    console.log('═══════════════════════════════════════════════════════════\n');

    const research = await researchProducts({
      category: 'butterfly hair clips',
      context: 'trendy Y2K aesthetic accessories',
      priceRange: { min: 5, max: 25 },
      limit: 5,
    });

    console.log(`Strategy: ${research.searchStrategy}`);
    console.log(`Found: ${research.totalFound} products\n`);

    for (const product of research.products) {
      console.log(`📦 ${product.title?.substring(0, 60)}...`);
      console.log(`   ASIN: ${product.asin}`);
      console.log(`   Price: $${product.price || 'N/A'}`);
      if (product.whyRelevant) {
        console.log(`   Why: ${product.whyRelevant}`);
      }
      console.log(`   🔗 ${product.affiliateUrl}`);
      console.log();
    }

    // Test 3: Sims-related product research
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Test 3: Sims Mod Category Research - "cottagecore"');
    console.log('═══════════════════════════════════════════════════════════\n');

    const simsResearch = await researchSimsRelatedProducts('cottagecore', 5);

    console.log(`Strategy: ${simsResearch.searchStrategy}`);
    console.log(`Found: ${simsResearch.totalFound} products\n`);

    for (const product of simsResearch.products) {
      console.log(`📦 ${product.title?.substring(0, 60)}...`);
      console.log(`   ASIN: ${product.asin}`);
      console.log(`   Price: $${product.price || 'N/A'}`);
      if (product.whyRelevant) {
        console.log(`   Why: ${product.whyRelevant}`);
      }
      console.log(`   🔗 ${product.affiliateUrl}`);
      console.log();
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Test Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('- Affiliate links include your tag: musthavemod04-20');
  console.log('- Products can be discovered from Amazon trending pages');
  console.log('- Perplexity can research specific product categories');
  console.log('- Sims mod categories map to real-world product searches');
  console.log();
}

main().catch(console.error);
