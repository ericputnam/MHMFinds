/**
 * Affiliate Product Research Service
 *
 * Uses Perplexity AI to find relevant Amazon products for affiliate linking.
 * Combines AI research with Amazon scraping for a complete product discovery pipeline.
 */

import {
  scrapeProduct,
  scrapeAsinsFromPage,
  scrapeProductsFromListingPage,
  formatAffiliateUrl,
  extractAsin,
  createAffiliateLinks,
  AMAZON_DISCOVERY_PAGES,
  type AmazonProduct,
} from './amazonScraperService';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Lazy load API key to ensure env vars are loaded first
function getPerplexityApiKey(): string | undefined {
  return process.env.PERPLEXITY_API_KEY;
}

export interface ProductResearchRequest {
  category: string;           // e.g., "butterfly hair clips", "cottagecore decor"
  context?: string;           // e.g., "for Sims mod users interested in Y2K fashion"
  priceRange?: {
    min?: number;
    max?: number;
  };
  limit?: number;             // Max products to return (default: 10)
}

export interface ResearchedProduct extends AmazonProduct {
  relevanceScore?: number;
  whyRelevant?: string;
}

export interface ProductResearchResult {
  query: string;
  products: ResearchedProduct[];
  totalFound: number;
  searchStrategy: string;
}

/**
 * Call Perplexity API
 */
