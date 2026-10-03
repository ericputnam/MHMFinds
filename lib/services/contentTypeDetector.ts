/**
 * Content Type Detector Service
 *
 * CTB-003: Intelligent content type detection for Sims 4 mods
 * Analyzes title and description to determine the most accurate content type
 *
 * Key features:
 * - Granular face categories: eyebrows, lashes, eyeliner, blush, lipstick, beard, facial-hair
 * - CAS items: cas-background, preset, loading-screen
 * - Pet items: pet-furniture, pet-clothing, pet-accessories
 * - Build/buy: furniture, decor, clutter, lighting, plants, rugs, curtains, wall-art
 * - Room theme detection
 * - Confidence scoring (high/medium/low)
 * - Returns undefined for ambiguous cases
 */

import { BEDROOM_THEME, isBedroomTitle } from '../bedroomThemeRules';
import { KITCHEN_THEME, isKitchenTitle } from '../kitchenThemeRules';
import { BATHROOM_THEME, isBathroomTitle } from '../bathroomThemeRules';
import { HOLIDAYS_CONTENT_TYPE, isHolidaysTitle } from '../holidaysContentTypeRules';
import { LOT_CONTENT_TYPE, LOT_TITLE_KEYWORDS } from '../lotContentTypeRules';

// ============================================
// TYPES
// ============================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DetectionResult {
  contentType: string | undefined;
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
  reasoning?: string;
}

export interface RoomThemeResult {
  themes: string[];
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
}

// ============================================
// KEYWORD PRIORITY SYSTEM
// Higher priority keywords are checked first and take precedence
// ============================================

export interface KeywordRule {
  keywords: string[];  // Keywords to match (case-insensitive)
  negativeKeywords?: string[];  // Keywords that should NOT be present
  contentType: string;
  priority: number;  // Higher = checked first, takes precedence
  /**
   * E168: the rule is evidence only when a keyword is in the TITLE; the
   * description pass skips it. A blog post's description is shared by every
   * mod scraped from it, so a description-read rule pollutes whole facets at
   * once (lighting #61, gameplay-mod #79, jewelry, every room theme, lot).
   */
  titleOnly?: boolean;
}

// Priority levels:
// 100+ = Granular face types (most specific, override generic makeup)
// 80-99 = Specific CAS categories
// 60-79 = Pet items
// 40-59 = Build/Buy specific
// 20-39 = Generic clothing/CAS
// 1-19 = Generic fallbacks

/**
 * Exported so guard tests can assert against the real rule table rather than
 * a restated copy of it (house rule: guard the constant, not a copy of its
 * value). Read-only for every consumer outside this module.
 */
