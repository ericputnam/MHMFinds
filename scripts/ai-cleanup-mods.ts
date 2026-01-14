import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Valid categories (flat, simple)
const VALID_CATEGORIES = [
  'Hair',
  'CAS - Clothing',
  'CAS - Accessories',
  'CAS - Makeup',
  'Build/Buy',
  'Build/Buy - Clutter',
  'Poses',
  'Gameplay',
  'Scripts',
  'UI/UX',
  'Lots',
] as const;

type ValidCategory = typeof VALID_CATEGORIES[number];

interface ModCleanupResult {
  category: ValidCategory;
  tags: string[];
  author: string | null;
  reasoning: string;
}

/**
 * Use AI to analyze a mod and determine correct category + tags
 */
async function analyzeModWithAI(mod: {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  author: string | null;
}): Promise<ModCleanupResult> {
  const prompt = `Analyze this Sims 4 mod and determine the correct category and tags.

**Mod Title:** ${mod.title}
**Current Category:** ${mod.category}
**Description:** ${mod.description || 'No description'}
**Current Tags:** ${mod.tags.join(', ') || 'None'}
**Current Author:** ${mod.author || 'Unknown'}

**VALID CATEGORIES (choose exactly ONE):**
- Hair - Hairstyles, wigs for Create-A-Sim
- CAS - Clothing - ANY wearable clothing: tops, bottoms, dresses, sweaters, pajamas, sleepwear, swimwear, outfits, costumes, shirts, pants, skirts, rompers
- CAS - Accessories - Jewelry, bags, glasses, hats, piercings, gloves, earrings, necklaces, watches
- CAS - Makeup - Lipstick, eyeshadow, blush, skincare overlays, face paint
- Build/Buy - Furniture, beds, chairs, tables, sofas, fireplaces, functional items
- Build/Buy - Clutter - Small decorative items, plants, wall art, candles, books
- Poses - Animation poses for screenshots
- Gameplay - Mods that ADD NEW GAME MECHANICS: careers, traits, skills, activities, food recipes, social interactions, life states
- Scripts - Script mods, utility mods, cheats, core mods like MCCC or Wicked Whims
- UI/UX - Loading screens, CAS backgrounds, menus, UI overhauls
- Lots - Pre-built lots and houses

**SEMANTIC TAGS (generate 3-8 relevant tags):**
- Style: alpha, maxis-match, realistic
- Age: toddler, child, teen, adult, elder, infant
- Gender: male, female, unisex
- Season: christmas, halloween, summer, winter, fall, spring
- Theme: goth, cottagecore, modern, vintage, boho, fantasy, sci-fi
- Type: free, patreon-early-access
- Specific: furniture, hair, makeup, dress, sweater, etc.

**CRITICAL RULES:**
1. CLOTHING IS CAS - Clothing: Sweaters, dresses, pants, shirts, pajamas, sleepwear = CAS - Clothing (even if Christmas/Halloween themed!)
2. "Holly Set", "Santa Sweaters", "Christmas Dress" = CAS - Clothing (these are CLOTHES, not gameplay!)
3. Only use Gameplay for mods that ADD MECHANICS like "Preschool Mod", "Teen Romance", "New Careers"
4. Furniture (beds, chairs, fireplaces) = Build/Buy
5. Loading screens = UI/UX
6. DO NOT change CAS clothing to Gameplay just because it has a holiday theme!
7. Remove garbage tags like numbered lists "23. Some Mod Name" or article titles

Based on the title and description, determine the CORRECT category. Your category choice MUST match your reasoning.

Respond with JSON only:
{
  "category": "<one of the valid categories above>",
  "tags": ["tag1", "tag2", "tag3"],
  "author": "CreatorName or null if truly unknown",
  "reasoning": "Brief explanation of why this category was chosen"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective for bulk processing
      messages: [
        { role: 'system', content: 'You are a Sims 4 mod categorization expert. IMPORTANT: Clothing items (sweaters, dresses, pants, tops) are ALWAYS "CAS - Clothing" regardless of theme. Only use "Gameplay" for mods that add new game mechanics. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate category
    if (!VALID_CATEGORIES.includes(result.category)) {
      result.category = 'Gameplay'; // Default fallback
    }

    // Fix category/reasoning mismatches (AI sometimes outputs wrong category despite correct reasoning)
    const reasoning = (result.reasoning || '').toLowerCase();
    if (reasoning.includes('build/buy') && !result.category.startsWith('Build')) {
      // Check if it's clutter or major furniture
      if (reasoning.includes('clutter') || reasoning.includes('small') || reasoning.includes('decorative')) {
        result.category = 'Build/Buy - Clutter';
      } else {
        result.category = 'Build/Buy';
      }
    }
    if (reasoning.includes('furniture') && result.category === 'Gameplay') {
      result.category = 'Build/Buy';
    }
    if (reasoning.includes('fireplace') && result.category !== 'Build/Buy') {
      result.category = 'Build/Buy';
    }

    // Fix lots/houses - AI often miscategorizes these as Gameplay
    const title = mod.title.toLowerCase();
    const lotsKeywords = ['house', 'home', 'cottage', 'mansion', 'apartment', 'lot ', ' lot', 'residence', 'villa'];
    const isLot = lotsKeywords.some(kw => title.includes(kw)) || reasoning.includes('lot') || reasoning.includes('pre-built');
    if (isLot && result.category === 'Gameplay') {
      result.category = 'Lots';
    }

    // Fix poses
    if ((title.includes('pose') || reasoning.includes('pose')) && result.category !== 'Poses') {
      result.category = 'Poses';
    }

    // Fix hair - AI often miscategorizes hair mods as Gameplay or other categories
    const hairKeywords = ['hair', 'hairstyle', 'ponytail', 'braids', 'bun', 'bangs', 'wig', 'updo'];
    const isHair = hairKeywords.some(kw => title.includes(kw)) ||
                   (reasoning.includes('hair') && !reasoning.includes('chair'));
    if (isHair && result.category !== 'Hair') {
      result.category = 'Hair';
    }

    // Fix CAS - Clothing being miscategorized
    const clothingKeywords = ['dress', 'top', 'bottom', 'shirt', 'pants', 'skirt', 'sweater', 'hoodie', 'jacket', 'coat', 'pajama', 'sleepwear', 'outfit', 'romper', 'jumpsuit', 'bodysuit'];
    const isClothing = clothingKeywords.some(kw => title.includes(kw)) ||
                       (reasoning.includes('clothing') || reasoning.includes('wearable'));
    if (isClothing && !result.category.startsWith('CAS') && result.category !== 'Hair') {
      result.category = 'CAS - Clothing';
    }

    // Fix CAS - Accessories being miscategorized
    const accessoryKeywords = ['earring', 'necklace', 'bracelet', 'ring', 'glasses', 'hat', 'piercing', 'jewelry', 'jewellery'];
    const isAccessory = accessoryKeywords.some(kw => title.includes(kw)) ||
                        reasoning.includes('accessor');
    if (isAccessory && result.category === 'Gameplay') {
      result.category = 'CAS - Accessories';
    }

    // Fix CAS - Makeup being miscategorized
    const makeupKeywords = ['lipstick', 'eyeshadow', 'makeup', 'blush', 'eyeliner', 'mascara'];
    const isMakeup = makeupKeywords.some(kw => title.includes(kw)) ||
                     reasoning.includes('makeup');
    if (isMakeup && result.category === 'Gameplay') {
      result.category = 'CAS - Makeup';
    }

    // Clean tags - remove any that look like article titles
    result.tags = (result.tags || [])
      .filter((tag: string) => {
        const t = tag.toLowerCase();
        return t.length < 30 &&
               !t.match(/^\d+\./) && // No numbered items
               !t.includes('sims 4') && // Remove generic
               !t.includes('by ') && // No "by Author" tags
               t.length > 2;
      })
      .slice(0, 8);

    return result as ModCleanupResult;
  } catch (error) {
    console.error(`Error analyzing mod ${mod.id}:`, error);
    return {
      category: mod.category as ValidCategory || 'Gameplay',
      tags: [],
      author: mod.author,
      reasoning: 'Error during analysis'
    };
  }
}

/**
 * Process all mods in batches
 */
async function cleanupAllMods() {
  console.log('=== AI MOD CLEANUP ===\n');

  const totalMods = await prisma.mod.count();
  console.log(`Total mods to process: ${totalMods}\n`);

  const BATCH_SIZE = 50;
  let processed = 0;
  let updated = 0;
  let errors = 0;

  // Get mods in batches
  let skip = 0;

  while (skip < totalMods) {
    const mods = await prisma.mod.findMany({
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        author: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (mods.length === 0) break;

    console.log(`\nProcessing batch ${Math.floor(skip / BATCH_SIZE) + 1} (${skip + 1}-${skip + mods.length})...`);

    for (const mod of mods) {
      try {
        const result = await analyzeModWithAI(mod);

        // Check if anything changed
        const categoryChanged = result.category !== mod.category;
        const tagsChanged = JSON.stringify(result.tags.sort()) !== JSON.stringify((mod.tags || []).sort());
        const authorChanged = result.author && result.author !== mod.author && mod.author === null;

        if (categoryChanged || tagsChanged || authorChanged) {
          await prisma.mod.update({
            where: { id: mod.id },
            data: {
              category: result.category,
              tags: result.tags,
              ...(authorChanged ? { author: result.author } : {})
            }
          });

          updated++;

          if (categoryChanged) {
            console.log(`  ✓ ${mod.title.substring(0, 40)}...`);
            console.log(`    Category: ${mod.category} → ${result.category}`);
          }
        }

        processed++;

        // Rate limiting - 1 request per 100ms = 600/min (well under OpenAI limits)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errors++;
        console.error(`  ✗ Error: ${mod.title.substring(0, 40)}`);
      }
    }

    skip += BATCH_SIZE;

    // Progress update
    const pct = ((processed / totalMods) * 100).toFixed(1);
    console.log(`Progress: ${processed}/${totalMods} (${pct}%) - ${updated} updated, ${errors} errors`);
  }

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Total updated: ${updated}`);
  console.log(`Total errors: ${errors}`);

  // Final category counts
  console.log('\nFinal category distribution:');
  const groups = await prisma.mod.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  groups.forEach(({ category, _count }) => {
    console.log(`  ${category.padEnd(25)} ${_count.id}`);
  });

  await prisma.$disconnect();
}

