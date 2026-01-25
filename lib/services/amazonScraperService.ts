/**
 * Amazon Scraper Service
 *
 * Scrapes Amazon product pages directly - no API needed.
 * Works with affiliate links in format: https://www.amazon.com/dp/{ASIN}/?tag={TAG}
 */

const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || 'musthavemod04-20';

// User agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

export interface AmazonProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string;
  rating: number | null;
  reviewCount: number | null;
  affiliateUrl: string;
  category?: string;
  brand?: string;
}

export interface ScrapedDeal {
  asin: string;
  title: string;
  imageUrl: string;
  originalPrice: number | null;
  dealPrice: number | null;
  discount: string | null;
  affiliateUrl: string;
}

/**
 * Get a random user agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Add random delay to avoid rate limiting
 */
async function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Format an affiliate URL with partner tag
 */
export function formatAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}/?tag=${PARTNER_TAG}`;
}

/**
 * Extract ASIN from any Amazon URL
 */
export function extractAsin(url: string): string | null {
  if (!url) return null;

  // Match /dp/ASIN pattern
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();

  // Match /gp/product/ASIN pattern
  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (gpMatch) return gpMatch[1].toUpperCase();

  // Match /gp/aw/d/ASIN pattern (mobile)
  const awMatch = url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
  if (awMatch) return awMatch[1].toUpperCase();

  // Match standalone ASIN
  const asinMatch = url.match(/^[A-Z0-9]{10}$/i);
  if (asinMatch) return asinMatch[0].toUpperCase();

  return null;
}

/**
 * Scrape product details from an Amazon product page
 */
export async function scrapeProduct(asinOrUrl: string): Promise<AmazonProduct | null> {
  const asin = extractAsin(asinOrUrl) || asinOrUrl;
  const url = `https://www.amazon.com/dp/${asin}`;

  console.log(`[Amazon Scraper] Fetching product: ${asin}`);

  try {
    await randomDelay(500, 1500);

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
      console.error(`[Amazon Scraper] Failed to fetch ${asin}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract product details using regex (avoiding cheerio dependency)
    const product: AmazonProduct = {
      asin,
      title: extractTitle(html),
      price: extractPrice(html),
      currency: 'USD',
      imageUrl: extractImage(html),
      rating: extractRating(html),
      reviewCount: extractReviewCount(html),
      affiliateUrl: formatAffiliateUrl(asin),
      brand: extractBrand(html) ?? undefined,
    };

    console.log(`[Amazon Scraper] Found: ${product.title?.substring(0, 50)}...`);
    return product;
  } catch (error) {
    console.error(`[Amazon Scraper] Error scraping ${asin}:`, error);
    return null;
  }
}

/**
 * Scrape multiple products by ASIN
 */
export async function scrapeProducts(asins: string[]): Promise<AmazonProduct[]> {
  const products: AmazonProduct[] = [];

  for (const asin of asins) {
    const product = await scrapeProduct(asin);
    if (product) {
      products.push(product);
    }
    // Add delay between requests
    await randomDelay(1000, 2000);
  }

  return products;
}

/**
 * Extract ASINs from an Amazon category/deals page URL
 */
export async function scrapeAsinsFromPage(pageUrl: string): Promise<string[]> {
  console.log(`[Amazon Scraper] Scraping ASINs from: ${pageUrl.substring(0, 80)}...`);

  try {
    await randomDelay(500, 1500);

    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`[Amazon Scraper] Failed to fetch page: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Find all ASINs in the page
    const asinPattern = /\/dp\/([A-Z0-9]{10})/gi;
    const asins = new Set<string>();

    // Use Array.from to avoid downlevelIteration issues with matchAll
    Array.from(html.matchAll(asinPattern)).forEach(match => {
      asins.add(match[1].toUpperCase());
    });

    console.log(`[Amazon Scraper] Found ${asins.size} unique ASINs`);
    return Array.from(asins);
  } catch (error) {
    console.error(`[Amazon Scraper] Error scraping page:`, error);
    return [];
  }
}

// --- HTML Extraction Helpers ---

