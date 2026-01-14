import OpenAI from 'openai';

// ============================================
// FACET VALUE DEFINITIONS
// These are the canonical values for each facet
// ============================================

export const FACET_VALUES = {
  contentType: [
    // CAS - Character items
    'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes', 'accessories',
    'jewelry', 'makeup', 'skin', 'eyes', 'nails', 'tattoos', 'glasses', 'hats',
    // Build/Buy - Objects
    'furniture', 'lighting', 'decor', 'clutter', 'kitchen', 'bathroom', 'bedroom',
    'outdoor', 'plants', 'rugs', 'curtains', 'electronics',
    // Other
    'poses', 'animations', 'gameplay-mod', 'script-mod', 'trait', 'career',
    'food', 'lot', 'ui-preset', 'cas-background', 'loading-screen',
  ],
  visualStyle: [
    'alpha', 'maxis-match', 'semi-maxis', 'clayified', 'realistic',
  ],
  themes: [
    // Seasonal
    'christmas', 'halloween', 'valentines', 'easter', 'summer', 'fall', 'winter', 'spring',
    // Aesthetic
    'cottagecore', 'y2k', 'goth', 'boho', 'modern', 'vintage', 'fantasy', 'sci-fi',
    'romantic', 'minimalist', 'maximalist', 'preppy', 'grunge', 'dark-academia',
    'light-academia', 'kawaii', 'streetwear', 'luxury', 'cozy', 'beach', 'tropical',
    'rustic', 'industrial', 'scandinavian', 'bohemian', 'retro', 'futuristic',
    'witchy', 'fairycore', 'goblincore', 'royalcore',
  ],
  ageGroups: [
    'infant', 'toddler', 'child', 'teen', 'young-adult', 'adult', 'elder', 'all-ages',
  ],
  genderOptions: [
    'masculine', 'feminine', 'unisex',
  ],
  occultTypes: [
    'human', 'vampire', 'werewolf', 'mermaid', 'spellcaster', 'alien', 'ghost',
  ],
  packRequirements: [
    'base-game', 'seasons', 'cottage-living', 'high-school-years', 'growing-together',
    'horse-ranch', 'for-rent', 'lovestruck', 'get-together', 'city-living',
    'cats-and-dogs', 'get-famous', 'island-living', 'discover-university',
    'eco-lifestyle', 'snowy-escape', 'dream-home-decorator', 'werewolves',
  ],
} as const;

export type ContentType = typeof FACET_VALUES.contentType[number];
export type VisualStyle = typeof FACET_VALUES.visualStyle[number];
export type Theme = typeof FACET_VALUES.themes[number];
export type AgeGroup = typeof FACET_VALUES.ageGroups[number];
export type GenderOption = typeof FACET_VALUES.genderOptions[number];
export type OccultType = typeof FACET_VALUES.occultTypes[number];
export type PackRequirement = typeof FACET_VALUES.packRequirements[number];

export interface ExtractedFacets {
  contentType: ContentType | null;
  visualStyle: VisualStyle | null;
  themes: Theme[];
  ageGroups: AgeGroup[];
  genderOptions: GenderOption[];
  occultTypes: OccultType[];
  packRequirements: PackRequirement[];
  confidence: number; // 0-1, how confident the extraction is
  reasoning?: string;
}

// ============================================
// KEYWORD MAPPINGS FOR VALIDATION
// These catch AI mistakes with hard-coded rules
// ============================================

