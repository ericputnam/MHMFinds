import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

// Lazy initialization of OpenAI client to allow env vars to load first
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const useOllama = process.env.USE_OLLAMA === 'true';
    const ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

    _openaiClient = new OpenAI({
      apiKey: useOllama ? 'ollama' : process.env.OPENAI_API_KEY, // Ollama doesn't need real key
      baseURL: useOllama ? ollamaBaseURL : undefined,
    });
  }
  return _openaiClient;
}

// For backwards compatibility, keep the model name accessible
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

interface CategoryHierarchy {
  root: string;        // Parent: "CC", "Mods", "Lots"
  level1?: string;     // Sub: "Build/Buy", "Create-a-Sim", "Gameplay", "Seasonal"
  level2?: string;     // Bucket: "Hair", "Lighting", "Food", "Halloween"
  reasoning?: string;  // AI's reasoning for this categorization
}

/**
 * AI-powered category service that intelligently categorizes mods
 * based on URL slugs and mod metadata
 */
export class AICategorizer {
  /**
   * Parse URL slug and use AI to determine hierarchical category
   * Example: "sims-4-lamp-cc" -> CC > Build/Buy > House > Lamp
   */
  async categorizeFromSlug(
    urlSlug: string,
    modTitle?: string,
    modDescription?: string
  ): Promise<string> {
    // Extract the meaningful part of the slug (remove sims-4, sims4, etc.)
    const cleanSlug = this.cleanSlug(urlSlug);

    // Use AI to determine the category hierarchy
    const hierarchy = await this.determineHierarchy(
      cleanSlug,
      modTitle,
      modDescription
    );

    // Find or create the category in the database
    const categoryId = await this.findOrCreateCategory(hierarchy);

    return categoryId;
  }

  /**
   * Clean up URL slug to extract meaningful keywords
   * "sims-4-lamp-cc" -> "lamp cc"
   * "best-sims-4-hair-mods" -> "hair mods"
   */
  private cleanSlug(urlSlug: string): string {
    return urlSlug
      .replace(/sims-?4/gi, '')
      .replace(/sims-?3/gi, '')
      .replace(/best-/gi, '')
      .replace(/top-/gi, '')
      .replace(/new-/gi, '')
      .replace(/latest-/gi, '')
      .replace(/free-/gi, '')
      .replace(/-+/g, ' ')
      .trim();
  }

  /**
   * Use OpenAI to intelligently determine category hierarchy
   */
  private async determineHierarchy(
    cleanSlug: string,
    modTitle?: string,
    modDescription?: string
  ): Promise<CategoryHierarchy> {
    const prompt = `You are a Sims 4 mod categorization expert. Analyze the following information and determine the appropriate category hierarchy.

URL Keywords: "${cleanSlug}"
${modTitle ? `Mod Title: "${modTitle}"` : ''}
${modDescription ? `Description: "${modDescription}"` : ''}

**CRITICAL:** You MUST return EXACTLY 3 levels: root (parent), level1 (sub), and level2 (bucket). No more, no less.

**Category Structure:**

**CC (Custom Content):**
- CC > Seasonal > (Halloween | Christmas | Valentines | Easter | Summer)
- CC > Create-a-Sim > (Hair | Tops | Bottoms | Dresses | Shoes | Outfits | Jewelry | Accessories | Bags | Makeup | Skin | Eyes)
- CC > Build/Buy > (Lighting | Seating | Tables | Storage | Beds | Kitchen | Bathroom | Electronics | Decor | Outdoor | Pool | Plants | Furniture)
- CC > Animations > (Poses)

**Mods:**
- Mods > Gameplay > (Food | Career | Relationships | Skills | Traits | Teen | Toddler | Child | Elder | General)
- Mods > Graphics > (Presets)
- Mods > Utilities > (Tools)

**Lots:**
- Lots > Residential > (Houses)
- Lots > Community > (Venues)

**Respond with EXACTLY 3 levels in valid JSON:**
{
  "root": "CC",
  "level1": "Seasonal",
  "level2": "Halloween",
  "reasoning": "Witch-themed content for Halloween"
}

**Important:**
- ALWAYS include root, level1, AND level2 (3 levels total)
- Use "General" as level2 if uncertain
- Prioritize specific categories (Food, Poses, Presets, etc.)
- Avoid generic buckets unless necessary`;

    try {
      const useOllama = process.env.USE_OLLAMA === 'true';
      const response = await getOpenAIClient().chat.completions.create({
        model: useOllama ? ollamaModel : 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a Sims 4 mod categorization expert. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent categorization
        response_format: useOllama ? undefined : { type: 'json_object' }, // Ollama doesn't support this param
      });

      const result = JSON.parse(
        response.choices[0].message.content || '{}'
      ) as CategoryHierarchy;

      return result;
    } catch (error) {
      console.error('Error determining category hierarchy:', error);

      // Fallback to simple heuristic categorization
      return this.fallbackCategorization(cleanSlug);
    }
  }

