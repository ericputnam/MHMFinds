#!/usr/bin/env npx tsx
/**
 * Affiliate Product Search CLI
 *
 * Usage:
 *   npx tsx scripts/affiliate-search.ts "butterfly hair clips"
 *   npx tsx scripts/affiliate-search.ts --trending beauty
 *   npx tsx scripts/affiliate-search.ts --category cottagecore
 *   npx tsx scripts/affiliate-search.ts --category y2k --limit 10
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  researchProducts,
  discoverTrendingProducts,
  researchSimsRelatedProducts,
} from '../lib/services/affiliateProductResearch';
import { AMAZON_DISCOVERY_PAGES } from '../lib/services/amazonScraperService';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
🛒 Affiliate Product Search

Usage:
  npx tsx scripts/affiliate-search.ts "search term"        Search Amazon via Perplexity
  npx tsx scripts/affiliate-search.ts --trending <type>    Get trending products
  npx tsx scripts/affiliate-search.ts --category <type>    Search by Sims category

Options:
  --limit <n>     Max products to return (default: 5)
  --min <price>   Min price filter
  --max <price>   Max price filter

Trending types:
  beauty, fashion, jewelry, movers, newBeauty, newFashion

Sims categories:
  hair, makeup, jewelry, clothing, y2k, cottagecore, dark-academia, fairycore

Examples:
  npx tsx scripts/affiliate-search.ts "vintage hair clips"
  npx tsx scripts/affiliate-search.ts --trending beauty --limit 10
  npx tsx scripts/affiliate-search.ts --category cottagecore
  npx tsx scripts/affiliate-search.ts "led room lights" --min 10 --max 30
`);
}

function parseArgs() {
  const options: {
    query?: string;
    trending?: string;
    category?: string;
    limit: number;
    minPrice?: number;
    maxPrice?: number;
  } = { limit: 5 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--trending') {
      options.trending = args[++i];
    } else if (arg === '--category') {
      options.category = args[++i];
    } else if (arg === '--limit') {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--min') {
      options.minPrice = parseFloat(args[++i]);
    } else if (arg === '--max') {
      options.maxPrice = parseFloat(args[++i]);
    } else if (!arg.startsWith('--')) {
      options.query = arg;
    }
  }

  return options;
}

function printProduct(product: any, index: number) {
  console.log(`\n${index + 1}. ${product.title?.substring(0, 70)}${product.title?.length > 70 ? '...' : ''}`);
  console.log(`   ASIN:   ${product.asin}`);
  console.log(`   Price:  ${product.price ? '$' + product.price : 'N/A'}`);
  if (product.rating) {
    console.log(`   Rating: ${product.rating}⭐ (${product.reviewCount || 'N/A'} reviews)`);
  }
  if (product.whyRelevant) {
    console.log(`   Why:    ${product.whyRelevant.substring(0, 80)}...`);
  }
  console.log(`   Link:   ${product.affiliateUrl}`);
}

async function main() {
  const options = parseArgs();

  if (!options.query && !options.trending && !options.category) {
    printUsage();
    process.exit(1);
  }

  console.log('\n🔍 Searching...\n');

  let result;

  if (options.trending) {
    // Map friendly names to AMAZON_DISCOVERY_PAGES keys
    const trendingMap: Record<string, keyof typeof AMAZON_DISCOVERY_PAGES> = {
      beauty: 'moversBeauty',
      fashion: 'moversFashion',
      jewelry: 'bestSellersJewelry',
      movers: 'moversAndShakers',
      newBeauty: 'newReleasesBeauty',
      newFashion: 'newReleasesFashion',
    };

    const key = trendingMap[options.trending] || options.trending as keyof typeof AMAZON_DISCOVERY_PAGES;

    if (!AMAZON_DISCOVERY_PAGES[key]) {
      console.error(`Unknown trending type: ${options.trending}`);
      console.log('Available:', Object.keys(trendingMap).join(', '));
      process.exit(1);
    }

    result = await discoverTrendingProducts(key, options.limit);
    console.log(`📈 Trending ${options.trending} products:`);

  } else if (options.category) {
    result = await researchSimsRelatedProducts(options.category, options.limit);
    console.log(`🎮 Products for Sims "${options.category}" aesthetic:`);

  } else if (options.query) {
    result = await researchProducts({
      category: options.query,
      priceRange: options.minPrice || options.maxPrice
        ? { min: options.minPrice, max: options.maxPrice }
        : undefined,
      limit: options.limit,
    });
    console.log(`🔎 Results for "${options.query}":`);
  }

  if (!result || result.products.length === 0) {
    console.log('\nNo products found.');
    process.exit(0);
  }

  console.log(`Found ${result.products.length} products\n`);
  console.log('─'.repeat(70));

  result.products.forEach((product, i) => printProduct(product, i));

  console.log('\n' + '─'.repeat(70));
  console.log(`\n✅ All links include your affiliate tag: musthavemod04-20\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