const CONTENT_TYPE_KEYWORDS: Record<string, ContentType> = {
  // Hair
  'hair': 'hair', 'hairstyle': 'hair', 'ponytail': 'hair', 'braids': 'hair',
  'bun': 'hair', 'bangs': 'hair', 'wig': 'hair', 'updo': 'hair', 'afro': 'hair',
  'locs': 'hair', 'dreadlocks': 'hair', 'mohawk': 'hair', 'pixie': 'hair',

  // Tops
  'top': 'tops', 'shirt': 'tops', 'blouse': 'tops', 'sweater': 'tops',
  'hoodie': 'tops', 'jacket': 'tops', 'coat': 'tops', 'cardigan': 'tops',
  'tshirt': 'tops', 't-shirt': 'tops', 'tank': 'tops', 'crop top': 'tops',
  'turtleneck': 'tops', 'vest': 'tops', 'blazer': 'tops',

  // Bottoms
  'pants': 'bottoms', 'jeans': 'bottoms', 'shorts': 'bottoms', 'skirt': 'bottoms',
  'leggings': 'bottoms', 'trousers': 'bottoms', 'sweatpants': 'bottoms',

  // Dresses
  'dress': 'dresses', 'gown': 'dresses', 'robe': 'dresses', 'maxi': 'dresses',
  'mini dress': 'dresses', 'midi': 'dresses',

  // Full body
  'outfit': 'full-body', 'romper': 'full-body', 'jumpsuit': 'full-body',
  'bodysuit': 'full-body', 'pajamas': 'full-body', 'sleepwear': 'full-body',
  'swimsuit': 'full-body', 'bikini': 'full-body', 'costume': 'full-body',
  'uniform': 'full-body', 'set': 'full-body',

  // Shoes
  'shoes': 'shoes', 'boots': 'shoes', 'sneakers': 'shoes', 'heels': 'shoes',
  'sandals': 'shoes', 'slippers': 'shoes', 'loafers': 'shoes', 'flats': 'shoes',

  // Accessories
  'accessory': 'accessories', 'accessories': 'accessories', 'bag': 'accessories',
  'purse': 'accessories', 'backpack': 'accessories', 'belt': 'accessories',
  'scarf': 'accessories', 'gloves': 'accessories', 'watch': 'accessories',

  // Jewelry
  'jewelry': 'jewelry', 'jewellery': 'jewelry', 'necklace': 'jewelry',
  'earrings': 'jewelry', 'bracelet': 'jewelry', 'ring': 'jewelry',
  'piercing': 'jewelry', 'piercings': 'jewelry',

  // Glasses/Hats (specific accessories)
  'glasses': 'glasses', 'sunglasses': 'glasses', 'eyewear': 'glasses',
  'hat': 'hats', 'cap': 'hats', 'beanie': 'hats', 'headband': 'hats',
  'crown': 'hats', 'tiara': 'hats', 'headwear': 'hats',

  // Makeup
  'makeup': 'makeup', 'lipstick': 'makeup', 'eyeshadow': 'makeup',
  'blush': 'makeup', 'eyeliner': 'makeup', 'mascara': 'makeup',
  'foundation': 'makeup', 'contour': 'makeup', 'highlighter': 'makeup',
  'lip gloss': 'makeup', 'cosmetic': 'makeup', 'lips': 'makeup',
  'lip': 'makeup', 'lipgloss': 'makeup', 'lipliner': 'makeup',

  // Skin
  'skin': 'skin', 'skinblend': 'skin', 'overlay': 'skin', 'body preset': 'skin',
  'skin detail': 'skin', 'freckles': 'skin', 'moles': 'skin', 'birthmark': 'skin',

  // Tattoos
  'tattoo': 'tattoos', 'tattoos': 'tattoos', 'ink': 'tattoos',

  // Eyes
  'eyes': 'eyes', 'eye color': 'eyes', 'contacts': 'eyes', 'lenses': 'eyes',
  'eyelashes': 'eyes', 'eyebrows': 'eyes', 'brows': 'eyes',

  // Nails
  'nails': 'nails', 'manicure': 'nails', 'nail polish': 'nails',

  // Furniture
  'furniture': 'furniture', 'sofa': 'furniture', 'couch': 'furniture',
  'chair': 'furniture', 'table': 'furniture', 'desk': 'furniture',
  'bed': 'furniture', 'dresser': 'furniture', 'wardrobe': 'furniture',
  'shelf': 'furniture', 'cabinet': 'furniture', 'bookshelf': 'furniture',
  'bench': 'furniture', 'stool': 'furniture', 'armchair': 'furniture',
  'nightstand': 'furniture', 'vanity': 'furniture', 'mirror': 'furniture',
  'fireplace': 'furniture',

  // Lighting
  'lamp': 'lighting', 'light': 'lighting', 'chandelier': 'lighting',
  'sconce': 'lighting', 'lantern': 'lighting', 'candle': 'lighting',

  // Decor
  'decor': 'decor', 'decoration': 'decor', 'art': 'decor', 'painting': 'decor',
  'poster': 'decor', 'sculpture': 'decor', 'vase': 'decor', 'wall art': 'decor',
  'frame': 'decor', 'clock': 'decor',

  // Clutter
  'clutter': 'clutter', 'books': 'clutter', 'magazines': 'clutter',
  'trinket': 'clutter', 'knickknack': 'clutter', 'figurine': 'clutter',

  // Kitchen
  'kitchen': 'kitchen', 'stove': 'kitchen', 'oven': 'kitchen', 'fridge': 'kitchen',
  'refrigerator': 'kitchen', 'microwave': 'kitchen', 'dishwasher': 'kitchen',
  'sink': 'kitchen', 'counter': 'kitchen', 'appliance': 'kitchen',

  // Bathroom
  'bathroom': 'bathroom', 'shower': 'bathroom', 'toilet': 'bathroom',
  'tub': 'bathroom', 'bathtub': 'bathroom', 'bath': 'bathroom',

  // Outdoor
  'outdoor': 'outdoor', 'patio': 'outdoor', 'garden': 'outdoor',
  'yard': 'outdoor', 'fence': 'outdoor', 'pool': 'outdoor',

  // Plants
  'plant': 'plants', 'flower': 'plants', 'tree': 'plants', 'bush': 'plants',
  'succulent': 'plants', 'houseplant': 'plants',

  // Rugs
  'rug': 'rugs', 'carpet': 'rugs', 'mat': 'rugs',

  // Curtains
  'curtain': 'curtains', 'drapes': 'curtains', 'blinds': 'curtains',

  // Electronics
  'tv': 'electronics', 'television': 'electronics', 'computer': 'electronics',
  'laptop': 'electronics', 'phone': 'electronics', 'stereo': 'electronics',
  'speaker': 'electronics', 'gaming': 'electronics',

  // Poses
  'pose': 'poses', 'poses': 'poses', 'pose pack': 'poses',

  // Animations
  'animation': 'animations', 'animated': 'animations',

  // Gameplay mods
  'gameplay': 'gameplay-mod', 'mod pack': 'gameplay-mod', 'social': 'gameplay-mod',
  'interaction': 'gameplay-mod', 'realistic gameplay': 'gameplay-mod',
  'tradition': 'gameplay-mod', 'traditions': 'gameplay-mod', 'habit': 'gameplay-mod',
  'routine': 'gameplay-mod', 'woohoo': 'gameplay-mod', 'pregnancy': 'gameplay-mod',
  'autonomy': 'gameplay-mod', 'slice of life': 'gameplay-mod', 'sol': 'gameplay-mod',

  // Script mods
  'script': 'script-mod', 'mccc': 'script-mod', 'mc command': 'script-mod',
  'wicked whims': 'script-mod', 'basemental': 'script-mod', 'utility': 'script-mod',
  'cheat': 'script-mod', 'tweak': 'script-mod',

  // Traits
  'trait': 'trait', 'traits': 'trait', 'personality': 'trait',

  // Careers
  'career': 'career', 'job': 'career', 'profession': 'career',

  // Food
  'food': 'food', 'recipe': 'food', 'meal': 'food', 'dish': 'food',
  'cooking': 'food', 'drink': 'food', 'beverage': 'food', 'snack': 'food',

  // Lots
  'lot': 'lot', 'house': 'lot', 'home': 'lot', 'apartment': 'lot',
  'mansion': 'lot', 'cottage': 'lot', 'residential': 'lot', 'venue': 'lot',

  // UI
  'ui': 'ui-preset', 'preset': 'ui-preset', 'reshade': 'ui-preset',
  'gshade': 'ui-preset', 'shader': 'ui-preset',
  'cas background': 'cas-background', 'cas bg': 'cas-background',
  'loading screen': 'loading-screen', 'loading': 'loading-screen',
};

