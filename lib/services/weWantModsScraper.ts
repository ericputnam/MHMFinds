import { prisma } from '@/lib/prisma';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { getPrivacyConfig, PrivacyConfig } from '@/lib/config/privacy';
import { uploadImageToBlob, isValidImageUrl } from './imageUploader';
import {
  detectContentType as detectContentTypeFromLib,
  detectRoomThemes,
} from './contentTypeDetector';

export interface DiscoveredMod {
  title: string;
  author: string;
  externalUrl: string; // The actual source URL (TSR, Patreon, Tumblr, etc.)
  discoverySource: string; // Always 'WeWantMods' - for tracking where we found it
  collectionPageUrl: string; // The We Want Mods page where we found it
  externalImageUrls: string[]; // Image URLs from external CDNs (NOT wewantmods.com)
}

export interface ScrapedModDetails {
  title: string;
  description?: string;
  shortDescription?: string;
  author: string;
  thumbnail?: string;
  images: string[];
  downloadUrl: string;
  sourceUrl: string; // The external site URL (NEVER wewantmods)
  source: string; // Platform name: 'TheSimsResource', 'Patreon', 'Tumblr', 'ModCollective', etc.
  sourceId?: string;
  category?: string;
  gameVersion: string; // Always 'Sims 4' for We Want Mods scraper
  tags: string[];
  isFree: boolean;
  price?: number;
  isNSFW: boolean;
  contentType?: string;
  visualStyle?: string;
  themes: string[]; // SCR-004: Always an array, never undefined
  publishedAt?: Date;
}

interface SitemapEntry {
  url: string;
  lastmod?: string;
}

/**
 * URL_CATEGORY_MAP: Maps We Want Mods URL path categories to our internal contentType values
 * SCR-002: Create URL category to contentType mapping
 *
 * Categories extracted from URLs like:
 * - https://wewantmods.com/sims4/bathroom/item-name -> 'bathroom'
 * - https://wewantmods.com/sims4/cas/eyebrows/item-name -> 'eyebrows'
 *
 * Mapping strategy:
 * - Granular face categories map to specific types (eyebrows, lashes, etc.)
 * - Room categories map to { contentType: 'furniture' | 'decor', theme: 'room-name' }
 * - Generic categories map directly to contentType
 * - Aliases are normalized (e.g., 'hairstyles' -> 'hair')
 */

export interface CategoryMapping {
  contentType: string;
  theme?: string;  // Optional room theme for furniture/decor categories
}

/**
 * URL_CATEGORY_MAP maps We Want Mods URL path segments to internal contentType values.
 *
 * Key: lowercase URL path segment (e.g., 'bathroom', 'eyebrows', 'hairstyles')
 * Value: CategoryMapping with contentType and optional theme
 */
