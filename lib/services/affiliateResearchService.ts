/**
 * Affiliate Research Service
 *
 * Data-driven product discovery based on mod content analysis.
 * Analyzes mod downloads by contentType and theme, then finds matching
 * real-world products that align with audience demographics.
 *
 * PRD: Affiliate Research Agent System
 */

import { prisma } from '@/lib/prisma';
import { PerplexityService } from '@/lib/services/perplexityService';
import { personaSwarmService } from '@/lib/services/personaSwarmService';
import { Prisma } from '@prisma/client';
import {
  researchProducts as perplexityResearch,
  discoverTrendingProducts,
  type ResearchedProduct,
} from '@/lib/services/affiliateProductResearch';
import {
  formatAffiliateUrl,
  scrapeProduct,
  THEME_TO_CATEGORIES,
  AMAZON_DISCOVERY_PAGES,
  type AmazonProduct,
} from '@/lib/services/amazonScraperService';
import { scrapeProductsFromListingPage } from '@/lib/services/amazonScraperService';

// Amazon Associates affiliate tag
const AMAZON_AFFILIATE_TAG = process.env.AMAZON_PARTNER_TAG || 'musthavemod04-20';

// Product candidate from research
export interface ProductCandidate {
  name: string;
  description?: string;
  price: number;
  category: string;
  amazonUrl?: string;
  imageUrl?: string;
  matchingThemes: string[];
  matchingContentTypes: string[];
}

// Scored product after applying algorithm
export interface ScoredProduct extends ProductCandidate {
  demographicScore: number;
  aestheticScore: number;
  priceScore: number;
  trendScore: number;
  finalScore: number;
  rejected: boolean;
  rejectionReason?: string;
}

// Validated product after persona swarm
export interface ValidatedProduct extends ScoredProduct {
  personaValidated: boolean;
  personaScore: number;
  personaFeedback: string;
  personaVotes: Record<string, unknown>;
}

// Research cycle result
export interface ResearchResult {
  runId: string;
  themesAnalyzed: string[];
  contentTypesAnalyzed: string[];
  productsFound: number;
  productsValidated: number;
  offersCreated: number;
  summary: string;
}

// Content distribution analysis
export interface ContentDistribution {
  contentTypes: { type: string; count: number; downloads: number }[];
  themes: { theme: string; count: number; downloads: number }[];
}

// Negative keywords that trigger auto-rejection
const REJECT_KEYWORDS = [
  'gaming',
  'gamer',
  'rgb',
  'esports',
  'mechanical keyboard',
  'mouse pad',
  'headset',
  'controller',
  'console',
];

// Rejected categories
const REJECT_CATEGORIES = [
  'peripherals',
  'tech',
  'computer',
  'electronics',
  'gaming',
];

/**
 * Extract ASIN from Amazon URL
 * Handles formats like:
 * - https://www.amazon.com/dp/B0C9V0W1X2
 * - https://amazon.com/gp/product/B0C9V0W1X2
 * - https://www.amazon.com/Some-Product-Name/dp/B0C9V0W1X2/ref=...
 */
function extractAsin(url: string): string | null {
  if (!url) return null;

  // Match /dp/ASIN or /gp/product/ASIN patterns
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();

  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (gpMatch) return gpMatch[1].toUpperCase();

  return null;
}

// Theme to product category mapping
const THEME_TO_PRODUCTS: Record<string, string[]> = {
  y2k: ['butterfly clips', 'chunky jewelry', 'lip gloss', 'mini bags', 'platform shoes'],
  cottagecore: ['fairy lights', 'floral dresses', 'wicker baskets', 'dried flowers', 'linen items'],
  goth: ['dark makeup', 'chokers', 'silver jewelry', 'black candles', 'velvet items'],
  modern: ['minimalist decor', 'neutral colors', 'clean-line furniture', 'geometric shapes'],
  preppy: ['hair bows', 'pearl jewelry', 'plaid accessories', 'ribbon headbands'],
  boho: ['macrame', 'turquoise jewelry', 'fringe bags', 'dreamcatchers'],
  vintage: ['retro accessories', 'antique-style jewelry', 'vinyl records', 'polaroid frames'],
};