const THEME_KEYWORDS: Record<string, Theme> = {
  // Seasonal
  'christmas': 'christmas', 'xmas': 'christmas', 'holiday': 'christmas',
  'santa': 'christmas', 'festive': 'christmas', 'winter holiday': 'christmas',
  'halloween': 'halloween', 'spooky': 'halloween', 'witch': 'halloween',
  'vampire': 'halloween', 'ghost': 'halloween', 'scary': 'halloween',
  'pumpkin': 'halloween', 'skeleton': 'halloween', 'zombie': 'halloween',
  'valentine': 'valentines', 'romantic': 'romantic', 'love': 'romantic',
  'heart': 'valentines', 'cupid': 'valentines',
  'easter': 'easter', 'bunny': 'easter', 'pastel': 'easter',
  'summer': 'summer', 'beach': 'beach', 'tropical': 'tropical',
  'fall': 'fall', 'autumn': 'fall', 'pumpkin spice': 'fall',
  'winter': 'winter', 'snow': 'winter', 'cold': 'winter', 'cozy': 'cozy',
  'spring': 'spring', 'floral': 'spring', 'bloom': 'spring',

  // Aesthetics
  'cottagecore': 'cottagecore', 'cottage': 'cottagecore', 'farmhouse': 'cottagecore',
  'y2k': 'y2k', '2000s': 'y2k', 'early 2000s': 'y2k',
  'goth': 'goth', 'gothic': 'goth', 'dark': 'goth', 'black': 'goth',
  'boho': 'boho', 'bohemian': 'bohemian',
  'modern': 'modern', 'contemporary': 'modern', 'sleek': 'modern',
  'vintage': 'vintage', 'retro': 'retro', '70s': 'retro', '80s': 'retro', '90s': 'retro',
  'fantasy': 'fantasy', 'fairy': 'fairycore', 'magical': 'fantasy', 'enchanted': 'fantasy',
  'sci-fi': 'sci-fi', 'futuristic': 'futuristic', 'cyberpunk': 'futuristic', 'space': 'sci-fi',
  'minimalist': 'minimalist', 'simple': 'minimalist', 'clean': 'minimalist',
  'maximalist': 'maximalist', 'bold': 'maximalist', 'colorful': 'maximalist',
  'preppy': 'preppy', 'collegiate': 'preppy', 'ivy league': 'preppy',
  'grunge': 'grunge', 'punk': 'grunge', 'edgy': 'grunge',
  'dark academia': 'dark-academia', 'academia': 'dark-academia',
  'kawaii': 'kawaii', 'cute': 'kawaii',
  'streetwear': 'streetwear', 'urban': 'streetwear', 'hypebeast': 'streetwear',
  'luxury': 'luxury', 'designer': 'luxury', 'high end': 'luxury', 'elegant': 'luxury',
  'rustic': 'rustic', 'country': 'rustic', 'cabin': 'rustic',
  'industrial': 'industrial', 'loft': 'industrial', 'warehouse': 'industrial',
  'scandinavian': 'scandinavian', 'nordic': 'scandinavian', 'ikea': 'scandinavian',
  'witchy': 'witchy', 'occult': 'witchy', 'mystical': 'witchy',
  'fairycore': 'fairycore', 'fae': 'fairycore', 'whimsical': 'fairycore',
  'goblincore': 'goblincore', 'nature': 'goblincore',
  'royalcore': 'royalcore', 'royal': 'royalcore', 'regal': 'royalcore', 'princess': 'royalcore',
};

