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

/**
 * Build a regex that matches any of the given slug "segments" — substrings
 * that appear bounded by hyphen, slash, or string boundary.
 *
 * `seg('house')` matches '/house', '-house-', '/house/' but NOT '-lighthouse-'.
 * This is the strictness upgrade from the previous substring-only matching:
 *   /pants/   was: matches "underpants" ❌
 *   seg('pants') is: matches "-pants-" only ✓
 *
 * Plurals: pass each form explicitly (`'ring', 'rings'`) when both should match.
 * Most slugs are SEO-curated so plural/singular variants are stable.
 */
function seg(...words: string[]): RegExp {
  // Words contain only [a-z0-9-]; safe to interpolate.
  const alts = words.join('|');
  return new RegExp(`(?:^|[-/])(?:${alts})(?:[-/]|$)`);
}

// ============================================
// SLUG NORMALIZATION
// ============================================

/**
 * Date markers that show up in MHM slugs but aren't content signals.
 * "sims-4-cc-finds-april-2024" → "sims-4-cc-finds" (so the cc-finds rule fires).
 *
 * Months are matched as whole segments only — "march" the month gets stripped,
 * but "march-on-mod" wouldn't (no such slug, but defensive).
 */
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  // Common abbreviations
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
];

/**
 * Listicle-prefix words we strip from the front of a slug so the meaningful
 * noun is exposed to our rules. "best-sims-4-main-menu-overrides" should
 * match like "sims-4-main-menu-overrides".
 *
 * NOTE: These are word-class markers, not content. We also strip leading
 * count words like "10-" / "20-" (paired with `-best-` / `-must-have-` etc).
 */
const LISTICLE_PREFIXES = [
  'best', 'top', 'must-have', 'must-have-the', 'essential', 'ultimate',
  'amazing', 'awesome', 'incredible',
];

/**
 * Normalize a slug for content-type matching: lowercase, strip leading slash,
 * strip month-name + year segments, strip listicle prefixes. The result is
 * passed to the same `seg(...)` regexes as before — strip operations only
 * REMOVE noise tokens, they don't introduce new ones, so existing rules
 * keep working unchanged.
 *
 * Idempotent. Safe to call multiple times. Exported for unit tests.
 */
export function normalizeSlug(rawSlug: string): string {
  let s = rawSlug.toLowerCase();

  // Drop a leading/trailing slash so the seg() boundary anchor (`^`) lines up.
  s = s.replace(/^\/+|\/+$/g, '');

  // Strip 4-digit year segments (2018-2099 covers all realistic blog years).
  s = s.replace(/(?:^|-)(20\d{2})(?=-|$)/g, '');

  // Strip month-name segments. We use seg() boundaries to avoid eating
  // "march" inside a hypothetical "marching-band" slug (none exist, but it
  // costs nothing to be careful).
  for (const m of MONTH_NAMES) {
    s = s.replace(new RegExp(`(?:^|-)${m}(?=-|$)`, 'g'), '');
  }

  // Strip listicle prefixes. Only at the FRONT of the slug — a "best-" in
  // the middle could be part of a real phrase ("the-best-friend-mod").
  // Also handles compound forms: "10-must-have-..." / "top-20-...".
  for (let i = 0; i < 3; i++) {
    const before = s;
    // Optional leading count: `10-`, `20-`, `top-10-`, etc.
    s = s.replace(/^(?:top-)?\d+-/, '');
    for (const p of LISTICLE_PREFIXES) {
      s = s.replace(new RegExp(`^${p}-`), '');
    }
    if (s === before) break;
  }

  // Collapse double-hyphens left over from removed segments.
  s = s.replace(/-{2,}/g, '-');
  // Trim hyphens at the edges.
  s = s.replace(/^-+|-+$/g, '');

  return s;
}

// ============================================
// NON-MOD POST SKIP LIST
// ============================================