export const CONTENT_TYPE_RULES: KeywordRule[] = [
  // ============================================
  // GRANULAR FACE TYPES (Priority 100+)
  // These MUST be checked before generic makeup
  // ============================================

  // Eyebrows
  {
    keywords: ['eyebrow', 'eyebrows', 'brow', 'brows'],
    negativeKeywords: ['lash', 'eyelash', 'eyeliner', 'lipstick', 'blush', 'mascara'],
    contentType: 'eyebrows',
    priority: 110,
  },

  // Lashes/Eyelashes
  {
    keywords: ['eyelash', 'eyelashes', 'lash', 'lashes', '3d lash', '3d lashes'],
    negativeKeywords: ['eyebrow', 'brow'],
    contentType: 'lashes',
    priority: 109,
  },

  // Eyeliner
  {
    keywords: ['eyeliner', 'eye liner', 'liner'],
    negativeKeywords: ['lip liner', 'lipliner'],
    contentType: 'eyeliner',
    priority: 108,
  },

  // Lipstick
  {
    keywords: ['lipstick', 'lip stick', 'lip gloss', 'lipgloss', 'lip color', 'lip colour',
               'lips n*', 'lips for', 'cerise lips', 'glossy lips', 'matte lips',
               'gloss collection', 'butter gloss', 'lip tint'],
    contentType: 'lipstick',
    priority: 107,
  },

  // Blush (SCR-008: Added contour, highlighter for granular face detection)
  {
    keywords: ['blush', 'blusher', 'cheek color', 'rouge', 'contour', 'contouring', 'highlighter', 'highlight'],
    contentType: 'blush',
    priority: 106,
  },

  // Beard
  {
    keywords: ['beard', 'beards', 'goatee', 'stubble'],
    contentType: 'beard',
    priority: 105,
  },

  // Facial Hair (broader category for mustaches and combinations)
  {
    keywords: ['facial hair', 'facial-hair', 'mustache', 'moustache', 'sideburns', 'mutton chops'],
    negativeKeywords: ['beard'],  // Prefer 'beard' if both match
    contentType: 'facial-hair',
    priority: 104,
  },

  // Pregnancy / Maternity (Revenue Pivot Initiative 1, added 2026-04-09)
  // High priority because "maternity dress" and "pregnancy belly" would
  // otherwise match generic dress/skin rules. Backfilled by
  // scripts/backfill-pregnancy-facet.ts against ~115 keyword-matching mods.
  {
    keywords: [
      'pregnan*', 'maternity', 'belly overlay', 'pregnancy belly',
      'baby bump', 'preggo', 'pregnant sim',
    ],
    contentType: 'pregnancy',
    priority: 103,
  },

  // ============================================
  // CAS SPECIAL ITEMS (Priority 90-99)
  // ============================================

  // CAS Background
  {
    keywords: ['cas background', 'cas-background', 'cas bg', 'cas room', 'create a sim background'],
    contentType: 'cas-background',
    priority: 99,
  },

  // Loading Screen
  {
    keywords: ['loading screen', 'loading-screen', 'load screen', 'main menu'],
    contentType: 'loading-screen',
    priority: 98,
  },

  // Preset (body preset, CAS preset)
  {
    keywords: ['body preset', 'preset', 'presets', 'face preset', 'cas preset', 'sim preset'],
    negativeKeywords: ['reshade', 'gshade', 'shader'],  // These are UI presets, not body presets
    contentType: 'preset',
    priority: 97,
  },

  // ============================================
  // PET ITEMS (Priority 60-79)
  // ============================================

  // Pet Furniture
  {
    keywords: ['pet bed', 'pet furniture', 'cat bed', 'dog bed', 'cat tree', 'scratch post',
               'scratching post', 'pet bowl', 'food bowl', 'water bowl', 'fish tank', 'aquarium',
               'pet house', 'dog house', 'cat house', 'pet crate', 'kennel'],
    contentType: 'pet-furniture',
    priority: 75,
  },

  // Pet Clothing
  {
    keywords: ['pet clothing', 'pet clothes', 'dog clothing', 'cat clothing', 'pet outfit',
               'dog outfit', 'cat outfit', 'pet sweater', 'dog sweater', 'cat sweater',
               'pet costume', 'dog costume', 'cat costume'],
    contentType: 'pet-clothing',
    priority: 74,
  },

  // Pet Accessories
  {
    keywords: ['pet accessory', 'pet accessories', 'collar', 'pet collar', 'dog collar',
               'cat collar', 'leash', 'pet leash', 'harness', 'pet harness', 'pet bandana',
               'dog bandana', 'cat bandana', 'pet bow', 'pet tag'],
    contentType: 'pet-accessories',
    priority: 73,
  },

  // ============================================
  // BUILD/BUY SPECIFIC (Priority 40-59)
  // ============================================

  // Wall Art (specific decor type)
  {
    keywords: ['wall art', 'wall-art', 'painting', 'paintings', 'poster', 'posters',
               'canvas', 'wall decor', 'mural', 'murals', 'picture frame', 'framed'],
    contentType: 'wall-art',
    priority: 58,
  },

  // Rugs
  {
    keywords: ['rug', 'rugs', 'carpet', 'carpets', 'floor mat', 'area rug'],
    contentType: 'rugs',
    priority: 57,
  },

  // Curtains
  {
    keywords: ['curtain', 'drape', 'blind', 'window treatment'],
    // "curtain bangs" is a hairstyle, not a window treatment — it put a male
    // hair CC pack into the `curtains` facet (Nova, 2026-09-08).
    negativeKeywords: ['curtain bang', 'bangs', 'hair'],
    contentType: 'curtains',
    priority: 56,
  },

  // Plants
  {
    keywords: ['plant', 'plants', 'houseplant', 'houseplants', 'succulent', 'succulents',
               'potted plant', 'flower pot', 'planter', 'greenery', 'foliage'],
    negativeKeywords: ['garden', 'outdoor'],  // These might be outdoor category
    contentType: 'plants',
    priority: 55,
  },

  // Lighting
  //
  // The bare adjective 'light' was removed on 2026-09-08: it matched
  // "Light To Medium Skintones", "Light Up Gaming PC", "Into the Light" and
  // any build set whose description happened to say "adds a warm light".
  // Only nouns that can only be a light fixture remain.
  {
    keywords: ['lamp', 'lighting', 'chandelier', 'sconce', 'lantern',
               'ceiling light', 'floor lamp', 'table lamp', 'pendant light',
               'wall light', 'light fixture', 'nightlight', 'night light'],
    negativeKeywords: [
      'christmas light', 'fairy light', 'string light',  // These are decor
      // Lighting *presets* and skin/CAS assets are not build-mode lights.
      'gshade', 'reshade', 'preset', 'skintone', 'skin tone', 'overlay',
    ],
    contentType: 'lighting',
    priority: 54,
  },

  // Clutter
  {
    keywords: ['clutter', 'clutters', 'trinket', 'trinkets', 'knickknack', 'figurine',
               'decorative object', 'small decor', 'tabletop decor', 'shelf decor',
               'pillow', 'pillows', 'throw pillow', 'cushion', 'cushions'],
    contentType: 'clutter',
    priority: 53,
  },

  // Decor (broader than wall-art or clutter)
  {
    keywords: ['decor', 'decoration', 'decorations', 'decorative', 'ornament', 'ornaments',
               'wallpaper', 'wallpapers', 'wall paper'],
    contentType: 'decor',
    priority: 45,
  },

  // Furniture
  {
    keywords: ['furniture', 'sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'beds',
               'dresser', 'wardrobe', 'closet', 'shelf', 'shelves', 'bookshelf',
               'shelving', 'bookcase', 'drawer', 'drawers',
               'cabinet', 'nightstand', 'vanity', 'mirror', 'fireplace', 'armchair',
               'bench', 'stool', 'ottoman', 'console', 'sideboard', 'buffet',
               'dining table', 'coffee table', 'end table', 'tv stand', 'entertainment center',
               'sink', 'toilet', 'shower', 'tub', 'bathtub',
               'bedroom', 'bedding', 'suite',
               'living room set', 'living room collection', 'dining room set',
               'bedroom set', 'bedroom collection', 'kitchen set', 'bathroom set',
               'nursery set', 'nursery collection', 'furniture set', 'furniture collection'],
    // Scene-named pose packs ("Bed Talk Poses") are poses, not furniture
    negativeKeywords: ['pose', 'poses', 'pose pack', 'posepack'],
    contentType: 'furniture',
    priority: 44,
  },

  // ============================================
  // CLOTHING/CAS (Priority 20-39)
  // ============================================

  // Hair
  {
    keywords: ['hair', 'hairstyle', 'hairstyles', 'haircut', 'ponytail', 'braids', 'braid',
               'bun', 'updo', 'bangs', 'wig', 'locs', 'loc', 'dreadlocks', 'dreads',
               'afro', 'mohawk', 'pixie', 'bob', 'bob cut', 'curls', 'waves', 'straight hair'],
    negativeKeywords: ['facial hair', 'beard', 'eyebrow', 'brow', 'body hair'],
    contentType: 'hair',
    priority: 38,
  },

  // Full Body (check before individual pieces)
  {
    keywords: ['outfit', 'outfits', 'full body', 'full-body', 'jumpsuit', 'romper',
               'bodysuit', 'onesie', 'overalls', 'uniform', 'costume', 'pajamas', 'pyjamas',
               'sleepwear', 'swimsuit', 'bikini', 'swimwear', 'wetsuit', 'clothing set',
               'clothes set', 'outfit set',
               'suit', 'suits', 'tuxedo', 'activewear', 'sportswear', 'athleisure'],
    // 'set' alone is too generic - sneaker set, eyeshadow set, etc.
    // Use specific clothing set patterns instead
    negativeKeywords: ['eyeshadow', 'makeup', 'palette', 'sneaker', 'shoe', 'boots',
                       'furniture', 'decor', 'clutter', 'tattoo'],
    contentType: 'full-body',
    priority: 35,
  },

  // Dresses
  {
    keywords: ['dress', 'dresses', 'gown', 'gowns', 'nightgown', 'maxi', 'mini dress',
               'midi dress', 'cocktail dress', 'evening dress', 'wedding dress', 'ball gown'],
    contentType: 'dresses',
    priority: 34,
  },

  // Tops
  {
    keywords: ['top', 'tops', 'shirt', 'shirts', 'sweatshirt', 'blouse', 'sweater', 'sweaters',
               'hoodie', 'hoodies', 'jacket', 'jackets', 'coat', 'coats', 'raincoat',
               'overcoat', 'cardigan', 't-shirt', 'tshirt', 'tank top', 'crop top',
               'turtleneck', 'vest', 'blazer', 'pullover', 'corset', 'corsets'],
    contentType: 'tops',
    priority: 33,
  },

  // Bottoms
  {
    keywords: ['pants', 'jeans', 'shorts', 'skirt', 'skirts', 'miniskirt', 'leggings',
               'trousers', 'sweatpants', 'joggers', 'capris', 'culottes', 'mini skirt',
               'maxi skirt'],
    contentType: 'bottoms',
    priority: 32,
  },

  // Shoes
  {
    keywords: ['shoes', 'boots', 'sneakers', 'heels', 'sandals', 'slippers', 'loafers',
               'flats', 'pumps', 'oxfords', 'platforms', 'wedges', 'mules', 'clogs',
               'ankle boots', 'high heels', 'stilettos'],
    contentType: 'shoes',
    priority: 31,
  },

  // Jewelry
  //
  // Nova 2026-09-18 (E63). Two changes, both measured against all 16,481
  // catalog titles before landing:
  //
  //  1. The rule had no piercing vocabulary beyond the bare word 'piercing',
  //     so the things a piercing pack is usually *named* after scored nothing
  //     on the title. Same failure mode as `gameplay-mod` on 2026-09-10 (no
  //     nouns for career/aspiration/trait). Added: grillz (2 titles, 2 real),
  //     septum (14, 14 real), gauge (4, 4 real), dermal (1), navel (1),
  //     bangle (3, all bracelets), amulet (1). 26 titles, 0 false positives.
  //
  //  2. Rejected on measurement, recorded so nobody re-proposes them:
  //     'nose'  — 95 titles, but 48 are nose *presets* / sliders (body-preset,
  //               preset). A bare noun with a dominant second meaning, exactly
  //               the `realistic` case removed on 2026-09-10.
  //     'chain' — 31 titles, only 7 jewelry; the rest are belts, jeans,
  //               sandals, a fence and a bench.
  //     'gem'   — 10 titles, 3 jewelry; the rest crowns, nails, tooth gems.
  //     'charm' — 5 titles, 2 jewelry; the rest a bag, a garden set, a build.
  //     'grill' — only 2 titles (both teeth grills) and it is the ordinary
  //               word for a BBQ, which is outdoor furniture.
  //     'plug'  — 10 titles all ear plugs, but the description pass would hit
  //               every appliance that says "plug in". Not worth 10 rows.
  //
  // Redundant plural spellings removed (necklaces/earrings/bracelets/rings/
  // piercings): `keywordToRegex` already appends an optional `(?:s|es)?`, so
  // they were never doing any work — this is the hygiene established by
  // PR #61 (2026-09-08) and PR #79 (2026-09-10).
  {
    keywords: ['jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'bangle',
               'ring', 'piercing', 'septum', 'dermal', 'navel', 'gauge', 'grillz',
               'choker', 'pendant', 'amulet', 'anklet', 'brooch', 'cuff', 'stud', 'hoop'],
    contentType: 'jewelry',
    priority: 30,
  },

  // Glasses
  {
    keywords: ['glasses', 'sunglasses', 'eyewear', 'eyeglasses', 'spectacles', 'shades',
               'aviators', 'frames'],
    contentType: 'glasses',
    priority: 29,
  },

  // Hats
  {
    keywords: ['hat', 'hats', 'cap', 'caps', 'beanie', 'beret', 'headband', 'crown',
               'tiara', 'headwear', 'headpiece', 'hood', 'turban', 'bandana', 'headscarf'],
    contentType: 'hats',
    priority: 28,
  },

  // Accessories (generic - lower priority than specific types)
  {
    keywords: ['accessory', 'accessories', 'bag', 'bags', 'handbag', 'purse', 'backpack',
               'belt', 'scarf', 'scarves', 'gloves', 'watch', 'watches', 'socks', 'tights'],
    contentType: 'accessories',
    priority: 25,
  },

  // Makeup (generic - only if no specific face type matched)
  {
    keywords: ['makeup', 'make-up', 'cosmetic', 'cosmetics', 'eyeshadow', 'mascara',
               'foundation', 'contour', 'highlighter', 'concealer', 'beauty',
               'palette', 'eyeshadow palette'],
    contentType: 'makeup',
    priority: 37,  // Bumped to be higher than full-body (35) so 'Eyeshadow Palette Set' matches makeup
  },

  // Skin/Skin Details
  {
    keywords: ['skin', 'skinblend', 'skin blend', 'skin detail', 'skin details',
               'overlay', 'freckles', 'moles', 'birthmark', 'wrinkles', 'pores',
               'skin texture', 'body hair'],
    contentType: 'skin',
    priority: 23,
  },

  // Eyes
  {
    keywords: ['eyes', 'eye color', 'eye colour', 'contacts', 'contact lenses',
               'iris', 'pupils', 'heterochromia'],
    negativeKeywords: ['eyebrow', 'eyelash', 'eyeliner'],  // These have their own categories
    contentType: 'eyes',
    priority: 22,
  },

  // Tattoos (priority bumped to avoid 'full body' matching first)
  {
    keywords: ['tattoo', 'tattoos', 'body art', 'sleeve tattoo', 'leg tattoo', 'arm tattoo',
               'back tattoo', 'chest tattoo', 'face tattoo', 'neck tattoo', 'hand tattoo'],
    contentType: 'tattoos',
    priority: 36,  // Higher than full-body (35) so 'Full Body Tattoo' matches tattoos
  },

  // Nails
  {
    keywords: ['nail', 'nails', 'manicure', 'nail polish', 'press-on', 'press on',
               'acrylic nails', 'gel nails', 'nail art', 'fingernails'],
    contentType: 'nails',
    priority: 20,
  },

  // ============================================
  // MODS AND OTHER (Priority 10-19)
  // ============================================

  // Poses
  {
    keywords: ['pose', 'poses', 'pose pack', 'posepack', 'posing'],
    contentType: 'poses',
    priority: 18,
  },

  // Gameplay Mod
  //
  // 2026-09-10 (Nova): the four "mods" listicles ingested on 09-09
  // (social-media, phone, funeral, moving) contributed 81 rows with no
  // content type at all, because this rule had no nouns for the three things
  // a gameplay mod is usually named after — a career, an aspiration or a
  // trait. Added those plus the other unambiguous gameplay nouns found by
  // auditing every title in the catalog (`career` 56 hits / 25 already
  // gameplay-mod, `trait` 54 / 35, `overhaul` 21 / 16, `aspiration` 7 / 4,
  // `map replacement` 19, `life mod` 5, `side hustle` 1, `social bunny` 1).
  //
  // Three keywords were REMOVED in the same pass:
  //   - 'realistic' — a bare adjective, and the 09-08 lighting fix ruled
  //     those out. It appears in 32 titles spanning beards, body presets,
  //     skins, poses, shorts and houses; because this rule outranks `lot`
  //     (12), it was actively stealing "Suburban Realistic Houses" from the
  //     lot rule, and in a description it is pure marketing filler.
  //   - 'pregnancy' — a duplicate of the priority-103 pregnancy rule, which
  //     always wins on the same word. It could only ever add a second,
  //     spurious match to this rule's description count.
  //   - 'gameplay mod' / 'social interaction' / 'trait mod' / 'career mod' —
  //     each one contains another keyword in the same rule ('gameplay',
  //     'interaction', 'trait', 'career'), so one occurrence of the shorter
  //     word scored twice. Same class of bug as the 'light'/'lights' plural
  //     double-count (2026-09-08); `matchedKeywordsIn` now collapses these
  //     generally, and the redundant spellings are gone from the source too.
  {
    keywords: ['gameplay', 'mod pack', 'interaction', 'career', 'aspiration',
               'trait', 'overhaul', 'side hustle', 'life mod', 'map replacement',
               'social bunny', 'slice of life', 'tradition',
               'autonomy', 'woohoo', 'custom event', 'romance mod',
               'regency mod', 'inspired mod'],
    // Note: ' mod' alone is too generic - use specific patterns.
    // Negatives cover the CC items that are *themed* after a gameplay
    // concept rather than being one: career-themed build sets and clothing,
    // trait/career poses, and "portrait" is already excluded by the word
    // boundary in `keywordToRegex`.
    negativeKeywords: ['career outfit', 'career dress', 'career wear',
                       'career set', 'trait pose'],
    contentType: 'gameplay-mod',
    priority: 15,
  },

  // Script Mod
  {
    keywords: ['script mod', 'script', '.ts4script', 'mccc', 'mc command center',
               'wicked whims', 'basemental', 'utility mod', 'cheat', 'tweak'],
    contentType: 'script-mod',
    priority: 14,
  },

  // Lot/Build — TITLE ONLY since E168 (2026-10-03). Keyword list, counts and
  // rejections live in lib/lotContentTypeRules.ts; this is the same array, not
  // a copy (guard the constant, not a copy of its value).
  {
    keywords: LOT_TITLE_KEYWORDS,
    contentType: LOT_CONTENT_TYPE,
    priority: 12,
    titleOnly: true,
  },
];