const VISUAL_STYLE_KEYWORDS: Record<string, VisualStyle> = {
  'alpha': 'alpha', 'alpha cc': 'alpha', 'realistic': 'realistic',
  'maxis match': 'maxis-match', 'maxis': 'maxis-match', 'mm': 'maxis-match',
  'maxis-match': 'maxis-match', 'clayified': 'clayified', 'clay': 'clayified',
  'semi-maxis': 'semi-maxis', 'semi maxis': 'semi-maxis',
};

const AGE_KEYWORDS: Record<string, AgeGroup> = {
  'infant': 'infant', 'baby': 'infant',
  'toddler': 'toddler', 'tot': 'toddler',
  'child': 'child', 'kid': 'child', 'kids': 'child',
  'teen': 'teen', 'teenager': 'teen', 'adolescent': 'teen',
  'young adult': 'young-adult', 'ya': 'young-adult',
  'adult': 'adult',
  'elder': 'elder', 'elderly': 'elder', 'senior': 'elder',
  'all ages': 'all-ages', 'all-ages': 'all-ages',
};

const GENDER_KEYWORDS: Record<string, GenderOption> = {
  'male': 'masculine', 'masculine': 'masculine', 'men': 'masculine', 'man': 'masculine',
  'female': 'feminine', 'feminine': 'feminine', 'women': 'feminine', 'woman': 'feminine',
  'unisex': 'unisex', 'both': 'unisex', 'all genders': 'unisex',
};

