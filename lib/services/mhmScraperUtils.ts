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
  { patterns: [/dress-cc/, /cc-dress/], contentType: 'dresses' },
  { patterns: [/furniture/, /build-buy/], contentType: 'furniture' },
  // E228 (Rowan, 2026-10-17): `/sims-4-farmhouse-cc/` is a furniture/decor
  // round-up (12 furniture, 3 decor/clutter of 25 rows), but `/house/` read it
  // as `lot`. Must sit BEFORE the `/house/` rule. `/sims-4-farmhouses/` (no
  // `-cc`) is a real lots post and keeps falling through to `lot`.
  { patterns: [/farmhouse-cc/], contentType: 'furniture' },
  { patterns: [/house/, /houses/, /lot-/], contentType: 'lot' },
  { patterns: [/pose/, /poses/], contentType: 'poses' },
  // E235 (Rowan, 2026-10-18): `/body-preset/` used to share the `preset` rule,
  // but the body-presets collection filters on `body-preset` only — a body
  // preset post's untitled row landed outside its own page. Must sit BEFORE
  // the generic `/presets/` rule. Guarded in collection-url-category.test.ts.
  { patterns: [/body-preset/], contentType: 'body-preset' },
  { patterns: [/presets/, /ear-preset/], contentType: 'preset' },
  { patterns: [/woohoo|gameplay-mod|trait-mod/], contentType: 'gameplay-mod' },
  // E235: `/clutter/` used to share the `decor` rule; the clutter collection
  // filters on `clutter` only. `/decor/` stays first, so a slug naming both
  // (e.g. `-decor-and-clutter-`) keeps reading as decor.
  { patterns: [/decor/], contentType: 'decor' },
  { patterns: [/clutter/], contentType: 'clutter' },
  { patterns: [/tattoo/], contentType: 'tattoos' },
  { patterns: [/nail/], contentType: 'nails' },
  { patterns: [/shoes-cc/, /cc-shoes/, /shoe-cc/], contentType: 'shoes' },
  { patterns: [/hat-cc/, /cc-hat/, /hats/], contentType: 'hats' },
  // E228: `/jewelry/` used to map to `accessories`, but the jewelry-cc
  // collection filters on `jewelry`/`watches` — a jewelry post's URL fallback
  // at ingest landed outside its own collection. Guarded against the registry
  // in __tests__/unit/collection-url-category.test.ts.
  { patterns: [/jewelry/, /jewellery/], contentType: 'jewelry' },
  { patterns: [/accessories-cc/, /cc-accessories/], contentType: 'accessories' },
  { patterns: [/kitchen/], contentType: 'kitchen' },
  { patterns: [/bathroom/], contentType: 'bathroom' },
  { patterns: [/bedroom/], contentType: 'bedroom' },
  { patterns: [/eyeliner/], contentType: 'eyeliner' },
  { patterns: [/lipstick/, /lip-cc/], contentType: 'lipstick' },
  { patterns: [/blush/], contentType: 'blush' },
  { patterns: [/eyebrow/], contentType: 'eyebrows' },
  { patterns: [/glasses/, /sunglasses/], contentType: 'glasses' },
  { patterns: [/top-cc/, /cc-top/, /shirt/, /sweater/], contentType: 'tops' },
  { patterns: [/bottom/, /pants/, /skirt/], contentType: 'bottoms' },
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

// ============================================
// POST SELECTION (incremental ingest)
// ============================================

/**
 * One <url> entry from the blog-posts sitemap. `lastmod` is undefined when the
 * sitemap did not carry one (older WordPress sitemaps), in which case the entry
 * is never filtered out by `since` — better to re-check a post than to miss it.
 */
export interface SitemapPostEntry {
  url: string;
  lastmod?: Date;
}

export interface SelectPostsOptions {
  /** Keep only entries whose sitemap lastmod is on/after this date. */
  since?: Date;
  /**
   * When true, skip any post that already has at least one Mod row whose
   * sourceUrl is this post. This makes freshness a property of the database,
   * not of the untracked data/mhm-scraped-urls.csv, so the scraper is safe to
   * run from a fresh worktree or a scheduled job without re-crawling the
   * whole blog (2026-09-09: 667 posts, 31 days with zero inserts because the
   * only freshness state lived in the operator's checkout).
   */
  newOnly?: boolean;
  /** Distinct Mod.sourceUrl values already in the DB (any trailing-slash form). */
  knownSourceUrls?: readonly string[];
  /**
   * E161 (2026-10-02): with `newOnly`, re-select a known post when its sitemap
   * `lastmod` is strictly newer than the post's last ingest. The writer refreshes
   * old seasonal posts instead of publishing new ones (7 of the 15 posts modified
   * 09-11 → 10-02 were first ingested in Nov 2025), and `newOnly` alone skipped
   * every one of them: `sims-4-fall-decor-cc` (lastmod 09-28) carried 18
   * uningested mods while the daily job logged `created=0` for six days.
   * Needs `knownSourceLastIngest`; a known post with no entry stays skipped.
   */
  refreshed?: boolean;
  /**
   * Mod.sourceUrl → the post's last ingest (any trailing-slash form). Build it with
   * `buildKnownSourceLastIngest` — max(createdAt, lastScraped), not createdAt alone (E239).
   */
  knownSourceLastIngest?: Readonly<Record<string, Date>>;
}