/**
 * Slug patterns for MHM posts that aren't actually about mods — they're
 * help articles, troubleshooting guides, cheat-code references, or posts
 * about official EA content. Caller (mhmScraper) checks `shouldSkipPost()`
 * BEFORE running per-link extraction; matching posts get marked as scraped
 * in the CSV so we don't re-try, but no rows are written to the DB.
 *
 * KEEP THIS CONSERVATIVE. False positives here mean a real mod post never
 * gets ingested. When in doubt, leave it out — the contentType detector
 * will return null and the post can be reviewed in the admin.
 *
 * ── Categories ───────────────────────────────────────────────────────
 *   - EA pack / scenario / DLC posts (e.g. /sims-4-tiny-living/,
 *     /the-sims-4-adventure-awaits/, /restaurant-in-sims-4/). The post
 *     describes EA-published content the user would buy from EA, not a mod.
 *   - Cheat-code / how-to / troubleshooting posts. Slugs containing
 *     `-cheats`, `-error`, `-how-to-...`. These reference no downloadable
 *     mod even when the content links out to wikis/forums.
 *   - Tools that ship with EA tooling (`-tray-importer`).
 *
 * Last reviewed 2026-04-28.
 */
const SKIP_POST_SLUGS: RegExp[] = [
  // ── Official EA content posts ──────────────────────────────────────
  // Tiny Living, Dine Out / Restaurant, Adventure Awaits scenario, etc.
  // These are paid EA packs, not mods.
  /^sims-4-tiny-living$/,
  /^the-sims-4-adventure-awaits$/,
  /^restaurant-in-sims-4$/,
  /^sims-4-tray-importer$/,

  // ── Cheats, troubleshooting, error guides ─────────────────────────
  // Slugs ending in -cheats / -cheat / -error / -fix / -bug describe
  // gameplay tips or bug workarounds, not mods.
  /-cheats?$/,
  /-error$/,
  /-fix$/,
  /-bug$/,
  /^how-to-/,
];

export function shouldSkipPost(url: string): boolean {
  let slug: string;
  try {
    slug = new URL(url).pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  } catch {
    slug = url.toLowerCase();
  }

  for (const re of SKIP_POST_SLUGS) {
    if (re.test(slug)) return true;
  }
  return false;
}

/**
 * URL → contentType mappings for Sims 4. First match wins, so order is by
 * specificity: granular CAS face types → CAS clothing → build/buy → general.
 *
 * Coverage requirements (tested in __tests__/unit/contentTypeFromUrl.test.ts):
 * - Every MHM article slug pattern in `data/mhm-scraped-urls.csv` should resolve
 *   to a non-undefined contentType when one of these facets clearly applies.
 *   Generic mix slugs like `-baddie-cc/` or `-lookbook/` correctly return
 *   undefined and fall through to title-based detection.
 * - Hyphen-bounded segments prevent false positives (e.g. `-house-` → lot,
 *   but `-lighthouse-` does not match).
 */
