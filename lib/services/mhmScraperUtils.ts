/**
 * MHM Scraper Utility Functions
 *
 * Pure utility functions for multi-game detection, content type detection from URLs,
 * and guaranteed author extraction. All functions are side-effect free and testable.
 */

import type { CheerioAPI } from 'cheerio';

// ============================================
// TYPES
// ============================================

export interface AuthorExtractionContext {
  authorFromTitle?: string;
  authorFromUrl?: string;
  authorFromModPage?: string;
  blogPostAuthor?: string;
  downloadUrl?: string;
}

// ============================================
// GAME DETECTION
// ============================================

const SIMS_4_URL_KEYWORDS = [
  'sims-4', 'sims4', 'ts4', 'maxis-match', 'maxis_match',
  'cas-background', 'woohoo', 'trait-mod',
];

// CC-related slugs that strongly imply Sims 4 (the CC modding community is overwhelmingly Sims 4)
const SIMS_4_CC_KEYWORDS = [
  'cc-hair', 'cc-clothes', 'cc-pack', 'cc-makeup', 'cc-skin',
  'cc-eyes', 'cc-furniture', 'alpha-cc', 'mm-cc',
  'hair-cc', 'clothes-cc', 'makeup-cc', 'skin-cc',
  'eyelashes-cc', 'body-preset',
];

const STARDEW_URL_KEYWORDS = [
  'stardew-valley', 'stardew', 'sdv',
];

const MINECRAFT_URL_KEYWORDS = [
  'minecraft', 'shader', 'shaders',
  'resource-pack', 'texture-pack', 'data-pack',
  'optifine', 'fabric-mod', 'forge-mod',
];

/**
 * Detect game from blog post URL slug.
 * URL slugs are the strongest signal — they're SEO-optimized and manually curated.
 *
 * @returns Game name string. Defaults to 'Sims 4' (backward compat).
 */
export function detectGameFromUrl(url: string): string {
  if (!url) return 'Sims 4';

  let slug: string;
  try {
    const parsed = new URL(url);
    slug = parsed.pathname.toLowerCase();
  } catch {
    slug = url.toLowerCase();
  }

  // Check Stardew first — more specific than generic keywords
  for (const keyword of STARDEW_URL_KEYWORDS) {
    if (slug.includes(keyword)) return 'Stardew Valley';
  }

  // Check Minecraft
  for (const keyword of MINECRAFT_URL_KEYWORDS) {
    if (slug.includes(keyword)) return 'Minecraft';
  }

  // Check Sims 4 explicit keywords
  for (const keyword of SIMS_4_URL_KEYWORDS) {
    if (slug.includes(keyword)) return 'Sims 4';
  }

  // Check Sims 4 CC-specific keywords
  for (const keyword of SIMS_4_CC_KEYWORDS) {
    if (slug.includes(keyword)) return 'Sims 4';
  }

  // Default: Sims 4 (all legacy content is Sims 4)
  return 'Sims 4';
}

/**
 * Detect game from WordPress categories and post title (HTML metadata).
 * Fallback when URL detection is ambiguous.
 */
export function detectGameFromHtml(categories: string[], title: string): string {
  const combined = [...categories, title].join(' ').toLowerCase();

  // Check Stardew
  if (/stardew|sdv/i.test(combined)) return 'Stardew Valley';

  // Check Minecraft
  if (/minecraft|shader|resource.?pack|texture.?pack/i.test(combined)) return 'Minecraft';

  // Check Sims 4
  if (/sims\s*4|ts4|maxis.?match|cas\b|woohoo|alpha\s*cc/i.test(combined)) return 'Sims 4';

  // Default
  return 'Sims 4';
}

/**
 * Orchestrator: detect game using URL first (strongest signal), then HTML fallback.
 */
export function detectGame(url: string, categories: string[], title: string): string {
  const urlResult = detectGameFromUrl(url);

  // If URL gave us a non-default (specific) result, trust it
  if (urlResult !== 'Sims 4') return urlResult;

  // If URL defaulted, check HTML for a more specific signal
  const htmlResult = detectGameFromHtml(categories, title);
  return htmlResult;
}

// ============================================
// CONTENT TYPE DETECTION FROM URL
// ============================================

interface ContentTypeMapping {
  patterns: RegExp[];
  contentType: string;
}

const SIMS_4_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  { patterns: [/hair-cc/, /cc-hair/], contentType: 'hair' },
  { patterns: [/makeup-cc/, /cc-makeup/], contentType: 'makeup' },
  { patterns: [/eyelash/, /lashes-cc/], contentType: 'lashes' },
  { patterns: [/skin-cc/, /cc-skin/, /skin-overlay/], contentType: 'skin' },
  { patterns: [/eyes-cc/, /cc-eyes/, /eye-color/], contentType: 'eyes' },
  { patterns: [/clothes-cc/, /cc-clothes/, /clothing-cc/], contentType: 'tops' },
  { patterns: [/furniture/, /build-buy/], contentType: 'furniture' },
  { patterns: [/pose-pack/, /poses/], contentType: 'poses' },
  { patterns: [/body-preset/, /presets/], contentType: 'preset' },
  { patterns: [/woohoo|gameplay-mod|trait-mod/], contentType: 'gameplay-mod' },
  { patterns: [/decor/, /clutter/], contentType: 'decor' },
  { patterns: [/tattoo/], contentType: 'tattoos' },
  { patterns: [/nail/], contentType: 'nails' },
  { patterns: [/shoes-cc/, /cc-shoes/], contentType: 'shoes' },
  { patterns: [/accessories-cc/, /cc-accessories/, /jewelry/], contentType: 'accessories' },
];

