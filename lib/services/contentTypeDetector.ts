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

interface KeywordRule {
  keywords: string[];  // Keywords to match (case-insensitive)
  negativeKeywords?: string[];  // Keywords that should NOT be present
  contentType: string;
  priority: number;  // Higher = checked first, takes precedence
}

// Priority levels:
// 100+ = Granular face types (most specific, override generic makeup)
// 80-99 = Specific CAS categories
// 60-79 = Pet items
// 40-59 = Build/Buy specific
// 20-39 = Generic clothing/CAS
// 1-19 = Generic fallbacks

const CONTENT_TYPE_RULES: KeywordRule[] = [
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
               'lips n', 'lips for', 'cerise lips', 'glossy lips', 'matte lips',
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
    keywords: ['curtain', 'curtains', 'drapes', 'drape', 'blinds', 'window treatment'],
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
  {
    keywords: ['lamp', 'lamps', 'light', 'lights', 'lighting', 'chandelier', 'sconce',
               'lantern', 'ceiling light', 'floor lamp', 'table lamp', 'pendant light'],
    negativeKeywords: ['christmas light', 'fairy light', 'string light'],  // These are decor
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
    keywords: ['decor', 'decoration', 'decorations', 'decorative', 'ornament', 'ornaments'],
    contentType: 'decor',
    priority: 45,
  },

  // Furniture
  {
    keywords: ['furniture', 'sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'beds',
               'dresser', 'wardrobe', 'closet', 'shelf', 'shelves', 'bookshelf',
               'cabinet', 'nightstand', 'vanity', 'mirror', 'fireplace', 'armchair',
               'bench', 'stool', 'ottoman', 'console', 'sideboard', 'buffet',
               'dining table', 'coffee table', 'end table', 'tv stand', 'entertainment center',
               'sink', 'toilet', 'shower', 'tub', 'bathtub'],
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
               'afro', 'mohawk', 'pixie', 'bob cut', 'curls', 'waves', 'straight hair'],
    negativeKeywords: ['facial hair', 'beard', 'eyebrow', 'brow', 'body hair'],
    contentType: 'hair',
    priority: 38,
  },

  // Full Body (check before individual pieces)
  {
    keywords: ['outfit', 'outfits', 'full body', 'full-body', 'jumpsuit', 'romper',
               'bodysuit', 'onesie', 'overalls', 'uniform', 'costume', 'pajamas', 'pyjamas',
               'sleepwear', 'swimsuit', 'bikini', 'swimwear', 'wetsuit', 'clothing set',
               'clothes set', 'outfit set'],
    // 'set' alone is too generic - sneaker set, eyeshadow set, etc.
    // Use specific clothing set patterns instead
    negativeKeywords: ['eyeshadow', 'makeup', 'palette', 'sneaker', 'shoe', 'boots',
                       'furniture', 'decor', 'clutter', 'tattoo'],
    contentType: 'full-body',
    priority: 35,
  },

  // Dresses
  {
    keywords: ['dress', 'dresses', 'gown', 'gowns', 'maxi', 'mini dress', 'midi dress',
               'cocktail dress', 'evening dress', 'wedding dress', 'ball gown'],
    contentType: 'dresses',
    priority: 34,
  },

  // Tops
  {
    keywords: ['top', 'tops', 'shirt', 'shirts', 'blouse', 'sweater', 'sweaters',
               'hoodie', 'hoodies', 'jacket', 'jackets', 'coat', 'coats', 'cardigan',
               't-shirt', 'tshirt', 'tank top', 'crop top', 'turtleneck', 'vest',
               'blazer', 'pullover'],
    contentType: 'tops',
    priority: 33,
  },

  // Bottoms
  {
    keywords: ['pants', 'jeans', 'shorts', 'skirt', 'skirts', 'leggings', 'trousers',
               'sweatpants', 'joggers', 'capris', 'culottes', 'mini skirt', 'maxi skirt'],
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
  {
    keywords: ['jewelry', 'jewellery', 'necklace', 'necklaces', 'earring', 'earrings',
               'bracelet', 'bracelets', 'ring', 'rings', 'piercing', 'piercings',
               'choker', 'pendant', 'anklet', 'brooch', 'cuff', 'stud', 'hoop'],
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
    keywords: ['accessory', 'accessories', 'bag', 'bags', 'purse', 'backpack', 'belt',
               'scarf', 'scarves', 'gloves', 'watch', 'watches', 'socks', 'tights'],
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
  {
    keywords: ['gameplay mod', 'gameplay', 'mod pack', 'social interaction', 'interaction',
               'trait mod', 'career mod', 'realistic', 'slice of life', 'tradition',
               'autonomy', 'woohoo', 'pregnancy', 'custom event', 'romance mod',
               'regency mod', 'inspired mod'],
    // Note: ' mod' alone is too generic - use specific patterns
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

  // Lot/Build
  {
    keywords: ['lot', 'house', 'home', 'apartment', 'mansion', 'cottage', 'residential',
               'venue', 'community lot', 'starter', 'build', 'renovation'],
    contentType: 'lot',
    priority: 12,
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
  {
    keywords: ['bathroom', 'bath', 'shower', 'toilet', 'tub', 'bathtub', 'washroom',
               'restroom', 'lavatory', 'powder room'],
    theme: 'bathroom',
  },
  {
    keywords: ['kitchen', 'cooking', 'culinary', 'chef', 'pantry', 'dining kitchen'],
    theme: 'kitchen',
  },
  {
    keywords: ['bedroom', 'bed room', 'sleeping', 'master bedroom', 'guest bedroom'],
    theme: 'bedroom',
  },
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
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  const matchedKeywords: string[] = [];

  // Sort rules by priority (highest first)
  const sortedRules = [...CONTENT_TYPE_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // Check for negative keywords first
    if (rule.negativeKeywords) {
      const hasNegative = rule.negativeKeywords.some(neg =>
        titleLower.includes(neg) || descLower.includes(neg)
      );
      if (hasNegative) {
        continue;
      }
    }

    // Check for matching keywords
    const matchedInTitle: string[] = [];
    const matchedInDesc: string[] = [];

    for (const keyword of rule.keywords) {
      if (titleLower.includes(keyword)) {
        matchedInTitle.push(keyword);
      } else if (descLower.includes(keyword)) {
        matchedInDesc.push(keyword);
      }
    }

    // Determine confidence based on where matches were found
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
  return ROOM_THEME_RULES.map(rule => rule.theme).sort();
}