// ============================================
// ROOM THEME KEYWORDS
// ============================================

interface RoomThemeRule {
  keywords: string[];
  theme: string;
}

const ROOM_THEME_RULES: RoomThemeRule[] = [
  // `bathroom` is deliberately NOT a keyword rule here: it is derived from the
  // TITLE only by `lib/bathroomThemeRules.ts` (Rowan, 2026-09-26, E112). The
  // old entry ('bathroom', 'bath', 'shower', 'tub', ... over title +
  // description) left the theme 33.8% title-supported (154 of 456 SFW Sims 4
  // rows, 24 of those baby showers) — Wicked Whims at card #1.
  // `kitchen` is deliberately NOT a keyword rule here: it is derived from the
  // TITLE only by `lib/kitchenThemeRules.ts` (Rowan, 2026-09-25, E109). The
  // old entry ('kitchen', 'cooking', 'chef', ... over title + description)
  // left the theme 34.2% title-supported (118 of 345 SFW Sims 4 rows) —
  // "Realistic Cooking Mod" at #2, food clutter and a chef career in the top 20.
  // `bedroom` is deliberately NOT a keyword rule here: it is derived from the
  // TITLE only by `lib/bedroomThemeRules.ts` (Rowan, 2026-09-24). The old
  // entry ('bedroom', 'bed room', 'sleeping', ... over title + description)
  // left the theme 37.3% title-supported (195 of 523 rows) — 133 of them
  // whole house builds, 26 pose packs, and "Sleeping Animation Pack".
  {
    keywords: ['living room', 'livingroom', 'living-room', 'lounge', 'family room',
               'sitting room', 'den'],
    theme: 'living-room',
  },
  {
    keywords: ['dining room', 'diningroom', 'dining-room', 'dining area', 'eating area'],
    theme: 'dining-room',
  },
  {
    keywords: ['outdoor', 'patio', 'garden', 'yard', 'backyard', 'front yard',
               'balcony', 'terrace', 'deck', 'pool', 'exterior'],
    theme: 'outdoor',
  },
  {
    keywords: ['office', 'study', 'workspace', 'work space', 'home office', 'desk area'],
    theme: 'office',
  },
  {
    keywords: ['kids room', 'kid room', 'kids bedroom', 'kid bedroom', 'child room',
               'child bedroom', 'childrens room', "children's room", 'playroom', 'play room'],
    theme: 'kids-room',
  },
  {
    keywords: ['nursery', 'baby room', 'infant room', 'newborn', 'toddler room'],
    theme: 'nursery',
  },
];

