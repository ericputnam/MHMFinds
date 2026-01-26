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
async function randomDelay(minMs: number = 3000, maxMs: number = 6000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Decode HTML entities and clean up product titles
 */
function cleanTitle(title: string): string {
  if (!title) return title;

  // Decode common HTML entities
  let cleaned = title
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Truncate at natural breakpoints if title is too long (Amazon keyword spam)
  // Look for patterns like "Product Name, Feature1, Feature2, Feature3..."
  if (cleaned.length > 80) {
    // Try to find a good cutoff point
    const breakPatterns = [
      /^(.{40,80}),\s*\d+\s*(Pack|Count|Piece|Oz|ml)/i,  // "Product, 2 Pack"
      /^(.{40,80})\s*-\s*[A-Z]/,                         // "Product - Feature"
      /^(.{40,80}),\s*[A-Z][a-z]+ing\b/,                 // "Product, Volumizing..."
      /^(.{40,80})\s+for\s+/i,                           // "Product for Women..."
    ];

    for (const pattern of breakPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        cleaned = match[1].trim();
        // Remove trailing comma if present
        if (cleaned.endsWith(',')) {
          cleaned = cleaned.slice(0, -1);
        }
        break;
      }
    }

    // If still too long, just truncate at 80 chars at word boundary
    if (cleaned.length > 100) {
      const truncated = cleaned.substring(0, 80);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 50) {
        cleaned = truncated.substring(0, lastSpace);
      }
    }
  }

  return cleaned;
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
export async function scrapeProduct(asinOrUrl: string, retryCount: number = 0): Promise<AmazonProduct | null> {
  const asin = extractAsin(asinOrUrl) || asinOrUrl;
  const url = `https://www.amazon.com/dp/${asin}`;

  console.log(`[Amazon Scraper] Fetching product: ${asin}`);

  try {
    await randomDelay(2000, 4000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    });

    if (response.status === 429) {
      if (retryCount < 2) {
        const waitTime = 10000 + (retryCount * 5000);
        console.log(`[Amazon Scraper] Rate limited on ${asin}. Waiting ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return scrapeProduct(asinOrUrl, retryCount + 1);
      }
      console.error(`[Amazon Scraper] Rate limited on ${asin} after retries. Skipping.`);
      return null;
    }

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
    // Longer delay between requests to avoid rate limiting
    await randomDelay(3000, 5000);
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

/**
 * Scrape product cards directly from Amazon listing pages (trending, best sellers, etc.)
 * This extracts products with images directly from the listing page HTML
 */
export async function scrapeProductsFromListingPage(pageUrl: string, limit: number = 10, retryCount: number = 0): Promise<AmazonProduct[]> {
  console.log(`[Amazon Scraper] Scraping product cards from: ${pageUrl.substring(0, 60)}...`);

  try {
    // Longer delay to avoid rate limiting
    await randomDelay(4000, 8000);

    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (response.status === 429) {
      if (retryCount < 2) {
        const waitTime = 15000 + (retryCount * 10000); // 15s, then 25s
        console.log(`[Amazon Scraper] Rate limited (429). Waiting ${waitTime/1000}s and retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return scrapeProductsFromListingPage(pageUrl, limit, retryCount + 1);
      }
      console.error(`[Amazon Scraper] Rate limited (429) after ${retryCount + 1} attempts. Giving up on this page.`);
      return [];
    }

    if (!response.ok) {
      console.error(`[Amazon Scraper] Failed to fetch listing page: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const products: AmazonProduct[] = [];

    // Extract product data from the page
    // Look for data-asin attributes and nearby image/title/price data
    const productPattern = /data-asin="([A-Z0-9]{10})"/gi;
    const asinMatches = Array.from(html.matchAll(productPattern));
    const seenAsins = new Set<string>();

    for (const match of asinMatches) {
      const asin = match[1].toUpperCase();
      if (seenAsins.has(asin)) continue;
      seenAsins.add(asin);

      // Find the product section around this ASIN
      const asinIndex = match.index || 0;
      const sectionStart = Math.max(0, asinIndex - 500);
      const sectionEnd = Math.min(html.length, asinIndex + 2000);
      const section = html.substring(sectionStart, sectionEnd);

      // Extract image URL - look for image sources near this ASIN
      let imageUrl = '';
      const imgPatterns = [
        /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\._[^"]*\.jpg)"/i,
        /src="(https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[^"]+\.jpg)"/i,
        /data-a-dynamic-image="\{&quot;(https:\/\/[^&]+)&quot;/i,
      ];
      for (const pattern of imgPatterns) {
        const imgMatch = section.match(pattern);
        if (imgMatch) {
          imageUrl = imgMatch[1].replace(/\._[A-Z0-9,_]+_\./, '._SL500_.');
          break;
        }
      }

      // Extract title - try multiple patterns, prioritize image alt text
      let title = '';

      // First try: Image alt text (usually best)
      const altMatch = section.match(/alt="([^"]{15,250})"/i);
      if (altMatch) {
        const candidate = cleanTitle(altMatch[1].trim());
        if (!candidate.toLowerCase().includes('arrow') &&
            !candidate.toLowerCase().includes('star') &&
            !candidate.toLowerCase().includes('rating')) {
          title = candidate;
        }
      }

      // Fallback: Look for product link text
      if (!title) {
        const linkMatch = section.match(/<a[^>]*class="[^"]*a-link-normal[^"]*"[^>]*title="([^"]+)"/i);
        if (linkMatch) {
          title = cleanTitle(linkMatch[1].trim());
        }
      }

      // Final fallback
      if (!title) {
        title = `Amazon Product ${asin}`;
      }

      // Extract price
      let price: number | null = null;
      const pricePatterns = [
        /class="[^"]*a-price[^"]*"[^>]*>[\s\S]*?<span[^>]*>[\s\S]*?\$(\d+\.?\d*)/i,
        /\$(\d+\.?\d*)/,
      ];
      for (const pattern of pricePatterns) {
        const priceMatch = section.match(pattern);
        if (priceMatch) {
          const parsed = parseFloat(priceMatch[1]);
          if (parsed > 0 && parsed < 1000) {
            price = parsed;
            break;
          }
        }
      }

      // Extract rating
      let rating: number | null = null;
      const ratingMatch = section.match(/(\d\.?\d?)\s*out of\s*5/i);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }

      // Only add products that have an image URL (we need images for affiliate display)
      if (imageUrl) {
        products.push({
          asin,
          title,
          price,
          currency: 'USD',
          imageUrl,
          rating,
          reviewCount: null,
          affiliateUrl: formatAffiliateUrl(asin),
        });

        if (products.length >= limit) break;
      }
    }

    console.log(`[Amazon Scraper] Extracted ${products.length} products with images from listing page`);

    // For products without proper titles, fetch title from product page
    for (const product of products) {
      if (product.title.startsWith('Amazon Product ')) {
        try {
          await randomDelay(300, 800);
          const detailedProduct = await scrapeProduct(product.asin);
          if (detailedProduct && detailedProduct.title !== 'Unknown Product') {
            product.title = detailedProduct.title;
            if (detailedProduct.price && !product.price) {
              product.price = detailedProduct.price;
            }
            if (detailedProduct.rating) {
              product.rating = detailedProduct.rating;
            }
          }
        } catch {
          // Keep fallback title if fetch fails
        }
      }
    }

    console.log(`[Amazon Scraper] Enriched ${products.filter(p => !p.title.startsWith('Amazon Product ')).length} products with titles`);
    return products;
  } catch (error) {
    console.error(`[Amazon Scraper] Error scraping listing page:`, error);
    return [];
  }
}

// --- HTML Extraction Helpers ---

function extractTitle(html: string): string {
  // Try productTitle span
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)</i);
  if (titleMatch) return cleanTitle(titleMatch[1].trim());

  // Try title tag
  const tagMatch = html.match(/<title>([^<]+)</i);
  if (tagMatch) {
    const title = tagMatch[1].replace(/\s*:\s*Amazon\.com\s*:.*$/i, '').trim();
    return cleanTitle(title);
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

  // Best Sellers - General
  bestSellersBeauty: 'https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty',
  bestSellersFashion: 'https://www.amazon.com/Best-Sellers-Fashion/zgbs/fashion',
  bestSellersJewelry: 'https://www.amazon.com/Best-Sellers-Jewelry/zgbs/jewelry',

  // Best Sellers - Targeted categories for Sims personas
  // Verified working Amazon Best Seller category URLs
  hairClips: 'https://www.amazon.com/gp/bestsellers/beauty/11057591',
  hairAccessories: 'https://www.amazon.com/gp/bestsellers/beauty/11057241',
  lipProducts: 'https://www.amazon.com/gp/bestsellers/beauty/11058281', // Lip balm/gloss
  eyeshadowPalettes: 'https://www.amazon.com/gp/bestsellers/beauty/11058071',
  womensEarrings: 'https://www.amazon.com/gp/bestsellers/fashion/7192397011',
  womensNecklaces: 'https://www.amazon.com/gp/bestsellers/fashion/7192398011',
  womensBracelets: 'https://www.amazon.com/gp/bestsellers/fashion/7192395011',

  // New Releases
  newReleasesBeauty: 'https://www.amazon.com/gp/new-releases/beauty',
  newReleasesFashion: 'https://www.amazon.com/gp/new-releases/fashion',
};

// Map themes to relevant Amazon categories
// Note: Using movers/shakers and general bestseller URLs that don't require CAPTCHA
// The specific category node URLs (like /gp/bestsellers/fashion/7192397011) are blocked
export const THEME_TO_CATEGORIES: Record<string, Array<keyof typeof AMAZON_DISCOVERY_PAGES>> = {
  y2k: ['moversFashion', 'moversBeauty'],
  modern: ['moversFashion', 'moversBeauty'],
  luxury: ['moversFashion', 'bestSellersJewelry'],
  minimalist: ['moversFashion', 'bestSellersJewelry'],
  cozy: ['moversBeauty', 'moversFashion'],
  fantasy: ['moversBeauty', 'moversFashion'],
  romantic: ['moversFashion', 'moversBeauty'],
  streetwear: ['moversFashion', 'moversBeauty'],
  cottagecore: ['moversFashion', 'moversBeauty'],
  goth: ['moversBeauty', 'moversFashion'],
  preppy: ['moversFashion', 'moversBeauty'],
  boho: ['moversFashion', 'bestSellersJewelry'],
  vintage: ['moversFashion', 'moversBeauty'],
  christmas: ['moversFashion', 'moversBeauty'],
  'living-room': ['moversFashion', 'moversBeauty'],
  witchy: ['moversBeauty', 'moversFashion'],
};

/**
 * Search Amazon for specific products by keyword
 * Returns real products with valid ASINs
 */
export async function searchAmazonProducts(
  query: string,
  limit: number = 10
): Promise<AmazonProduct[]> {
  const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  console.log(`[Amazon Scraper] Searching: "${query}"`);

  const products = await scrapeProductsFromListingPage(searchUrl, limit);
  console.log(`[Amazon Scraper] Found ${products.length} products for "${query}"`);

  return products;
}

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
