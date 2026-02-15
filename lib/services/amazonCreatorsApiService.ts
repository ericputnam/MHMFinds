/**
 * Amazon Creators API Service
 *
 * Uses the new Creators API (replacement for PA-API 5.0) to search
 * and retrieve Amazon products with affiliate links.
 *
 * Docs: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/
 */

// Configuration from environment
const CREDENTIAL_ID = process.env.AMAZON_CREATORS_CREDENTIAL_ID || '';
const CREDENTIAL_SECRET = process.env.AMAZON_CREATORS_CREDENTIAL_SECRET || '';
const APPLICATION_ID = process.env.AMAZON_CREATORS_APPLICATION_ID || '';
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || 'musthavemod04-20';

// API Configuration - Creators API endpoints (from official SDK)
// Token endpoint varies by region: 2.1=NA, 2.2=EU, 2.3=FE
const TOKEN_ENDPOINT = 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token';
const API_BASE_URL = 'https://creatorsapi.amazon';
const OAUTH_SCOPE = 'creatorsapi/default';
const CREDENTIAL_VERSION = '2.1'; // NA region
const MARKETPLACE = 'www.amazon.com';

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

// Product result from API
export interface AmazonProduct {
  asin: string;
  title: string;
  detailPageUrl: string;
  imageUrl: string;
  price: number | null;
  currency: string;
  category: string;
  brand: string | null;
}

// Search parameters
export interface SearchParams {
  keywords: string;
  searchIndex?: string;
  minPrice?: number;
  maxPrice?: number;
  itemCount?: number;
}

/**
 * Get OAuth access token using Cognito client credentials flow
 *
 * Uses body params (NOT Basic Auth) as shown in official SDK.
 */
async function getAccessToken(): Promise<string> {
  // Check cache first
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  if (!CREDENTIAL_ID || !CREDENTIAL_SECRET) {
    throw new Error('Amazon Creators API credentials not configured. Set AMAZON_CREATORS_CREDENTIAL_ID and AMAZON_CREATORS_CREDENTIAL_SECRET');
  }

  console.log('[Amazon Creators API] Fetching access token from Cognito...');

  try {
    // Use body params (not Basic Auth) per official SDK
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CREDENTIAL_ID,
        client_secret: CREDENTIAL_SECRET,
        scope: OAUTH_SCOPE,
      }).toString(),
    });

    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);

      // Cache the token with 30-second buffer (per SDK)
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + ((data.expires_in || 3600) - 30) * 1000,
      };

      console.log('[Amazon Creators API] Access token obtained successfully');
      return data.access_token;
    }

    console.error(`[Amazon Creators API] Token request failed: ${response.status} ${responseText}`);
    throw new Error(`Failed to get access token: ${response.status} ${responseText}`);
  } catch (error) {
    console.error('[Amazon Creators API] Token fetch error:', error);
    throw error;
  }
}

/**
 * Make an authenticated request to the Creators API
 *
 * URL structure: https://creatorsapi.amazon/catalog/v1/{operation}
 * Auth header: Bearer <token>, Version <version>
 * Marketplace: x-marketplace header
 */