// ============================================
// KEYWORD MATCHING
// ============================================

// Keywords match on word boundaries (with an optional trailing s/es plural),
// so 'dress' does NOT match "headdress" and 'suit' does NOT match "suite".
// A trailing '*' marks a prefix keyword with no end boundary, e.g. 'pregnan*'
// matches "pregnancy" and "pregnant".
const keywordRegexCache = new Map<string, RegExp>();

function keywordToRegex(keyword: string): RegExp {
  let regex = keywordRegexCache.get(keyword);
  if (!regex) {
    const prefixOnly = keyword.endsWith('*');
    const kw = prefixOnly ? keyword.slice(0, -1) : keyword;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lead = /^\w/.test(kw) ? '\\b' : '';
    const trail = prefixOnly ? '' : /\w$/.test(kw) ? '(?:s|es)?\\b' : '';
    regex = new RegExp(`${lead}${escaped}${trail}`);
    keywordRegexCache.set(keyword, regex);
  }
  return regex;
}

function keywordMatches(text: string, keyword: string): boolean {
  return keywordToRegex(keyword).test(text);
}

/**
 * Collapse a matched keyword to the concept it represents, so that
 * redundant singular/plural spellings in the same rule cannot be counted
 * as two independent pieces of evidence.
 *
 * `keywordToRegex` already appends an optional `(?:s|es)?` plural, so a rule
 * listing BOTH 'light' and 'lights' produced TWO matches from the single word
 * "lights" in a description. The description pass promotes anything with
 * >= 2 matches to medium confidence, so one incidental word was enough to
 * relabel a mod. That is how 140 mods — a GShade preset, a skin overlay and a
 * Ford Crown Victoria among them — ended up tagged `lighting` (Nova, 2026-09-08).
 *
 * Deduping by stem means "lights" counts once, while a description that
 * genuinely says "lamp" *and* "chandelier" still counts twice.
 */