export const URL_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // ============================================
  // HAIR (CAS - Hair)
  // ============================================
  'hair': { contentType: 'hair' },
  'hairstyle': { contentType: 'hair' },
  'hairstyles': { contentType: 'hair' },
  'haircut': { contentType: 'hair' },
  'haircuts': { contentType: 'hair' },

  // ============================================
  // GRANULAR FACE CATEGORIES (Specific makeup/face types)
  // These are more specific than generic 'makeup'
  // ============================================

  // Eyebrows
  'eyebrows': { contentType: 'eyebrows' },
  'eyebrow': { contentType: 'eyebrows' },
  'brows': { contentType: 'eyebrows' },
  'brow': { contentType: 'eyebrows' },

  // Eyelashes
  'eyelashes': { contentType: 'lashes' },
  'eyelash': { contentType: 'lashes' },
  'lashes': { contentType: 'lashes' },
  'lash': { contentType: 'lashes' },

  // Eyeliner
  'eyeliner': { contentType: 'eyeliner' },
  'liner': { contentType: 'eyeliner' },
  'eye-liner': { contentType: 'eyeliner' },

  // Lipstick
  'lipstick': { contentType: 'lipstick' },
  'lips': { contentType: 'lipstick' },
  'lip-gloss': { contentType: 'lipstick' },
  'lipgloss': { contentType: 'lipstick' },

  // Blush
  'blush': { contentType: 'blush' },
  'blusher': { contentType: 'blush' },
  'cheeks': { contentType: 'blush' },
  'contour': { contentType: 'blush' },
  'highlighter': { contentType: 'blush' },

  // Beard / Facial Hair
  'beard': { contentType: 'beard' },
  'beards': { contentType: 'beard' },
  'mustache': { contentType: 'facial-hair' },
  'moustache': { contentType: 'facial-hair' },
  'facial-hair': { contentType: 'facial-hair' },
  'stubble': { contentType: 'beard' },
  'goatee': { contentType: 'beard' },

  // ============================================
  // CAS CATEGORIES (Create-A-Sim special items)
  // ============================================
  'cas-backgrounds': { contentType: 'cas-background' },
  'cas-background': { contentType: 'cas-background' },
  'cas-bg': { contentType: 'cas-background' },
  'presets': { contentType: 'preset' },
  'preset': { contentType: 'preset' },
  'body-preset': { contentType: 'preset' },
  'body-presets': { contentType: 'preset' },
  'face-preset': { contentType: 'preset' },
  'face-presets': { contentType: 'preset' },
  'overlays': { contentType: 'skin' },
  'overlay': { contentType: 'skin' },
  'skin-overlay': { contentType: 'skin' },
  'skin-overlays': { contentType: 'skin' },
  'loading-screen': { contentType: 'loading-screen' },
  'loading-screens': { contentType: 'loading-screen' },

  // Generic Makeup (less specific than granular types)
  'makeup': { contentType: 'makeup' },
  'make-up': { contentType: 'makeup' },
  'cosmetics': { contentType: 'makeup' },
  'eyeshadow': { contentType: 'makeup' },
  'mascara': { contentType: 'makeup' },
  'foundation': { contentType: 'makeup' },

  // Skin
  'skin': { contentType: 'skin' },
  'skinblend': { contentType: 'skin' },
  'skin-blend': { contentType: 'skin' },
  'skindetails': { contentType: 'skin' },
  'skin-details': { contentType: 'skin' },
  'freckles': { contentType: 'skin' },
  'moles': { contentType: 'skin' },

  // Eyes
  'eyes': { contentType: 'eyes' },
  'eye-colors': { contentType: 'eyes' },
  'eye-colour': { contentType: 'eyes' },
  'contacts': { contentType: 'eyes' },
  'contact-lenses': { contentType: 'eyes' },

  // Tattoos
  'tattoo': { contentType: 'tattoos' },
  'tattoos': { contentType: 'tattoos' },

  // Nails
  'nails': { contentType: 'nails' },
  'nail': { contentType: 'nails' },
  'manicure': { contentType: 'nails' },

  // ============================================
  // CLOTHING CATEGORIES
  // ============================================
  'clothing': { contentType: 'full-body' },
  'clothes': { contentType: 'full-body' },
  'outfit': { contentType: 'full-body' },
  'outfits': { contentType: 'full-body' },
  'tops': { contentType: 'tops' },
  'top': { contentType: 'tops' },
  'shirts': { contentType: 'tops' },
  'shirt': { contentType: 'tops' },
  'blouse': { contentType: 'tops' },
  'blouses': { contentType: 'tops' },
  'sweater': { contentType: 'tops' },
  'sweaters': { contentType: 'tops' },
  'bottoms': { contentType: 'bottoms' },
  'bottom': { contentType: 'bottoms' },
  'pants': { contentType: 'bottoms' },
  'jeans': { contentType: 'bottoms' },
  'skirts': { contentType: 'bottoms' },
  'skirt': { contentType: 'bottoms' },
  'shorts': { contentType: 'bottoms' },
  'dresses': { contentType: 'dresses' },
  'dress': { contentType: 'dresses' },
  'gown': { contentType: 'dresses' },
  'gowns': { contentType: 'dresses' },
  'shoes': { contentType: 'shoes' },
  'footwear': { contentType: 'shoes' },
  'boots': { contentType: 'shoes' },
  'heels': { contentType: 'shoes' },
  'sneakers': { contentType: 'shoes' },

  // ============================================
  // ACCESSORIES
  // ============================================
  'accessories': { contentType: 'accessories' },
  'accessory': { contentType: 'accessories' },
  'jewelry': { contentType: 'jewelry' },
  'jewellery': { contentType: 'jewelry' },
  'necklace': { contentType: 'jewelry' },
  'necklaces': { contentType: 'jewelry' },
  'earrings': { contentType: 'jewelry' },
  'earring': { contentType: 'jewelry' },
  'bracelet': { contentType: 'jewelry' },
  'bracelets': { contentType: 'jewelry' },
  'rings': { contentType: 'jewelry' },
  'ring': { contentType: 'jewelry' },
  'piercings': { contentType: 'jewelry' },
  'piercing': { contentType: 'jewelry' },
  'glasses': { contentType: 'glasses' },
  'sunglasses': { contentType: 'glasses' },
  'eyewear': { contentType: 'glasses' },
  'hats': { contentType: 'hats' },
  'hat': { contentType: 'hats' },
  'caps': { contentType: 'hats' },
  'cap': { contentType: 'hats' },
  'headwear': { contentType: 'hats' },

  // ============================================
  // BUILD/BUY - FURNITURE
  // ============================================
  'furniture': { contentType: 'furniture' },
  'furnishings': { contentType: 'furniture' },
  'furnishing': { contentType: 'furniture' },
  'sofa': { contentType: 'furniture' },
  'sofas': { contentType: 'furniture' },
  'couch': { contentType: 'furniture' },
  'couches': { contentType: 'furniture' },
  'chair': { contentType: 'furniture' },
  'chairs': { contentType: 'furniture' },
  'table': { contentType: 'furniture' },
  'tables': { contentType: 'furniture' },
  'desk': { contentType: 'furniture' },
  'desks': { contentType: 'furniture' },
  'bed': { contentType: 'furniture' },
  'beds': { contentType: 'furniture' },
  'dresser': { contentType: 'furniture' },
  'dressers': { contentType: 'furniture' },
  'wardrobe': { contentType: 'furniture' },
  'wardrobes': { contentType: 'furniture' },
  'closet': { contentType: 'furniture' },
  'closets': { contentType: 'furniture' },
  'shelf': { contentType: 'furniture' },
  'shelves': { contentType: 'furniture' },
  'bookshelf': { contentType: 'furniture' },
  'bookshelves': { contentType: 'furniture' },
  'cabinet': { contentType: 'furniture' },
  'cabinets': { contentType: 'furniture' },
  'nightstand': { contentType: 'furniture' },
  'nightstands': { contentType: 'furniture' },
  'vanity': { contentType: 'furniture' },
  'mirror': { contentType: 'furniture' },
  'mirrors': { contentType: 'furniture' },

  // ============================================
  // BUILD/BUY - DECOR & CLUTTER
  // ============================================
  'decor': { contentType: 'decor' },
  'decoration': { contentType: 'decor' },
  'decorations': { contentType: 'decor' },
  'decorative': { contentType: 'decor' },
  'clutter': { contentType: 'clutter' },
  'clutter-items': { contentType: 'clutter' },
  'wall-art': { contentType: 'wall-art' },
  'wallart': { contentType: 'wall-art' },
  'paintings': { contentType: 'wall-art' },
  'painting': { contentType: 'wall-art' },
  'posters': { contentType: 'wall-art' },
  'poster': { contentType: 'wall-art' },
  'rugs': { contentType: 'rugs' },
  'rug': { contentType: 'rugs' },
  'carpet': { contentType: 'rugs' },
  'carpets': { contentType: 'rugs' },
  'curtains': { contentType: 'curtains' },
  'curtain': { contentType: 'curtains' },
  'drapes': { contentType: 'curtains' },
  'blinds': { contentType: 'curtains' },
  'plants': { contentType: 'plants' },
  'plant': { contentType: 'plants' },
  'houseplants': { contentType: 'plants' },
  'succulents': { contentType: 'plants' },

  // ============================================
  // BUILD/BUY - LIGHTING
  // ============================================
  'lighting': { contentType: 'lighting' },
  'lights': { contentType: 'lighting' },
  'light': { contentType: 'lighting' },
  'lamp': { contentType: 'lighting' },
  'lamps': { contentType: 'lighting' },
  'chandelier': { contentType: 'lighting' },
  'chandeliers': { contentType: 'lighting' },

  // ============================================
  // ROOM CATEGORIES -> Map to furniture/decor with theme
  // These URL paths indicate room-specific content
  // ============================================
  'bathroom': { contentType: 'furniture', theme: 'bathroom' },
  'kitchen': { contentType: 'furniture', theme: 'kitchen' },
  'bedroom': { contentType: 'furniture', theme: 'bedroom' },
  'living-room': { contentType: 'furniture', theme: 'living-room' },
  'livingroom': { contentType: 'furniture', theme: 'living-room' },
  'living': { contentType: 'furniture', theme: 'living-room' },
  'dining-room': { contentType: 'furniture', theme: 'dining-room' },
  'diningroom': { contentType: 'furniture', theme: 'dining-room' },
  'dining': { contentType: 'furniture', theme: 'dining-room' },
  'office': { contentType: 'furniture', theme: 'office' },
  'study': { contentType: 'furniture', theme: 'office' },
  'kids-room': { contentType: 'furniture', theme: 'kids-room' },
  'kidsroom': { contentType: 'furniture', theme: 'kids-room' },
  'kids': { contentType: 'furniture', theme: 'kids-room' },
  'nursery': { contentType: 'furniture', theme: 'nursery' },
  'baby': { contentType: 'furniture', theme: 'nursery' },
  'toddler': { contentType: 'furniture', theme: 'kids-room' },
  'outdoor': { contentType: 'decor', theme: 'outdoor' },
  'garden': { contentType: 'decor', theme: 'outdoor' },
  'patio': { contentType: 'decor', theme: 'outdoor' },
  'yard': { contentType: 'decor', theme: 'outdoor' },

  // ============================================
  // POSES & ANIMATIONS
  // ============================================
  'poses': { contentType: 'poses' },
  'pose': { contentType: 'poses' },
  'pose-pack': { contentType: 'poses' },
  'posepacks': { contentType: 'poses' },
  'animations': { contentType: 'poses' },
  'animation': { contentType: 'poses' },

  // ============================================
  // PET ITEMS
  // ============================================
  'pet-furniture': { contentType: 'pet-furniture' },
  'pet-bed': { contentType: 'pet-furniture' },
  'pet-beds': { contentType: 'pet-furniture' },
  'cat-bed': { contentType: 'pet-furniture' },
  'dog-bed': { contentType: 'pet-furniture' },
  'pet-clothing': { contentType: 'pet-clothing' },
  'pet-clothes': { contentType: 'pet-clothing' },
  'pet-accessories': { contentType: 'pet-accessories' },
  'pet-accessory': { contentType: 'pet-accessories' },
  'collar': { contentType: 'pet-accessories' },
  'collars': { contentType: 'pet-accessories' },

  // ============================================
  // GAMEPLAY & SCRIPT MODS
  // ============================================
  'gameplay': { contentType: 'gameplay-mod' },
  'gameplay-mod': { contentType: 'gameplay-mod' },
  'gameplay-mods': { contentType: 'gameplay-mod' },
  'mods': { contentType: 'gameplay-mod' },
  'mod': { contentType: 'gameplay-mod' },
  'script': { contentType: 'script-mod' },
  'scripts': { contentType: 'script-mod' },
  'script-mod': { contentType: 'script-mod' },
  'script-mods': { contentType: 'script-mod' },

  // ============================================
  // LOTS & BUILDS
  // ============================================
  'lot': { contentType: 'lot' },
  'lots': { contentType: 'lot' },
  'house': { contentType: 'lot' },
  'houses': { contentType: 'lot' },
  'build': { contentType: 'lot' },
  'builds': { contentType: 'lot' },

  // ============================================
  // GENERIC/PARENT CATEGORIES (catch-all)
  // These are parent categories that may appear in URLs
  // ============================================
  'cas': { contentType: 'full-body' },  // Create-A-Sim generic
  'build-buy': { contentType: 'furniture' },  // Build/Buy generic
  'buildbuy': { contentType: 'furniture' },
  'objects': { contentType: 'decor' },
  'object': { contentType: 'decor' },
};

// Track unmapped categories encountered during scraping
const unmappedCategories = new Set<string>();

/**
 * Map a URL-extracted category to our internal contentType.
 * Logs unmapped categories for review.
 *
 * @param urlCategory The category extracted from a We Want Mods URL
 * @returns CategoryMapping with contentType and optional theme, or undefined if not mapped
 */
export function mapUrlCategoryToContentType(urlCategory: string | undefined): CategoryMapping | undefined {
  if (!urlCategory) {
    return undefined;
  }

  const normalizedCategory = urlCategory.toLowerCase().trim();
  const mapping = URL_CATEGORY_MAP[normalizedCategory];

  if (!mapping) {
    // Track and log unmapped categories for review
    if (!unmappedCategories.has(normalizedCategory)) {
      unmappedCategories.add(normalizedCategory);
      console.log(`[SCR-002] Unmapped URL category encountered: "${normalizedCategory}"`);
    }
    return undefined;
  }

  return mapping;
}

/**
 * Get all unmapped categories encountered during this session.
 * Useful for identifying new categories to add to the map.
 */
export function getUnmappedCategories(): string[] {
  return Array.from(unmappedCategories);
}

/**
 * Clear the unmapped categories set (useful for testing)
 */
export function clearUnmappedCategories(): void {
  unmappedCategories.clear();
}