// ============================================
// AI FACET EXTRACTOR CLASS
// ============================================

let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const useOllama = process.env.USE_OLLAMA === 'true';
    const ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';

    _openaiClient = new OpenAI({
      apiKey: useOllama ? 'ollama' : process.env.OPENAI_API_KEY,
      baseURL: useOllama ? ollamaBaseURL : undefined,
    });
  }
  return _openaiClient;
}

export class AIFacetExtractor {

  /**
   * Extract facets from mod metadata using AI + keyword validation
   */
  async extractFacets(
    title: string,
    description?: string | null,
    existingTags?: string[],
    existingCategory?: string
  ): Promise<ExtractedFacets> {

    // First, try keyword-based extraction (fast, reliable)
    const keywordFacets = this.extractFromKeywords(title, description, existingTags);

    // If we got a confident content type from keywords, use keyword extraction
    if (keywordFacets.contentType && keywordFacets.confidence >= 0.8) {
      return keywordFacets;
    }

    // Otherwise, use AI for more nuanced extraction
    try {
      const aiFacets = await this.extractWithAI(title, description, existingTags, existingCategory);

      // Merge AI results with keyword validation
      return this.mergeAndValidate(keywordFacets, aiFacets);
    } catch (error) {
      console.error('AI facet extraction failed, using keywords only:', error);
      return keywordFacets;
    }
  }