function keywordStem(keyword: string): string {
  const kw = keyword.endsWith('*') ? keyword.slice(0, -1) : keyword;
  return kw.replace(/(?:es|s)$/, '');
}

/**
 * Keywords from `rule.keywords` that match `text`, with singular/plural
 * spellings of the same concept collapsed to one entry, and with any keyword
 * that is contained in another matched keyword of the same rule dropped.
 *
 * The second collapse is the compound form of the same bug the stem collapse
 * fixes (Nova, 2026-09-10). A rule listing BOTH 'interaction' and
 * 'social interaction' scored TWO matches from the single phrase "social
 * interactions", and >= 2 description matches is promoted to medium
 * confidence — so one incidental phrase was enough to relabel a mod, exactly
 * as 'light' + 'lights' did on 2026-09-08. Stem-collapsing alone does not
 * catch it, because the two spellings have different stems.
 *
 * The pairs that existed in the source when this landed:
 *   gameplay-mod: 'gameplay mod'/'gameplay', 'social interaction'/'interaction',
 *                 'trait mod'/'trait', 'career mod'/'career'
 *   hair:         'bob cut'/'bob'
 *   lighting:     'ceiling light'/'light fixture'/... (no bare 'light' since 09-08)
 * The redundant spellings were removed from the gameplay-mod rule as well;
 * this guard is here so the next author who adds one cannot re-open the hole.
 */
function matchedKeywordsIn(text: string, keywords: string[]): string[] {
  const bySt = new Map<string, string>();
  for (const kw of keywords) {
    if (!keywordMatches(text, kw)) continue;
    const stem = keywordStem(kw);
    // Keep the longest spelling for readable `reasoning` strings.
    const existing = bySt.get(stem);
    if (!existing || kw.length > existing.length) bySt.set(stem, kw);
  }

  const matched = Array.from(bySt.values());
  // Drop any match whose stem appears inside a longer match's stem, so a
  // compound keyword and the simple keyword it contains count once.
  return matched.filter(kw => {
    const stem = keywordStem(kw);
    return !matched.some(other => {
      if (other === kw) return false;
      const otherStem = keywordStem(other);
      return otherStem.length > stem.length && otherStem.includes(stem);
    });
  });
}

// ============================================
// MAIN DETECTION FUNCTIONS
// ============================================

/**
 * Detect the content type from a mod's title and description
 *
 * @param title - The mod title
 * @param description - Optional mod description
 * @returns The detected content type, or undefined if ambiguous
 */
export function detectContentType(title: string, description?: string): string | undefined {
  const result = detectContentTypeWithConfidence(title, description);

  // Only return content type if confidence is medium or high
  if (result.confidence === 'low') {
    return undefined;
  }

  return result.contentType;
}

/**
 * Detect content type with full confidence information
 *
 * @param title - The mod title
 * @param description - Optional mod description
 * @returns Detection result with confidence scoring
 */
export function detectContentTypeWithConfidence(
  title: string,
  description?: string
): DetectionResult {
  const result = detectWithRules(title, description, SORTED_RULES);
  if (
    !result.contentType ||
    (!isSuppressedRoomTitledCas(title, result.contentType) && !isSuppressedRoomTitledLot(title, result.contentType))
  ) {
    return result;
  }
  return roomTitledFallback(title, result.contentType);
}

// ============================================
// ROOM-TITLED ROWS ARE NEVER CREATE-A-SIM (E132)
// ============================================

/**
 * Create-a-Sim content types: things a Sim wears or is. A row whose TITLE
 * passes a title-only room rule (bedroom / kitchen / bathroom) is build/buy
 * content and must never land in one of these facets.
 *
 * `cas-background` is deliberately NOT here: "Coquette Bedroom – CAS
 * Background" is a room-titled row that genuinely is a CAS background (2 such
 * rows on 2026-09-28). `pet-clothing` is not here either — no room-titled row
 * has ever carried it, and "pet bed" is vetoed by the bedroom rule anyway.
 *
 * Exported so the guard tests import the real set (house rule: guard the
 * constant, not a copy of its value).
 */
export const CAS_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'tops', 'bottoms', 'dresses', 'full-body', 'shoes', 'hair', 'makeup', 'eyebrows',
  'eyeliner', 'blush', 'lipstick', 'eyes', 'lashes', 'glasses', 'jewelry', 'nails',
  'accessories', 'hats', 'skin', 'tattoos', 'body-preset', 'preset', 'poses', 'beard',
  'facial-hair',
]);