function extractTitle(html: string): string {
  // Try productTitle span
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)</i);
  if (titleMatch) return titleMatch[1].trim();

  // Try title tag
  const tagMatch = html.match(/<title>([^<]+)</i);
  if (tagMatch) {
    const title = tagMatch[1].replace(/\s*:\s*Amazon\.com\s*:.*$/i, '').trim();
    return title;
  }

  return 'Unknown Product';
}

function extractPrice(html: string): number | null {
  // Try various price patterns
  const patterns = [
    /class="a-price-whole">(\d+)</,
    /class="a-offscreen">\$(\d+\.?\d*)</,
    /"priceAmount":(\d+\.?\d*)/,
    /\$(\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(',', ''));
      if (!isNaN(price) && price > 0 && price < 10000) {
        return price;
      }
    }
  }

  return null;
}

function extractImage(html: string): string {
  // Try main image patterns
  const patterns = [
    /"hiRes":"([^"]+)"/,
    /"large":"([^"]+)"/,
    /id="landingImage"[^>]*src="([^"]+)"/,
    /id="imgBlkFront"[^>]*src="([^"]+)"/,
    /data-old-hires="([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1].includes('images-amazon.com')) {
      return match[1];
    }
  }

  return '';
}

function extractRating(html: string): number | null {
  const match = html.match(/(\d+\.?\d*)\s*out of\s*5\s*stars/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

function extractReviewCount(html: string): number | null {
  const match = html.match(/(\d+,?\d*)\s*(?:global\s*)?ratings?/i);
  if (match) {
    return parseInt(match[1].replace(',', ''), 10);
  }
  return null;
}

function extractBrand(html: string): string | null {
  const patterns = [
    /id="bylineInfo"[^>]*>(?:Visit the\s*)?([^<]+?)(?:\s*Store)?</i,
    /"brand":"([^"]+)"/,
    /Brand:<\/th>[^<]*<td[^>]*>([^<]+)</i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Get trending/deals ASINs from known Amazon pages
 */
export const AMAZON_DISCOVERY_PAGES = {
  // Beauty deals
  beautyDeals: 'https://www.amazon.com/b/?node=213319445011',

  // Movers and Shakers (trending)
  moversAndShakers: 'https://www.amazon.com/gp/movers-and-shakers',
  moversBeauty: 'https://www.amazon.com/gp/movers-and-shakers/beauty',
  moversFashion: 'https://www.amazon.com/gp/movers-and-shakers/fashion',

  // Best Sellers
  bestSellersBeauty: 'https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty',
  bestSellersFashion: 'https://www.amazon.com/Best-Sellers-Fashion/zgbs/fashion',
  bestSellersJewelry: 'https://www.amazon.com/Best-Sellers-Jewelry/zgbs/jewelry',

  // New Releases
  newReleasesBeauty: 'https://www.amazon.com/gp/new-releases/beauty',
  newReleasesFashion: 'https://www.amazon.com/gp/new-releases/fashion',
};

/**
 * Discover products from a category
 */
export async function discoverProducts(
  category: keyof typeof AMAZON_DISCOVERY_PAGES,
  limit: number = 10
): Promise<AmazonProduct[]> {
  const pageUrl = AMAZON_DISCOVERY_PAGES[category];
  if (!pageUrl) {
    console.error(`[Amazon Scraper] Unknown category: ${category}`);
    return [];
  }

  const asins = await scrapeAsinsFromPage(pageUrl);
  const limitedAsins = asins.slice(0, limit);

  return scrapeProducts(limitedAsins);
}

/**
 * Create product info from ASIN without scraping (for quick affiliate link generation)
 */
export function createQuickProduct(asin: string, title?: string): AmazonProduct {
  return {
    asin,
    title: title || `Amazon Product ${asin}`,
    price: null,
    currency: 'USD',
    imageUrl: '',
    rating: null,
    reviewCount: null,
    affiliateUrl: formatAffiliateUrl(asin),
  };
}

/**
 * Batch create affiliate links from ASINs (no scraping needed)
 */
export function createAffiliateLinks(asins: string[]): Array<{ asin: string; url: string }> {
  return asins.map(asin => ({
    asin: asin.toUpperCase(),
    url: formatAffiliateUrl(asin),
  }));
}