const SIMS_4_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  // ── Granular face/CAS types (must come BEFORE generic makeup) ─────────
  { patterns: [seg('eyeliner', 'eye-liner')], contentType: 'eyeliner' },
  { patterns: [seg('lipstick', 'lipgloss', 'lip-cc', 'lip-gloss', 'lip-tint', 'lip-color', 'lip-colour')], contentType: 'lipstick' },
  { patterns: [seg('eyebrow', 'eyebrows', 'brow-cc', 'cc-brows')], contentType: 'eyebrows' },
  { patterns: [seg('lashes', 'lash', 'eyelash', 'eyelashes', 'lashes-cc')], contentType: 'lashes' },
  { patterns: [seg('blush', 'blush-cc')], contentType: 'blush' },
  { patterns: [seg('makeup-cc', 'cc-makeup', 'makeup')], contentType: 'makeup' },

  // ── Skin / Eyes ─────────────────────────────────────────────────────
  { patterns: [seg('skin-cc', 'cc-skin', 'skin-overlay', 'skintones', 'skin-tones', 'acne')], contentType: 'skin' },
  { patterns: [seg('eyes-cc', 'cc-eyes', 'eye-color', 'eye-colors', 'iris-cc', 'iris')], contentType: 'eyes' },

  // ── Tattoos / Nails ─────────────────────────────────────────────────
  { patterns: [seg('tattoo', 'tattoos')], contentType: 'tattoos' },
  { patterns: [seg('nail', 'nails', 'nail-cc')], contentType: 'nails' },

  // ── Jewelry (rings/bracelets/necklaces/earrings/anklets/piercings) ───
  // Highest priority among accessory-types so an /sims-4-anklet-cc/ doesn't
  // get picked up as generic accessories.
  {
    patterns: [
      seg(
        'ring', 'rings', 'bracelet', 'bracelets', 'necklace', 'necklaces',
        'earring', 'earrings', 'hoop-earrings', 'anklet', 'anklets',
        'choker', 'chokers', 'piercing', 'piercings', 'nose-piercings',
        'jewelry', 'jewellery',
      ),
    ],
    contentType: 'jewelry',
  },

  // ── Hats (incl. flower crowns/headpieces — count as headwear) ────────
  {
    patterns: [
      seg(
        'hat-cc', 'cc-hat', 'hat', 'hats', 'cap-cc', 'caps',
        'beanie', 'beanies', 'flower-crown', 'crown', 'crowns',
      ),
    ],
    contentType: 'hats',
  },

  // ── Glasses / Eyewear ───────────────────────────────────────────────
  { patterns: [seg('glasses', 'sunglasses', 'eyewear')], contentType: 'glasses' },

  // ── Hair (cuts, colors, styles, lookbook hair-only) ─────────────────
  { patterns: [seg('hair-cc', 'cc-hair', 'hair', 'hairs', 'hairstyle', 'hairstyles', 'bun', 'buns', 'braid', 'braids', 'braided-hair', 'curly-hair', 'short-hair', 'long-hair', 'male-hair', 'female-hair', 'black-hair', 'blonde-hair', 'red-hair', 'bob-hair', 'two-toned-hair', 'afro-hair', 'urban-hair', 'alpha-hair', 'maxis-hair')], contentType: 'hair' },

  // ── Shoes ───────────────────────────────────────────────────────────
  {
    patterns: [
      seg(
        'shoes-cc', 'cc-shoes', 'shoe-cc', 'shoes', 'shoe',
        'boots', 'boots-cc', 'heels', 'heel-cc', 'sandal', 'sandals',
        'sneaker', 'sneakers', 'flats',
      ),
    ],
    contentType: 'shoes',
  },

  // ── Dresses / Gowns ─────────────────────────────────────────────────
  { patterns: [seg('dress-cc', 'cc-dress', 'dress', 'dresses', 'gown', 'gowns')], contentType: 'dresses' },

  // ── Full-body outfits ───────────────────────────────────────────────
  {
    patterns: [
      seg(
        'swimsuit', 'swimwear', 'bikini', 'bikinis',
        'jumpsuit', 'jumpsuits', 'romper', 'rompers',
        'bodysuit', 'bodysuits', 'overall', 'overalls', 'lingerie',
      ),
    ],
    contentType: 'full-body',
  },

  // ── Tops ────────────────────────────────────────────────────────────
  {
    patterns: [
      seg(
        'top-cc', 'cc-top', 'tops', 'shirt', 'shirts',
        't-shirt', 'tshirt', 'tee', 'tees', 'sweater', 'sweaters',
        'hoodie', 'hoodies', 'blouse', 'blouses', 'crop-top', 'crop-tops',
      ),
    ],
    contentType: 'tops',
  },

  // ── Bottoms ─────────────────────────────────────────────────────────
  {
    patterns: [
      seg(
        'pants', 'pants-cc', 'jean', 'jeans', 'jean-cc', 'denim',
        'shorts', 'shorts-cc', 'leggings', 'skirt', 'skirts',
        'trouser', 'trousers',
      ),
    ],
    contentType: 'bottoms',
  },

  // ── Generic clothing slugs (mens/fall/winter clothes) → tops as default
  // because most "clothes" aggregator articles lead with tops. Only match
  // when no more specific clothing type matched above.
  {
    patterns: [
      seg('clothes-cc', 'cc-clothes', 'clothing-cc', 'mens-clothes', 'womens-clothes', 'alpha-clothes'),
      // "fall-clothes-cc" etc. — segment match handles it
    ],
    contentType: 'tops',
  },

  // ── Accessories (bags, belts, scarves, watches — non-jewelry) ────────
  {
    patterns: [
      seg('accessories-cc', 'cc-accessories', 'accessories'),
      seg('bag', 'bags', 'purse', 'purses', 'wallet', 'wallets'),
      seg('belt', 'belts', 'scarf', 'scarves', 'gloves', 'watch', 'watches'),
    ],
    contentType: 'accessories',
  },

  // ── Build/Buy: specific room categories (must come BEFORE 'furniture') ──
  { patterns: [seg('kitchen', 'kitchen-cc')], contentType: 'kitchen' },
  { patterns: [seg('bathroom', 'bathroom-cc')], contentType: 'bathroom' },
  { patterns: [seg('bedroom', 'bedroom-cc', 'bedroom-clutter')], contentType: 'bedroom' },

  // ── Build/Buy: specific item types ──────────────────────────────────
  { patterns: [seg('lighting', 'lamp', 'lamps', 'chandelier', 'chandeliers')], contentType: 'lighting' },
  { patterns: [seg('rug', 'rugs')], contentType: 'rugs' },
  { patterns: [seg('curtain', 'curtains', 'blinds')], contentType: 'curtains' },
  { patterns: [seg('plants', 'plant-cc', 'flowers-cc')], contentType: 'plants' },
  { patterns: [seg('wall-art', 'wall-decor', 'paintings', 'posters')], contentType: 'wall-art' },
  { patterns: [seg('decor', 'decor-cc', 'clutter', 'clutter-cc')], contentType: 'decor' },

  // ── Furniture (the catch-all for build/buy items that aren't above) ──
  {
    patterns: [
      seg('furniture', 'furniture-cc', 'build-buy'),
      seg('appliance', 'appliances', 'window', 'windows', 'windows-cc'),
      seg('door', 'doors', 'doors-cc'),
      seg('bed', 'beds', 'sofa', 'couch', 'desk', 'chair', 'chairs', 'closet', 'wardrobe'),
      seg('brick-wall', 'wall-cc', 'walls', 'flooring', 'floors'),
    ],
    contentType: 'furniture',
  },

  // ── Lots / Houses ────────────────────────────────────────────────────
  // Strict segment match — "lighthouse", "warehouse" no longer false-positive.
  {
    patterns: [
      seg('house', 'houses', 'home', 'homes', 'lot', 'lots',
          'mansion', 'mansions', 'cabin', 'cabins',
          'cottage', 'cottages', 'apartment', 'apartments',
          'castle', 'castles', 'bachelor-pad', 'starter-home',
          'starter-homes', 'beach-houses', 'autumn-houses',
          'cabin-houses', 'room-ideas'),
    ],
    contentType: 'lot',
  },

  // ── Backgrounds / Loading screens ────────────────────────────────────
  { patterns: [seg('cas-background', 'cas-backgrounds', 'mirror-background')], contentType: 'cas-background' },
  { patterns: [seg('loading-screen', 'loading-screens')], contentType: 'loading-screen' },

  // ── Body presets ────────────────────────────────────────────────────
  { patterns: [seg('body-preset', 'body-presets', 'athletic-body-presets', 'ear-preset', 'preset', 'presets')], contentType: 'preset' },

  // ── Poses / Animations ──────────────────────────────────────────────
  {
    patterns: [
      seg('pose', 'poses', 'pose-pack', 'pose-packs',
          'gallery-poses', 'sleeping-poses', 'family-poses',
          'beach-poses', 'wedding-poses', 'cas-poses',
          'car-poses', 'handbag-poses', 'couple-poses'),
    ],
    contentType: 'poses',
  },
  { patterns: [seg('animation', 'animations')], contentType: 'animations' },

  // ── Pregnancy / Maternity (revenue-pivot facet) ────────────────────
  {
    patterns: [seg('pregnancy', 'maternity', 'pregnancy-mod', 'pregnancy-mods', 'maternity-cc')],
    contentType: 'pregnancy',
  },

  // ── Lookbooks (curated outfit showcases) ────────────────────────────
  // Slugs like sims-4-fall-lookbook, sims-4-chic-lookbook, sims-4-fairy-
  // lookbook. Each post is a styled outfit gathering CC from many creators
  // — not a single mod, but a recognizable editorial format.
  {
    patterns: [seg('lookbook', 'lookbooks', 'outfit-inspo', 'styled-looks')],
    contentType: 'lookbook',
  },

  // ── Gameplay challenges (rules-of-play, not downloadable mods) ──────
  // sims-4-very-veggie-challenge, sims-4-100-baby-challenge, etc.
  // Editorial content that describes a way to play the game.
  {
    patterns: [seg('challenge', 'challenges', 'legacy-challenge')],
    contentType: 'challenge',
  },

  // ── Main-menu overrides (replace the SimsLand backdrop / music) ─────
  // sims-4-main-menu-overrides, best-sims-4-main-menu-cc.
  {
    patterns: [seg('main-menu', 'main-menu-override', 'main-menu-overrides', 'main-menu-cc')],
    contentType: 'main-menu',
  },

  // ── CC Finds roundups (monthly editorial) ───────────────────────────
  // After normalizeSlug strips months/years, slugs like
  // "sims-4-cc-finds-april-2024" reduce to "sims-4-cc-finds" and match
  // here. Catches the "April CC Finds" edge case the user flagged.
  {
    patterns: [seg('cc-finds', 'cc-find', 'mhm-finds', 'mods-finds', 'mod-finds')],
    contentType: 'cc-finds',
  },

  // ── Easter (seasonal collection) ────────────────────────────────────
  // Seasonal articles mix decor/clothing/hair/etc. but the editorial
  // intent is "Easter" — categorize the whole article that way.
  {
    patterns: [seg('easter', 'easter-cc', 'easter-mods')],
    contentType: 'easter',
  },

  // ── Princess (editorial collection) ─────────────────────────────────
  // Same pattern as easter: /sims-4-princess-cc/ lists dresses, hair,
  // tiaras, jewelry, lots, etc. Granular per-mod detection on this page
  // is unreliable (a glass slipper "set" has been misread as jewelry),
  // and the editorial intent is clearly "Princess" — so categorize the
  // whole article that way.
  {
    patterns: [seg('princess', 'royalcore')],
    contentType: 'princess',
  },

  // ── Royals (gender-neutral sibling to princess) ─────────────────────
  // /sims-4-royal-cc/ lists male + female regal CC (gowns, uniforms,
  // crowns, palaces). Same noisy granular detection problem; same
  // editorial-collection treatment. Kept separate from princess so we
  // don't force male CC under a feminine label.
  {
    patterns: [seg('royal', 'royals', 'royalty')],
    contentType: 'royals',
  },

  // ── Food / Recipes ──────────────────────────────────────────────────
  {
    patterns: [
      seg('food', 'food-cc', 'recipe', 'recipes',
          'baking', 'breakfast', 'cooking', 'meal', 'meals'),
    ],
    contentType: 'food',
  },

  // ── Trait / Career ──────────────────────────────────────────────────
  { patterns: [seg('trait', 'traits', 'trait-mod', 'trait-mods', 'trait-pack')], contentType: 'trait' },
  { patterns: [seg('career', 'careers', 'career-mod', 'career-mods')], contentType: 'career' },

  // ── Gameplay / Script (catch-all for "*-mod(s)" articles) ───────────
  // Lowest priority — any specific contentType above wins.
  {
    patterns: [
      seg('woohoo', 'gameplay-mod', 'gameplay-mods', 'routine-mod', 'routine-mods'),
      seg('script-mod', 'script-mods'),
    ],
    contentType: 'gameplay-mod',
  },
];