async function callPerplexity(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = getPerplexityApiKey();
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Research products using Perplexity and return Amazon ASINs
 */
export async function researchProducts(request: ProductResearchRequest): Promise<ProductResearchResult> {
  const { category, context, priceRange, limit = 10 } = request;

  console.log(`[Product Research] Researching: "${category}"`);

  const systemPrompt = `You are an Amazon product research assistant. Your job is to find specific Amazon products with their ASINs.

IMPORTANT: You must return REAL Amazon ASINs (10-character codes starting with B0 or consisting of digits/letters).
Format your response as a JSON array of products.

Each product should have:
- asin: The Amazon ASIN (REQUIRED - must be a real ASIN you found)
- title: Product name
- price: Approximate price in USD (number only)
- whyRelevant: Brief explanation of why this product matches the query

Only include products you are confident have valid ASINs. Do not make up ASINs.`;

  const priceConstraint = priceRange
    ? `Price range: $${priceRange.min || 0} - $${priceRange.max || 100}.`
    : 'Any price range.';

  const contextInfo = context
    ? `Context: ${context}`
    : '';

  const prompt = `Find ${limit} popular Amazon products for: "${category}"

${contextInfo}
${priceConstraint}

Search Amazon.com for real products and return their ASINs. Focus on:
- Highly rated products (4+ stars)
- Good value for money
- Currently available items
- Products that match the aesthetic/style requested

Return ONLY a JSON array like this:
[
  {"asin": "B0XXXXXXXXX", "title": "Product Name", "price": 19.99, "whyRelevant": "Why this matches"},
  ...
]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await callPerplexity(prompt, systemPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[Product Research] No JSON found in response:', response.substring(0, 200));
      return {
        query: category,
        products: [],
        totalFound: 0,
        searchStrategy: 'perplexity-failed',
      };
    }

    let parsedProducts: Array<{
      asin: string;
      title: string;
      price?: number;
      whyRelevant?: string;
    }>;

    try {
      parsedProducts = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[Product Research] Failed to parse JSON:', parseError);
      return {
        query: category,
        products: [],
        totalFound: 0,
        searchStrategy: 'perplexity-parse-error',
      };
    }

    // Filter valid ASINs and enrich with scraping
    const validProducts: ResearchedProduct[] = [];

    for (const item of parsedProducts) {
      // Validate ASIN format
      if (!item.asin || !/^[A-Z0-9]{10}$/i.test(item.asin)) {
        console.log(`[Product Research] Skipping invalid ASIN: ${item.asin}`);
        continue;
      }

      const asin = item.asin.toUpperCase();

      // Try to scrape additional details
      console.log(`[Product Research] Enriching product: ${asin}`);
      const scrapedProduct = await scrapeProduct(asin);

      if (scrapedProduct) {
        validProducts.push({
          ...scrapedProduct,
          // Use scraped title if available, otherwise use Perplexity's
          title: scrapedProduct.title !== 'Unknown Product' ? scrapedProduct.title : item.title,
          // Use scraped price if available, otherwise use Perplexity's estimate
          price: scrapedProduct.price || item.price || null,
          whyRelevant: item.whyRelevant,
        });
      } else {
        // Even if scraping fails, we can still use the ASIN
        validProducts.push({
          asin,
          title: item.title || `Amazon Product ${asin}`,
          price: item.price || null,
          currency: 'USD',
          imageUrl: '',
          rating: null,
          reviewCount: null,
          affiliateUrl: formatAffiliateUrl(asin),
          whyRelevant: item.whyRelevant,
        });
      }

      // Small delay between scrapes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stop if we have enough products
      if (validProducts.length >= limit) break;
    }

    console.log(`[Product Research] Found ${validProducts.length} valid products`);

    return {
      query: category,
      products: validProducts,
      totalFound: validProducts.length,
      searchStrategy: 'perplexity-research',
    };
  } catch (error) {
    console.error('[Product Research] Error:', error);
    return {
      query: category,
      products: [],
      totalFound: 0,
      searchStrategy: 'error',
    };
  }
}

/**
 * Discover trending products from Amazon category pages
 * Scrapes product cards directly from listing pages (includes images)
 */
export async function discoverTrendingProducts(
  category: keyof typeof AMAZON_DISCOVERY_PAGES,
  limit: number = 10
): Promise<ProductResearchResult> {
  console.log(`[Product Research] Discovering trending: ${category}`);

  const pageUrl = AMAZON_DISCOVERY_PAGES[category];
  if (!pageUrl) {
    return {
      query: category,
      products: [],
      totalFound: 0,
      searchStrategy: 'invalid-category',
    };
  }

  // Use the new listing page scraper that extracts products with images directly
  const products = await scrapeProductsFromListingPage(pageUrl, limit);

  return {
    query: category,
    products,
    totalFound: products.length,
    searchStrategy: 'amazon-trending',
  };
}

/**
 * Research products matching Sims mod categories
 */
export async function researchSimsRelatedProducts(
  modCategory: string,
  limit: number = 5
): Promise<ProductResearchResult> {
  // Map Sims mod categories to real-world product searches
  const categoryMappings: Record<string, string[]> = {
    'hair': ['hair accessories', 'hair clips', 'scrunchies', 'headbands'],
    'hair-accessories': ['butterfly hair clips', 'claw clips', 'hair barrettes', 'hair pins'],
    'makeup': ['makeup sets', 'lip gloss', 'eyeshadow palette', 'makeup brushes'],
    'clothing': ['trendy tops', 'aesthetic clothing', 'y2k fashion'],
    'tops': ['crop tops', 'trendy blouses', 'aesthetic tops'],
    'bottoms': ['wide leg pants', 'mini skirts', 'trendy jeans'],
    'dresses': ['midi dresses', 'summer dresses', 'party dresses'],
    'jewelry': ['layered necklaces', 'stackable rings', 'charm bracelets'],
    'accessories': ['tote bags', 'sunglasses', 'belts'],
    'home-decor': ['aesthetic room decor', 'LED lights', 'wall art'],
    'furniture': ['accent chairs', 'decorative pillows', 'throw blankets'],
    'cottagecore': ['cottagecore dress', 'vintage aesthetic decor', 'floral accessories'],
    'y2k': ['y2k fashion', 'butterfly clips', '2000s style accessories'],
    'dark-academia': ['dark academia fashion', 'vintage books decor', 'plaid skirts'],
    'fairycore': ['fairy lights', 'butterfly decor', 'whimsical accessories'],
  };

  const searchTerms = categoryMappings[modCategory.toLowerCase()] || [modCategory];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  return researchProducts({
    category: searchTerm,
    context: `Products that would appeal to Sims players interested in ${modCategory} aesthetic`,
    limit,
  });
}

/**
 * Quick affiliate link generation for known ASINs
 */
export function generateAffiliateLinks(asins: string[]): Array<{ asin: string; url: string }> {
  return createAffiliateLinks(asins);
}

/**
 * Check if Perplexity is configured
 */
export function isPerplexityConfigured(): boolean {
  return Boolean(getPerplexityApiKey());
}