  /**
   * Fallback categorization using comprehensive keyword matching
   * ALWAYS returns exactly 3 levels: root → level1 → level2
   * Used when AI categorization fails - should rarely use "Other"
   */
  private fallbackCategorization(cleanSlug: string): CategoryHierarchy {
    const lower = cleanSlug.toLowerCase();

    // Helper to ensure we always return 3 levels
    const ensure3Levels = (hierarchy: CategoryHierarchy): CategoryHierarchy => {
      if (!hierarchy.level1) hierarchy.level1 = 'General';
      if (!hierarchy.level2) hierarchy.level2 = 'Miscellaneous';
      return hierarchy;
    };

    // ========================================
    // GAMEPLAY MODS - FOOD & RECIPES (Priority 1)
    // ========================================

    if (lower.match(/\b(custom ?food|recipe|cooking|food ?mod|meal|dish|cuisine)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Food' };
    }

    // ========================================
    // GRAPHICS & VISUAL MODS (Priority 2)
    // ========================================

    if (lower.match(/\b(gshade|reshade|preset|shader|lighting ?mod|graphics ?mod)\b/)) {
      return { root: 'Mods', level1: 'Graphics', level2: 'Presets' };
    }

    // ========================================
    // POSES & ANIMATIONS (Priority 3)
    // ========================================

    if (lower.match(/\b(pose|poses|animation|animator|pose ?pack)\b/)) {
      return { root: 'CC', level1: 'Animations', level2: 'Poses' };
    }

    // ========================================
    // AGE-SPECIFIC CONTENT (Priority 4)
    // ========================================

    if (lower.match(/\b(teen|teenager|adolescent)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Teen' };
    }
    if (lower.match(/\b(toddler|baby|infant)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Toddler' };
    }
    if (lower.match(/\b(child|kids?)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Child' };
    }
    if (lower.match(/\b(elder|elderly|senior)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Elder' };
    }

    // ========================================
    // SEASONAL & HOLIDAY CONTENT (Priority 5)
    // ========================================

    // Halloween / Spooky
    if (lower.match(/\b(halloween|spooky|witch|vampire|ghost|zombie|occult|magic|spell|potion|cauldron|broom)\b/)) {
      return { root: 'CC', level1: 'Seasonal', level2: 'Halloween' };
    }

    // Christmas / Winter
    if (lower.match(/\b(christmas|xmas|winter|holiday|festive|snow|santa|elf|reindeer)\b/)) {
      return { root: 'CC', level1: 'Seasonal', level2: 'Christmas' };
    }

    // Valentine's Day
    if (lower.match(/\b(valentine|romantic|love|hearts?|cupid)\b/)) {
      return { root: 'CC', level1: 'Seasonal', level2: 'Valentines' };
    }

    // Easter / Spring
    if (lower.match(/\b(easter|spring|bunny|pastel)\b/)) {
      return { root: 'CC', level1: 'Seasonal', level2: 'Easter' };
    }

    // Summer
    if (lower.match(/\b(summer|beach|tropical|sun)\b/)) {
      return { root: 'CC', level1: 'Seasonal', level2: 'Summer' };
    }

    // ========================================
    // CREATE-A-SIM (Priority 6)
    // ========================================

    // Hair
    if (lower.match(/\b(hair|hairstyle|ponytail|braids?|bun|bangs|fringe)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Hair' };
    }

    // Clothing - Tops
    if (lower.match(/\b(top|shirt|blouse|tshirt|t-shirt|sweater|hoodie|jacket|coat|cardigan)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Tops' };
    }

    // Clothing - Bottoms
    if (lower.match(/\b(bottom|pants?|jeans|shorts?|skirt|leggings)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Bottoms' };
    }

    // Clothing - Dresses
    if (lower.match(/\b(dress|gown|robe)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Dresses' };
    }

    // Clothing - Shoes
    if (lower.match(/\b(shoes?|boots?|sneakers?|heels?|sandals?|slippers?)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Shoes' };
    }

    // Clothing - Sets/Outfits
    if (lower.match(/\b(outfit|set|ensemble|costume)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Outfits' };
    }

    // Generic clothing fallback
    if (lower.match(/\b(clothing|clothes|apparel|wear)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Clothing' };
    }

    // Accessories - Jewelry
    if (lower.match(/\b(jewelry|jewellery|necklace|earrings?|bracelet|ring)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Jewelry' };
    }

    // Accessories - Hats/Headwear
    if (lower.match(/\b(hat|cap|beanie|headband|crown|tiara|accessory|accessories)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Accessories' };
    }

    // Accessories - Bags
    if (lower.match(/\b(bag|purse|backpack|tote)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Bags' };
    }

    // Makeup
    if (lower.match(/\b(makeup|cosmetic|lipstick|eyeshadow|blush|eyeliner|mascara)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Makeup' };
    }

    // Skin
    if (lower.match(/\b(skin|skintone|overlay|tattoo)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Skin' };
    }

    // Eyes
    if (lower.match(/\b(eyes?|eyecolor|contacts?)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Eyes' };
    }

    // ========================================
    // BUILD/BUY (Priority 7)
    // ========================================

    // Lighting
    if (lower.match(/\b(lamp|light|lighting|chandelier|sconce|lantern)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Lighting' };
    }

    // Seating Furniture
    if (lower.match(/\b(sofa|couch|chair|seat|bench|stool|armchair)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Seating' };
    }

    // Tables
    if (lower.match(/\b(table|desk|counter|bar)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Tables' };
    }

    // Storage
    if (lower.match(/\b(shelf|shelves|cabinet|drawer|dresser|wardrobe|closet|storage)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Storage' };
    }

    // Beds
    if (lower.match(/\b(bed|mattress|crib)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Beds' };
    }

    // Kitchen
    if (lower.match(/\b(kitchen|stove|oven|fridge|refrigerator|microwave|dishwasher|sink|appliance)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Kitchen' };
    }

    // Bathroom
    if (lower.match(/\b(bathroom|bath|shower|toilet|tub|bathtub)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Bathroom' };
    }

    // Electronics
    if (lower.match(/\b(tv|television|computer|laptop|phone|electronics?|tech)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Electronics' };
    }

    // Decor
    if (lower.match(/\b(decor|decoration|art|painting|sculpture|vase|rug|carpet|curtain|wall)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Decor' };
    }

    // Outdoor/Garden
    if (lower.match(/\b(garden|outdoor|patio|deck|yard|lawn|fence|fencing)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Outdoor' };
    }

    // Pool
    if (lower.match(/\b(pool|swim|hot ?tub|spa)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Pool' };
    }

    // Plants
    if (lower.match(/\b(plant|tree|flower|bush|shrub)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Plants' };
    }

    // Generic furniture
    if (lower.match(/\b(furniture|furnishing)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Furniture' };
    }

    // ========================================
    // LOTS & BUILDINGS (Priority 8)
    // ========================================

    // Residential
    if (lower.match(/\b(house|home|residential|apartment)\b/)) {
      return { root: 'Lots', level1: 'Residential', level2: 'Houses' };
    }

    // Community
    if (lower.match(/\b(lot|community|venue|restaurant|shop|store|gym|library|park)\b/)) {
      return { root: 'Lots', level1: 'Community', level2: 'Venues' };
    }

    // ========================================
    // GAMEPLAY MODS (Priority 9)
    // ========================================

    // Career mods
    if (lower.match(/\b(career|job|work)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Career' };
    }

    // Relationships
    if (lower.match(/\b(relationship|romance|dating|marriage|family)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Relationships' };
    }

    // Skills
    if (lower.match(/\b(skill|talent|ability)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Skills' };
    }

    // Traits
    if (lower.match(/\b(trait|personality)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'Traits' };
    }

    // Utilities/Cheats
    if (lower.match(/\b(cheat|utility|tool|fix|mccc|mc command)\b/)) {
      return { root: 'Mods', level1: 'Utilities', level2: 'Tools' };
    }

    // Generic mod/script
    if (lower.match(/\b(mod|script|gameplay)\b/)) {
      return { root: 'Mods', level1: 'Gameplay', level2: 'General' };
    }

    // ========================================
    // FALLBACKS (Priority 10 - Last Resort)
    // ========================================

    // If it mentions "cc" or "custom content", assume it's Build/Buy
    if (lower.match(/\b(cc|custom ?content)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'General' };
    }

    // Check if it's likely CAS based on context
    if (lower.match(/\b(sim|character|avatar)\b/)) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'General' };
    }

    // Check if it's Build/Buy based on context
    if (lower.match(/\b(build|buy|object|item)\b/)) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'General' };
    }

    // Ultimate last resort - use General instead of Other
    return { root: 'CC', level1: 'Build/Buy', level2: 'General' };
  }

  /**
   * Find or create category in database based on hierarchy
   * Uses materialized path pattern for efficient queries
   */
  private async findOrCreateCategory(
    hierarchy: CategoryHierarchy
  ): Promise<string> {
    const levels = [
      hierarchy.root,
      hierarchy.level1,
      hierarchy.level2,
    ].filter(Boolean);

    // Build the path: "cc/build-buy/house/lighting"
    const path = levels
      .map((level) => this.slugify(level!))
      .join('/');

    // Try to find existing category by path
    let category = await prisma.category.findUnique({
      where: { path },
    });

    if (category) {
      return category.id;
    }

    // Category doesn't exist, create the entire path
    // We need to create each level if it doesn't exist
    let parentId: string | null = null;

    for (let i = 0; i < levels.length; i++) {
      const levelName = levels[i]!;
      const levelPath = levels
        .slice(0, i + 1)
        .map((l) => this.slugify(l!))
        .join('/');

      // Check if this level exists
      let levelCategory = await prisma.category.findUnique({
        where: { path: levelPath },
      });

      if (!levelCategory) {
        // Create this level
        levelCategory = await prisma.category.create({
          data: {
            name: levelName,
            slug: this.slugify(levelName),
            path: levelPath,
            level: i,
            parentId: parentId,
            order: 0,
          },
        });
      }

      parentId = levelCategory.id;

      // If this is the last level, return its ID
      if (i === levels.length - 1) {
        return levelCategory.id;
      }
    }

    // Should never reach here, but return root if we do
    throw new Error('Failed to create category hierarchy');
  }

  /**
   * Convert category name to slug
   * "Build/Buy" -> "build-buy"
   * "Create-a-Sim" -> "create-a-sim"
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get the full category path as a breadcrumb array
   * Returns: ["CC", "Build/Buy", "House", "Lighting"]
   */
  async getCategoryBreadcrumb(categoryId: string): Promise<string[]> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return [];
    }

    const breadcrumb: string[] = [];
    let current: any = category;

    while (current) {
      breadcrumb.unshift(current.name);
      current = current.parent;
    }

    return breadcrumb;
  }

  /**
   * Get all categories as a tree structure for UI
   */
  async getCategoryTree() {
    const allCategories = await prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure
    const categoryMap = new Map<string, any>();
    const roots: any[] = [];

    // First pass: create all nodes
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    // Second pass: build tree
    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}

export const aiCategorizer = new AICategorizer();
