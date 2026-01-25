#!/usr/bin/env npx tsx
/**
 * Task #4: Fix Workout/Gym Mods
 *
 * Creates 'workout' and 'gym' facets for fitness content and categorizes
 * existing mods appropriately based on their content type.
 *
 * - 'workout' (contentType): CC items like poses, clothing, equipment
 * - 'gym' (contentType): Fitness venue lots (buildings)
 *
 * Usage:
 *   npx tsx scripts/ralph/fix-workout-mods.ts          # Dry run - preview changes
 *   npx tsx scripts/ralph/fix-workout-mods.ts --fix    # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--fix');

// STRICT fitness-related keywords - must be clearly about fitness/gym/workout
const FITNESS_KEYWORDS = [
  /\bgym\b/i,
  /\bfitness\b/i,
  /\bworkout\b/i,
  /\byoga\b/i,
  /\bexercise\b/i,
  /\bhealth\s*club\b/i,
  /\bpilates\b/i,
  /\baerobics\b/i,
  /\btreadmill\b/i,
  /\bcrossfit\b/i,
];

// Lot indicators - these are buildings/venues (only used AFTER fitness keyword confirmed)
const LOT_INDICATORS = [
  /\blot\b/i,
  /\bbuild(ing)?\b/i,
  /\bvenue\b/i,
  /\bclub\b/i,
  /\bcenter\b/i,
  /\bcentre\b/i,
  /\bstudio\b/i,
  /\breno(vation)?\b/i,
  /\bproject\b/i,
  /\bsave\b/i, // Save Project
  /\bv\d+\b/i, // V2, V3 etc (common for lot versions)
];

// CC indicators - these are poses, clothing, equipment (only used AFTER fitness keyword confirmed)
const CC_INDICATORS = [
  /\bpose\b/i,
  /\bposes\b/i,
  /\bclothing\b/i,
  /\boutfit\b/i,
  /\bset\b/i,
  /\bcollection\b/i,
  /\bequipment\b/i,
  /\bmachine\b/i,
  /\bmat\b/i,
  /\bball\b/i,
  /\bleggings\b/i,
  /\btop\b/i,
  /\bshorts\b/i,
  /\bbra\b/i,
  /\bsneakers\b/i,
  /\bposter\b/i,
  /\bdecal\b/i,
  /\bclutter\b/i,
  /\bfurniture\b/i,
  /\bdecor\b/i,
  /\bplanner\b/i, // e.g., Workout Planner Traditions Mod
  /\bmod\b/i,
];

interface FacetDefinitionInput {
  facetType: string;
  value: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

// New facet definitions for fitness content
const workoutFacetDefinitions: FacetDefinitionInput[] = [
  {
    facetType: 'contentType',
    value: 'workout',
    displayName: 'Workout',
    description: 'Workout-related CC: poses, clothing, and fitness equipment',
    icon: '💪',
    color: '#F97316', // orange-500
    sortOrder: 400,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'gym',
    displayName: 'Gym',
    description: 'Fitness venue lots and gym buildings',
    icon: '🏋️',
    color: '#EF4444', // red-500
    sortOrder: 401,
    isActive: true,
  },
];

// Gym theme for tagging
const gymThemeDefinition: FacetDefinitionInput = {
  facetType: 'themes',
  value: 'fitness',
  displayName: 'Fitness',
  description: 'Fitness and workout themed content',
  icon: '🏃',
  color: '#10B981', // emerald-500
  sortOrder: 400,
  isActive: true,
};

interface ModCandidate {
  id: string;
  title: string;
  description: string | null;
  contentType: string | null;
  tags: string[];
  themes: string[];
}

interface CategorizationResult {
  mod: ModCandidate;
  suggestedContentType: 'gym' | 'workout' | null;
  addFitnessTheme: boolean;
  reason: string;
}

/**
 * Check if a mod has a fitness keyword (required to be considered for changes)
 */
function hasFitnessKeyword(text: string): boolean {
  return FITNESS_KEYWORDS.some((p) => p.test(text));
}

