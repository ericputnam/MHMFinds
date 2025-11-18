import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CategoryHierarchy {
  root: string;        // "CC" or "Mods" or "Gameplay"
  level1?: string;     // "Build/Buy", "Create-a-Sim", etc.
  level2?: string;     // "House", "Garden", etc.
  level3?: string;     // "Lamp", "Furniture", etc.
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

Your task is to categorize this into a hierarchical structure. Use this category tree as a guide:

**Root Level (Level 0):**
- CC (Custom Content) - visual items like clothing, hair, furniture, decor
- Mods (Gameplay Mods) - gameplay changes, new features, cheats
- Scripts - technical mods, script mods
- Lots - pre-built houses, community lots

**CC Subtree:**
- CC > Create-a-Sim > (Hair | Clothing | Accessories | Skin | Makeup | Eyes)
- CC > Build/Buy > House > (Furniture | Decor | Lighting | Bathroom | Kitchen | Bedroom)
- CC > Build/Buy > Garden > (Plants | Outdoor | Fencing | Pools)
- CC > Build/Buy > Other

**Mods Subtree:**
- Mods > Gameplay > (Career | Relationships | Skills | Traits)
- Mods > Interface > (UI | Menus | HUD)
- Mods > Utilities > (Cheats | Tools | Fixes)

**Respond ONLY with valid JSON in this exact format:**
{
  "root": "CC",
  "level1": "Build/Buy",
  "level2": "House",
  "level3": "Lighting",
  "reasoning": "The mod is about lamps which are lighting items for houses"
}

**Important:**
- Use EXACTLY these category names (case-sensitive)
- Only include levels that are needed (e.g., if it's just "CC > Hair", only include root and level1)
- If unsure, err on the side of broader categories
- Common keywords: "cc" = CC, "hair" = Create-a-Sim > Hair, "lamp/light" = Build/Buy > House > Lighting`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
        response_format: { type: 'json_object' },
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
   * Fallback categorization using simple keyword matching
   * Used when AI categorization fails
   */
  private fallbackCategorization(cleanSlug: string): CategoryHierarchy {
    const lower = cleanSlug.toLowerCase();

    // CC > Create-a-Sim categories
    if (lower.includes('hair')) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Hair' };
    }
    if (lower.includes('clothing') || lower.includes('clothes')) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Clothing' };
    }
    if (lower.includes('makeup') || lower.includes('cosmetic')) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Makeup' };
    }
    if (lower.includes('skin')) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Skin' };
    }
    if (lower.includes('eyes')) {
      return { root: 'CC', level1: 'Create-a-Sim', level2: 'Eyes' };
    }

    // CC > Build/Buy > House categories
    if (lower.includes('lamp') || lower.includes('light')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Lighting' };
    }
    if (lower.includes('furniture') || lower.includes('sofa') || lower.includes('chair')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Furniture' };
    }
    if (lower.includes('decor') || lower.includes('decoration')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Decor' };
    }
    if (lower.includes('kitchen')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Kitchen' };
    }
    if (lower.includes('bathroom')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Bathroom' };
    }
    if (lower.includes('bedroom')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'House', level3: 'Bedroom' };
    }

    // CC > Build/Buy > Garden categories
    if (lower.includes('garden') || lower.includes('outdoor') || lower.includes('plant')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Garden' };
    }

    // Mods categories
    if (
      lower.includes('mod') ||
      lower.includes('gameplay') ||
      lower.includes('cheat') ||
      lower.includes('script')
    ) {
      return { root: 'Mods', level1: 'Gameplay' };
    }

    // Lots
    if (lower.includes('lot') || lower.includes('house') || lower.includes('build')) {
      return { root: 'Lots' };
    }

    // Default to CC > Build/Buy > Other if we can't determine
    if (lower.includes('cc') || lower.includes('custom content')) {
      return { root: 'CC', level1: 'Build/Buy', level2: 'Other' };
    }

    // Ultimate fallback
    return { root: 'CC', level1: 'Other' };
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
      hierarchy.level3,
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