const MINECRAFT_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  { patterns: [/shader/], contentType: 'shaders' },
  { patterns: [/resource-pack/], contentType: 'resource-pack' },
  { patterns: [/texture-pack/], contentType: 'texture-pack' },
  { patterns: [/modpack/, /mod-pack/], contentType: 'modpack' },
  { patterns: [/data-pack/], contentType: 'data-pack' },
];

const STARDEW_CONTENT_MAPPINGS: ContentTypeMapping[] = [
  // Specific (run before catch-alls)
  { patterns: [/portrait/], contentType: 'portraits' },
  { patterns: [/retexture/], contentType: 'retexture' },
  { patterns: [/farm-map/, /farm-layout/], contentType: 'farm-map' },

  // Quality-of-life / general gameplay enhancements (added 2026-04-28).
  // MHM publishes lots of these — "stardew-valley-quality-of-life-mods",
  // "stardew-valley-economy-mods", "stardew-valley-automation-mods", etc.
  // We bucket them all as `gameplay-mod` (the same value Sims 4 uses) so
  // they share a single facet without proliferating Stardew-only types.
  {
    patterns: [
      /quality-of-life/,
      /qol-mod/,
      /automation-mod/,
      /economy-mod/,
      /utility-mod/,
      /stardew-valley-mods/,
      /sdv-mods/,
    ],
    contentType: 'gameplay-mod',
  },

  // Expansion / new-content mods (NPCs, towns, expansions).
  {
    patterns: [
      /expansion-mod/,
      /expansion-pack/,
      /new-npc/,
      /custom-npc/,
      /custom-character/,
    ],
    contentType: 'expansion',
  },
];