/**
 * Determine if a mod is a LOT (building) or CC (items)
 * Returns null for suggestedContentType if the mod doesn't clearly have fitness keywords
 */
function categorizeFitnessMod(mod: ModCandidate): CategorizationResult {
  const titleAndDesc = `${mod.title} ${mod.description || ''}`;
  const titleOnly = mod.title;

  // FIRST: Check if this mod actually has fitness keywords
  // This prevents false positives from generic words like "house", "set", "collection"
  if (!hasFitnessKeyword(titleAndDesc)) {
    return {
      mod,
      suggestedContentType: null,
      addFitnessTheme: false,
      reason: 'No fitness keywords found - skipping',
    };
  }

  // Strong CC indicators in TITLE - check these FIRST
  // If the title clearly indicates CC, don't let description override
  const strongTitleCCPatterns = [
    /yoga\s*(mat|set|pose|collection)/i,
    /workout\s*(outfit|set|collection)/i,
    /gym\s*(outfit|set|clothing|equipment|posters?|bag)/i,
    /fitness\s*(outfit|set|clothing)/i,
    /\bgym\s+top\b/i,
    /\bgym\s+shorts\b/i,
    /balance\s*collection/i,
  ];

  const hasStrongTitleCCIndicator = strongTitleCCPatterns.some((p) => p.test(titleOnly));
  const matchedTitleCCPattern = strongTitleCCPatterns.find((p) => p.test(titleOnly));

  if (hasStrongTitleCCIndicator) {
    return {
      mod,
      suggestedContentType: 'workout',
      addFitnessTheme: true,
      reason: `Strong CC indicator in title: ${matchedTitleCCPattern?.source}`,
    };
  }

  // Strong lot indicators in TITLE - check after ruling out CC title patterns
  const strongTitleLotPatterns = [
    /health\s*club/i,
    /gym\s+(build|lot|venue|reno)/i,
    /fitness\s+(center|centre|club)/i,
    /spa\s+gym/i,
    /gym\s+v\d/i, // Gym V2, Gym V3
    /pilates\s+studio/i,
    /yoga\s+studio/i,
    /fitness\s+gym/i,
    /la\s+fitness/i,
    /crossfit\s+gym/i,
  ];

  const hasStrongTitleLotIndicator = strongTitleLotPatterns.some((p) => p.test(titleOnly));
  const matchedTitleLotPattern = strongTitleLotPatterns.find((p) => p.test(titleOnly));

  if (hasStrongTitleLotIndicator) {
    return {
      mod,
      suggestedContentType: 'gym',
      addFitnessTheme: true,
      reason: `Strong lot indicator in title: ${matchedTitleLotPattern?.source}`,
    };
  }

  // Secondary patterns (can check full text)
  const strongCCPatterns = [
    /workout\s*planner/i,
    /exercise\s*(equipment|machine)/i,
    /\btreadmill\b/i,
    /gym\s*equipment/i,
    /workout\s*mod/i,
    /\bfitness\s+set\b/i,
    /fitness\s*(clutter|influencer)/i,
  ];

  const hasStrongCCIndicator = strongCCPatterns.some((p) => p.test(titleAndDesc));
  const matchedCCPattern = strongCCPatterns.find((p) => p.test(titleAndDesc));

  // Check current contentType
  const currentType = mod.contentType?.toLowerCase() || '';

  // If strong CC indicator, it's a workout item
  if (hasStrongCCIndicator) {
    return {
      mod,
      suggestedContentType: 'workout',
      addFitnessTheme: true,
      reason: `Strong CC indicator: ${matchedCCPattern?.source}`,
    };
  }

  // Secondary lot patterns (check full text including description)
  const strongLotPatterns = [
    /evermore.*gym/i,
    /gym.*evermore/i,
  ];

  const hasStrongLotIndicator = strongLotPatterns.some((p) => p.test(titleAndDesc));
  const matchedLotPattern = strongLotPatterns.find((p) => p.test(titleAndDesc));

  // If strong lot indicator found in description, it's a gym
  if (hasStrongLotIndicator) {
    return {
      mod,
      suggestedContentType: 'gym',
      addFitnessTheme: true,
      reason: `Strong lot indicator: ${matchedLotPattern?.source}`,
    };
  }

  // Check lot indicators (after confirming fitness keyword)
  const hasLotIndicator = LOT_INDICATORS.some((p) => p.test(titleAndDesc));
  const hasCCIndicator = CC_INDICATORS.some((p) => p.test(titleAndDesc));

  // If already marked as 'lot' and has fitness keyword, it's a gym
  if (currentType === 'lot') {
    return {
      mod,
      suggestedContentType: 'gym',
      addFitnessTheme: true,
      reason: 'Currently contentType=lot with fitness keyword -> gym',
    };
  }

  // Use heuristics based on secondary indicators
  if (hasLotIndicator && !hasCCIndicator) {
    return {
      mod,
      suggestedContentType: 'gym',
      addFitnessTheme: true,
      reason: 'Has fitness keyword + lot indicators',
    };
  }

  if (hasCCIndicator && !hasLotIndicator) {
    return {
      mod,
      suggestedContentType: 'workout',
      addFitnessTheme: true,
      reason: 'Has fitness keyword + CC indicators',
    };
  }

  // Mixed or unclear - check current content type for hints
  if (['full-body', 'tops', 'bottoms', 'shoes', 'accessories', 'poses', 'decor', 'clutter', 'furniture'].includes(currentType)) {
    return {
      mod,
      suggestedContentType: 'workout',
      addFitnessTheme: true,
      reason: `Fitness keyword + current contentType (${currentType}) suggests CC item`,
    };
  }

  // Default: add fitness theme but don't change content type
  return {
    mod,
    suggestedContentType: null,
    addFitnessTheme: true,
    reason: 'Has fitness keyword but unclear type - adding theme only',
  };
}

