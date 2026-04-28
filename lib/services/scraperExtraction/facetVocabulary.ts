/**
 * Shared facet vocabulary for scraper extraction.
 *
 * Consolidates the contentType → keyword map previously split between:
 *   - lib/services/mhmScraperUtils.ts (SIMS_4_CONTENT_MAPPINGS regex table)
 *   - lib/services/weWantModsScraper.ts (URL_CATEGORY_MAP)
 *
 * This is the single source of truth used by the URL slug keyword matcher
 * (see ./urlSlugMatcher.ts) and, going forward, by any extractor that needs
 * a keyword → contentType lookup.
 *
 * NOTE on ContentType: the canonical strict union lives in
 * `lib/services/aiFacetExtractor.ts` as `FACET_VALUES.contentType`. However
 * the MHM/WWM scraper code paths have always emitted a broader string set
 * (e.g. 'eyebrows', 'lashes', 'eyeliner', 'lipstick', 'blush', 'beard',
 * 'wall-art', 'pet-furniture', 'preset', 'watches', 'seasonal'). We keep
 * ContentType as a plain string alias here so the extended vocabulary can
 * live alongside the strict canonical values without forcing a schema
 * rewrite. Downstream consumers (DB writes, UI) already treat contentType
 * as `string`.
 */

export type ContentType = string;

/**
 * FACET_VOCABULARY: contentType → ordered list of keyword tokens that, when
 * found as a standalone slug token, imply that contentType.
 *
 * Tokens must be lowercase, and should be matched as whole tokens (not
 * substrings). The matcher tokenizes on `/`, `-`, `_` so multi-word
 * keywords need to appear as single compound tokens — keep entries short.
 */
export const FACET_VOCABULARY: Record<ContentType, string[]> = {
  // =========================================================================
  // SEASONAL / THEME (priority over decor/furniture when co-occurring)
  // =========================================================================
  seasonal: [
    'halloween', 'christmas', 'xmas', 'valentines', 'valentine',
    'easter', 'thanksgiving', 'holiday',
  ],

  // =========================================================================
  // CAS — HAIR & FACE (granular)
  // =========================================================================
  hair: [
    'hair', 'hairstyle', 'hairstyles', 'haircut', 'haircuts',
    'ponytail', 'braids', 'wig', 'updo', 'afro', 'locs',
    'dreadlocks', 'mohawk', 'pixie', 'bun',
  ],

  eyebrows: ['eyebrow', 'eyebrows', 'brows', 'brow'],

  lashes: ['eyelash', 'eyelashes', 'lash', 'lashes'],

  eyeliner: ['eyeliner', 'liner'],

  lipstick: ['lipstick', 'lipgloss', 'lipliner'],

  blush: ['blush', 'blusher'],

  beard: ['beard', 'beards', 'goatee', 'stubble'],

  'facial-hair': ['mustache', 'moustache'],

  makeup: [
    'makeup', 'cosmetics', 'cosmetic', 'eyeshadow',
    'mascara', 'foundation', 'contour', 'highlighter',
  ],

  skin: [
    'skin', 'skinblend', 'skinblends', 'skindetails',
    'overlay', 'overlays', 'freckles', 'moles', 'birthmark',
  ],

  eyes: ['eyes', 'eye', 'contacts', 'lenses'],

  tattoos: ['tattoo', 'tattoos', 'ink'],

  nails: ['nails', 'nail', 'manicure'],

  preset: ['preset', 'presets'],

  // =========================================================================
  // CAS — CLOTHING
  // =========================================================================
  tops: [
    'top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses',
    'sweater', 'sweaters', 'hoodie', 'jacket', 'coat',
    'cardigan', 'tshirt', 'tank', 'turtleneck', 'vest', 'blazer',
  ],

  bottoms: [
    'bottom', 'bottoms', 'pants', 'jeans', 'shorts', 'skirt', 'skirts',
    'leggings', 'trousers', 'sweatpants',
  ],

  dresses: ['dress', 'dresses', 'gown', 'gowns', 'maxi', 'midi'],

  'full-body': [
    'outfit', 'outfits', 'romper', 'jumpsuit', 'bodysuit',
    'pajamas', 'sleepwear', 'swimsuit', 'bikini', 'costume', 'uniform',
  ],

  shoes: [
    'shoes', 'shoe', 'footwear', 'boots', 'boot',
    'sneakers', 'sneaker', 'heels', 'sandals', 'slippers', 'loafers', 'flats',
  ],

  // =========================================================================
  // CAS — ACCESSORIES (granular)
  // =========================================================================
  watches: ['watch', 'watches'],

  jewelry: [
    'jewelry', 'jewellery', 'necklace', 'necklaces',
    'earrings', 'earring', 'bracelet', 'bracelets',
    'ring', 'rings', 'piercing', 'piercings',
  ],

  glasses: ['glasses', 'sunglasses', 'eyewear'],

  hats: ['hat', 'hats', 'cap', 'caps', 'beanie', 'headband', 'crown', 'tiara', 'headwear'],

  accessories: ['accessory', 'accessories', 'bag', 'purse', 'backpack', 'belt', 'scarf', 'scarves'],

  // =========================================================================
  // BUILD/BUY — ROOMS (more specific than furniture)
  // =========================================================================
  bathroom: ['bathroom', 'bath'],
  kitchen: ['kitchen'],
  bedroom: ['bedroom'],

  // =========================================================================
  // BUILD/BUY — DECOR & FURNITURE
  // =========================================================================
  decor: [
    'decor', 'decoration', 'decorations', 'decorative',
    'vase', 'frame', 'clock', 'sculpture',
  ],

  'wall-art': ['wallart', 'painting', 'paintings', 'poster', 'posters'],

  clutter: ['clutter', 'trinket', 'knickknack', 'figurine'],

  furniture: [
    'furniture', 'furnishings', 'furnishing',
    'sofa', 'couch', 'chair', 'table', 'desk',
    'bed', 'beds', 'dresser', 'wardrobe', 'closet',
    'shelf', 'shelves', 'bookshelf', 'cabinet',
    'nightstand', 'vanity', 'mirror', 'bench', 'stool', 'armchair',
    'salon', // salon furniture sets (vanity stations, styling chairs, etc.)
  ],

  lighting: ['lighting', 'light', 'lights', 'lamp', 'lamps', 'chandelier', 'sconce', 'lantern', 'candle'],

  plants: ['plant', 'plants', 'flower', 'tree', 'bush', 'succulent', 'houseplant'],

  rugs: ['rug', 'rugs', 'carpet', 'carpets', 'mat'],

  curtains: ['curtain', 'curtains', 'drapes', 'blinds'],

  electronics: ['tv', 'television', 'computer', 'laptop', 'phone', 'stereo', 'speaker'],

  outdoor: ['outdoor', 'patio', 'garden', 'yard', 'fence', 'pool'],

  // =========================================================================
  // GAMEPLAY / SCRIPT
  // =========================================================================
  'gameplay-mod': ['gameplay', 'interaction', 'interactions', 'autonomy', 'pregnancy', 'woohoo'],

  'script-mod': ['script', 'scripts', 'mccc', 'basemental', 'wickedwhims'],

  trait: ['trait', 'traits', 'personality'],

  career: ['career', 'careers', 'job', 'jobs', 'profession'],

  food: ['food', 'recipe', 'recipes', 'meal', 'cooking', 'dish', 'drink', 'beverage'],

  poses: ['pose', 'poses', 'posepack', 'posepacks'],

  animations: ['animation', 'animations', 'animated'],

  // =========================================================================
  // LOTS
  // =========================================================================
  lot: ['lot', 'lots', 'house', 'houses', 'home', 'apartment', 'mansion', 'cottage', 'residential', 'venue', 'build', 'builds'],

  // =========================================================================
  // UI
  // =========================================================================
  'cas-background': ['casbackground', 'casbg'],

  'loading-screen': ['loadingscreen'],

  'ui-preset': ['reshade', 'gshade'],
};