// Run with a small test first
async function testWithSample() {
  console.log('=== TEST RUN (10 mods) ===\n');

  // Get some obviously miscategorized mods
  const testMods = await prisma.mod.findMany({
    where: {
      OR: [
        { title: { contains: 'Mod', mode: 'insensitive' } },
        { title: { contains: 'Preschool', mode: 'insensitive' } },
        { title: { contains: 'Tradition', mode: 'insensitive' } },
        { title: { contains: 'Loading', mode: 'insensitive' } },
      ],
      category: { in: ['CAS', 'CAS - Accessories', 'Other'] }
    },
    take: 10,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      author: true,
    }
  });

  console.log(`Found ${testMods.length} test mods\n`);

  for (const mod of testMods) {
    console.log(`\n📦 ${mod.title}`);
    console.log(`   Current: ${mod.category}`);
    console.log(`   Tags: ${mod.tags.slice(0, 3).join(', ')}`);

    const result = await analyzeModWithAI(mod);

    console.log(`   → New Category: ${result.category}`);
    console.log(`   → New Tags: ${result.tags.join(', ')}`);
    console.log(`   → Reasoning: ${result.reasoning}`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  await prisma.$disconnect();
}

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--test')) {
  testWithSample().catch(console.error);
} else if (args.includes('--run')) {
  cleanupAllMods().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npx ts-node scripts/ai-cleanup-mods.ts --test   # Test with 10 mods');
  console.log('  npx ts-node scripts/ai-cleanup-mods.ts --run    # Run full cleanup');
}