async function createFacetDefinitions(): Promise<void> {
  console.log('\n--- Creating Facet Definitions ---\n');

  const allDefinitions = [...workoutFacetDefinitions, gymThemeDefinition];

  for (const def of allDefinitions) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create/update: ${def.facetType}/${def.value} -> "${def.displayName}"`);
    } else {
      const result = await prisma.facetDefinition.upsert({
        where: {
          facetType_value: {
            facetType: def.facetType,
            value: def.value,
          },
        },
        update: {
          displayName: def.displayName,
          description: def.description,
          icon: def.icon,
          color: def.color,
          sortOrder: def.sortOrder,
          isActive: def.isActive,
        },
        create: {
          facetType: def.facetType,
          value: def.value,
          displayName: def.displayName,
          description: def.description,
          icon: def.icon,
          color: def.color,
          sortOrder: def.sortOrder,
          isActive: def.isActive,
        },
      });
      console.log(`[CREATED/UPDATED] ${def.facetType}/${def.value} -> "${def.displayName}"`);
    }
  }
}

async function findFitnessMods(): Promise<ModCandidate[]> {
  // Build OR conditions for all fitness keywords
  const keywordConditions = FITNESS_KEYWORDS.map((pattern) => {
    // Extract the core word from the regex pattern
    const word = pattern.source.replace(/\\b/g, '').replace(/\\/g, '').replace(/\s\*/g, ' ').replace(/\(\?\:.*?\)/g, '').replace(/\(.*?\)\?/g, '');
    return [
      { title: { contains: word, mode: 'insensitive' as const } },
      { description: { contains: word, mode: 'insensitive' as const } },
    ];
  }).flat();

  const mods = await prisma.mod.findMany({
    where: {
      OR: keywordConditions,
    },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      tags: true,
      themes: true,
    },
  });

  return mods;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Task #4: Fix Workout/Gym Mods');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (use --fix to apply)' : 'APPLYING CHANGES'}`);
  console.log('='.repeat(60));

  // Step 1: Create facet definitions
  await createFacetDefinitions();

  // Step 2: Find all fitness-related mods
  console.log('\n--- Finding Fitness Mods ---\n');
  const fitnessMods = await findFitnessMods();
  console.log(`Found ${fitnessMods.length} mods with fitness keywords\n`);

  // Step 3: Categorize each mod
  const results: CategorizationResult[] = [];
  for (const mod of fitnessMods) {
    const result = categorizeFitnessMod(mod);
    results.push(result);
  }

  // Step 4: Group by categorization
  const gymMods = results.filter((r) => r.suggestedContentType === 'gym');
  const workoutMods = results.filter((r) => r.suggestedContentType === 'workout');
  const uncategorized = results.filter((r) => r.suggestedContentType === null);

  console.log('--- Categorization Summary ---');
  console.log(`  Gym (lots/venues): ${gymMods.length}`);
  console.log(`  Workout (CC items): ${workoutMods.length}`);
  console.log(`  Fitness theme only: ${uncategorized.length}\n`);

  // Step 5: Show specific mods mentioned in task
  console.log('--- Specific Mods to Fix ---\n');
  const specificMods = [
    'movers and shakers gym reno',
    'willow health club',
    'chaos spa gym',
    'balance collection',
    'yoga set',
  ];

  for (const searchTerm of specificMods) {
    const found = results.find((r) =>
      r.mod.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (found) {
      console.log(`  [${found.suggestedContentType || 'fitness-theme-only'}] "${found.mod.title}"`);
      console.log(`    Current: ${found.mod.contentType || 'NULL'}`);
      console.log(`    Reason: ${found.reason}`);
      console.log('');
    } else {
      console.log(`  [NOT FOUND] "${searchTerm}"`);
    }
  }

  // Step 6: Show sample of gym mods
  console.log('--- Sample Gym Mods (Lots/Venues) ---');
  for (const result of gymMods.slice(0, 10)) {
    console.log(`  - "${result.mod.title.substring(0, 60)}${result.mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    Current: ${result.mod.contentType || 'NULL'} -> gym`);
    console.log(`    Reason: ${result.reason}`);
  }
  if (gymMods.length > 10) {
    console.log(`  ... and ${gymMods.length - 10} more`);
  }

  // Step 7: Show sample of workout mods
  console.log('\n--- Sample Workout Mods (CC Items) ---');
  for (const result of workoutMods.slice(0, 10)) {
    console.log(`  - "${result.mod.title.substring(0, 60)}${result.mod.title.length > 60 ? '...' : ''}"`);
    console.log(`    Current: ${result.mod.contentType || 'NULL'} -> workout`);
    console.log(`    Reason: ${result.reason}`);
  }
  if (workoutMods.length > 10) {
    console.log(`  ... and ${workoutMods.length - 10} more`);
  }

  // Step 8: Apply changes if not dry run
  if (!DRY_RUN) {
    console.log('\n--- Applying Changes ---\n');

    let updatedCount = 0;
    let themeAddedCount = 0;

    for (const result of results) {
      const updates: {
        contentType?: string;
        themes?: string[];
      } = {};

      // Update content type if suggested
      if (result.suggestedContentType) {
        updates.contentType = result.suggestedContentType;
      }

      // Add fitness theme if not already present
      if (result.addFitnessTheme && !result.mod.themes.includes('fitness')) {
        updates.themes = [...result.mod.themes, 'fitness'];
        themeAddedCount++;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.mod.update({
          where: { id: result.mod.id },
          data: updates,
        });
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} mods`);
    console.log(`Added fitness theme to ${themeAddedCount} mods`);
  }

  // Step 9: Final summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total fitness mods found: ${fitnessMods.length}`);
  console.log(`  -> Would set to 'gym': ${gymMods.length}`);
  console.log(`  -> Would set to 'workout': ${workoutMods.length}`);
  console.log(`  -> Would add 'fitness' theme only: ${uncategorized.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes were made. Run with --fix to apply changes.');
  } else {
    console.log('\nChanges have been applied!');
  }

  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