  /**
   * Fast keyword-based extraction
   */
  private extractFromKeywords(
    title: string,
    description?: string | null,
    existingTags?: string[]
  ): ExtractedFacets {
    const text = `${title} ${description || ''} ${(existingTags || []).join(' ')}`.toLowerCase();

    const result: ExtractedFacets = {
      contentType: null,
      visualStyle: null,
      themes: [],
      ageGroups: [],
      genderOptions: [],
      occultTypes: [],
      packRequirements: [],
      confidence: 0,
    };

    // Extract content type (first match wins, ordered by specificity)
    const titleLower = title.toLowerCase();
    for (const [keyword, type] of Object.entries(CONTENT_TYPE_KEYWORDS)) {
      // Check title first (higher priority)
      if (titleLower.includes(keyword)) {
        result.contentType = type;
        result.confidence = 0.9;
        break;
      }
    }

    // If no match in title, check full text
    if (!result.contentType) {
      for (const [keyword, type] of Object.entries(CONTENT_TYPE_KEYWORDS)) {
        if (text.includes(keyword)) {
          result.contentType = type;
          result.confidence = 0.7;
          break;
        }
      }
    }

    // Extract visual style
    for (const [keyword, style] of Object.entries(VISUAL_STYLE_KEYWORDS)) {
      if (text.includes(keyword)) {
        result.visualStyle = style;
        break;
      }
    }

    // Extract themes (multiple allowed)
    const seenThemes = new Set<Theme>();
    for (const [keyword, theme] of Object.entries(THEME_KEYWORDS)) {
      if (text.includes(keyword) && !seenThemes.has(theme)) {
        seenThemes.add(theme);
        result.themes.push(theme);
      }
    }

    // Extract age groups (multiple allowed)
    const seenAges = new Set<AgeGroup>();
    for (const [keyword, age] of Object.entries(AGE_KEYWORDS)) {
      if (text.includes(keyword) && !seenAges.has(age)) {
        seenAges.add(age);
        result.ageGroups.push(age);
      }
    }

    // Extract gender options (multiple allowed)
    const seenGenders = new Set<GenderOption>();
    for (const [keyword, gender] of Object.entries(GENDER_KEYWORDS)) {
      if (text.includes(keyword) && !seenGenders.has(gender)) {
        seenGenders.add(gender);
        result.genderOptions.push(gender);
      }
    }

    // If no confidence yet, set a base level
    if (result.confidence === 0) {
      result.confidence = 0.3;
    }

    return result;
  }

