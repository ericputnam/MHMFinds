/**
 * Vision-Based Facet Extractor
 *
 * Uses Ollama's vision models (llama3.2-vision or llava) to analyze
 * mod images and extract accurate facets.
 *
 * This is the REAL extractor that actually looks at what things ARE,
 * not just guessing from keywords.
 */

import { prisma } from '@/lib/prisma';

// ============================================
// FACET DEFINITIONS
// ============================================

export const CONTENT_TYPES = {
  // CAS - Body/Face
  'hair': 'Hairstyles, wigs, hair accessories worn on head',
  'makeup': 'Lipstick, eyeshadow, blush, eyeliner, face paint, cosmetics applied to face',
  'skin': 'Skin overlays, skin details, freckles, moles, body textures, skin tones',
  'eyes': 'Eye colors, contact lenses, eyelashes, eyebrows, eye presets',
  'tattoos': 'Body tattoos, temporary tattoos, body art',
  'nails': 'Nail polish, manicures, nail art',

  // CAS - Clothing
  'tops': 'Shirts, blouses, sweaters, hoodies, jackets, t-shirts, tank tops - upper body clothing',
  'bottoms': 'Pants, jeans, shorts, skirts, leggings - lower body clothing',
  'dresses': 'Dresses, gowns, robes - one-piece clothing',
  'full-body': 'Full outfits, jumpsuits, rompers, bodysuits, swimsuits, costumes, pajamas',
  'shoes': 'Shoes, boots, sneakers, heels, sandals, slippers - footwear',

  // CAS - Accessories
  'accessories': 'Bags, purses, belts, scarves, gloves - non-jewelry accessories',
  'jewelry': 'Necklaces, earrings, bracelets, rings, piercings - jewelry items',
  'glasses': 'Eyeglasses, sunglasses, goggles - eyewear',
  'hats': 'Hats, caps, beanies, headbands, crowns, tiaras - headwear (NOT hair)',

  // Build/Buy - Furniture
  'furniture': 'Sofas, chairs, tables, beds, desks, shelves, cabinets - large furniture',
  'lighting': 'Lamps, chandeliers, candles, light fixtures',
  'decor': 'Wall art, paintings, sculptures, vases, decorative objects',
  'clutter': 'Small decorative items, books, plants, trinkets, surface items',
  'kitchen': 'Kitchen appliances, counters, sinks, refrigerators, stoves',
  'bathroom': 'Toilets, showers, bathtubs, bathroom fixtures',
  'outdoor': 'Outdoor furniture, garden items, patio sets, fences',
  'plants': 'Indoor plants, outdoor plants, trees, flowers, shrubs',
  'pet-furniture': 'Pet beds, cat trees, scratching posts, pet bowls, aquariums',
  'electronics': 'TVs, computers, phones, gaming systems, speakers',

  // Other
  'poses': 'Animation poses for taking screenshots, pose packs',
  'lot': 'Pre-built houses, apartments, venues, community lots - full buildings',
  'gameplay-mod': 'Mods that change game mechanics, add interactions, traits, careers',
  'script-mod': 'Script mods, utility mods, core mods like MCCC, Wicked Whims',
  'cas-background': 'Create-a-Sim backgrounds, CAS room replacements',
  'loading-screen': 'Custom loading screens',
  'preset': 'ReShade presets, lighting presets, graphics presets',
} as const;

export const VISUAL_STYLES = {
  'alpha': 'Realistic, high-detail textures with realistic hair strands and skin details',
  'maxis-match': 'Matches EA\'s cartoony art style, clay-like textures, no individual strands',
  'semi-maxis': 'Blend between alpha and maxis-match',
} as const;