/**
 * Extract the category segment from a We Want Mods URL.
 * URL structure: wewantmods.com/sims4/{category}/{item-slug}
 *
 * Examples:
 * - https://wewantmods.com/sims4/bathroom/modern-sink -> 'bathroom'
 * - https://wewantmods.com/sims4/hair/ponytail-style -> 'hair'
 * - https://wewantmods.com/sims4/cas/eyebrows/natural-brows -> 'eyebrows' (nested path)
 * - https://wewantmods.com/ -> undefined (no category)
 *
 * @param url The We Want Mods URL to parse
 * @returns The category segment or undefined if not found
 */
export function extractCategoryFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);

    // Only process wewantmods.com URLs
    if (!urlObj.hostname.includes('wewantmods.com')) {
      return undefined;
    }

    // Get path segments, filtering out empty strings
    const segments = urlObj.pathname.split('/').filter(Boolean);

    // URL structure: /sims4/{category}/{item-slug} or /sims4/{parent-category}/{category}/{item-slug}
    // We need at least 2 segments after 'sims4' for category + item
    if (segments.length < 2) {
      return undefined;
    }

    // First segment should be 'sims4'
    if (segments[0] !== 'sims4') {
      return undefined;
    }

    // For nested paths like /sims4/cas/eyebrows/item-name, return the most specific category
    // For simple paths like /sims4/bathroom/item-name, return the category
    if (segments.length >= 4) {
      // Nested path: /sims4/{parent}/{category}/{item}
      // Return the second-to-last segment (the more specific category)
      return segments[segments.length - 2].toLowerCase();
    } else if (segments.length === 3) {
      // Simple path: /sims4/{category}/{item}
      // Return the second segment (category)
      return segments[1].toLowerCase();
    } else if (segments.length === 2) {
      // Just /sims4/{category}/ - no item slug, treat second segment as category
      return segments[1].toLowerCase();
    }

    return undefined;
  } catch {
    // Invalid URL
    return undefined;
  }
}

export class WeWantModsScraper {
  private axiosInstances: AxiosInstance[] = [];
  private currentInstanceIndex = 0;
  private requestCount = 0;
  private lastRequestTime = 0;
  private config: PrivacyConfig;

  // Stats tracking
  private stats = {
    pagesScraped: 0,
    modsDiscovered: 0,
    modsImported: 0,
    modsSkipped: 0,
    modsUpdated: 0,
    imagesUploaded: 0,
    errors: 0,
  };