/**
 * Detect content type from URL slug fragments.
 * Maps URL patterns to facet values matching seed-facet-definitions.ts.
 *
 * @returns contentType string or undefined for generic/ambiguous slugs
 */
export function detectContentTypeFromUrl(url: string): string | undefined {
  if (!url) return undefined;

  let rawSlug: string;
  try {
    const parsed = new URL(url);
    rawSlug = parsed.pathname.toLowerCase();
  } catch {
    rawSlug = url.toLowerCase();
  }

  // Normalize: strip month/year markers and listicle prefixes BEFORE matching.
  // The seg() rules expect hyphen/slash boundaries, and normalizeSlug preserves
  // those — it only removes whole noise tokens. We pad with leading/trailing
  // hyphens so the normalized result still hits the seg() boundary anchors
  // for first-and-last segments (`^` becomes a hyphen edge after normalization).
  const slug = `-${normalizeSlug(rawSlug)}-`;

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
// THEME DETECTION FROM URL
// ============================================

interface ThemeMapping {
  patterns: RegExp[];
  themes: string[];
}

/**
 * URL → themes mappings. Used for editorial collection pages whose slug
 * conveys an aesthetic/theme that won't be obvious from individual mod
 * titles (e.g. /sims-4-princess-cc/ — the listed mods are dresses/hairs/
 * tiaras, but the editorial intent is "Princess"). Themes are additive,
 * so this complements (not replaces) per-mod content type detection.
 */
const SIMS_4_THEME_MAPPINGS: ThemeMapping[] = [
  { patterns: [seg('princess', 'royalcore')], themes: ['princess'] },
  { patterns: [seg('royal', 'royals', 'royalty')], themes: ['royals'] },
];

/**
 * Detect themes from URL slug fragments. Returns a (possibly empty) array.
 * Currently only emits Sims 4 themes; other games can opt in later.
 */
export function detectThemesFromUrl(url: string): string[] {
  if (!url) return [];

  let slug: string;
  try {
    const parsed = new URL(url);
    slug = parsed.pathname.toLowerCase();
  } catch {
    slug = url.toLowerCase();
  }

  const game = detectGameFromUrl(url);
  if (game !== 'Sims 4') return [];

  const matched = new Set<string>();
  for (const mapping of SIMS_4_THEME_MAPPINGS) {
    if (mapping.patterns.some(p => p.test(slug))) {
      for (const theme of mapping.themes) matched.add(theme);
    }
  }
  return Array.from(matched);
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