/** One row of `prisma.mod.groupBy({ by: ['sourceUrl'], _max: { createdAt, lastScraped } })`. */
export interface SourceIngestGroup {
  sourceUrl: string | null;
  _max: { createdAt: Date | null; lastScraped?: Date | null };
}

/**
 * When did we last ingest this post? max(newest Mod.createdAt, newest Mod.lastScraped).
 *
 * E239 (Nova, 2026-10-19): E161 used max(createdAt) alone, and createdAt only moves when a
 * re-scrape *creates* a row. A refreshed post whose edit added nothing new therefore stayed
 * "newer than its last ingest" forever: `sims-4-nursery-cc` and `sims-4-y2k-cc-finds-for-2025`
 * were re-fetched on every morning run 10-10 → 10-19 (10 runs, 0 created, 66 rows skipped
 * "already complete", ~2 pages + ~40 author-page fetches each time). The re-scrape now stamps
 * `lastScraped` on every existing row it matched (mhmScraper.saveModsToDatabase), and this
 * max() is what lets that stamp end the loop. `updatedAt` stays excluded (counter writes, E136).
 */
export function postLastIngest(
  maxCreatedAt: Date | null | undefined,
  maxLastScraped: Date | null | undefined
): Date | undefined {
  let best: Date | undefined;
  [maxCreatedAt, maxLastScraped].forEach(d => {
    if (d && !Number.isNaN(d.getTime()) && (!best || d.getTime() > best.getTime())) best = d;
  });
  return best;
}

/** sourceUrl → postLastIngest(...) for every group that has one. Pure. */
export function buildKnownSourceLastIngest(groups: readonly SourceIngestGroup[]): Record<string, Date> {
  const out: Record<string, Date> = {};
  groups.forEach(g => {
    const d = postLastIngest(g._max.createdAt, g._max.lastScraped);
    if (g.sourceUrl && d) out[g.sourceUrl] = d;
  });
  return out;
}

export interface SelectPostsResult {
  selected: string[];
  skippedSince: number;
  skippedKnown: number;
  /** Known posts selected again because the sitemap says they changed after we last ingested them. */
  selectedRefreshed: number;
}

/** Normalize a post URL for set membership: lowercase host, single trailing slash, no hash/query. */
export function normalizePostUrl(url: string): string {
  let u = url.trim();
  const hashIdx = u.indexOf('#');
  if (hashIdx >= 0) u = u.slice(0, hashIdx);
  const qIdx = u.indexOf('?');
  if (qIdx >= 0) u = u.slice(0, qIdx);
  u = u.replace(/^http:\/\//i, 'https://');
  u = u.replace(/^(https:\/\/)www\./i, '$1');
  const m = u.match(/^(https:\/\/[^/]+)(\/.*)?$/i);
  if (m) u = m[1].toLowerCase() + (m[2] ?? '');
  if (!u.endsWith('/')) u += '/';
  return u;
}

/**
 * Decide which sitemap posts to fetch. Pure: no network, no DB. Order of the
 * input is preserved (sitemaps list newest first).
 */
export function selectPostsToScrape(
  entries: SitemapPostEntry[],
  opts: SelectPostsOptions = {}
): SelectPostsResult {
  const known = new Set<string>();
  // forEach, not for…of: tsconfig targets ES5 without downlevelIteration (see PR #19).
  if (opts.newOnly && opts.knownSourceUrls) {
    opts.knownSourceUrls.forEach(k => {
      if (k) known.add(normalizePostUrl(k));
    });
  }
  const lastIngest = new Map<string, number>();
  if (opts.newOnly && opts.refreshed && opts.knownSourceLastIngest) {
    Object.keys(opts.knownSourceLastIngest).forEach(k => {
      const d = opts.knownSourceLastIngest![k];
      const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
      if (k && !Number.isNaN(t)) lastIngest.set(normalizePostUrl(k), t);
    });
  }

  const seen = new Set<string>();
  const selected: string[] = [];
  let skippedSince = 0;
  let skippedKnown = 0;
  let selectedRefreshed = 0;

  for (const entry of entries) {
    if (!entry?.url) continue;
    const key = normalizePostUrl(entry.url);
    if (seen.has(key)) continue;
    seen.add(key);

    if (opts.since && entry.lastmod && entry.lastmod.getTime() < opts.since.getTime()) {
      skippedSince++;
      continue;
    }
    if (opts.newOnly && known.has(key)) {
      // Strictly newer: a date-only <lastmod> is UTC midnight, so a post ingested
      // at 10:42Z and edited later the same day is a bounded miss (caught on its
      // next edit), while a post ingested today is never re-fetched today.
      const ingestedAt = lastIngest.get(key);
      const isRefreshed =
        opts.refreshed === true &&
        ingestedAt !== undefined &&
        entry.lastmod !== undefined &&
        entry.lastmod.getTime() > ingestedAt;
      if (!isRefreshed) {
        skippedKnown++;
        continue;
      }
      selectedRefreshed++;
    }
    selected.push(entry.url);
  }

  return { selected, skippedSince, skippedKnown, selectedRefreshed };
}

/** Parse a sitemap <lastmod> value ("2026-09-09" or full ISO); undefined when absent/invalid. */
export function parseSitemapLastmod(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Date-only values are UTC midnight per the sitemap protocol (W3C datetime).
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