  // User agents for rotation
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/121.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ];

  private readonly acceptHeaders = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  ];

  private readonly languages = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en-CA,en;q=0.9',
    'en-AU,en;q=0.9',
  ];

  constructor() {
    this.config = getPrivacyConfig();
    this.initializeAxiosInstances();
  }

  private initializeAxiosInstances(): void {
    for (let i = 0; i < 3; i++) {
      const instance = axios.create({
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: (status) => status < 400,
      });

      instance.interceptors.request.use((config) => {
        Object.assign(config.headers, {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': this.getRandomAcceptHeader(),
          'Accept-Language': this.getRandomLanguage(),
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        });

        if (Math.random() < 0.3) {
          config.headers['Referer'] = this.getRandomReferer();
        }

        return config;
      });

      instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 429 || error.response?.status === 403) {
            console.log(`⚠️  Rate limited or blocked, rotating session...`);
            this.rotateSession();
          }
          return Promise.reject(error);
        }
      );

      this.axiosInstances.push(instance);
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private getRandomAcceptHeader(): string {
    return this.acceptHeaders[Math.floor(Math.random() * this.acceptHeaders.length)];
  }

  private getRandomLanguage(): string {
    return this.languages[Math.floor(Math.random() * this.languages.length)];
  }

  private getRandomReferer(): string {
    const referers = [
      'https://www.google.com/',
      'https://www.bing.com/',
      'https://duckduckgo.com/',
      'https://www.reddit.com/r/Sims4/',
      'https://www.pinterest.com/',
    ];
    return referers[Math.floor(Math.random() * referers.length)];
  }

  private async delay(ms?: number): Promise<void> {
    if (ms !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return;
    }
    const baseDelay = Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
    const jitter = Math.random() * this.config.jitterRange;
    await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
  }

  private rotateSession(): void {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.axiosInstances.length;
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
    console.log(`🔄 Rotated to session ${this.currentInstanceIndex + 1}`);
  }

  private shouldRotateSession(): boolean {
    return (
      this.requestCount >= this.config.maxRequestsPerSession ||
      Date.now() - this.lastRequestTime > this.config.sessionTimeout
    );
  }

  private getCurrentAxiosInstance(): AxiosInstance {
    if (this.shouldRotateSession()) {
      this.rotateSession();
    }
    return this.axiosInstances[this.currentInstanceIndex];
  }

  /**
   * Fetch and parse the We Want Mods sitemap
   */
  async fetchSitemap(): Promise<SitemapEntry[]> {
    console.log('📥 Fetching We Want Mods sitemap...');

    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();

      // First fetch the sitemap index
      const indexResponse = await instance.get('https://wewantmods.com/sitemap.xml');
      this.requestCount++;

      const $index = cheerio.load(indexResponse.data, { xmlMode: true });
      const sitemapUrls: string[] = [];

      // Find the post sitemap URL
      $index('sitemap loc').each((_, el) => {
        const url = $index(el).text().trim();
        if (url.includes('post-sitemap')) {
          sitemapUrls.push(url);
        }
      });

      console.log(`📄 Found ${sitemapUrls.length} post sitemaps`);

      // Fetch all post sitemaps
      const entries: SitemapEntry[] = [];

      for (const sitemapUrl of sitemapUrls) {
        await this.delay();
        const response = await instance.get(sitemapUrl);
        this.requestCount++;

        const $ = cheerio.load(response.data, { xmlMode: true });

        $('url').each((_, el) => {
          const loc = $(el).find('loc').text().trim();
          const lastmod = $(el).find('lastmod').text().trim();

          // Skip non-content pages
          if (
            loc &&
            !loc.includes('/category/') &&
            !loc.includes('/tag/') &&
            !loc.includes('/author/') &&
            loc !== 'https://wewantmods.com/'
          ) {
            entries.push({ url: loc, lastmod });
          }
        });
      }

      console.log(`✅ Found ${entries.length} collection pages in sitemap`);
      return entries;
    } catch (error) {
      console.error('❌ Error fetching sitemap:', error);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Parse a We Want Mods collection page to discover mods
   */
  async parseCollectionPage(pageUrl: string): Promise<DiscoveredMod[]> {
    console.log(`📄 Parsing collection page: ${pageUrl}`);

    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(pageUrl);
      this.requestCount++;
      this.stats.pagesScraped++;

      const $ = cheerio.load(response.data);
      const discoveredMods: DiscoveredMod[] = [];

      // Find all h3 elements that contain mod listings
      // Format: "1. Mod Title by Author Name"
      $('h3, h4').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Pattern: "Number. Title by Author"
        const modMatch = text.match(/^\d+\.\s*(.+?)\s+by\s+(.+)$/i);

        if (modMatch) {
          const title = modMatch[1].trim();
          const author = modMatch[2].trim();

          // Find the download link and images - look after this heading
          let externalUrl: string | undefined;
          const imageUrls: string[] = [];

          // Look at sibling elements and following elements
          let $current = $el.next();
          let searchDepth = 0;
          const maxSearchDepth = 10;

          while ($current.length && searchDepth < maxSearchDepth) {
            // Look for images (we'll download these and upload to Vercel Blob)
            // IMPORTANT: Check data-src FIRST because src is often a lazy-load placeholder
            $current.find('img').each((_, imgEl) => {
              const $img = $(imgEl);
              // Prioritize data-src (actual URL) over src (may be placeholder)
              const src = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('src');
              if (src && isValidImageUrl(src) && imageUrls.length < 5) {
                imageUrls.push(src);
              }
            });

            // Also check if current element is an image
            if ($current.is('img')) {
              const src = $current.attr('data-src') || $current.attr('data-lazy-src') || $current.attr('src');
              if (src && isValidImageUrl(src) && imageUrls.length < 5) {
                imageUrls.push(src);
              }
            }

            // Look for external links (not wewantmods)
            $current.find('a[href]').each((_, linkEl) => {
              const href = $(linkEl).attr('href');
              if (
                href &&
                !href.includes('wewantmods.com') &&
                !href.startsWith('#') &&
                !href.startsWith('/')
              ) {
                // Check if it looks like a mod source
                if (
                  href.includes('thesimsresource.com') ||
                  href.includes('patreon.com') ||
                  href.includes('tumblr.com') ||
                  href.includes('modcollective.gg') ||
                  href.includes('curseforge.com') ||
                  href.includes('simsdom.com') ||
                  href.includes('modthesims.info') ||
                  href.includes('sims4studio.com')
                ) {
                  if (!externalUrl) {
                    externalUrl = href;
                  }
                }
              }
            });

            // Also check if the current element itself is a link
            if ($current.is('a')) {
              const href = $current.attr('href');
              if (
                href &&
                !href.includes('wewantmods.com') &&
                !href.startsWith('#') &&
                !href.startsWith('/')
              ) {
                if (
                  href.includes('thesimsresource.com') ||
                  href.includes('patreon.com') ||
                  href.includes('tumblr.com') ||
                  href.includes('modcollective.gg') ||
                  href.includes('curseforge.com') ||
                  href.includes('simsdom.com') ||
                  href.includes('modthesims.info') ||
                  href.includes('sims4studio.com')
                ) {
                  if (!externalUrl) {
                    externalUrl = href;
                  }
                }
              }
            }

            // Stop if we hit another heading (next mod entry)
            if ($current.is('h2, h3, h4, h5')) break;

            $current = $current.next();
            searchDepth++;
          }

          if (externalUrl && title && author) {
            discoveredMods.push({
              title,
              author,
              externalUrl,
              discoverySource: 'WeWantMods',
              collectionPageUrl: pageUrl,
              externalImageUrls: imageUrls,
            });
            this.stats.modsDiscovered++;
          }
        }
      });

      console.log(`   Found ${discoveredMods.length} mods on this page`);
      return discoveredMods;
    } catch (error) {
      console.error(`❌ Error parsing collection page ${pageUrl}:`, error);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Determine the source platform from a URL
   */
  private getSourceFromUrl(url: string): string {
    if (url.includes('thesimsresource.com')) return 'TheSimsResource';
    if (url.includes('patreon.com')) return 'Patreon';
    if (url.includes('tumblr.com')) return 'Tumblr';
    if (url.includes('modcollective.gg')) return 'ModCollective';
    if (url.includes('curseforge.com')) return 'CurseForge';
    if (url.includes('simsdom.com')) return 'SimsDom';
    if (url.includes('modthesims.info')) return 'ModTheSims';
    if (url.includes('sims4studio.com')) return 'Sims4Studio';
    return 'Other';
  }

  /**
   * Extract a unique source ID from the URL
   */
  private extractSourceId(url: string, source: string): string | undefined {
    try {
      const urlObj = new URL(url);

      switch (source) {
        case 'TheSimsResource':
          // URLs like: /downloads/details/category/sims4-hair/title/ponytail/id/12345
          const tsrMatch = url.match(/\/id\/(\d+)/);
          return tsrMatch ? tsrMatch[1] : undefined;

        case 'Patreon':
          // URLs like: /posts/mod-name-12345678
          const patreonMatch = url.match(/\/posts\/([^\/\?]+)/);
          return patreonMatch ? patreonMatch[1] : undefined;

        case 'ModCollective':
          // URLs like: /sims4/details/collection/1234
          const mcMatch = url.match(/\/(?:collection|mod|item)\/(\d+)/);
          return mcMatch ? mcMatch[1] : undefined;

        case 'CurseForge':
          // URLs like: /sims4/mods/mod-slug
          const cfMatch = url.match(/\/mods\/([^\/\?]+)/);
          return cfMatch ? cfMatch[1] : undefined;

        case 'Tumblr':
          // URLs like: /post/12345678/title
          const tumblrMatch = url.match(/\/post\/(\d+)/);
          return tumblrMatch ? tumblrMatch[1] : undefined;

        case 'ModTheSims':
          // URLs like: /d/12345
          const mtsMatch = url.match(/\/d\/(\d+)/);
          return mtsMatch ? mtsMatch[1] : undefined;

        default:
          // Use path as fallback
          return urlObj.pathname.replace(/\//g, '_').substring(0, 100);
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Scrape detailed information from The Sims Resource
   */
  private async scrapeTheSimsResource(url: string, basicInfo: DiscoveredMod): Promise<ScrapedModDetails | null> {
    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(url, {
        validateStatus: (status) => status < 500,
      });
      this.requestCount++;

      // Check for blocks
      if (response.status === 403 || response.status === 429) {
        console.log(`   ⚠️  TSR blocked (${response.status}) - using basic info`);
        return null;
      }

      const $ = cheerio.load(response.data);

      // Extract details from TSR page
      const description =
        $('.download-description, .item-description, .description, .detail-description').text().trim() ||
        $('meta[name="description"]').attr('content') ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('.download-image img, .item-image img, .preview-image img').first().attr('src');

      const images: string[] = [];
      $('.download-images img, .gallery img, .preview-images img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });

      // Check if free or premium
      const isFree = !$('.premium-only, .vip-only, [class*="premium"], [class*="vip"]').length;

      const contentType = this.detectContentType(basicInfo.title, description, url, basicInfo.collectionPageUrl);
      return {
        title: basicInfo.title,
        author: basicInfo.author,
        description,
        shortDescription: description.substring(0, 150),
        thumbnail,
        images: images.length > 0 ? images : thumbnail ? [thumbnail] : [],
        downloadUrl: url,
        sourceUrl: url,
        source: 'TheSimsResource',
        sourceId: this.extractSourceId(url, 'TheSimsResource'),
        category: this.categorizeMod(basicInfo.title, description),
        gameVersion: 'Sims 4',
        tags: this.extractTags(basicInfo.title, description),
        isFree,
        isNSFW: this.detectNSFW(basicInfo.title, description),
        contentType,
        visualStyle: this.detectVisualStyle(basicInfo.title, description),
        themes: this.detectThemes(basicInfo.title, description, basicInfo.collectionPageUrl, contentType),
      };
    } catch (error: any) {
      console.error(`   ❌ Error scraping TSR: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Scrape detailed information from Patreon
   * Note: Patreon has aggressive Cloudflare protection - often returns 403
   */
  private async scrapePatreon(url: string, basicInfo: DiscoveredMod): Promise<ScrapedModDetails | null> {
    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();

      // Accept 403 responses so we can check for Cloudflare
      const response = await instance.get(url, {
        validateStatus: (status) => status < 500,
      });
      this.requestCount++;

      // Check for Cloudflare challenge
      const isCloudflareBlocked =
        response.status === 403 ||
        response.data.includes('Just a moment') ||
        response.data.includes('cf-chl-opt') ||
        response.data.includes('Cloudflare');

      if (isCloudflareBlocked) {
        console.log(`   ⚠️  Patreon Cloudflare protection detected - cannot get images/details`);
        // Return null - the mod will be imported with no images via fallback
        return null;
      }

      const $ = cheerio.load(response.data);

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('.post-content, .post-body, [data-tag="post-content"]').text().trim() ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('.post-image img, .media-image img').first().attr('src');

      const images: string[] = [];
      $('.post-content img, .post-body img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });

      // Patreon posts may be locked
      const isFree = !$('.locked-post, [class*="locked"], [class*="patron-only"]').length;

      const contentType = this.detectContentType(basicInfo.title, description, url, basicInfo.collectionPageUrl);
      return {
        title: basicInfo.title,
        author: basicInfo.author,
        description,
        shortDescription: description.substring(0, 150),
        thumbnail,
        images: images.length > 0 ? images : thumbnail ? [thumbnail] : [],
        downloadUrl: url,
        sourceUrl: url,
        source: 'Patreon',
        sourceId: this.extractSourceId(url, 'Patreon'),
        category: this.categorizeMod(basicInfo.title, description),
        gameVersion: 'Sims 4',
        tags: this.extractTags(basicInfo.title, description),
        isFree,
        isNSFW: this.detectNSFW(basicInfo.title, description),
        contentType,
        visualStyle: this.detectVisualStyle(basicInfo.title, description),
        themes: this.detectThemes(basicInfo.title, description, basicInfo.collectionPageUrl, contentType),
      };
    } catch (error: any) {
      // Don't log full error for expected Cloudflare blocks
      if (error?.response?.status === 403) {
        console.log(`   ⚠️  Patreon blocked (403) - using basic info`);
      } else {
        console.error(`   ❌ Error scraping Patreon: ${error?.message || error}`);
      }
      return null;
    }
  }

  /**
   * Scrape detailed information from Tumblr
   */
  private async scrapeTumblr(url: string, basicInfo: DiscoveredMod): Promise<ScrapedModDetails | null> {
    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(url, {
        validateStatus: (status) => status < 500,
      });
      this.requestCount++;

      // Check for blocks/challenges
      if (response.status === 403 || response.status === 429) {
        console.log(`   ⚠️  Tumblr blocked (${response.status}) - using basic info`);
        return null;
      }

      const $ = cheerio.load(response.data);

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('.post-content, .post-body, .body-text').text().trim() ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('.post img, .photo img').first().attr('src');

      const images: string[] = [];
      $('.post img, .photo img, .content img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('avatar') && !src.includes('icon')) {
          images.push(src);
        }
      });

      const contentType = this.detectContentType(basicInfo.title, description, url, basicInfo.collectionPageUrl);
      return {
        title: basicInfo.title,
        author: basicInfo.author,
        description,
        shortDescription: description.substring(0, 150),
        thumbnail,
        images: images.length > 0 ? images : thumbnail ? [thumbnail] : [],
        downloadUrl: url,
        sourceUrl: url,
        source: 'Tumblr',
        sourceId: this.extractSourceId(url, 'Tumblr'),
        category: this.categorizeMod(basicInfo.title, description),
        gameVersion: 'Sims 4',
        tags: this.extractTags(basicInfo.title, description),
        isFree: true, // Tumblr posts are generally free
        isNSFW: this.detectNSFW(basicInfo.title, description),
        contentType,
        visualStyle: this.detectVisualStyle(basicInfo.title, description),
        themes: this.detectThemes(basicInfo.title, description, basicInfo.collectionPageUrl, contentType),
      };
    } catch (error: any) {
      console.error(`   ❌ Error scraping Tumblr: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Scrape detailed information from ModCollective
   */
  private async scrapeModCollective(url: string, basicInfo: DiscoveredMod): Promise<ScrapedModDetails | null> {
    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(url, {
        validateStatus: (status) => status < 500,
      });
      this.requestCount++;

      if (response.status === 403 || response.status === 429) {
        console.log(`   ⚠️  ModCollective blocked (${response.status}) - using basic info`);
        return null;
      }

      const $ = cheerio.load(response.data);

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('.mod-description, .item-description, .description').text().trim() ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('.mod-image img, .preview img').first().attr('src');

      const images: string[] = [];
      $('.gallery img, .screenshots img, .preview-images img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });

      const contentType = this.detectContentType(basicInfo.title, description, url, basicInfo.collectionPageUrl);
      return {
        title: basicInfo.title,
        author: basicInfo.author,
        description,
        shortDescription: description.substring(0, 150),
        thumbnail,
        images: images.length > 0 ? images : thumbnail ? [thumbnail] : [],
        downloadUrl: url,
        sourceUrl: url,
        source: 'ModCollective',
        sourceId: this.extractSourceId(url, 'ModCollective'),
        category: this.categorizeMod(basicInfo.title, description),
        gameVersion: 'Sims 4',
        tags: this.extractTags(basicInfo.title, description),
        isFree: true,
        isNSFW: this.detectNSFW(basicInfo.title, description),
        contentType,
        visualStyle: this.detectVisualStyle(basicInfo.title, description),
        themes: this.detectThemes(basicInfo.title, description, basicInfo.collectionPageUrl, contentType),
      };
    } catch (error: any) {
      console.error(`   ❌ Error scraping ModCollective: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Generic scraper for other sources
   */
  private async scrapeGeneric(url: string, basicInfo: DiscoveredMod): Promise<ScrapedModDetails | null> {
    try {
      await this.delay();
      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(url, {
        validateStatus: (status) => status < 500,
      });
      this.requestCount++;

      if (response.status === 403 || response.status === 429) {
        console.log(`   ⚠️  Site blocked (${response.status}) - using basic info`);
        return null;
      }

      const $ = cheerio.load(response.data);
      const source = this.getSourceFromUrl(url);

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('img').first().attr('src');

      const contentType = this.detectContentType(basicInfo.title, description, url, basicInfo.collectionPageUrl);
      return {
        title: basicInfo.title,
        author: basicInfo.author,
        description,
        shortDescription: description.substring(0, 150),
        thumbnail,
        images: thumbnail ? [thumbnail] : [],
        downloadUrl: url,
        sourceUrl: url,
        source,
        sourceId: this.extractSourceId(url, source),
        category: this.categorizeMod(basicInfo.title, description),
        gameVersion: 'Sims 4',
        tags: this.extractTags(basicInfo.title, description),
        isFree: true,
        isNSFW: this.detectNSFW(basicInfo.title, description),
        contentType,
        visualStyle: this.detectVisualStyle(basicInfo.title, description),
        themes: this.detectThemes(basicInfo.title, description, basicInfo.collectionPageUrl, contentType),
      };
    } catch (error: any) {
      console.error(`   ❌ Error scraping: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Create a basic mod details object from discovered info when external scraping fails
   * Uses pre-uploaded Vercel Blob URLs for images
   * Generates original descriptions (never plagiarizes or reveals source)
   */
  private createBasicModDetails(
    discoveredMod: DiscoveredMod,
    blobImageUrls: string[]
  ): ScrapedModDetails {
    const source = this.getSourceFromUrl(discoveredMod.externalUrl);
    const contentType = this.detectContentType(
      discoveredMod.title,
      '',
      discoveredMod.externalUrl,
      discoveredMod.collectionPageUrl
    );
    // SCR-004: Pass contentType to detectThemes for enhanced room theme detection
    const themes = this.detectThemes(
      discoveredMod.title,
      '',
      discoveredMod.collectionPageUrl,
      contentType
    );
    const visualStyle = this.detectVisualStyle(discoveredMod.title, '');
    const category = this.categorizeMod(discoveredMod.title, '');

    // Generate original descriptions
    const { shortDescription, description } = this.generateDescription(
      discoveredMod.title,
      discoveredMod.author,
      contentType,
      visualStyle,
      category
    );

    return {
      title: discoveredMod.title,
      author: discoveredMod.author,
      description,
      shortDescription,
      thumbnail: blobImageUrls[0], // First image as thumbnail
      images: blobImageUrls,
      downloadUrl: discoveredMod.externalUrl,
      sourceUrl: discoveredMod.externalUrl,
      source,
      sourceId: this.extractSourceId(discoveredMod.externalUrl, source),
      category,
      gameVersion: 'Sims 4', // We Want Mods is specifically for Sims 4 mods
      tags: this.extractTags(discoveredMod.title, ''),
      isFree: source !== 'Patreon', // Assume Patreon content may be paid
      isNSFW: this.detectNSFW(discoveredMod.title, ''),
      contentType,
      visualStyle,
      themes,
    };
  }

  /**
   * Upload images from source URLs to Vercel Blob
   * Returns array of Vercel Blob URLs
   */
  private async uploadModImages(
    imageUrls: string[],
    modTitle: string
  ): Promise<string[]> {
    if (imageUrls.length === 0) {
      return [];
    }

    const blobUrls: string[] = [];
    const slug = modTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);

    for (let i = 0; i < imageUrls.length && i < 5; i++) {
      const imageUrl = imageUrls[i];
      console.log(`      📥 Downloading image ${i + 1}/${Math.min(imageUrls.length, 5)}: ${imageUrl.substring(0, 50)}...`);

      const blobUrl = await uploadImageToBlob(imageUrl, {
        folder: 'mods',
        filename: `${slug}-${Date.now()}-${i}`,
      });

      if (blobUrl) {
        blobUrls.push(blobUrl);
        this.stats.imagesUploaded++;
      }

      // Small delay between uploads
      if (i < imageUrls.length - 1) {
        await this.delay(500);
      }
    }

    return blobUrls;
  }

  /**
   * Scrape detailed information from the external source
   * Falls back to basic info if scraping fails (e.g., Cloudflare protection)
   * Always uploads images to Vercel Blob to avoid referencing source URLs
   * Always generates original descriptions (never plagiarizes or reveals source)
   */
  async scrapeExternalSource(
    discoveredMod: DiscoveredMod,
    blobImageUrls: string[]
  ): Promise<ScrapedModDetails | null> {
    const source = this.getSourceFromUrl(discoveredMod.externalUrl);
    console.log(`   🔍 Scraping ${source}: ${discoveredMod.externalUrl}`);

    let result: ScrapedModDetails | null = null;

    try {
      switch (source) {
        case 'TheSimsResource':
          result = await this.scrapeTheSimsResource(discoveredMod.externalUrl, discoveredMod);
          break;
        case 'Patreon':
          result = await this.scrapePatreon(discoveredMod.externalUrl, discoveredMod);
          break;
        case 'Tumblr':
          result = await this.scrapeTumblr(discoveredMod.externalUrl, discoveredMod);
          break;
        case 'ModCollective':
          result = await this.scrapeModCollective(discoveredMod.externalUrl, discoveredMod);
          break;
        default:
          result = await this.scrapeGeneric(discoveredMod.externalUrl, discoveredMod);
      }
    } catch (error: any) {
      // Check for Cloudflare or other protection
      if (error?.response?.status === 403 || error?.response?.status === 429) {
        console.log(`   ⚠️  ${source} blocked (${error?.response?.status}) - using basic info`);
      }
    }

    // If scraping failed, use basic info with pre-uploaded blob images
    if (!result) {
      console.log(`   📝 Using basic info from We Want Mods for: ${discoveredMod.title}`);
      result = this.createBasicModDetails(discoveredMod, blobImageUrls);
    } else {
      // If scraping succeeded but we have blob images, use those instead
      // (ensures we never reference external image URLs)
      if (blobImageUrls.length > 0) {
        result.thumbnail = blobImageUrls[0];
        result.images = blobImageUrls;
      }

      // Check if the scraped description is just metadata/breadcrumbs
      // If so, replace with an original generated description
      if (
        this.isMetadataDescription(result.description || '') ||
        this.isMetadataDescription(result.shortDescription || '')
      ) {
        console.log(`   📝 Scraped description was metadata - generating original description`);
        const { shortDescription, description } = this.generateDescription(
          result.title,
          result.author,
          result.contentType,
          result.visualStyle,
          result.category
        );
        result.description = description;
        result.shortDescription = shortDescription;
      }
    }

    return result;
  }

  /**
   * Check if a mod already exists in the database
   * Enhanced with title+author combination check
   */
  async checkDuplicate(mod: ScrapedModDetails): Promise<{ exists: boolean; existingId?: string }> {
    // Normalize title and author for comparison
    const normalizedTitle = mod.title.toLowerCase().trim();
    const normalizedAuthor = mod.author.toLowerCase().trim().replace(/\s+/g, '');

    const existingMod = await prisma.mod.findFirst({
      where: {
        OR: [
          // Check by sourceUrl (exact match)
          { sourceUrl: mod.sourceUrl },
          // Check by source + sourceId combination
          ...(mod.sourceId ? [{ sourceId: mod.sourceId, source: mod.source }] : []),
          // Check by downloadUrl
          { downloadUrl: mod.downloadUrl },
          // Check by normalized title + author (fuzzy match)
          {
            AND: [
              {
                title: {
                  equals: mod.title,
                  mode: 'insensitive' as const,
                },
              },
              {
                author: {
                  equals: mod.author,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        ],
      },
      select: { id: true },
    });

    return {
      exists: !!existingMod,
      existingId: existingMod?.id,
    };
  }

  /**
   * SCR-005: Ensure FacetDefinition exists for a given facetType + value
   * Auto-creates the definition with sensible defaults if it doesn't exist
   *
   * @param facetType - The facet type (e.g., 'contentType', 'themes', 'visualStyle')
   * @param value - The facet value (e.g., 'furniture', 'bathroom', 'alpha')
   */
  private async ensureFacetDefinitionExists(facetType: string, value: string): Promise<void> {
    if (!value) return;

    try {
      // Check if FacetDefinition already exists
      const existing = await prisma.facetDefinition.findUnique({
        where: {
          facetType_value: { facetType, value },
        },
      });

      if (!existing) {
        // Convert value to title case for display name
        const displayName = value
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Create the new FacetDefinition
        await prisma.facetDefinition.create({
          data: {
            facetType,
            value,
            displayName,
            sortOrder: 100, // Default sort order for auto-created facets
            isActive: true,
          },
        });

        console.log(`[SCR-005] Auto-created FacetDefinition: ${facetType}/${value} -> "${displayName}"`);
      }
    } catch (error) {
      // If there's a unique constraint error, the record was created by another process
      // This is fine - we just ignore it
      if ((error as any)?.code !== 'P2002') {
        console.error(`[SCR-005] Error ensuring FacetDefinition for ${facetType}/${value}:`, error);
      }
    }
  }

  /**
   * SCR-005: Ensure all facets for a mod have definitions
   * Called before importing a mod to ensure UI can display all facets
   */
  private async ensureAllFacetDefinitions(mod: ScrapedModDetails): Promise<void> {
    // Ensure contentType FacetDefinition exists
    if (mod.contentType) {
      await this.ensureFacetDefinitionExists('contentType', mod.contentType);
    }

    // Ensure visualStyle FacetDefinition exists
    if (mod.visualStyle) {
      await this.ensureFacetDefinitionExists('visualStyle', mod.visualStyle);
    }

    // Ensure all theme FacetDefinitions exist
    for (const theme of mod.themes) {
      await this.ensureFacetDefinitionExists('themes', theme);
    }
  }

  /**
   * Import a scraped mod into the database
   */
  async importMod(mod: ScrapedModDetails): Promise<{ action: 'created' | 'updated' | 'skipped'; id?: string }> {
    try {
      // SCR-005: Ensure FacetDefinitions exist before importing
      await this.ensureAllFacetDefinitions(mod);

      const { exists, existingId } = await this.checkDuplicate(mod);

      if (exists && existingId) {
        // Update existing mod
        await prisma.mod.update({
          where: { id: existingId },
          data: {
            title: mod.title,
            description: mod.description,
            shortDescription: mod.shortDescription,
            thumbnail: mod.thumbnail,
            images: mod.images,
            downloadUrl: mod.downloadUrl,
            author: mod.author,
            category: mod.category || 'Other',
            gameVersion: mod.gameVersion,
            tags: mod.tags,
            isFree: mod.isFree,
            price: mod.price,
            isNSFW: mod.isNSFW,
            contentType: mod.contentType,
            visualStyle: mod.visualStyle,
            themes: mod.themes || [],
            lastScraped: new Date(),
          },
        });

        this.stats.modsUpdated++;
        return { action: 'updated', id: existingId };
      }

      // Create new mod (auto-verified since we ensure images exist)
      const newMod = await prisma.mod.create({
        data: {
          title: mod.title,
          description: mod.description,
          shortDescription: mod.shortDescription,
          thumbnail: mod.thumbnail,
          images: mod.images,
          downloadUrl: mod.downloadUrl,
          sourceUrl: mod.sourceUrl,
          source: mod.source,
          sourceId: mod.sourceId,
          author: mod.author,
          category: mod.category || 'Other',
          gameVersion: mod.gameVersion,
          tags: mod.tags,
          isFree: mod.isFree,
          price: mod.price,
          isNSFW: mod.isNSFW,
          contentType: mod.contentType,
          visualStyle: mod.visualStyle,
          themes: mod.themes || [],
          publishedAt: mod.publishedAt || new Date(),
          lastScraped: new Date(),
          isVerified: true, // Auto-verify since we ensure images are uploaded
        },
      });

      this.stats.modsImported++;
      return { action: 'created', id: newMod.id };
    } catch (error) {
      console.error(`❌ Error importing mod "${mod.title}":`, error);
      this.stats.errors++;
      return { action: 'skipped' };
    }
  }

  /**
   * Category detection based on title and description
   */
  private categorizeMod(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();

    if (text.match(/\bhair(style)?s?\b/) || text.includes('hairstyle') || text.includes('ponytail') || text.includes('bun ')) {
      return 'Hair';
    }
    if (text.match(/\bpose[sd]?\b/) || text.includes('animation') || text.includes('posing')) {
      return 'Poses';
    }
    if (
      text.includes('makeup') ||
      text.includes('blush') ||
      text.includes('lipstick') ||
      text.includes('eyeshadow') ||
      text.includes('eyeliner')
    ) {
      return 'CAS - Makeup';
    }
    if (
      text.includes('accessory') ||
      text.includes('accessories') ||
      text.includes('jewelry') ||
      text.includes('necklace') ||
      text.includes('earring')
    ) {
      return 'CAS - Accessories';
    }
    if (
      text.includes('clothing') ||
      text.includes('dress') ||
      text.includes('outfit') ||
      text.includes('shirt') ||
      text.includes('pants') ||
      text.includes('shoes') ||
      text.includes('sweater') ||
      text.includes('jacket') ||
      text.includes('top ') ||
      text.includes(' tops')
    ) {
      return 'CAS - Clothing';
    }
    if (text.includes('clutter') || text.includes('decor object')) {
      return 'Build/Buy - Clutter';
    }
    if (
      text.includes('build') ||
      text.includes('furniture') ||
      text.includes('chair') ||
      text.includes('table') ||
      text.includes('sofa') ||
      text.includes('bed ') ||
      text.includes('kitchen') ||
      text.includes('bathroom')
    ) {
      return 'Build/Buy';
    }
    if (
      text.includes('gameplay') ||
      text.includes('career') ||
      text.includes('skill') ||
      text.includes('aspiration')
    ) {
      return 'Gameplay';
    }
    if (text.includes('script') || text.includes('trait') || text.match(/\bmods?\b/)) {
      return 'Scripts';
    }
    if (text.includes('cas') || text.includes('create-a-sim')) {
      return 'CAS';
    }

    return 'Other';
  }

  /**
   * Extract tags from title and description
   */
  private extractTags(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const commonTags = [
      'sims4',
      'sims3',
      'build',
      'buy',
      'cas',
      'gameplay',
      'furniture',
      'clothing',
      'hair',
      'makeup',
      'career',
      'skill',
      'trait',
      'mod',
      'cc',
      'maxis-match',
      'alpha',
    ];

    return commonTags.filter((tag) => text.includes(tag));
  }

  /**
   * Detect NSFW content
   */
  private detectNSFW(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    const nsfwKeywords = ['nsfw', 'adult', 'mature', 'explicit', 'sexual', '18+', 'wicked whims'];
    return nsfwKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Detect content type using the improved contentTypeDetector library.
   * SCR-003: Combines URL-extracted category with title/description analysis for best accuracy.
   *
   * Priority:
   * 1. URL category mapping (highest - explicit categorization from source)
   * 2. Title-based detection (high - keywords in mod name)
   * 3. Description-based detection (medium - context from description)
   *
   * @param title - The mod title
   * @param description - Optional mod description
   * @param sourceUrl - Optional source URL for extracting category hint
   * @param collectionPageUrl - Optional We Want Mods collection page URL for category hint
   * @returns The detected content type, or undefined if ambiguous
   */
  private detectContentType(
    title: string,
    description?: string,
    sourceUrl?: string,
    collectionPageUrl?: string
  ): string | undefined {
    // First, try to get a category hint from the URLs
    let urlCategoryHint: string | undefined;
    let urlThemeHint: string | undefined;

    // Check the collection page URL for category (usually more reliable)
    if (collectionPageUrl) {
      const urlCategory = extractCategoryFromUrl(collectionPageUrl);
      if (urlCategory) {
        const mapping = mapUrlCategoryToContentType(urlCategory);
        if (mapping) {
          urlCategoryHint = mapping.contentType;
          urlThemeHint = mapping.theme;
        }
      }
    }

    // If we got a confident URL category mapping, use it
    // (URL categories are explicit and highly reliable)
    if (urlCategoryHint) {
      return urlCategoryHint;
    }

    // Fall back to title + description analysis using the improved detector
    const detectedType = detectContentTypeFromLib(title, description);

    return detectedType;
  }

  /**
   * Detect room themes using the improved contentTypeDetector library.
   * SCR-003: Combines URL-extracted theme with title/description analysis.
   * SCR-004: Enhanced to always detect themes for furniture/decor/clutter/lighting content types.
   *
   * @param title - The mod title
   * @param description - Optional mod description
   * @param collectionPageUrl - Optional We Want Mods collection page URL for theme hint
   * @param contentType - Optional content type to help determine if room themes should be detected
   * @returns Array of detected room themes (always an array, never undefined)
   */
  private detectThemes(
    title: string,
    description?: string,
    collectionPageUrl?: string,
    contentType?: string
  ): string[] {
    const themes: string[] = [];

    // Check URL for room theme hint
    if (collectionPageUrl) {
      const urlCategory = extractCategoryFromUrl(collectionPageUrl);
      if (urlCategory) {
        const mapping = mapUrlCategoryToContentType(urlCategory);
        if (mapping?.theme) {
          themes.push(mapping.theme);
        }
      }
    }

    // SCR-004: For furniture, decor, clutter, lighting content types, always run room theme detection
    // This ensures we capture room context even if URL doesn't have a theme
    const roomRelatedContentTypes = ['furniture', 'decor', 'clutter', 'lighting', 'plants', 'rugs', 'curtains', 'wall-art'];
    const shouldDetectRoomThemes = !contentType || roomRelatedContentTypes.includes(contentType);

    if (shouldDetectRoomThemes) {
      // Detect themes from title/description using the improved library
      const detectedThemes = detectRoomThemes(title, description);

      // Merge themes without duplicates
      for (const theme of detectedThemes) {
        if (!themes.includes(theme)) {
          themes.push(theme);
        }
      }
    }

    return themes;
  }

  /**
   * Detect visual style for faceted taxonomy
   */
  private detectVisualStyle(title: string, description?: string): string | undefined {
    const text = `${title} ${description || ''}`.toLowerCase();

    if (text.includes('maxis match') || text.includes('maxis-match') || text.includes('mm ')) return 'maxis-match';
    if (text.includes('alpha') || text.includes('realistic')) return 'alpha';
    if (text.includes('semi-maxis') || text.includes('semi maxis')) return 'semi-maxis';
    if (text.includes('clayified')) return 'clayified';

    return undefined;
  }

  /**
   * Generate an original description based on mod attributes.
   * NEVER uses source site names or external content.
   */
  private generateDescription(
    title: string,
    author: string,
    contentType?: string,
    visualStyle?: string,
    category?: string
  ): { shortDescription: string; description: string } {
    // Clean title - remove common prefixes/suffixes that might reveal source
    const cleanTitle = title
      .replace(/^(download|get|free)\s+/i, '')
      .replace(/\s+(download|cc|custom content)$/i, '')
      .trim();

    // Parse the title to extract meaningful attributes
    const lowerTitle = cleanTitle.toLowerCase();

    // Detect hairstyle attributes
    const hairAttributes: string[] = [];
    if (lowerTitle.includes('ponytail')) hairAttributes.push('ponytail');
    if (lowerTitle.includes('updo')) hairAttributes.push('updo');
    if (lowerTitle.includes('braid') || lowerTitle.includes('braided')) hairAttributes.push('braided');
    if (lowerTitle.includes('bun')) hairAttributes.push('bun');
    if (lowerTitle.includes('curly') || lowerTitle.includes('curls')) hairAttributes.push('curly');
    if (lowerTitle.includes('wavy')) hairAttributes.push('wavy');
    if (lowerTitle.includes('straight')) hairAttributes.push('straight');
    if (lowerTitle.includes('long')) hairAttributes.push('long');
    if (lowerTitle.includes('short')) hairAttributes.push('short');
    if (lowerTitle.includes('medium')) hairAttributes.push('medium-length');
    if (lowerTitle.includes('bangs') || lowerTitle.includes('fringe')) hairAttributes.push('with bangs');
    if (lowerTitle.includes('bob')) hairAttributes.push('bob');
    if (lowerTitle.includes('pixie')) hairAttributes.push('pixie cut');
    if (lowerTitle.includes('afro')) hairAttributes.push('afro');

    // Detect clothing attributes
    const clothingAttributes: string[] = [];
    if (lowerTitle.includes('casual')) clothingAttributes.push('casual');
    if (lowerTitle.includes('formal')) clothingAttributes.push('formal');
    if (lowerTitle.includes('vintage')) clothingAttributes.push('vintage-inspired');
    if (lowerTitle.includes('modern')) clothingAttributes.push('modern');
    if (lowerTitle.includes('elegant')) clothingAttributes.push('elegant');
    if (lowerTitle.includes('cozy')) clothingAttributes.push('cozy');
    if (lowerTitle.includes('summer')) clothingAttributes.push('summer');
    if (lowerTitle.includes('winter')) clothingAttributes.push('winter');
    if (lowerTitle.includes('party')) clothingAttributes.push('party');
    if (lowerTitle.includes('everyday')) clothingAttributes.push('everyday');
    if (lowerTitle.includes('athletic') || lowerTitle.includes('sport')) clothingAttributes.push('athletic');

    // Detect makeup attributes
    const makeupAttributes: string[] = [];
    if (lowerTitle.includes('natural')) makeupAttributes.push('natural');
    if (lowerTitle.includes('glam') || lowerTitle.includes('glamorous')) makeupAttributes.push('glamorous');
    if (lowerTitle.includes('bold')) makeupAttributes.push('bold');
    if (lowerTitle.includes('subtle')) makeupAttributes.push('subtle');
    if (lowerTitle.includes('smoky') || lowerTitle.includes('smokey')) makeupAttributes.push('smoky');
    if (lowerTitle.includes('glitter') || lowerTitle.includes('sparkle')) makeupAttributes.push('sparkly');

    // Format visual style for description
    let styleDescription = '';
    if (visualStyle === 'maxis-match') {
      styleDescription = 'This Maxis Match content seamlessly blends with the base game aesthetic. ';
    } else if (visualStyle === 'alpha') {
      styleDescription = 'This alpha CC features a realistic, high-detail style. ';
    } else if (visualStyle === 'semi-maxis') {
      styleDescription = 'This semi-maxis content offers a balanced blend of realistic and Maxis Match styles. ';
    }

    // Generate descriptions based on content type
    let shortDesc = '';
    let longDesc = '';

    const detectedType = contentType || this.detectContentType(title, '');
    const detectedCategory = category || this.categorizeMod(title, '');

    switch (detectedType) {
      case 'hair':
        const hairDesc = hairAttributes.length > 0
          ? `A beautiful ${hairAttributes.join(', ')} hairstyle`
          : 'A stunning hairstyle';
        shortDesc = `${hairDesc} for your Sims by ${author}.`;
        longDesc = `${hairDesc} created by ${author}. ${styleDescription}Perfect for adding variety to your Sims' look. This custom content hairstyle is compatible with The Sims 4 and offers a fresh option for your Create-A-Sim wardrobe.`;
        break;

      case 'tops':
      case 'bottoms':
      case 'dresses':
        const clothingDesc = clothingAttributes.length > 0
          ? `A ${clothingAttributes.join(', ')} ${detectedType === 'tops' ? 'top' : detectedType === 'bottoms' ? 'bottom' : 'dress'}`
          : `A stylish ${detectedType === 'tops' ? 'top' : detectedType === 'bottoms' ? 'bottom' : 'dress'}`;
        shortDesc = `${clothingDesc} for your Sims by ${author}.`;
        longDesc = `${clothingDesc} created by ${author}. ${styleDescription}This custom content clothing item adds a fresh fashion option to your Sims' closet. Perfect for everyday wear or special occasions.`;
        break;

      case 'shoes':
        shortDesc = `Stylish footwear for your Sims by ${author}.`;
        longDesc = `Fashionable shoes created by ${author}. ${styleDescription}Complete your Sims' outfits with this custom footwear option. Designed to complement a variety of styles.`;
        break;

      case 'accessories':
      case 'jewelry':
        shortDesc = `Beautiful ${detectedType} for your Sims by ${author}.`;
        longDesc = `Stunning ${detectedType} created by ${author}. ${styleDescription}Add the perfect finishing touch to your Sims' look with these custom accessories.`;
        break;

      case 'makeup':
        const makeupDesc = makeupAttributes.length > 0
          ? `A ${makeupAttributes.join(', ')} makeup look`
          : 'A beautiful makeup look';
        shortDesc = `${makeupDesc} for your Sims by ${author}.`;
        longDesc = `${makeupDesc} created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom makeup. Perfect for creating diverse and unique looks in Create-A-Sim.`;
        break;

      case 'skin':
        shortDesc = `Custom skin overlay for your Sims by ${author}.`;
        longDesc = `High-quality skin content created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom skin option. Designed to work seamlessly with your existing CC.`;
        break;

      case 'eyes':
        shortDesc = `Custom eye contacts/colors for your Sims by ${author}.`;
        longDesc = `Beautiful eye content created by ${author}. ${styleDescription}Give your Sims stunning new eye options with this custom content.`;
        break;

      case 'furniture':
      case 'decor':
        shortDesc = `Custom ${detectedType} for your Sims' homes by ${author}.`;
        longDesc = `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} created by ${author}. ${styleDescription}Add personality to your Sims' living spaces with this custom build/buy content.`;
        break;

      case 'poses':
        shortDesc = `Custom poses for your Sims by ${author}.`;
        longDesc = `Expressive pose pack created by ${author}. Perfect for storytelling, screenshots, and creating memorable moments with your Sims. Compatible with pose player mods.`;
        break;

      case 'gameplay-mod':
      case 'script-mod':
        shortDesc = `A gameplay mod for The Sims 4 by ${author}.`;
        longDesc = `Gameplay modification created by ${author}. This mod enhances or changes gameplay mechanics in The Sims 4. Always read the creator's documentation for installation and compatibility information.`;
        break;

      default:
        // Fall back to category-based description
        if (detectedCategory === 'Hair') {
          shortDesc = `Custom hairstyle for your Sims by ${author}.`;
          longDesc = `A beautiful custom hairstyle created by ${author}. ${styleDescription}Perfect for adding variety to your Sims' Create-A-Sim options.`;
        } else if (detectedCategory.startsWith('CAS')) {
          shortDesc = `Custom content for Create-A-Sim by ${author}.`;
          longDesc = `Create-A-Sim custom content created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom content.`;
        } else if (detectedCategory.startsWith('Build')) {
          shortDesc = `Custom build/buy content by ${author}.`;
          longDesc = `Build and buy mode content created by ${author}. ${styleDescription}Add new options to your Sims' homes with this custom content.`;
        } else if (detectedCategory === 'Poses') {
          shortDesc = `Custom poses for your Sims by ${author}.`;
          longDesc = `Pose pack created by ${author}. Perfect for screenshots and storytelling with your Sims.`;
        } else {
          // Generic fallback - still original content
          shortDesc = `Custom content for The Sims 4 by ${author}.`;
          longDesc = `Custom content created by ${author}. ${styleDescription}Enhance your Sims 4 experience with this community-created content.`;
        }
    }

    // Ensure descriptions aren't too long
    return {
      shortDescription: shortDesc.substring(0, 200),
      description: longDesc.substring(0, 1000),
    };
  }

  /**
   * Check if a description looks like source site metadata/breadcrumbs
   * These are usually formatted like "Site Name - Category - Subcategory - Title"
   * Only flags true breadcrumb patterns, not well-written descriptions that happen to mention sites
   */
  private isMetadataDescription(text: string): boolean {
    if (!text || text.length < 10) return true;

    // Check for source site breadcrumb patterns at the START of the description
    // These are clearly metadata, not written descriptions
    const breadcrumbPatterns = [
      /^the sims resource\s*-/i,
      /^tsr\s*-/i,
      /^patreon\s*-/i,
      /^tumblr\s*-/i,
      /^mod\s*collective\s*-/i,
      /^curseforge\s*-/i,
      /^sims\s*dom\s*-/i,
      /^mod\s*the\s*sims\s*-/i,
      // Matches "Sims 4 - Hair - Category" pattern
      /^sims\s*4\s*-\s*(hair|clothing|makeup|skin|furniture|accessories|build|buy)/i,
      // Matches "[Site] - Sims 4 - Category" pattern
      /^[^-]+\s*-\s*sims\s*4\s*-\s*/i,
    ];

    if (breadcrumbPatterns.some(pattern => pattern.test(text))) {
      return true;
    }

    // Check for breadcrumb-style structure: multiple dashes at the start
    // Only flag if the FIRST 100 chars have 4+ dash separators (clear breadcrumb)
    const firstPart = text.substring(0, 100);
    const dashSeparators = (firstPart.match(/\s+-\s+/g) || []).length;
    if (dashSeparators >= 4) {
      return true;
    }

    // Check for "Download from [site]" style descriptions
    if (/^download\s+(from|at|on)\s+/i.test(text)) {
      return true;
    }

    // If description is ONLY the title repeated
    // (e.g., "Ponytail Hair" as both title and description)
    // We check if it's very short and generic
    if (text.length < 50 && !text.includes('.') && !text.includes(',')) {
      // Likely just a title, not a real description
      return true;
    }

    return false;
  }

  /**
   * Run the full scraping process
   */
  async run(options?: { limit?: number; skipExisting?: boolean }): Promise<void> {
    console.log('🚀 Starting We Want Mods scraper...');
    console.log(`   Privacy level: ${process.env.PRIVACY_LEVEL || 'default'}`);
    console.log(`   Min delay: ${this.config.minDelay}ms, Max delay: ${this.config.maxDelay}ms`);

    // Reset stats
    this.stats = {
      pagesScraped: 0,
      modsDiscovered: 0,
      modsImported: 0,
      modsSkipped: 0,
      modsUpdated: 0,
      imagesUploaded: 0,
      errors: 0,
    };

    // Step 1: Fetch sitemap
    const sitemapEntries = await this.fetchSitemap();

    if (sitemapEntries.length === 0) {
      console.log('❌ No pages found in sitemap. Exiting.');
      return;
    }

    // Apply limit if specified
    const pagesToScrape = options?.limit ? sitemapEntries.slice(0, options.limit) : sitemapEntries;
    console.log(`\n📋 Will scrape ${pagesToScrape.length} collection pages\n`);

    // Step 2: Scrape each collection page
    for (let i = 0; i < pagesToScrape.length; i++) {
      const entry = pagesToScrape[i];
      console.log(`\n[${i + 1}/${pagesToScrape.length}] Processing: ${entry.url}`);

      const discoveredMods = await this.parseCollectionPage(entry.url);

      // Step 3: For each discovered mod, upload images and scrape details
      for (const discovered of discoveredMods) {
        console.log(`   📦 ${discovered.title} by ${discovered.author}`);

        // Check if we have any images to work with
        if (discovered.externalImageUrls.length === 0) {
          console.log(`      ⚠️  No images found - skipping mod`);
          this.stats.modsSkipped++;
          continue;
        }

        // Step 3a: Upload images to Vercel Blob FIRST
        console.log(`      🖼️  Found ${discovered.externalImageUrls.length} image(s) - uploading to Vercel Blob...`);
        const blobImageUrls = await this.uploadModImages(
          discovered.externalImageUrls,
          discovered.title
        );

        // Must have at least one image uploaded successfully
        if (blobImageUrls.length === 0) {
          console.log(`      ⚠️  Failed to upload any images - skipping mod`);
          this.stats.modsSkipped++;
          continue;
        }

        console.log(`      ✅ Uploaded ${blobImageUrls.length} image(s) to Vercel Blob`);

        // Step 3b: Scrape details from external source (with blob images)
        const modDetails = await this.scrapeExternalSource(discovered, blobImageUrls);

        if (modDetails && modDetails.thumbnail) {
          // Import to database
          const result = await this.importMod(modDetails);
          console.log(`      ✅ ${result.action}: ${modDetails.title}`);
        } else {
          console.log(`      ⚠️  Could not process mod: ${discovered.title}`);
          this.stats.modsSkipped++;
        }
      }

      // Progress update
      if ((i + 1) % 5 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${pagesToScrape.length} pages`);
        console.log(`   Discovered: ${this.stats.modsDiscovered}, Imported: ${this.stats.modsImported}, Updated: ${this.stats.modsUpdated}, Skipped: ${this.stats.modsSkipped}`);
      }
    }

    // Final stats
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL STATISTICS');
    console.log('='.repeat(60));
    console.log(`   Pages scraped: ${this.stats.pagesScraped}`);
    console.log(`   Mods discovered: ${this.stats.modsDiscovered}`);
    console.log(`   Mods imported: ${this.stats.modsImported}`);
    console.log(`   Mods updated: ${this.stats.modsUpdated}`);
    console.log(`   Mods skipped: ${this.stats.modsSkipped}`);
    console.log(`   Images uploaded to Vercel Blob: ${this.stats.imagesUploaded}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log('='.repeat(60));
    console.log('✅ Scraping complete!');
  }
}

export const weWantModsScraper = new WeWantModsScraper();