const MINECRAFT_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  { patterns: [/shader/], contentType: 'shaders' },
  { patterns: [/resource-pack/], contentType: 'resource-pack' },
  { patterns: [/texture-pack/], contentType: 'texture-pack' },
  { patterns: [/modpack/, /mod-pack/], contentType: 'modpack' },
  { patterns: [/data-pack/], contentType: 'data-pack' },
];

const STARDEW_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  { patterns: [/portrait/], contentType: 'portraits' },
  { patterns: [/retexture/], contentType: 'retexture' },
  { patterns: [/farm-map/, /farm-layout/], contentType: 'farm-map' },
];

/**
 * Detect content type from URL slug fragments.
 * Maps URL patterns to facet values matching seed-facet-definitions.ts.
 *
 * @returns contentType string or undefined for generic/ambiguous slugs
 */
export function detectContentTypeFromUrl(url: string): string | undefined {
  if (!url) return undefined;

  let slug: string;
  try {
    const parsed = new URL(url);
    slug = parsed.pathname.toLowerCase();
  } catch {
    slug = url.toLowerCase();
  }

  // Try game-specific mappings based on detected game
  const game = detectGameFromUrl(url);

  let mappings: ContentTypeMapping[];
  switch (game) {
    case 'Minecraft':
      mappings = MINECRAFT_CONTENT_MAPPINGS;
      break;
    case 'Stardew Valley':
      mappings = STARDEW_CONTENT_MAPPINGS;
      break;
    default:
      mappings = SIMS_4_CONTENT_MAPPINGS;
  }

  for (const mapping of mappings) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(slug)) {
        return mapping.contentType;
      }
    }
  }

  return undefined;
}

// ============================================
// AUTHOR EXTRACTION & GUARANTEE
// ============================================

// Domain-based author fallbacks (when all other methods fail)
const DOMAIN_AUTHOR_MAP: Record<string, string> = {
  'thesimsresource.com': 'The Sims Resource Creator',
  'curseforge.com': 'CurseForge Creator',
  'nexusmods.com': 'Nexus Mods Creator',
  'modthesims.info': 'ModTheSims Creator',
  'patreon.com': 'Patreon Creator',
  'tumblr.com': 'Tumblr Creator',
  'simsdom.com': 'SimsDom Creator',
};

const ULTIMATE_FALLBACK_AUTHOR = 'MustHaveMods Community';

/**
 * Extract WordPress blog post author from HTML metadata.
 * Checks meta tags and structured data.
 */
export function extractBlogPostAuthor($: CheerioAPI): string | undefined {
  // Method 1: meta[name="author"]
  const metaAuthor = $('meta[name="author"]').attr('content')?.trim();
  if (metaAuthor && metaAuthor.length >= 2) return metaAuthor;

  // Method 2: meta[property="article:author"]
  const articleAuthor = $('meta[property="article:author"]').attr('content')?.trim();
  if (articleAuthor && articleAuthor.length >= 2) return articleAuthor;

  // Method 3: .author-name element
  const authorName = $('.author-name').first().text().trim();
  if (authorName && authorName.length >= 2) return authorName;

  // Method 4: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      if (data?.author?.name && data.author.name.length >= 2) {
        return data.author.name;
      }
      // Handle array of authors
      if (Array.isArray(data?.author) && data.author[0]?.name) {
        return data.author[0].name;
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return undefined;
}

/**
 * Extract domain-based author hint from a download URL.
 */
function getDomainAuthorHint(downloadUrl: string | undefined): string | undefined {
  if (!downloadUrl) return undefined;

  try {
    const parsed = new URL(downloadUrl);
    const hostname = parsed.hostname.toLowerCase();

    for (const [domain, author] of Object.entries(DOMAIN_AUTHOR_MAP)) {
      if (hostname.includes(domain)) {
        return author;
      }
    }
  } catch {
    // Invalid URL
  }

  return undefined;
}

/**
 * Guarantee a non-null, non-empty author string.
 * **NEVER returns null/undefined/empty** — this is the key invariant.
 *
 * Priority chain:
 * 1. authorFromTitle (from title parsing patterns)
 * 2. authorFromUrl (from download URL patterns — Patreon /c/, TSR /members/, Tumblr subdomain)
 * 3. authorFromModPage (scraped from actual download page)
 * 4. Domain-based hint from download URL (more specific than blog author)
 * 5. blogPostAuthor (WordPress post author — often the blog writer, not mod creator)
 * 6. Ultimate fallback: "MustHaveMods Community"
 */
export function ensureAuthor(ctx: AuthorExtractionContext): string {
  // Check each source in priority order
  const candidates = [
    ctx.authorFromTitle,
    ctx.authorFromUrl,
    ctx.authorFromModPage,
    getDomainAuthorHint(ctx.downloadUrl),
    ctx.blogPostAuthor,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length >= 2) {
      return candidate.trim();
    }
  }

  return ULTIMATE_FALLBACK_AUTHOR;
}