/**
 * VOCABULARY_PRIORITY: tiebreaker order when a single slug matches multiple
 * contentTypes. Earlier entries win.
 *
 * Ordering rationale (more-specific wins over more-generic):
 *   seasonal  — a themed pack beats any generic category (halloween-decor → seasonal, not decor)
 *   preset    — face/body presets are specific CAS items
 *   lashes, eyebrows, eyeliner, lipstick, blush — granular face items beat generic 'makeup'
 *   watches   — granular accessory beats generic 'accessories'
 *   jewelry, glasses, hats — specific accessories beat 'accessories'
 *   beard, facial-hair — specific CAS items
 *   hair      — specific
 *   skin, eyes, tattoos, nails, makeup
 *   dresses, tops, bottoms, shoes, full-body — granular clothing
 *   wall-art, rugs, curtains, lighting, plants, clutter — granular build-buy
 *   bathroom, kitchen, bedroom — rooms (more specific than furniture)
 *   decor     — more specific than furniture
 *   furniture
 *   outdoor, electronics
 *   poses, animations, trait, career, food
 *   lot
 *   gameplay-mod, script-mod
 *   cas-background, loading-screen, ui-preset
 *   accessories — last resort catch-all for the accessories bucket
 */
export const VOCABULARY_PRIORITY: ContentType[] = [
  'seasonal',
  'preset',
  'lashes',
  'eyebrows',
  'eyeliner',
  'lipstick',
  'blush',
  'watches',
  'jewelry',
  'glasses',
  'hats',
  'beard',
  'facial-hair',
  'hair',
  'skin',
  'eyes',
  'tattoos',
  'nails',
  'makeup',
  'dresses',
  'tops',
  'bottoms',
  'shoes',
  'full-body',
  'wall-art',
  'rugs',
  'curtains',
  'lighting',
  'plants',
  'clutter',
  'bathroom',
  'kitchen',
  'bedroom',
  'decor',
  'furniture',
  'outdoor',
  'electronics',
  'poses',
  'animations',
  'trait',
  'career',
  'food',
  'lot',
  'gameplay-mod',
  'script-mod',
  'cas-background',
  'loading-screen',
  'ui-preset',
  'accessories',
];