async function apiRequest(operation: string, payload: object): Promise<any> {
  const token = await getAccessToken();

  // API paths follow pattern: /catalog/v1/{operation} - preserve camelCase
  const url = `${API_BASE_URL}/catalog/v1/${operation}`;

  console.log(`[Amazon Creators API] Request to: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}, Version ${CREDENTIAL_VERSION}`,
      'x-marketplace': MARKETPLACE,
      'User-Agent': 'creatorsapi-nodejs-sdk/1.1.2',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    // Parse error response for better messaging
    try {
      const errorData = JSON.parse(responseText);
      if (errorData.reason === 'AssociateNotEligible') {
        console.error(`[Amazon Creators API] Account not eligible - need 3 qualifying sales within 180 days`);
        throw new Error('Amazon Associates account needs 3 qualifying sales before API access is granted');
      }
    } catch (parseError) {
      // Ignore parse error, use generic message
    }
    console.error(`[Amazon Creators API] ${operation} error:`, response.status, responseText);
    throw new Error(`API request failed: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText);
}

/**
 * Search for products on Amazon
 */
export async function searchProducts(params: SearchParams): Promise<AmazonProduct[]> {
  // Map common categories to Amazon search indexes
  const searchIndexMap: Record<string, string> = {
    'hair-accessories': 'Beauty',
    'jewelry': 'Jewelry',
    'accessories': 'Fashion',
    'home-decor': 'HomeGarden',
    'decor': 'HomeGarden',
    'beauty': 'Beauty',
    'makeup': 'Beauty',
    'fashion': 'Fashion',
    'clothing': 'Fashion',
  };

  const searchIndex = params.searchIndex
    ? searchIndexMap[params.searchIndex.toLowerCase()] || 'All'
    : 'All';

  // Creators API uses camelCase (per official SDK)
  const payload = {
    keywords: params.keywords,
    searchIndex: searchIndex,
    itemCount: params.itemCount || 10,
    partnerTag: PARTNER_TAG,
    resources: [
      'images.primary.large',
      'images.primary.medium',
      'itemInfo.title',
      'itemInfo.byLineInfo',
      'itemInfo.classifications',
      'offersV2.listings.price',
    ],
    ...(params.minPrice ? { minPrice: Math.round(params.minPrice * 100) } : {}),
    ...(params.maxPrice ? { maxPrice: Math.round(params.maxPrice * 100) } : {}),
  };

  try {
    console.log(`[Amazon Creators API] SearchItems: "${params.keywords}" in ${searchIndex}`);
    const data = await apiRequest('searchItems', payload);

    // Response may use camelCase or PascalCase depending on API version
    const searchResult = data.searchResult || data.SearchResult;
    if (!searchResult?.items && !searchResult?.Items) {
      console.log('[Amazon Creators API] No items found');
      return [];
    }

    const items = searchResult.items || searchResult.Items;
    const products: AmazonProduct[] = items.map((item: any) => {
      // Handle both camelCase and PascalCase responses
      const offers = item.offersV2 || item.OffersV2 || item.offers || item.Offers;
      const images = item.images || item.Images;
      const itemInfo = item.itemInfo || item.ItemInfo;

      const price = offers?.listings?.[0]?.price?.amount ||
                    offers?.Listings?.[0]?.Price?.Amount;
      const imageUrl = images?.primary?.large?.url ||
                       images?.Primary?.Large?.URL ||
                       images?.primary?.medium?.url ||
                       images?.Primary?.Medium?.URL || '';

      return {
        asin: item.asin || item.ASIN,
        title: itemInfo?.title?.displayValue || itemInfo?.Title?.DisplayValue || 'Unknown Product',
        detailPageUrl: item.detailPageUrl || item.DetailPageURL,
        imageUrl,
        price: price ? parseFloat(price) : null,
        currency: offers?.listings?.[0]?.price?.currency ||
                  offers?.Listings?.[0]?.Price?.Currency || 'USD',
        category: itemInfo?.classifications?.productGroup?.displayValue ||
                  itemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Other',
        brand: itemInfo?.byLineInfo?.brand?.displayValue ||
               itemInfo?.ByLineInfo?.Brand?.DisplayValue || null,
      };
    });

    console.log(`[Amazon Creators API] Found ${products.length} products`);
    return products;
  } catch (error) {
    console.error('[Amazon Creators API] Search error:', error);
    return [];
  }
}

/**
 * Get item details by ASIN
 */
export async function getItem(asin: string): Promise<AmazonProduct | null> {
  // Creators API uses camelCase (per official SDK)
  const payload = {
    itemIds: [asin],
    partnerTag: PARTNER_TAG,
    resources: [
      'images.primary.large',
      'images.primary.medium',
      'itemInfo.title',
      'itemInfo.byLineInfo',
      'itemInfo.classifications',
      'offersV2.listings.price',
    ],
  };

  try {
    console.log(`[Amazon Creators API] GetItems: ${asin}`);
    const data = await apiRequest('getItems', payload);

    // Handle both camelCase and PascalCase responses
    const itemsResult = data.itemsResult || data.ItemsResult;
    const items = itemsResult?.items || itemsResult?.Items;
    if (!items?.[0]) {
      console.log(`[Amazon Creators API] Item not found: ${asin}`);
      return null;
    }

    const item = items[0];
    const offers = item.offersV2 || item.OffersV2 || item.offers || item.Offers;
    const images = item.images || item.Images;
    const itemInfo = item.itemInfo || item.ItemInfo;

    const price = offers?.listings?.[0]?.price?.amount ||
                  offers?.Listings?.[0]?.Price?.Amount;
    const imageUrl = images?.primary?.large?.url ||
                     images?.Primary?.Large?.URL ||
                     images?.primary?.medium?.url ||
                     images?.Primary?.Medium?.URL || '';

    return {
      asin: item.asin || item.ASIN,
      title: itemInfo?.title?.displayValue || itemInfo?.Title?.DisplayValue || 'Unknown Product',
      detailPageUrl: item.detailPageUrl || item.DetailPageURL,
      imageUrl,
      price: price ? parseFloat(price) : null,
      currency: offers?.listings?.[0]?.price?.currency ||
                offers?.Listings?.[0]?.Price?.Currency || 'USD',
      category: itemInfo?.classifications?.productGroup?.displayValue ||
                itemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Other',
      brand: itemInfo?.byLineInfo?.brand?.displayValue ||
               itemInfo?.ByLineInfo?.Brand?.DisplayValue || null,
    };
  } catch (error) {
    console.error('[Amazon Creators API] GetItem error:', error);
    return null;
  }
}

/**
 * Get multiple items by ASINs
 */
export async function getItems(asins: string[]): Promise<AmazonProduct[]> {
  if (asins.length === 0) return [];
  if (asins.length > 10) {
    console.warn('[Amazon Creators API] GetItems supports max 10 ASINs, truncating');
    asins = asins.slice(0, 10);
  }

  // Creators API uses camelCase (per official SDK)
  const payload = {
    itemIds: asins,
    partnerTag: PARTNER_TAG,
    resources: [
      'images.primary.large',
      'images.primary.medium',
      'itemInfo.title',
      'itemInfo.byLineInfo',
      'itemInfo.classifications',
      'offersV2.listings.price',
    ],
  };

  try {
    console.log(`[Amazon Creators API] GetItems: ${asins.length} ASINs`);
    const data = await apiRequest('getItems', payload);

    // Handle both camelCase and PascalCase responses
    const itemsResult = data.itemsResult || data.ItemsResult;
    const items = itemsResult?.items || itemsResult?.Items;
    if (!items) {
      return [];
    }

    return items.map((item: any) => {
      const offers = item.offersV2 || item.OffersV2 || item.offers || item.Offers;
      const images = item.images || item.Images;
      const itemInfo = item.itemInfo || item.ItemInfo;

      const price = offers?.listings?.[0]?.price?.amount ||
                    offers?.Listings?.[0]?.Price?.Amount;
      const imageUrl = images?.primary?.large?.url ||
                       images?.Primary?.Large?.URL ||
                       images?.primary?.medium?.url ||
                       images?.Primary?.Medium?.URL || '';

      return {
        asin: item.asin || item.ASIN,
        title: itemInfo?.title?.displayValue || itemInfo?.Title?.DisplayValue || 'Unknown Product',
        detailPageUrl: item.detailPageUrl || item.DetailPageURL,
        imageUrl,
        price: price ? parseFloat(price) : null,
        currency: offers?.listings?.[0]?.price?.currency ||
                  offers?.Listings?.[0]?.Price?.Currency || 'USD',
        category: itemInfo?.classifications?.productGroup?.displayValue ||
                  itemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Other',
        brand: itemInfo?.byLineInfo?.brand?.displayValue ||
               itemInfo?.ByLineInfo?.Brand?.DisplayValue || null,
      };
    });
  } catch (error) {
    console.error('[Amazon Creators API] GetItems error:', error);
    return [];
  }
}

/**
 * Format an affiliate URL with partner tag
 */
export function formatAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`;
}

/**
 * Extract ASIN from an Amazon URL
 */
export function extractAsin(url: string): string | null {
  if (!url) return null;

  // Match /dp/ASIN or /gp/product/ASIN patterns
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();

  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (gpMatch) return gpMatch[1].toUpperCase();

  // Match standalone ASIN
  const asinMatch = url.match(/^[A-Z0-9]{10}$/i);
  if (asinMatch) return asinMatch[0].toUpperCase();

  return null;
}

/**
 * Check if credentials are configured
 */
export function isConfigured(): boolean {
  return Boolean(CREDENTIAL_ID && CREDENTIAL_SECRET);
}

/**
 * Test API eligibility by attempting a simple request.
 * Returns { eligible: true } if API access is available,
 * or { eligible: false, reason: string } if not.
 */
export async function testEligibility(): Promise<{ eligible: boolean; reason?: string }> {
  if (!isConfigured()) {
    return { eligible: false, reason: 'Credentials not configured' };
  }

  try {
    // Try to get a well-known test ASIN
    await getItem('B0000000000'); // Invalid ASIN, but will test auth
    return { eligible: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    if (message.includes('3 qualifying sales')) {
      return { eligible: false, reason: 'Account needs 3 qualifying sales within 180 days' };
    }
    if (message.includes('not eligible')) {
      return { eligible: false, reason: 'Associate account not eligible for API access' };
    }
    // Other errors might indicate the API is working but ASIN was invalid
    return { eligible: true };
  }
}