/**
 * AffiliateResearchService class - discovers products matching audience interests
 */
export class AffiliateResearchService {
  /**
   * Analyze content distribution from mod downloads
   * Returns top contentTypes and themes by download count
   */
  async analyzeContentDistribution(): Promise<ContentDistribution> {
    // Get content type distribution
    const contentTypeGroups = await prisma.mod.groupBy({
      by: ['contentType'],
      where: {
        contentType: { not: null },
        isVerified: true,
      },
      _count: { id: true },
      _sum: { downloadCount: true },
      orderBy: { _sum: { downloadCount: 'desc' } },
      take: 20,
    });

    const contentTypes = contentTypeGroups
      .filter((g) => g.contentType)
      .map((g) => ({
        type: g.contentType!,
        count: g._count.id,
        downloads: g._sum.downloadCount ?? 0,
      }));

    // Get theme distribution by unnesting themes array
    // Using raw query since Prisma doesn't support array unnest in groupBy
    const themeStats = await prisma.$queryRaw<
      { theme: string; count: bigint; downloads: bigint }[]
    >(Prisma.sql`
      SELECT
        unnest(themes) as theme,
        COUNT(*) as count,
        SUM("downloadCount") as downloads
      FROM mods
      WHERE "isVerified" = true AND array_length(themes, 1) > 0
      GROUP BY unnest(themes)
      ORDER BY downloads DESC
      LIMIT 20
    `);

    const themes = themeStats.map((t) => ({
      theme: t.theme,
      count: Number(t.count),
      downloads: Number(t.downloads),
    }));

    return { contentTypes, themes };
  }

  /**
   * Research products for a specific theme using targeted Amazon category pages
   *
   * Flow:
   * 1. Map theme to relevant Amazon category pages (hair clips, jewelry, etc.)
   * 2. Scrape products from those specific category best-seller pages
   * 3. Return products with verified ASINs and affiliate links
   */
  async researchProductsForTheme(theme: string): Promise<ProductCandidate[]> {
    const allCategories = THEME_TO_CATEGORIES[theme] || ['hairAccessories', 'womensEarrings'];
    // Only use first 2 categories to reduce requests and avoid rate limiting
    const categories = allCategories.slice(0, 2);
    const allProducts: ProductCandidate[] = [];

    console.log(`[Research] Fetching "${theme}" products from ${categories.length} categories...`);

    for (const categoryKey of categories) {
      const pageUrl = AMAZON_DISCOVERY_PAGES[categoryKey];
      if (!pageUrl) continue;

      console.log(`[Research] Scraping category: ${categoryKey}`);

      try {
        const products = await scrapeProductsFromListingPage(pageUrl, 5);

        for (const product of products) {
          // Skip products without valid data
          if (!product.asin || !product.imageUrl) {
            continue;
          }

          // Skip products that are too expensive or too cheap
          if (product.price && (product.price > 75 || product.price < 5)) {
            continue;
          }

          // Determine category from the product
          const category = this.inferCategory(product.title, theme);

          allProducts.push({
            name: product.title,
            description: `${theme} style ${categoryKey}`,
            price: product.price || 25,
            category,
            amazonUrl: product.affiliateUrl,
            imageUrl: product.imageUrl,
            matchingThemes: [theme],
            matchingContentTypes: this.mapCategoryToContentTypes(category),
          });
        }

        console.log(`[Research] Found ${products.length} products from ${categoryKey}`);

        // Small delay between category fetches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Research] Error fetching ${categoryKey}:`, error);
      }
    }

    console.log(`[Research] Total products found for "${theme}": ${allProducts.length}`);
    return allProducts;
  }