/** True iff the title alone passes a title-only room rule (bedroom, kitchen or bathroom). */
export function isRoomTitle(title: string | null | undefined): boolean {
  return isBedroomTitle(title) || isKitchenTitle(title) || isBathroomTitle(title);
}

// ============================================
// A ROOM IS A THEME, NOT A CONTENT TYPE; A ROOM SET IS NOT A LOT (E147)
// ============================================

/**
 * Room words that are themes (`themes[]`, title-only rules in
 * lib/*ThemeRules.ts), never content types. The bathroom/kitchen/bedroom
 * collection pages filter on `themes`, so a row typed `bathroom` sat in no
 * content-type facet at all. The only writer was the blog post's URL category
 * (`detectContentTypeFromUrl`: /sims-4-bathroom-cc/ -> 'bathroom'); no
 * CONTENT_TYPE_RULES entry emits one. On 2026-09-30: 22 rows `bathroom`,
 * 8 `kitchen`, 0 `bedroom`/`living-room`; replaying today's ingest over them
 * re-wrote 10 `bathroom` and 6 `kitchen`. Exported for the guard test.
 */
export const ROOM_VALUE_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'bathroom', 'kitchen', 'bedroom', 'living-room',
]);

/** Whole-lot content types. `residential` has no current writer (591 legacy rows). */
const LOT_CONTENT_TYPES: ReadonlySet<string> = new Set(['lot', 'residential']);

/**
 * Title words that make a room-titled row a whole building, so `lot` stands
 * ("Ranch 5-Bedroom with In-Law Suite House"). Measured 2026-09-30 over the
 * 532 room-titled rows of the 16,561-row catalog, per lot-rule keyword in the
 * TITLE (real lots / hits): house 1/1. REJECTED — do not re-add: cottage 0/3
 * ("Country Cottage Refrigerator"), farmhouse 0/1 ("Duck Egg Blue Farmhouse
 * Kitchen"), manor 0/1 ("Midnight Manor Kitchen 1"), build 0/2 ("Build A
 * Shower Kit"). townhouse/apartment/mansion/villa: 0 hits, unambiguous
 * buildings. No singular+plural pairs (`keywordToRegex` adds the plural).
 */
const WHOLE_BUILDING_TITLE_WORDS = ['house', 'townhouse', 'apartment', 'mansion', 'villa'];

function namesWholeBuilding(title: string | null | undefined): boolean {
  const t = (title || '').toLowerCase();
  return WHOLE_BUILDING_TITLE_WORDS.some(w => keywordMatches(t, w));
}

/** True when `type` is a lot answer on a room-titled row whose title names no building. */
function isSuppressedRoomTitledLot(title: string | null | undefined, type: string): boolean {
  return LOT_CONTENT_TYPES.has(type) && isRoomTitle(title) && !namesWholeBuilding(title);
}

const SORTED_RULES: KeywordRule[] = [...CONTENT_TYPE_RULES].sort((a, b) => b.priority - a.priority);
// E147: the room-titled fallback drops the lot rule as well as every CAS rule —
// otherwise "Country Cottage Refrigerator" falls straight back to `lot`.
const SORTED_NON_CAS_RULES: KeywordRule[] = SORTED_RULES.filter(
  r => !CAS_CONTENT_TYPES.has(r.contentType) && !LOT_CONTENT_TYPES.has(r.contentType),
);

/**
 * CAS types a build/buy set's own TITLE uses as a word, so a title match on
 * them is not evidence of CAS. Measured 2026-09-28 over the 16,561-row
 * catalog: the only room-titled rows whose title alone read as CAS were
 * "Eevie Kitchen Accessories", "Sims 4 Bathroom Accessories" and
 * "2 Enchanted Bathroom Accessories" — 3 of 3 are build clutter (E120).
 */
const ROOM_AMBIGUOUS_CAS_TITLE_TYPES: ReadonlySet<string> = new Set(['accessories']);

/**
 * True when `type` is a CAS answer for a room-titled row that must be
 * suppressed. A CAS type the TITLE itself names is kept ("Kitchen Poses",
 * "Bedroom Eyes Lashes" — a pose pack staged in a room is still a pose pack;
 * 0 such rows in the catalog on 2026-09-28, so this exemption changes no
 * stored row). Everything else — a CAS type from the description, the blog
 * post's URL category, or an ambiguous title word — is suppressed.
 */
function isSuppressedRoomTitledCas(title: string | null | undefined, type: string): boolean {
  if (!CAS_CONTENT_TYPES.has(type) || !isRoomTitle(title)) return false;
  if (ROOM_AMBIGUOUS_CAS_TITLE_TYPES.has(type)) return true;
  const titleOnly = detectWithRules(title || '', undefined, SORTED_RULES);
  return !(titleOnly.contentType === type && titleOnly.confidence !== 'low');
}

/**
 * The answer for a room-titled row whose first answer was a CAS type: re-run
 * the detector over the TITLE ONLY with every CAS rule removed. A confident
 * build/buy answer ("Cozy Ruffle Bed" -> furniture) is kept; anything else is
 * `undefined` — NULL beats a guess, and fix-null-content-types.ts can repair
 * a NULL later, while a fridge on makeup-cc is visible to every visitor.
 *
 * Never falls back to the description: a blog post's description is shared by
 * every mod scraped from it, which is how these rows got a CAS type at all
 * (E120: "glass" in wine-fridge copy, "blush" inside "Roseblush").
 */
function roomTitledFallback(title: string, suppressed: string): DetectionResult {
  const r = detectWithRules(title, undefined, SORTED_NON_CAS_RULES);
  if (r.contentType && r.confidence !== 'low') {
    return { ...r, reasoning: `room-titled: "${suppressed}" suppressed (E132/E147); ${r.reasoning}` };
  }
  return {
    contentType: undefined,
    confidence: 'low',
    matchedKeywords: [],
    reasoning: `room-titled: "${suppressed}" suppressed (E132/E147) and the title names no build/buy type`,
  };
}