  /**
   * AI-powered extraction for nuanced cases
   */
  private async extractWithAI(
    title: string,
    description?: string | null,
    existingTags?: string[],
    existingCategory?: string
  ): Promise<ExtractedFacets> {

    const useOllama = process.env.USE_OLLAMA === 'true';
    const model = useOllama
      ? (process.env.OLLAMA_MODEL || 'llama3.2:3b')
      : 'gpt-4o-mini';

    const prompt = `Analyze this Sims 4 mod and extract facets for categorization.

**Title:** ${title}
${description ? `**Description:** ${description}` : ''}
${existingTags?.length ? `**Existing Tags:** ${existingTags.join(', ')}` : ''}
${existingCategory ? `**Current Category:** ${existingCategory}` : ''}

Extract the following facets:

1. **contentType** (REQUIRED, pick ONE):
   CAS items: hair, tops, bottoms, dresses, full-body, shoes, accessories, jewelry, makeup, skin, eyes, nails, tattoos, glasses, hats
   Build/Buy: furniture, lighting, decor, clutter, kitchen, bathroom, bedroom, outdoor, plants, rugs, curtains, electronics
   Other: poses, animations, gameplay-mod, script-mod, trait, career, food, lot, ui-preset, cas-background, loading-screen

2. **visualStyle** (pick ONE if applicable):
   alpha, maxis-match, semi-maxis, clayified, realistic

3. **themes** (pick ALL that apply):
   Seasonal: christmas, halloween, valentines, easter, summer, fall, winter, spring
   Aesthetic: cottagecore, y2k, goth, boho, modern, vintage, fantasy, sci-fi, romantic, minimalist, preppy, grunge, dark-academia, kawaii, streetwear, luxury, cozy, beach, tropical, rustic, witchy, fairycore

4. **ageGroups** (pick ALL that apply):
   infant, toddler, child, teen, young-adult, adult, elder, all-ages

5. **genderOptions** (pick ALL that apply):
   masculine, feminine, unisex

**CRITICAL RULES:**
- Hair mods = contentType: "hair" (NEVER gameplay-mod)
- Clothing items (sweaters, dresses, etc.) = their specific type (tops, dresses, etc.)
- Christmas/Halloween sweater = contentType: "tops" + themes: ["christmas"] or ["halloween"]
- Food/recipe mods = contentType: "food"
- Loading screens = contentType: "loading-screen"

Respond with ONLY valid JSON:
{
  "contentType": "hair",
  "visualStyle": "alpha",
  "themes": ["christmas"],
  "ageGroups": ["adult", "elder"],
  "genderOptions": ["feminine"],
  "reasoning": "Brief explanation"
}`;

    const response = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a Sims 4 mod categorization expert. Extract facets accurately. Hair is ALWAYS contentType:"hair". Clothing is its specific type. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: useOllama ? undefined : { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';

    // Try to parse JSON, handling potential markdown code blocks
    let parsed: any;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      return this.getEmptyFacets();
    }

    return {
      contentType: this.validateContentType(parsed.contentType),
      visualStyle: this.validateVisualStyle(parsed.visualStyle),
      themes: this.validateThemes(parsed.themes),
      ageGroups: this.validateAgeGroups(parsed.ageGroups),
      genderOptions: this.validateGenderOptions(parsed.genderOptions),
      occultTypes: [],
      packRequirements: [],
      confidence: 0.7,
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Merge keyword and AI results, with keyword taking precedence for validated matches
   */
  private mergeAndValidate(
    keywordFacets: ExtractedFacets,
    aiFacets: ExtractedFacets
  ): ExtractedFacets {
    return {
      // Content type: prefer keyword if confident, else AI
      contentType: keywordFacets.contentType && keywordFacets.confidence >= 0.7
        ? keywordFacets.contentType
        : aiFacets.contentType || keywordFacets.contentType,

      // Visual style: prefer keyword match
      visualStyle: keywordFacets.visualStyle || aiFacets.visualStyle,

      // Themes: union of both
      themes: Array.from(new Set([...keywordFacets.themes, ...aiFacets.themes])),

      // Age groups: union of both
      ageGroups: Array.from(new Set([...keywordFacets.ageGroups, ...aiFacets.ageGroups])),

      // Gender: union of both
      genderOptions: Array.from(new Set([...keywordFacets.genderOptions, ...aiFacets.genderOptions])),

      // Occult: from AI only for now
      occultTypes: aiFacets.occultTypes,

      // Pack requirements: would need more context
      packRequirements: [],

      // Confidence: weighted average
      confidence: Math.max(keywordFacets.confidence, aiFacets.confidence),

      reasoning: aiFacets.reasoning,
    };
  }

  // Validation helpers
  private validateContentType(value: any): ContentType | null {
    if (!value) return null;
    const normalized = String(value).toLowerCase().trim();
    return FACET_VALUES.contentType.includes(normalized as ContentType)
      ? normalized as ContentType
      : null;
  }

  private validateVisualStyle(value: any): VisualStyle | null {
    if (!value) return null;
    const normalized = String(value).toLowerCase().trim();
    return FACET_VALUES.visualStyle.includes(normalized as VisualStyle)
      ? normalized as VisualStyle
      : null;
  }

  private validateThemes(values: any): Theme[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => FACET_VALUES.themes.includes(v as Theme)) as Theme[];
  }

  private validateAgeGroups(values: any): AgeGroup[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => FACET_VALUES.ageGroups.includes(v as AgeGroup)) as AgeGroup[];
  }

  private validateGenderOptions(values: any): GenderOption[] {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => String(v).toLowerCase().trim())
      .filter(v => FACET_VALUES.genderOptions.includes(v as GenderOption)) as GenderOption[];
  }

  private getEmptyFacets(): ExtractedFacets {
    return {
      contentType: null,
      visualStyle: null,
      themes: [],
      ageGroups: [],
      genderOptions: [],
      occultTypes: [],
      packRequirements: [],
      confidence: 0,
    };
  }
}

export const aiFacetExtractor = new AIFacetExtractor();