  /**
   * Infer product category from title and theme
   */
  private inferCategory(title: string, theme: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('clip') || titleLower.includes('hair')) return 'hair-accessories';
    if (titleLower.includes('necklace') || titleLower.includes('earring') || titleLower.includes('bracelet') || titleLower.includes('ring')) return 'jewelry';
    if (titleLower.includes('decor') || titleLower.includes('light') || titleLower.includes('candle')) return 'home-decor';
    if (titleLower.includes('makeup') || titleLower.includes('lip') || titleLower.includes('gloss') || titleLower.includes('mascara')) return 'beauty';
    if (titleLower.includes('dress') || titleLower.includes('shirt') || titleLower.includes('skirt') || titleLower.includes('top')) return 'fashion';
    if (titleLower.includes('bag') || titleLower.includes('purse')) return 'accessories';

    // Default based on theme
    const themeDefaults: Record<string, string> = {
      y2k: 'accessories',
      cottagecore: 'home-decor',
      goth: 'jewelry',
      modern: 'home-decor',
      preppy: 'accessories',
      boho: 'jewelry',
      vintage: 'accessories',
    };

    return themeDefaults[theme] || 'accessories';
  }

  /**
   * Use Perplexity to generate optimal Amazon search keywords for a theme
   */
  private async generateSearchKeywords(
    theme: string,
    productTypes: string[]
  ): Promise<Array<{ keywords: string; category: string }>> {
    const productList = productTypes.join(', ');

    const systemPrompt = `You are a search keyword optimizer for Amazon product searches.
You generate specific, effective search terms that will find real products on Amazon.
You MUST respond with ONLY valid JSON. No explanatory text or markdown.`;

    const prompt = `Generate 5 specific Amazon search queries for "${theme}" aesthetic products.

Target audience: Women 18-34 who play The Sims 4 and like aesthetic items
Product types: ${productList}
Price range: $10-75

For each search query, provide:
- keywords: Specific search terms (2-5 words) that will find real products on Amazon
- category: One of: hair-accessories, jewelry, accessories, home-decor, beauty, fashion

Examples of GOOD search keywords:
- "butterfly hair clips y2k" (specific, will find real products)
- "cottagecore mushroom decor" (aesthetic + specific item type)
- "chunky gold hoop earrings" (style + item type)

Examples of BAD search keywords:
- "cute things" (too vague)
- "aesthetic items" (too broad)
- "sims 4 merchandise" (wrong category)

Response format - return ONLY this JSON array:
[
  { "keywords": "butterfly hair clips rhinestone", "category": "hair-accessories" },
  { "keywords": "gold chunky chain necklace y2k", "category": "jewelry" }
]

Return exactly 5 search queries. JSON only, no other text.`;

    try {
      const response = await PerplexityService.query(prompt, systemPrompt);

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Failed to parse Perplexity keyword response:', response);
        // Fallback to basic keywords
        return productTypes.slice(0, 3).map((type) => ({
          keywords: `${theme} ${type}`,
          category: this.mapProductTypeToCategory(type),
        }));
      }

      const queries: Array<{ keywords: string; category: string }> = JSON.parse(jsonMatch[0]);
      return queries.slice(0, 5); // Limit to 5 queries
    } catch (error) {
      console.error('Error generating search keywords:', error);
      // Fallback to basic keywords
      return productTypes.slice(0, 3).map((type) => ({
        keywords: `${theme} ${type}`,
        category: this.mapProductTypeToCategory(type),
      }));
    }
  }

  /**
   * Map product type string to category
   */
  private mapProductTypeToCategory(productType: string): string {
    const type = productType.toLowerCase();
    if (type.includes('clip') || type.includes('hair')) return 'hair-accessories';
    if (type.includes('jewelry') || type.includes('necklace') || type.includes('earring')) return 'jewelry';
    if (type.includes('decor') || type.includes('light') || type.includes('candle')) return 'home-decor';
    if (type.includes('makeup') || type.includes('lip') || type.includes('gloss')) return 'beauty';
    if (type.includes('dress') || type.includes('shoe') || type.includes('bag')) return 'fashion';
    return 'accessories';
  }

  /**
   * Score a product using the demographic fit algorithm
   */
  scoreProduct(product: ProductCandidate): ScoredProduct {
    // Check for auto-rejection
    const nameLower = product.name.toLowerCase();
    const categoryLower = product.category.toLowerCase();

    // Check reject keywords
    for (const keyword of REJECT_KEYWORDS) {
      if (nameLower.includes(keyword)) {
        return {
          ...product,
          demographicScore: 0,
          aestheticScore: 0,
          priceScore: 0,
          trendScore: 0,
          finalScore: 0,
          rejected: true,
          rejectionReason: `Contains rejected keyword: "${keyword}"`,
        };
      }
    }

    // Check reject categories
    for (const cat of REJECT_CATEGORIES) {
      if (categoryLower.includes(cat)) {
        return {
          ...product,
          demographicScore: 0,
          aestheticScore: 0,
          priceScore: 0,
          trendScore: 0,
          finalScore: 0,
          rejected: true,
          rejectionReason: `Rejected category: "${product.category}"`,
        };
      }
    }

    // Check price
    if (product.price > 75) {
      return {
        ...product,
        demographicScore: 0,
        aestheticScore: 0,
        priceScore: 0,
        trendScore: 0,
        finalScore: 0,
        rejected: true,
        rejectionReason: `Price too high: $${product.price}`,
      };
    }

    // Calculate demographic score (35% weight)
    // Higher for fashion, beauty, home decor categories
    const goodCategories = ['accessories', 'jewelry', 'decor', 'fashion', 'beauty', 'hair'];
    const demographicScore = goodCategories.some((c) => categoryLower.includes(c)) ? 85 : 60;

    // Calculate aesthetic score (30% weight)
    // Higher for products matching popular themes
    const trendyThemes = ['y2k', 'cottagecore', 'goth', 'modern', 'preppy'];
    const matchingTrendy = product.matchingThemes.filter((t) =>
      trendyThemes.includes(t.toLowerCase())
    ).length;
    const aestheticScore = Math.min(100, 50 + matchingTrendy * 25);

    // Calculate price score (20% weight)
    // Sweet spot is $15-50
    let priceScore: number;
    if (product.price >= 15 && product.price <= 50) {
      priceScore = 100;
    } else if (product.price < 15) {
      priceScore = 60 + (product.price / 15) * 20;
    } else {
      // $50-75
      priceScore = 100 - ((product.price - 50) / 25) * 40;
    }

    // Calculate trend score (15% weight)
    // Based on matching themes that are currently trending
    const hotThemes = ['y2k', 'cottagecore'];
    const trendScore = product.matchingThemes.some((t) => hotThemes.includes(t.toLowerCase()))
      ? 90
      : 60;

    // Calculate final weighted score
    const finalScore =
      demographicScore * 0.35 +
      aestheticScore * 0.3 +
      priceScore * 0.2 +
      trendScore * 0.15;

    return {
      ...product,
      demographicScore,
      aestheticScore,
      priceScore,
      trendScore,
      finalScore,
      rejected: false,
    };
  }

  /**
   * Run a complete research cycle
   */
  async runResearchCycle(limit: number = 10, specificThemes?: string[]): Promise<ResearchResult> {
    // Create research run record
    const run = await prisma.affiliateResearchRun.create({
      data: {
        runType: 'discovery',
        status: 'running',
        sourceTypes: ['perplexity', 'amazon'],
        categories: [],
        partners: [],
        themesAnalyzed: [],
        contentTypesAnalyzed: [],
      },
    });

    try {
      // Step 1: Analyze content distribution
      const distribution = await this.analyzeContentDistribution();

      // Determine themes to research - shuffle to get variety each run
      const allThemes = distribution.themes.slice(0, 10).map((t) => t.theme);
      const shuffledThemes = allThemes.sort(() => Math.random() - 0.5);
      const themesToResearch = specificThemes || shuffledThemes.slice(0, 5);

      // Update run with themes
      await prisma.affiliateResearchRun.update({
        where: { id: run.id },
        data: {
          themesAnalyzed: themesToResearch,
          contentTypesAnalyzed: distribution.contentTypes.slice(0, 10).map((c) => c.type),
        },
      });

      // Step 2: Search Amazon for theme-specific products (PRIMARY SOURCE)
      // These are targeted searches that match our persona interests
      // Note: Amazon rate limits aggressively, so we limit to 1-2 themes per run
      console.log('[Research] Searching Amazon for theme-specific products...');
      const allProducts: ProductCandidate[] = [];
      let amazonSearches = 0;

      // Only search 1 theme per run to avoid rate limiting
      for (const theme of themesToResearch.slice(0, 1)) {
        try {
          const products = await this.researchProductsForTheme(theme);
          const validProducts = products.filter(p => p.imageUrl && p.amazonUrl);
          allProducts.push(...validProducts);
          amazonSearches++;
          console.log(`[Research] Found ${validProducts.length} products for "${theme}"`);
        } catch (error) {
          console.log(`[Research] Could not search for "${theme}":`, error);
        }
      }

      // Step 2b: Supplement with trending products if we need more
      // (Only if theme searches didn't return enough)
      let perplexityQueries = 0; // Keep for stats compatibility
      if (allProducts.length < limit) {
        console.log('[Research] Supplementing with trending products...');
        // Only use 1 trending category to reduce requests and avoid rate limiting
        const trendingCategories: Array<'moversFashion' | 'bestSellersJewelry'> = [
          'moversFashion',
        ];

        for (const category of trendingCategories) {
          try {
            const trending = await discoverTrendingProducts(category, 5);
            for (const product of trending.products) {
              if (product.asin && product.imageUrl && product.price && product.price <= 75 && product.price >= 10) {
                allProducts.push({
                  name: product.title,
                  description: product.brand || category,
                  price: product.price,
                  category: this.inferCategory(product.title, category),
                  amazonUrl: product.affiliateUrl,
                  imageUrl: product.imageUrl,
                  matchingThemes: themesToResearch,
                  matchingContentTypes: this.mapCategoryToContentTypes(this.inferCategory(product.title, category)),
                });
              }
            }
            console.log(`[Research] Added ${trending.products.filter(p => p.imageUrl).length} products from ${category}`);
          } catch (error) {
            console.log(`[Research] Could not fetch ${category}:`, error);
          }
          // Longer delay between trending category requests
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      // Step 3: Score all products
      const scoredProducts = allProducts.map((p) => this.scoreProduct(p));
      const validProducts = scoredProducts.filter((p) => !p.rejected);

      // Sort by final score and take top N
      validProducts.sort((a, b) => b.finalScore - a.finalScore);
      const topProducts = validProducts.slice(0, limit);

      // Step 4: Validate with persona swarm
      const validatedProducts: ValidatedProduct[] = [];
      let personaEvaluations = 0;

      console.log('\n[Persona Validation] Evaluating products...');
      for (const product of topProducts) {
        const evaluation = await personaSwarmService.evaluateProduct({
          name: product.name,
          price: product.price,
          category: product.category,
          description: product.description,
        });

        const personaCount = Object.keys(evaluation.votes).length;
        personaEvaluations += personaCount;

        // Log the score for debugging
        const statusIcon = evaluation.approvalCount >= 4 ? '✅' : evaluation.approvalCount >= 3 ? '⚠️' : '❌';
        console.log(`  ${statusIcon} ${evaluation.approvalCount}/${personaCount} - ${product.name.substring(0, 45)}...`);

        validatedProducts.push({
          ...product,
          personaValidated: evaluation.passed,
          personaScore: evaluation.approvalCount,
          personaFeedback: evaluation.summary,
          personaVotes: evaluation.votes,
        });
      }

      // Step 5: Create offers for products with at least 1 persona buyer
      // Filter to products that have at least 1 persona who would buy
      const approvedProducts = validatedProducts.filter((p) => p.personaScore >= 3);
      let offersCreated = 0;
      let duplicatesSkipped = 0;

      for (const product of approvedProducts) {
        // Only create if we have a valid affiliate URL
        if (!product.amazonUrl || !product.amazonUrl.includes(AMAZON_AFFILIATE_TAG)) {
          console.log(`Skipping "${product.name}" - no valid affiliate URL`);
          continue;
        }
        const offerId = await this.createOfferFromProduct(product, run.id);
        if (offerId) {
          offersCreated++;
        } else {
          duplicatesSkipped++;
        }
      }

      // Update run record
      const logSummary = duplicatesSkipped > 0
        ? `Found ${allProducts.length} products, validated ${topProducts.length}, created ${offersCreated} offers (${duplicatesSkipped} duplicates skipped)`
        : `Found ${allProducts.length} products, validated ${topProducts.length}, created ${offersCreated} offers`;

      await prisma.affiliateResearchRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
          productsFound: allProducts.length,
          productsValidated: topProducts.length,
          personaEvaluations,
          perplexityQueries,
          offersDiscovered: offersCreated,
          logSummary,
        },
      });

      const summary = duplicatesSkipped > 0
        ? `${offersCreated}/${topProducts.length} products passed persona validation (${duplicatesSkipped} duplicates skipped)`
        : `${offersCreated}/${topProducts.length} products passed persona validation`;

      return {
        runId: run.id,
        themesAnalyzed: themesToResearch,
        contentTypesAnalyzed: distribution.contentTypes.slice(0, 10).map((c) => c.type),
        productsFound: allProducts.length,
        productsValidated: topProducts.length,
        offersCreated,
        summary,
      };
    } catch (error) {
      // Update run with error
      await prisma.affiliateResearchRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorsEncountered: 1,
          errorDetails: { error: String(error) },
        },
      });

      throw error;
    }
  }

  /**
   * Create an AffiliateOffer from a validated product
   */
  async createOfferFromProduct(
    product: ValidatedProduct,
    researchRunId: string
  ): Promise<string | null> {
    // Extract ASIN for image URL if needed
    const asin = extractAsin(product.amazonUrl || '');
    const imageUrl = product.imageUrl ||
      (asin ? `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL250_&ID=AsinImage&ServiceVersion=20070822&WS=1` : '');

    try {
      const offer = await prisma.affiliateOffer.create({
        data: {
          name: product.name,
          description: product.description,
          imageUrl,
          affiliateUrl: product.amazonUrl || '',
          partner: 'amazon',
          category: product.category,
          priority: Math.round(product.finalScore),
          isActive: true, // Auto-activate since we validated the URL
          salePrice: new Prisma.Decimal(product.price),
          researchRunId,
          sourceType: 'perplexity',
          validationStatus: 'validated',
          validatedAt: new Date(),
          matchingThemes: product.matchingThemes,
          matchingContentTypes: product.matchingContentTypes,
          demographicScore: new Prisma.Decimal(product.demographicScore),
          aestheticScore: new Prisma.Decimal(product.aestheticScore),
          priceScore: new Prisma.Decimal(product.priceScore),
          trendScore: new Prisma.Decimal(product.trendScore),
          finalScore: new Prisma.Decimal(product.finalScore),
          personaValidated: product.personaScore >= 3, // 3/8 personas approval (37.5%+)
          personaScore: product.personaScore,
          personaVotes: product.personaVotes as Prisma.InputJsonValue,
          personaFeedback: product.personaFeedback,
        },
      });

      return offer.id;
    } catch (error: unknown) {
      // Handle duplicate affiliate URL gracefully
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        console.log(`[Research] Skipping duplicate product: ${product.name.substring(0, 40)}...`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Map product category to mod content types
   */
  private mapCategoryToContentTypes(category: string): string[] {
    const categoryLower = category.toLowerCase();
    const mappings: Record<string, string[]> = {
      'hair': ['hair'],
      'accessories': ['accessories', 'jewelry'],
      'jewelry': ['jewelry', 'accessories'],
      'makeup': ['makeup'],
      'beauty': ['makeup', 'skin'],
      'fashion': ['tops', 'bottoms', 'dresses'],
      'clothing': ['tops', 'bottoms', 'dresses', 'full-body'],
      'decor': ['furniture', 'decor', 'clutter'],
      'home': ['furniture', 'decor', 'lighting'],
      'lighting': ['lighting'],
    };

    for (const [key, types] of Object.entries(mappings)) {
      if (categoryLower.includes(key)) {
        return types;
      }
    }

    return ['accessories'];
  }
}

// Export singleton instance
export const affiliateResearchService = new AffiliateResearchService();