export const THEMES = {
  // Seasonal
  'christmas': 'Christmas, holiday, Santa, reindeer, snow, red and green, festive winter',
  'halloween': 'Halloween, spooky, witch, vampire, ghost, pumpkin, orange and black',
  'valentines': 'Valentine\'s day, hearts, love, pink and red, romantic holiday',
  'easter': 'Easter, bunny, eggs, pastel colors, spring holiday',

  // Seasons
  'summer': 'Summer vibes, beach, tropical, bright colors, warm weather',
  'fall': 'Autumn, fall leaves, orange and brown, cozy autumn',
  'winter': 'Winter, snow, cold weather, cozy winter (not necessarily Christmas)',
  'spring': 'Spring, flowers, pastels, fresh, blooming',

  // Aesthetics
  'goth': 'Gothic, dark, black clothing, edgy, punk, dark makeup, skulls',
  'cottagecore': 'Cottagecore, farmhouse, rustic, floral, vintage countryside',
  'y2k': 'Y2K, 2000s fashion, low-rise, butterfly clips, bedazzled',
  'boho': 'Bohemian, free-spirited, flowy, earth tones, hippie',
  'modern': 'Modern, contemporary, clean lines, minimalist design',
  'vintage': 'Vintage, retro, old-fashioned, classic styles',
  'romantic': 'Romantic, soft, feminine, lace, florals, delicate',
  'minimalist': 'Minimalist, simple, clean, neutral colors',
  'streetwear': 'Streetwear, urban, sneakers, hoodies, casual cool',
  'luxury': 'Luxury, designer, high-end, elegant, expensive-looking',
  'cozy': 'Cozy, comfortable, warm, soft textures, homey',
  'fantasy': 'Fantasy, magical, fairy, elf, mythical',
  'witchy': 'Witchy, occult, mystical, crystals, moon imagery',
} as const;

export const AGE_GROUPS = ['infant', 'toddler', 'child', 'teen', 'young-adult', 'adult', 'elder', 'all-ages'] as const;
export const GENDER_OPTIONS = ['masculine', 'feminine', 'unisex'] as const;

export type ContentType = keyof typeof CONTENT_TYPES;
export type VisualStyle = keyof typeof VISUAL_STYLES;
export type Theme = keyof typeof THEMES;
export type AgeGroup = typeof AGE_GROUPS[number];
export type GenderOption = typeof GENDER_OPTIONS[number];

export interface ExtractedFacets {
  contentType: ContentType | null;
  visualStyle: VisualStyle | null;
  themes: Theme[];
  ageGroups: AgeGroup[];
  genderOptions: GenderOption[];
  confidence: number;
  reasoning: string;
}

// ============================================
// OLLAMA VISION CLIENT
// ============================================

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

async function analyzeImageWithOllama(
  imageUrl: string,
  prompt: string,
  model: string = 'llama3.2-vision'
): Promise<string> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  // Fetch the image and convert to base64
  let imageBase64: string;
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    imageBase64 = Buffer.from(imageBuffer).toString('base64');
  } catch (error) {
    console.error(`Failed to fetch image from ${imageUrl}:`, error);
    throw new Error('Could not load image for analysis');
  }

  // Call Ollama with the image
  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      images: [imageBase64],
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistent categorization
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama request failed: ${error}`);
  }

  const data: OllamaResponse = await response.json();
  return data.response;
}

// ============================================
// MAIN EXTRACTOR CLASS
// ============================================

export class VisionFacetExtractor {
  private model: string;

  constructor(model: string = 'llama3.2-vision') {
    this.model = model;
  }

  /**
   * Extract facets from a mod using vision + text analysis
   */
  async extractFacets(
    imageUrl: string | null,
    title: string,
    description: string | null,
    existingTags: string[] = [],
    existingCategory: string | null = null
  ): Promise<ExtractedFacets> {

    // Build comprehensive text context
    const textContext = this.buildTextContext(title, description, existingTags, existingCategory);

    // If we have an image, use vision
    if (imageUrl) {
      try {
        return await this.extractWithVision(imageUrl, textContext);
      } catch (error) {
        console.error('Vision extraction failed, falling back to text-only:', error);
        return this.extractFromTextOnly(textContext);
      }
    }

    // No image, use text-only extraction
    return this.extractFromTextOnly(textContext);
  }

  /**
   * Build a comprehensive text context from all available data
   */
  private buildTextContext(
    title: string,
    description: string | null,
    existingTags: string[],
    existingCategory: string | null
  ): string {
    const parts: string[] = [];

    parts.push(`TITLE: ${title}`);

    if (description) {
      // Clean up description - remove HTML, limit length
      const cleanDesc = description
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
      parts.push(`DESCRIPTION: ${cleanDesc}`);
    }

    if (existingTags.length > 0) {
      parts.push(`EXISTING TAGS: ${existingTags.join(', ')}`);
    }

    if (existingCategory) {
      parts.push(`EXISTING CATEGORY: ${existingCategory}`);
    }

    return parts.join('\n');
  }

  /**
   * Extract facets using vision model
   */
  private async extractWithVision(
    imageUrl: string,
    textContext: string
  ): Promise<ExtractedFacets> {

    const prompt = `You are analyzing a Sims 4 mod image. Look at this image carefully and classify it.

${textContext}

Based on WHAT YOU SEE IN THE IMAGE, determine:

1. CONTENT TYPE - What IS this item? Look at the image, not just the title.
   Options: ${Object.keys(CONTENT_TYPES).join(', ')}

   CRITICAL RULES:
   - If you see a CAT TREE or SCRATCHING POST, it's "pet-furniture" NOT "hats"
   - If you see a BUILDING or HOUSE, it's "lot" NOT clothing
   - If you see CLOTHING on a Sim, identify the specific type (tops, bottoms, dresses, etc.)
   - If you see HAIR on a Sim's head, it's "hair"
   - If you see MAKEUP on a face (lipstick, eyeshadow), it's "makeup"

2. VISUAL STYLE - For CAS items (hair, clothing, makeup), what art style?
   Options: alpha, maxis-match, semi-maxis, or null if not applicable
   - Alpha: Realistic textures, individual hair strands visible
   - Maxis-match: Cartoony, clay-like, matches EA's style

3. THEMES - What aesthetic/vibe does this have? Pick ALL that apply.
   Options: ${Object.keys(THEMES).join(', ')}
   - Only pick themes you can ACTUALLY SEE evidence of
   - Christmas = red/green, Santa, snow decorations
   - Goth = black, skulls, dark aesthetic
   - If it's just normal everyday items, themes can be empty

4. AGE GROUPS - If this is CAS content, what ages is it for?
   Options: ${AGE_GROUPS.join(', ')}