/**
 * `holidays` is kept only when the TITLE names a holiday
 * (`lib/holidaysContentTypeRules.ts`, E154). Otherwise the row is re-decided
 * from the title alone — medium/high confidence or NULL, never a guess. No
 * CONTENT_TYPE_RULES entry emits `holidays`, so the re-decision cannot loop
 * back to it. Any other candidate is returned unchanged.
 *
 * Why: on 2026-10-01, 432 of the 923 `holidays` rows (46.8%) named no
 * holiday — "Mary Dress", "Sony Wall Mounted TV", "Nike Air Force 1s" — all
 * from a legacy import where the source blog post decided the type.
 */
export function guardHolidaysContentType(
  title: string | null | undefined,
  candidate: string | null | undefined,
): string | undefined {
  if (!candidate) return undefined;
  if (candidate !== HOLIDAYS_CONTENT_TYPE) return candidate;
  if (isHolidaysTitle(title)) return candidate;
  const t = detectContentTypeWithConfidence(title || '');
  return t.confidence === 'low' ? undefined : t.contentType;
}

/**
 * Apply the room rules to a content type that came from somewhere other than
 * `detectContentTypeWithConfidence` — at ingest, the blog post's URL category
 * (`detectContentTypeFromUrl`) outranks the detector, so a bathroom set
 * scraped from a glasses round-up would otherwise still be written as
 * `glasses`. Three rules:
 *
 *   - a room value (`ROOM_VALUE_CONTENT_TYPES`, E147) is never returned, for
 *     ANY title: it is re-decided from the title alone, or NULL;
 *   - a CAS type on a room-titled row is suppressed (E132);
 *   - `lot`/`residential` on a room-titled row is suppressed unless the title
 *     names a whole building (E147).
 *
 * Otherwise the candidate is returned unchanged — except `holidays`, which
 * since E154 (2026-10-01) passes through `guardHolidaysContentType` first:
 * kept only when the title names a holiday.
 */
export function guardRoomTitledContentType(
  title: string | null | undefined,
  candidate: string | null | undefined,
): string | undefined {
  if (!candidate) return undefined;
  if (candidate === HOLIDAYS_CONTENT_TYPE) return guardHolidaysContentType(title, candidate);
  if (ROOM_VALUE_CONTENT_TYPES.has(candidate)) {
    // No rule emits a room value, so this re-decision cannot loop back to one.
    const t = detectContentTypeWithConfidence(title || '');
    return t.confidence === 'low' ? undefined : t.contentType;
  }
  if (!isSuppressedRoomTitledCas(title, candidate) && !isSuppressedRoomTitledLot(title, candidate)) return candidate;
  const r = roomTitledFallback(title || '', candidate);
  return r.confidence === 'low' ? undefined : r.contentType;
}

/**
 * The ingest composition (`mhmScraper.saveModsToDatabase`), E168 (2026-10-03):
 *
 *   1. a CONFIDENT title answer — `detectContentTypeWithConfidence(title)` at
 *      medium or high, the detector's own threshold, the same one every retag
 *      script uses — wins;
 *   2. otherwise the blog post's URL category (`detectContentTypeFromUrl`) is
 *      the fallback;
 *   3. otherwise the title+description detector, exactly as before;
 *   4. and whatever came out passes the room / holidays guards.
 *
 * Before E168 the order was URL → title+description, so every row on
 * /sims-4-fall-cc-clothes/ was written `tops` (20 of 20, 5 title-supported)
 * and 17 of the first 117 `--refreshed` rows (14.5%) were wrong (E161).
 * Whole-catalog replay on 2026-10-03: 5,412 rows carry a URL category; the
 * new order differs on 861 (15.9%), never to NULL; where it differs the stored
 * value agrees with the new answer 468 times and with the old 224. NULL beats
 * a guess, so nothing here invents a type the three sources did not produce.
 */
export function resolveIngestContentType(
  title: string | null | undefined,
  description: string | null | undefined,
  urlContentType: string | null | undefined,
): string | undefined {
  const t = detectContentTypeWithConfidence(title || '');
  const titleAnswer = t.confidence !== 'low' ? t.contentType : undefined;
  const candidate = titleAnswer ?? urlContentType ?? detectContentType(title || '', description || undefined);
  return guardRoomTitledContentType(title, candidate);
}

function detectWithRules(
  title: string,
  description: string | undefined,
  sortedRules: KeywordRule[],
): DetectionResult {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  const matchedKeywords: string[] = [];

  const hasNegative = (rule: KeywordRule): boolean =>
    !!rule.negativeKeywords?.some(neg =>
      keywordMatches(titleLower, neg) || keywordMatches(descLower, neg)
    );

  // PASS 1: title matches only. The title is what the creator named the item,
  // so any title match — even a low-priority one — beats a description-only
  // match (a dress whose description mentions "body preset" stays a dress).
  for (const rule of sortedRules) {
    if (hasNegative(rule)) {
      continue;
    }

    const matchedInTitle = matchedKeywordsIn(titleLower, rule.keywords);

    if (matchedInTitle.length > 0) {
      // Match in title = high confidence
      const confidence: ConfidenceLevel = matchedInTitle.length >= 2 ? 'high' :
                                          rule.priority >= 100 ? 'high' : 'medium';
      return {
        contentType: rule.contentType,
        confidence,
        matchedKeywords: matchedInTitle,
        reasoning: `Found "${matchedInTitle.join('", "')}" in title`,
      };
    }
  }

  // PASS 2: description-only matches, used when the title was uninformative.
  // A `titleOnly` rule (E168: lot) is never evidence here.
  for (const rule of sortedRules) {
    if (rule.titleOnly || hasNegative(rule)) {
      continue;
    }

    const matchedInDesc = matchedKeywordsIn(descLower, rule.keywords);

    if (matchedInDesc.length >= 2) {
      // Multiple matches in description = medium confidence
      return {
        contentType: rule.contentType,
        confidence: 'medium',
        matchedKeywords: matchedInDesc,
        reasoning: `Found "${matchedInDesc.join('", "')}" in description`,
      };
    }

    if (matchedInDesc.length === 1 && rule.priority >= 80) {
      // Single match in description for high-priority rule = medium confidence
      return {
        contentType: rule.contentType,
        confidence: 'medium',
        matchedKeywords: matchedInDesc,
        reasoning: `Found "${matchedInDesc[0]}" in description (high-priority rule)`,
      };
    }

    if (matchedInDesc.length === 1) {
      // Single match in description for lower priority = low confidence
      // Continue checking other rules but track this as a fallback
      if (matchedKeywords.length === 0) {
        matchedKeywords.push(...matchedInDesc);
      }
    }
  }

  // No confident match found
  return {
    contentType: undefined,
    confidence: 'low',
    matchedKeywords,
    reasoning: matchedKeywords.length > 0
      ? `Insufficient matches for confident detection. Found: "${matchedKeywords.join('", "')}"`
      : 'No keywords matched',
  };
}

/**
 * Detect room themes from a mod's title and description
 *
 * @param title - The mod title
 * @param description - Optional mod description
 * @returns Array of detected room themes
 */
export function detectRoomThemes(title: string, description?: string): string[] {
  const result = detectRoomThemesWithConfidence(title, description);
  return result.themes;
}

/**
 * Detect room themes with full confidence information
 *
 * @param title - The mod title
 * @param description - Optional mod description
 * @returns Room theme result with confidence scoring
 */
export function detectRoomThemesWithConfidence(
  title: string,
  description?: string
): RoomThemeResult {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  const detectedThemes: string[] = [];
  const allMatchedKeywords: string[] = [];
  let hasHighConfidenceMatch = false;

  for (const rule of ROOM_THEME_RULES) {
    let matchedInTitle = false;
    let matchedInDesc = false;
    let matchedKeyword = '';

    for (const keyword of rule.keywords) {
      if (titleLower.includes(keyword)) {
        matchedInTitle = true;
        matchedKeyword = keyword;
        break;
      }
      if (descLower.includes(keyword)) {
        matchedInDesc = true;
        matchedKeyword = keyword;
      }
    }

    if (matchedInTitle) {
      // High confidence - match in title
      if (!detectedThemes.includes(rule.theme)) {
        detectedThemes.push(rule.theme);
        allMatchedKeywords.push(matchedKeyword);
        hasHighConfidenceMatch = true;
      }
    } else if (matchedInDesc) {
      // Medium confidence - match in description only
      if (!detectedThemes.includes(rule.theme)) {
        detectedThemes.push(rule.theme);
        allMatchedKeywords.push(matchedKeyword);
      }
    }
  }

  // Bedroom theme — title only, whole words, shared rules (never from the
  // description; see lib/bedroomThemeRules.ts).
  if (isBedroomTitle(title) && !detectedThemes.includes(BEDROOM_THEME)) {
    detectedThemes.push(BEDROOM_THEME);
    allMatchedKeywords.push(BEDROOM_THEME);
    hasHighConfidenceMatch = true;
  }

  // Kitchen theme — title only, whole words, shared rules (never from the
  // description; see lib/kitchenThemeRules.ts).
  if (isKitchenTitle(title) && !detectedThemes.includes(KITCHEN_THEME)) {
    detectedThemes.push(KITCHEN_THEME);
    allMatchedKeywords.push(KITCHEN_THEME);
    hasHighConfidenceMatch = true;
  }

  // Bathroom theme — title only, whole words, shared rules (never from the
  // description; see lib/bathroomThemeRules.ts).
  if (isBathroomTitle(title) && !detectedThemes.includes(BATHROOM_THEME)) {
    detectedThemes.push(BATHROOM_THEME);
    allMatchedKeywords.push(BATHROOM_THEME);
    hasHighConfidenceMatch = true;
  }

  // Determine overall confidence
  let confidence: ConfidenceLevel = 'low';
  if (detectedThemes.length > 0) {
    confidence = hasHighConfidenceMatch ? 'high' : 'medium';
  }

  return {
    themes: detectedThemes,
    confidence,
    matchedKeywords: allMatchedKeywords,
  };
}

// ============================================
// BATCH PROCESSING UTILITIES
// ============================================

/**
 * Batch detect content types for multiple mods
 *
 * @param mods - Array of mods with title and optional description
 * @returns Array of detection results
 */
export function batchDetectContentTypes(
  mods: Array<{ id: string; title: string; description?: string | null }>
): Array<{ id: string; result: DetectionResult }> {
  return mods.map(mod => ({
    id: mod.id,
    result: detectContentTypeWithConfidence(mod.title, mod.description || undefined),
  }));
}

/**
 * Batch detect room themes for multiple mods
 *
 * @param mods - Array of mods with title and optional description
 * @returns Array of room theme results
 */
export function batchDetectRoomThemes(
  mods: Array<{ id: string; title: string; description?: string | null }>
): Array<{ id: string; result: RoomThemeResult }> {
  return mods.map(mod => ({
    id: mod.id,
    result: detectRoomThemesWithConfidence(mod.title, mod.description || undefined),
  }));
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a suggested content type differs from the current one
 * and should be considered for update
 *
 * @param currentType - Current content type
 * @param suggestedType - Suggested content type from detection
 * @param confidence - Confidence level of the suggestion
 * @returns Whether the update should be applied
 */
export function shouldUpdateContentType(
  currentType: string | null | undefined,
  suggestedType: string | undefined,
  confidence: ConfidenceLevel
): boolean {
  // Don't update if no suggestion
  if (!suggestedType) {
    return false;
  }

  // Always update if current is null
  if (!currentType) {
    return confidence !== 'low';
  }

  // Don't update if same
  if (currentType === suggestedType) {
    return false;
  }

  // Only update with high confidence if current type exists
  // This prevents overwriting valid categorizations with uncertain ones
  return confidence === 'high';
}

/**
 * Get all valid content types that this detector supports
 */
export function getSupportedContentTypes(): string[] {
  const types = new Set<string>();
  for (const rule of CONTENT_TYPE_RULES) {
    types.add(rule.contentType);
  }
  return Array.from(types).sort();
}

/**
 * Get all valid room themes that this detector supports
 */
export function getSupportedRoomThemes(): string[] {
  // Title-only themes live outside ROOM_THEME_RULES; list them too, or moving
  // a theme to its own rule file silently drops it from this list (bedroom
  // was missing here from #170 until 2026-09-25).
  return [...ROOM_THEME_RULES.map(rule => rule.theme), BEDROOM_THEME, KITCHEN_THEME, BATHROOM_THEME].sort();
}