5. GENDER - If this is CAS content, what frames?
   Options: ${GENDER_OPTIONS.join(', ')}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "contentType": "the-type",
  "visualStyle": "style-or-null",
  "themes": ["theme1", "theme2"],
  "ageGroups": ["age1", "age2"],
  "genderOptions": ["gender1"],
  "reasoning": "Brief explanation of what you see in the image"
}`;

    const response = await analyzeImageWithOllama(imageUrl, prompt, this.model);
    return this.parseResponse(response);
  }

  /**
   * Extract facets from text only (fallback)
   */
  private extractFromTextOnly(textContext: string): ExtractedFacets {
    const text = textContext.toLowerCase();

    const result: ExtractedFacets = {
      contentType: null,
      visualStyle: null,
      themes: [],
      ageGroups: [],
      genderOptions: [],
      confidence: 0.5,
      reasoning: 'Text-only extraction (no image)',
    };

    // Content type detection - ORDER MATTERS! More specific patterns first.

    // LOADING SCREENS & UI - Check FIRST because they contain many other keywords in titles
    if (this.matchesAny(text, ['loading screen', 'loading screens', 'loadingscreen'])) {
      result.contentType = 'loading-screen';
    } else if (this.matchesAny(text, ['main menu', 'opening screen', 'menu override', 'menu replacement'])) {
      result.contentType = 'loading-screen'; // Group with loading screens
    } else if (this.matchesAny(text, ['cas background', 'cas bg', 'create a sim background'])) {
      result.contentType = 'cas-background';
    } else if (this.matchesAny(text, ['reshade', 'gshade', 'graphics preset', 'reshade preset', 'lighting preset'])) {
      result.contentType = 'preset';
    }

    // SCRIPT/GAMEPLAY MODS - Check early (be careful with 'script' - it matches 'description'!)
    else if (this.matchesAny(text, ['script mod', 'script-mod', 'mccc', 'wicked whims', 'basemental', 'ui cheat', 'tmex', 'more columns'])) {
      result.contentType = 'script-mod';
    } else if (this.matchesAny(text, ['gameplay mod', 'gameplay-mod', 'trait mod', 'career mod', 'woohoo', 'pregnancy mod', 'autonomy'])) {
      result.contentType = 'gameplay-mod';
    } else if (this.matchesAny(text, ['traditions', 'tradition mod'])) {
      result.contentType = 'gameplay-mod';
    }

    // PET FURNITURE - Check before general furniture
    else if (this.matchesAny(text, ['scratch post', 'scratching post', 'cat tree', 'pet bed', 'dog bed', 'cat bed', 'pet bowl', 'dog bowl', 'cat bowl', 'aquarium', 'terrarium', 'pet house', 'dog house', 'cat house'])) {
      result.contentType = 'pet-furniture';
    }

    // NAILS - Check if title contains "nail" (avoids matching "thumbnails" in descriptions)
    else if (text.includes('title:') && text.split('\n')[0].includes('nail')) {
      result.contentType = 'nails';
    } else if (this.matchesAny(text, ['nail polish', 'manicure', 'nail art', 'fingernails', 'fingernail', 'specific: nails', 'acrylic nails', 'gel nails'])) {
      result.contentType = 'nails';
    }

    // CAS - Clothing (check specific items before generic "set")
    else if (this.matchesAny(text, ['sweater', 'sweaters', 'hoodie', 'hoodies', 'cardigan'])) {
      result.contentType = 'tops';
    } else if (this.matchesAny(text, ['shirt', 'top ', ' top', 'tops', 'blouse', 'jacket', 'coat', 'tshirt', 't-shirt', 'tank top', 'crop top', 'tee '])) {
      result.contentType = 'tops';
    } else if (this.matchesAny(text, ['pajama', 'pyjama', 'jammies', 'pjs', 'sleeper', 'onesie', 'lingerie', 'nightgown', 'sleepwear'])) {
      result.contentType = 'full-body';
    } else if (this.matchesAny(text, ['dress ', 'dresses', 'gown', 'robe']) && !this.matchesAny(text, ['dresser', 'address'])) {
      result.contentType = 'dresses';
    } else if (this.matchesAny(text, ['pants', 'jeans', 'shorts', 'skirt', 'leggings', 'trousers', 'bottoms'])) {
      result.contentType = 'bottoms';
    } else if (this.matchesAny(text, ['outfit', 'jumpsuit', 'romper', 'bodysuit', 'swimsuit', 'bikini', 'costume']) && !this.matchesAny(text, ['furniture', 'decor', 'house', 'home'])) {
      result.contentType = 'full-body';
    } else if (this.matchesAny(text, ['shoes', 'boots', 'sneakers', 'heels', 'sandals', 'slippers', 'footwear', 'loafers'])) {
      result.contentType = 'shoes';
    }

    // CAS - Body/Face
    else if (this.matchesAny(text, ['hair', 'hairstyle', 'ponytail', 'braids', 'bun ', ' bun', 'wig', 'updo', 'afro', 'locs', 'curls', 'bangs'])) {
      result.contentType = 'hair';
    } else if (this.matchesAny(text, ['lipstick', 'eyeshadow', 'makeup', 'blush', 'eyeliner', 'mascara', 'lips', 'lip gloss', 'cosmetic', 'brows', 'brow'])) {
      result.contentType = 'makeup';
    } else if (this.matchesAny(text, ['skin overlay', 'skin detail', 'skinblend', 'freckles', 'body preset', 'skin tone', 'overlay'])) {
      result.contentType = 'skin';
    } else if (this.matchesAny(text, ['eyes', 'eye color', 'contacts', 'eyelashes', 'eyebrows', 'lenses', 'irises'])) {
      result.contentType = 'eyes';
    } else if (this.matchesAny(text, ['tattoo', 'tattoos', 'body art', 'body ink', 'tattooed'])) {
      result.contentType = 'tattoos';
    }

    // CAS - Accessories
    else if (this.matchesAny(text, ['hat ', 'hats', 'cap ', 'caps', 'beanie', 'headband', 'crown', 'tiara', 'headwear', 'beret']) && !this.matchesAny(text, ['scratch', 'cat', 'pet', 'tree'])) {
      result.contentType = 'hats';
    } else if (this.matchesAny(text, ['necklace', 'earring', 'bracelet', ' ring ', ' ring,', 'rings', 'jewelry', 'piercing', 'pendant', 'choker'])) {
      result.contentType = 'jewelry';
    } else if (this.matchesAny(text, ['glasses', 'sunglasses', 'eyewear', 'spectacles', 'shades'])) {
      result.contentType = 'glasses';
    } else if (this.matchesAny(text, ['bag', 'purse', 'backpack', 'belt', 'scarf', 'gloves', 'accessory', 'accessories']) && !this.matchesAny(text, ['sleeping bag'])) {
      result.contentType = 'accessories';
    }

    // POSES
    else if (this.matchesAny(text, ['pose', 'poses', 'pose pack', 'animation'])) {
      result.contentType = 'poses';
    }

    // LOTS - Check FIRST in build/buy section, before furniture (lots can mention furniture)
    else if (this.matchesAny(text, ['house', 'home', 'apartment', ' lot', 'lots', 'cabin', 'cottage', 'mansion', 'residence', 'venue', 'residential', 'villa', 'tiny home'])) {
      result.contentType = 'lot';
    }

    // BUILD/BUY - Furniture & Decor
    else if (this.matchesAny(text, ['pillow', 'pillows', 'cushion', 'throw', 'blanket', 'calendar', 'clock', 'mirror', 'rug', 'carpet', 'curtain', 'drape'])) {
      result.contentType = 'decor';
    } else if (this.matchesAny(text, ['sofa', 'couch', 'chair', 'table', 'desk', 'bed ', 'beds', 'shelf', 'shelves', 'cabinet', 'dresser', 'wardrobe', 'furniture', 'bench', 'stool', 'bookcase', 'nightstand'])) {
      result.contentType = 'furniture';
    } else if (this.matchesAny(text, ['lamp', 'light', 'chandelier', 'candle', 'lantern', 'sconce', 'string lights'])) {
      result.contentType = 'lighting';
    } else if (this.matchesAny(text, ['painting', 'art', 'poster', 'sculpture', 'vase', 'decor', 'wall art', 'frame', 'wall decor', 'plant', 'plants', 'wreath'])) {
      result.contentType = 'decor';
    } else if (this.matchesAny(text, ['clutter', 'books', 'trinket', 'knickknack', 'food', 'drink', 'appetizer', 'cocoa', 'coffee', 'dish', 'plate'])) {
      result.contentType = 'clutter';
    }

    // FALLBACK for "set" - ambiguous, check context
    else if (this.matchesAny(text, ['set', 'collection', 'pack'])) {
      // Try to determine from other context clues
      if (this.matchesAny(text, ['christmas', 'holiday', 'xmas', 'winter', 'festive'])) {
        // Holiday sets without other indicators - likely decor or clutter
        result.contentType = 'clutter';
      }
    }

    // Visual style detection
    if (this.matchesAny(text, ['alpha', 'alpha cc', 'realistic'])) {
      result.visualStyle = 'alpha';
    } else if (this.matchesAny(text, ['maxis match', 'maxis-match', 'mm ', ' mm', 'clayified'])) {
      result.visualStyle = 'maxis-match';
    } else if (this.matchesAny(text, ['semi maxis', 'semi-maxis'])) {
      result.visualStyle = 'semi-maxis';
    }

    // Theme detection - only if there's clear evidence
    const themeMatches: Theme[] = [];
    if (this.matchesAny(text, ['christmas', 'xmas', 'santa', 'reindeer', 'holiday season', 'festive'])) themeMatches.push('christmas');
    if (this.matchesAny(text, ['halloween', 'spooky', 'witch', 'pumpkin', 'skeleton', 'zombie', 'horror'])) themeMatches.push('halloween');
    if (this.matchesAny(text, ['valentine', 'heart', 'cupid', 'romantic holiday'])) themeMatches.push('valentines');
    if (this.matchesAny(text, ['easter', 'bunny', 'easter egg'])) themeMatches.push('easter');
    if (this.matchesAny(text, ['summer', 'beach', 'tropical', 'swimwear'])) themeMatches.push('summer');
    if (this.matchesAny(text, ['autumn', 'fall leaves', 'harvest', 'pumpkin spice'])) themeMatches.push('fall');
    if (this.matchesAny(text, ['winter', 'snow', 'cold', 'cozy winter']) && !this.matchesAny(text, ['christmas'])) themeMatches.push('winter');
    if (this.matchesAny(text, ['spring', 'bloom', 'floral spring'])) themeMatches.push('spring');
    // GOTH - be specific, avoid generic 'dark' which matches 'dark wood', 'dark-skin-friendly'
    if (this.matchesAny(text, ['goth', 'gothic', 'punk', 'emo', 'dark aesthetic', 'dark fashion', 'skulls', 'skeleton'])) themeMatches.push('goth');
    // COTTAGECORE - use specific terms, avoid generic 'rustic' and 'cottage' which match many contexts
    if (this.matchesAny(text, ['cottagecore', 'cottage core', 'farmhouse style', 'cottage aesthetic', 'country living'])) themeMatches.push('cottagecore');
    if (this.matchesAny(text, ['y2k', '2000s', 'early 2000'])) themeMatches.push('y2k');
    if (this.matchesAny(text, ['boho', 'bohemian', 'hippie'])) themeMatches.push('boho');
    if (this.matchesAny(text, ['modern', 'contemporary', 'minimalist design'])) themeMatches.push('modern');
    if (this.matchesAny(text, ['vintage', 'retro', 'old-fashioned', 'antique'])) themeMatches.push('vintage');
    // ROMANTIC - avoid generic 'soft' and 'delicate'
    if (this.matchesAny(text, ['romantic', 'romance', 'lace trim', 'sweetheart', 'love theme'])) themeMatches.push('romantic');
    // MINIMALIST - avoid generic 'simple' and 'clean'
    if (this.matchesAny(text, ['minimalist', 'minimal style', 'minimal design', 'minimalistic'])) themeMatches.push('minimalist');
    if (this.matchesAny(text, ['streetwear', 'urban', 'hypebeast'])) themeMatches.push('streetwear');
    if (this.matchesAny(text, ['luxury', 'designer', 'high-end', 'elegant'])) themeMatches.push('luxury');
    // COZY - avoid generic 'warm' which matches many contexts
    if (this.matchesAny(text, ['cozy', 'cosy', 'homey', 'snug', 'hygge'])) themeMatches.push('cozy');
    if (this.matchesAny(text, ['fantasy', 'magical', 'fairy', 'elf', 'mythical'])) themeMatches.push('fantasy');
    if (this.matchesAny(text, ['witchy', 'witch', 'occult', 'mystical', 'crystal', 'moon'])) themeMatches.push('witchy');

    result.themes = themeMatches;

    // Age detection
    const ageMatches: AgeGroup[] = [];
    if (this.matchesAny(text, ['infant', 'baby'])) ageMatches.push('infant');
    if (this.matchesAny(text, ['toddler'])) ageMatches.push('toddler');
    if (this.matchesAny(text, ['child', 'kid'])) ageMatches.push('child');
    if (this.matchesAny(text, ['teen', 'teenager'])) ageMatches.push('teen');
    if (this.matchesAny(text, ['young adult', 'ya '])) ageMatches.push('young-adult');
    if (this.matchesAny(text, ['adult']) && !this.matchesAny(text, ['young adult'])) ageMatches.push('adult');
    if (this.matchesAny(text, ['elder', 'elderly', 'senior'])) ageMatches.push('elder');
    if (this.matchesAny(text, ['all ages', 'all-ages'])) ageMatches.push('all-ages');
    result.ageGroups = ageMatches;

    // Gender detection
    const genderMatches: GenderOption[] = [];
    if (this.matchesAny(text, ['male', 'masculine', 'men', ' man '])) genderMatches.push('masculine');
    if (this.matchesAny(text, ['female', 'feminine', 'women', 'woman'])) genderMatches.push('feminine');
    if (this.matchesAny(text, ['unisex', 'both', 'all genders'])) genderMatches.push('unisex');
    result.genderOptions = genderMatches;

    return result;
  }

  /**
   * Check if text contains any of the phrases
   */
  private matchesAny(text: string, phrases: string[]): boolean {
    return phrases.some(phrase => text.includes(phrase.toLowerCase()));
  }

  /**
   * Parse the JSON response from the model
   */
  private parseResponse(response: string): ExtractedFacets {
    const defaultResult: ExtractedFacets = {
      contentType: null,
      visualStyle: null,
      themes: [],
      ageGroups: [],
      genderOptions: [],
      confidence: 0.3,
      reasoning: 'Failed to parse response',
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', response);
        return defaultResult;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      const result: ExtractedFacets = {
        contentType: this.validateContentType(parsed.contentType),
        visualStyle: this.validateVisualStyle(parsed.visualStyle),
        themes: this.validateThemes(parsed.themes),
        ageGroups: this.validateAgeGroups(parsed.ageGroups),
        genderOptions: this.validateGenderOptions(parsed.genderOptions),
        confidence: 0.85,
        reasoning: parsed.reasoning || 'Vision analysis',
      };

      return result;
    } catch (error) {
      console.error('Failed to parse response:', error, response);
      return defaultResult;
    }
  }

  private validateContentType(value: any): ContentType | null {
    if (!value || value === 'null') return null;
    const normalized = String(value).toLowerCase().trim();
    return Object.keys(CONTENT_TYPES).includes(normalized) ? normalized as ContentType : null;
  }

  private validateVisualStyle(value: any): VisualStyle | null {
    if (!value || value === 'null') return null;
    const normalized = String(value).toLowerCase().trim();
    return Object.keys(VISUAL_STYLES).includes(normalized) ? normalized as VisualStyle : null;
  }

  private validateThemes(values: any): Theme[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => Object.keys(THEMES).includes(v)) as Theme[];
  }

  private validateAgeGroups(values: any): AgeGroup[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => AGE_GROUPS.includes(v as AgeGroup)) as AgeGroup[];
  }

  private validateGenderOptions(values: any): GenderOption[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => GENDER_OPTIONS.includes(v as GenderOption)) as GenderOption[];
  }
}

export const visionFacetExtractor = new VisionFacetExtractor();
