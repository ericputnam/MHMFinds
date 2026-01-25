#!/usr/bin/env npx tsx
/**
 * Task #5: Fix Lot Mods - Remove 'lot' facet and split into specific categories
 *
 * The 'lot' contentType is too generic. This script analyzes all mods with
 * contentType='lot' and recategorizes them into more specific categories:
 *
 * - residential: Houses, apartments, starter homes, mansions, villas, cabins
 * - commercial: Retail, restaurants, cafes, shops, bakeries, markets
 * - entertainment: Clubs, bars, theaters, cinemas, arcades, venues, casinos
 * - community: Parks, libraries, museums, galleries, community centers, schools, hospitals
 *
 * Note: 'gym' and 'holidays' already exist from previous tasks.
 * Note: Many items marked as 'lot' are actually CC (furniture, wallpaper, etc.)
 *       and should be recategorized based on their actual content.
 *
 * Usage:
 *   npx tsx scripts/ralph/fix-lot-mods.ts          # Dry run - preview changes
 *   npx tsx scripts/ralph/fix-lot-mods.ts --fix    # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--fix');

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

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

// New lot type facets to create
const newLotFacets: FacetDefinitionInput[] = [
  {
    facetType: 'contentType',
    value: 'residential',
    displayName: 'Residential',
    description: 'Residential lots: houses, apartments, starter homes, mansions, villas',
    icon: '🏠',
    color: '#22C55E', // green-500
    sortOrder: 200,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'commercial',
    displayName: 'Commercial',
    description: 'Commercial lots: restaurants, cafes, shops, bakeries, retail',
    icon: '🏪',
    color: '#F59E0B', // amber-500
    sortOrder: 201,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'entertainment',
    displayName: 'Entertainment',
    description: 'Entertainment venues: clubs, bars, theaters, arcades, lounges',
    icon: '🎭',
    color: '#EC4899', // pink-500
    sortOrder: 202,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'community',
    displayName: 'Community',
    description: 'Community lots: parks, libraries, museums, schools, hospitals',
    icon: '🏛️',
    color: '#6366F1', // indigo-500
    sortOrder: 203,
    isActive: true,
  },
];

// =============================================================================
// KEYWORD PATTERNS FOR CATEGORIZATION
// =============================================================================

// TITLE-ONLY patterns - these should only match in the title, not description
// These are strong indicators that appear directly in lot names

// Residential patterns - houses, homes, apartments (TITLE ONLY)
const RESIDENTIAL_TITLE_PATTERNS = [
  /\bhouse\b/i,
  /\bhome\b/i,
  /\bapartment\b/i,
  /\bstarter\b/i,
  /\bcabin\b/i,
  /\bcottage\b/i,
  /\bmansion\b/i,
  /\bvilla\b/i,
  /\bloft\b/i,
  /\bpenthouse\b/i,
  /\btownhouse\b/i,
  /\bduplex\b/i,
  /\bfarmhouse\b/i,
  /\bbungalow\b/i,
  /\bresidence\b/i,
  /\bmanor\b/i,
  /\blodge\b/i,
  /\bshack\b/i,
  /\bhut\b/i,
  /\btreehouse\b/i,
  /\btiny\s*home\b/i,
  /\btiny\s*house\b/i,
  /\bfamily\s*house\b/i,
  /\bfamily\s*home\b/i,
  /\bbeach\s*house\b/i,
];

// Commercial patterns - businesses, retail, restaurants (TITLE ONLY)
const COMMERCIAL_TITLE_PATTERNS = [
  /\bshop\b/i,
  /\bstore\b/i,
  /\bretail\b/i,
  /\brestaurant\b/i,
  /\bcafe\b/i,
  /\bcafé\b/i,
  /\bbakery\b/i,
  /\bpub\b/i,
  /\bboutique\b/i,
  /\bmarket\b/i,
  /\bmall\b/i,
  /\bdiner\b/i,
  /\bbistro\b/i,
  /\btavern\b/i,
  /\binn\b/i,
  /\bhotel\b/i,
  /\bmotel\b/i,
  /\bresort\b/i,
  /\bsalon\b/i,
  /\bcream\s*shop\b/i,
  /\bice\s*cream\b/i,
  /\bmcdonalds?\b/i,
  /\bolive\s*garden\b/i,
  /\bkfc\b/i,
];

// Entertainment patterns - venues, clubs, leisure (TITLE ONLY)
const ENTERTAINMENT_TITLE_PATTERNS = [
  /\bnightclub\b/i,
  /\btheater\b/i,
  /\btheatre\b/i,
  /\bcinema\b/i,
  /\barcade\b/i,
  /\bbowling\b/i,
  /\bkaraoke\b/i,
  /\bcasino\b/i,
  /\bdisco\b/i,
  /\barena\b/i,
  /\bstadium\b/i,
  /\bbar\b/i, // only in title to avoid description matches
];

// Community patterns - public spaces, institutions (TITLE ONLY)
const COMMUNITY_TITLE_PATTERNS = [
  /\bpark\b/i,
  /\blibrary\b/i,
  /\bmuseum\b/i,
  /\bschool\b/i,
  /\buniversity\b/i,
  /\bcampus\b/i,
  /\bhospital\b/i,
  /\bclinic\b/i,
  /\bchurch\b/i,
  /\btemple\b/i,
  /\bplayground\b/i,
  /\bwedding\s*venue\b/i,
  /\bcommunity\s*center\b/i,
  /\bpublic\s*(pool|park|library)\b/i,
];

// Less reliable patterns - these are often found in descriptions generically
// Only use these if no other category matches and mod appears to be a lot
const WEAK_COMMUNITY_PATTERNS = [
  /\bgarden\b/i, // Many lots have gardens
  /\bpool\b/i,   // Many lots have pools
  /\bgallery\b/i, // Could be art gallery or just description
];

// Patterns that indicate commercial when combined with other context
const WEAK_COMMERCIAL_PATTERNS = [
  /\bspa\b/i, // Could be spa building or just amenity
];

// Patterns that indicate entertainment
const WEAK_ENTERTAINMENT_PATTERNS = [
  /\bclub\b/i,   // Could be night club or just description
  /\blounge\b/i, // Could be lounge venue or furniture piece
  /\bvenue\b/i,  // Generic - needs context
];

// =============================================================================
// NON-LOT CC PATTERNS - Items that should NOT be categorized as lots
// =============================================================================

// These indicate the mod is actually CC (furniture, wallpaper, etc.) not a lot
const NON_LOT_INDICATORS = [
  // Furniture items
  /\bfridge\b/i,
  /\brefrigerator\b/i,
  /\bshower\b/i,
  /\btub\b/i,
  /\bstove\b/i,
  /\boven\b/i,
  /\bsink\b/i,
  /\btoilet\b/i,
  /\bbed\b(?!room)/i,
  /\bsofa\b/i,
  /\bcouch\b/i,
  /\bchair\b/i,
  /\btable\b/i,
  /\bdesk\b/i,
  /\blamp\b/i,
  /\blight(ing|s)?\b/i,
  /\bshelf\b/i,
  /\bshelves\b/i,
  /\bbookshelf\b/i,
  /\bcabinet\b/i,
  /\bdresser\b/i,
  /\bmirror\b/i,
  /\brug\b/i,
  /\bcarpet\b/i,
  /\bcurtain\b/i,
  /\bplanter\b/i,
  /\bplant\s*pot\b/i,
  /\bvase\b/i,
  /\bclock\b/i,
  /\btv\b/i,
  /\btelevision\b/i,
  /\bmonitor\b/i,
  /\bcomputer\b/i,
  /\blaptop\b/i,
  /\bconsole\b/i,
  /\bappliance\b/i,

  // Wall items
  /\bwallpaper\b/i,
  /\bwall\s*(art|decor|painting|mural|panel|tile)\b/i,
  /\bwall\s*set\b/i,
  /\bbrick\s*wall\b/i,
  /\bstone\s*wall\b/i,
  /\bpainted\s*wall\b/i,
  /\bwalls?\s*(and|&)\s*floors?\b/i,

  // Decorative items
  /\bdecor\b/i,
  /\bdeco\b/i,
  /\bclutter\b/i,
  /\bcandle\b/i,
  /\bposter\b/i,
  /\bpainting\b/i,
  /\bcanvas\b/i,
  /\bframe\b/i,
  /\bprint\b/i,
  /\bsticker\b/i,
  /\bplushie\b/i,
  /\bstatue\b/i,
  /\bsculpture\b/i,

  // Windows and doors (as CC items)
  /\bwindow\s*set\b/i,
  /\bdoor\s*set\b/i,
  /\bwindows\s*(and|&)\s*doors\b/i,
  /\bdoors\s*(and|&)\s*windows\b/i,
  /\barch\s*set\b/i,

  // Clothing/CAS
  /\bswimsuit\b/i,
  /\bmonokini\b/i,
  /\bbikini\b/i,
  /\boutfit\b/i,
  /\btop\b(?!\s*(rated|floor))/i,
  /\bbottom\b/i,
  /\bdress\b/i,
  /\bshoes\b/i,
  /\bhat\b/i,
  /\bhair\b/i,
  /\bskin\s*tone\b/i,
  /\bpreset\b/i,
  /\bmakeup\b/i,

  // Mods/gameplay
  /\btrait\b/i,
  /\bcareer\b/i,
  /\bmod\b(?!\s*(ern|erately))/i, // "mod" but not "modern"
  /\btweak\b/i,
  /\bfix\b/i,
  /\boverride\b/i,
  /\bdefault\b/i,
  /\bscenario\b/i,
  /\bchallenge\b/i,

  // Food items
  /\brecipe\b/i,
  /\bjerk\s*chicken\b/i,
  /\bjollof\b/i,
  /\bcake\b/i,
  /\bdoughnut\b/i,
  /\bbreakfast\b/i,
  /\bfood\b/i,

  // Generic CC terms
  /\bcc\s*pack\b/i,
  /\bstuff\s*pack\b/i,
  /\bcollection\b(?!\s*house)/i,
  /\bset\b(?!\s*up)/i,
  /\bkit\b/i,

  // Specific non-lot items seen in data
  /\bplaypen\b/i,
  /\bswing\b/i,
  /\bpacifier\b/i,
  /\btoys?\b/i,
  /\bsave\s*file\b/i,
  /\bfunctional\b/i,
  /\banimation\b/i,
  /\bpose\b/i,
];

// Strong lot indicators - if these are present, likely a real lot
const STRONG_LOT_INDICATORS = [
  /\blot\b/i,
  /\bbuild\b/i,
  /\bno\s*cc\b/i,
  /\bfully\s*furnished\b/i,
  /\b(20|30|40|50)x(20|30|40|50)\b/i, // lot dimensions
  /\bsave\s*file\b.*\b(house|home|lot)\b/i,
];

// =============================================================================
// CATEGORIZATION LOGIC
// =============================================================================

interface ModCandidate {
  id: string;
  title: string;
  description: string | null;
  contentType: string | null;
  tags: string[];
}

type NewCategory = 'residential' | 'commercial' | 'entertainment' | 'community' | 'gym' | 'holidays' | null;

interface CategorizationResult {
  mod: ModCandidate;
  suggestedContentType: NewCategory;
  isReallyCC: boolean;
  suggestedCCType: string | null;
  reason: string;
}

/**
 * Check if text matches any pattern in the array
 */
function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Find the first matching pattern
 */
function findMatch(text: string, patterns: RegExp[]): RegExp | null {
  return patterns.find((p) => p.test(text)) || null;
}

/**
 * Determine if a mod is actually CC (not a lot) and what type
 */
function detectCCType(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Specific CC type mappings
  if (/\bwallpaper\b/i.test(text) || /\bwall\s*(art|mural|panel|tile)\b/i.test(text)) {
    return 'decor';
  }
  if (/\b(fridge|refrigerator|stove|oven|appliance)\b/i.test(text)) {
    return 'kitchen';
  }
  if (/\b(shower|tub|toilet|bathroom)\b/i.test(text)) {
    return 'bathroom';
  }
  if (/\b(lamp|lighting|light)\b/i.test(text)) {
    return 'lighting';
  }
  if (/\b(shelf|shelves|bookshelf|cabinet)\b/i.test(text)) {
    return 'furniture';
  }
  if (/\b(rug|carpet)\b/i.test(text)) {
    return 'decor';
  }
  if (/\b(plant|planter|pot)\b/i.test(text)) {
    return 'plants';
  }
  if (/\b(window|door)\s*set\b/i.test(text)) {
    return 'builds';
  }
  if (/\b(tv|television|monitor|computer|laptop|console)\b/i.test(text)) {
    return 'clutter';
  }
  if (/\b(poster|painting|canvas|frame|print|art)\b/i.test(text)) {
    return 'wall-art';
  }
  if (/\b(decor|deco|clutter|decorative)\b/i.test(text)) {
    return 'decor';
  }
  if (/\b(trait)\b/i.test(text)) {
    return 'trait';
  }
  if (/\b(career)\b/i.test(text)) {
    return 'career';
  }
  if (/\b(mod|tweak|fix|override)\b/i.test(text) && !/modern/i.test(text)) {
    return 'gameplay-mod';
  }
  if (/\b(recipe|food|chicken|rice|cake|breakfast)\b/i.test(text)) {
    return 'food';
  }
  if (/\b(swimsuit|monokini|bikini|outfit|dress)\b/i.test(text)) {
    return 'full-body';
  }
  if (/\b(top)\b/i.test(text) && !/top\s*(floor|rated)/i.test(text)) {
    return 'tops';
  }
  if (/\b(preset)\b/i.test(text)) {
    return 'preset';
  }
  if (/\b(skin\s*tone|skintone)\b/i.test(text)) {
    return 'skin';
  }
  if (/\b(hair)\b/i.test(text)) {
    return 'hair';
  }

  return null;
}

/**
 * Categorize a mod that currently has contentType='lot'
 */
function categorizeLotMod(mod: ModCandidate): CategorizationResult {
  const text = `${mod.title} ${mod.description || ''}`;
  const titleOnly = mod.title;

  // First check: Is this really CC and not a lot?
  // Check if it has strong lot indicators (these override CC detection)
  const hasStrongLotIndicator = matchesAny(text, STRONG_LOT_INDICATORS);

  // If it doesn't have strong lot indicators and has CC indicators, it's likely CC
  if (!hasStrongLotIndicator && matchesAny(titleOnly, NON_LOT_INDICATORS)) {
    const ccType = detectCCType(titleOnly);
    if (ccType) {
      return {
        mod,
        suggestedContentType: null,
        isReallyCC: true,
        suggestedCCType: ccType,
        reason: `Not a lot - appears to be ${ccType} CC`,
      };
    }
  }

  // Now categorize as a lot type - prioritize TITLE matches over description matches

  // Check for gym/fitness first (high priority) - TITLE ONLY
  if (/\bgym\b/i.test(titleOnly) || /\bfitness\s*(center|centre|club)\b/i.test(titleOnly) || /\bhealth\s*club\b/i.test(titleOnly)) {
    return {
      mod,
      suggestedContentType: 'gym',
      isReallyCC: false,
      suggestedCCType: null,
      reason: 'Fitness/gym venue (in title)',
    };
  }

  // Check for holiday themes (high priority) - TITLE ONLY
  if (/\bholiday\b/i.test(titleOnly) || /\bchristmas\b/i.test(titleOnly) || /\bhalloween\b/i.test(titleOnly) ||
      /\beaster\b/i.test(titleOnly) || /\bthanksgiving\b/i.test(titleOnly) || /\bfestive\b/i.test(titleOnly)) {
    return {
      mod,
      suggestedContentType: 'holidays',
      isReallyCC: false,
      suggestedCCType: null,
      reason: 'Holiday-themed lot (in title)',
    };
  }

  // Check commercial (restaurants, shops, etc.) - TITLE ONLY first
  if (matchesAny(titleOnly, COMMERCIAL_TITLE_PATTERNS)) {
    const match = findMatch(titleOnly, COMMERCIAL_TITLE_PATTERNS);
    return {
      mod,
      suggestedContentType: 'commercial',
      isReallyCC: false,
      suggestedCCType: null,
      reason: `Commercial venue: title matched "${match?.source}"`,
    };
  }

  // Check entertainment (clubs, theaters, etc.) - TITLE ONLY first
  if (matchesAny(titleOnly, ENTERTAINMENT_TITLE_PATTERNS)) {
    const match = findMatch(titleOnly, ENTERTAINMENT_TITLE_PATTERNS);
    return {
      mod,
      suggestedContentType: 'entertainment',
      isReallyCC: false,
      suggestedCCType: null,
      reason: `Entertainment venue: title matched "${match?.source}"`,
    };
  }

  // Check community (parks, schools, etc.) - TITLE ONLY first
  if (matchesAny(titleOnly, COMMUNITY_TITLE_PATTERNS)) {
    const match = findMatch(titleOnly, COMMUNITY_TITLE_PATTERNS);
    return {
      mod,
      suggestedContentType: 'community',
      isReallyCC: false,
      suggestedCCType: null,
      reason: `Community lot: title matched "${match?.source}"`,
    };
  }

  // Check residential (houses, apartments, etc.) - TITLE ONLY first
  if (matchesAny(titleOnly, RESIDENTIAL_TITLE_PATTERNS)) {
    const match = findMatch(titleOnly, RESIDENTIAL_TITLE_PATTERNS);
    return {
      mod,
      suggestedContentType: 'residential',
      isReallyCC: false,
      suggestedCCType: null,
      reason: `Residential lot: title matched "${match?.source}"`,
    };
  }

  // Secondary check: weak patterns that might indicate lot type
  // Only use these for things that look like lot names

  // Check if it looks like a proper lot name (starts with capital, multiple words)
  const looksLikeLotName = /^[A-Z]/.test(titleOnly) && titleOnly.split(' ').length >= 2 && !matchesAny(titleOnly, NON_LOT_INDICATORS);

  if (looksLikeLotName) {
    // For lot-like names, check weak patterns in the DESCRIPTION only
    // (title would have matched strong patterns above)

    // Check weak commercial patterns
    if (matchesAny(titleOnly, WEAK_COMMERCIAL_PATTERNS)) {
      const match = findMatch(titleOnly, WEAK_COMMERCIAL_PATTERNS);
      return {
        mod,
        suggestedContentType: 'commercial',
        isReallyCC: false,
        suggestedCCType: null,
        reason: `Likely commercial: weak pattern "${match?.source}" in title`,
      };
    }

    // Check weak entertainment patterns
    if (matchesAny(titleOnly, WEAK_ENTERTAINMENT_PATTERNS)) {
      const match = findMatch(titleOnly, WEAK_ENTERTAINMENT_PATTERNS);
      return {
        mod,
        suggestedContentType: 'entertainment',
        isReallyCC: false,
        suggestedCCType: null,
        reason: `Likely entertainment: weak pattern "${match?.source}" in title`,
      };
    }

    // Default named lots to residential (most common lot type)
    return {
      mod,
      suggestedContentType: 'residential',
      isReallyCC: false,
      suggestedCCType: null,
      reason: 'Named lot defaulting to residential',
    };
  }

  // For mods without clear categorization - check if they have "lot" or "build" in them
  if (/\blot\b/i.test(titleOnly) || /\bbuild\b/i.test(titleOnly)) {
    return {
      mod,
      suggestedContentType: 'residential',
      isReallyCC: false,
      suggestedCCType: null,
      reason: 'Has "lot" or "build" keyword, defaulting to residential',
    };
  }

  // Final fallback: if nothing else, assume residential (safest default for lots)
  return {
    mod,
    suggestedContentType: 'residential',
    isReallyCC: false,
    suggestedCCType: null,
    reason: 'Fallback: no clear category, defaulting to residential',
  };
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function createFacetDefinitions(): Promise<void> {
  console.log('\n--- Creating/Verifying Facet Definitions ---\n');

  for (const def of newLotFacets) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create/verify: ${def.facetType}/${def.value} -> "${def.displayName}"`);
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

async function deactivateLotFacet(): Promise<void> {
  console.log('\n--- Deactivating "lot" FacetDefinition ---\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would set isActive=false for lot FacetDefinition');
  } else {
    try {
      await prisma.facetDefinition.update({
        where: {
          facetType_value: {
            facetType: 'contentType',
            value: 'lot',
          },
        },
        data: {
          isActive: false,
        },
      });
      console.log('[DONE] Set isActive=false for lot FacetDefinition');
    } catch (error) {
      console.log('[NOTE] lot FacetDefinition not found or already deactivated');
    }
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Task #5: Fix Lot Mods - Split into Specific Categories');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (use --fix to apply)' : 'APPLYING CHANGES'}`);
  console.log('='.repeat(70));

  // Step 1: Create new facet definitions
  await createFacetDefinitions();

  // Step 2: Get all mods with contentType='lot'
  console.log('\n--- Finding mods with contentType="lot" ---\n');
  const lotMods = await prisma.mod.findMany({
    where: { contentType: 'lot' },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      tags: true,
    },
  });

  console.log(`Found ${lotMods.length} mods with contentType='lot'\n`);

  if (lotMods.length === 0) {
    console.log('No lot mods found. Nothing to do.');
    await deactivateLotFacet();
    await prisma.$disconnect();
    return;
  }

  // Step 3: Categorize each mod
  const results: CategorizationResult[] = [];
  for (const mod of lotMods) {
    const result = categorizeLotMod(mod);
    results.push(result);
  }

  // Step 4: Group by categorization for reporting
  const ccMods = results.filter((r) => r.isReallyCC);
  const residentialMods = results.filter((r) => r.suggestedContentType === 'residential');
  const commercialMods = results.filter((r) => r.suggestedContentType === 'commercial');
  const entertainmentMods = results.filter((r) => r.suggestedContentType === 'entertainment');
  const communityMods = results.filter((r) => r.suggestedContentType === 'community');
  const gymMods = results.filter((r) => r.suggestedContentType === 'gym');
  const holidayMods = results.filter((r) => r.suggestedContentType === 'holidays');

  console.log('--- Categorization Summary ---');
  console.log(`  Residential lots: ${residentialMods.length}`);
  console.log(`  Commercial lots: ${commercialMods.length}`);
  console.log(`  Entertainment lots: ${entertainmentMods.length}`);
  console.log(`  Community lots: ${communityMods.length}`);
  console.log(`  Gym lots: ${gymMods.length}`);
  console.log(`  Holiday lots: ${holidayMods.length}`);
  console.log(`  Actually CC (not lots): ${ccMods.length}\n`);

  // Group CC mods by suggested type
  const ccByType = new Map<string, CategorizationResult[]>();
  for (const result of ccMods) {
    const type = result.suggestedCCType || 'unknown';
    if (!ccByType.has(type)) {
      ccByType.set(type, []);
    }
    ccByType.get(type)!.push(result);
  }

  if (ccMods.length > 0) {
    console.log('--- CC Items Breakdown ---');
    ccByType.forEach((mods, type) => {
      console.log(`  ${type}: ${mods.length}`);
    });
    console.log('');
  }

  // Step 5: Show samples
  const showSamples = (title: string, items: CategorizationResult[], limit = 10) => {
    if (items.length === 0) return;
    console.log(`\n--- ${title} (first ${Math.min(limit, items.length)}) ---`);
    for (const result of items.slice(0, limit)) {
      const titleTrunc = result.mod.title.length > 55
        ? result.mod.title.substring(0, 55) + '...'
        : result.mod.title;
      console.log(`  "${titleTrunc}"`);
      console.log(`    -> ${result.suggestedContentType || result.suggestedCCType} (${result.reason})`);
    }
    if (items.length > limit) {
      console.log(`  ... and ${items.length - limit} more`);
    }
  };

  showSamples('Sample Residential Lots', residentialMods, 15);
  showSamples('Sample Commercial Lots', commercialMods, 10);
  showSamples('Sample Entertainment Lots', entertainmentMods, 10);
  showSamples('Sample Community Lots', communityMods, 10);
  showSamples('Sample Gym Lots', gymMods, 5);
  showSamples('Sample Holiday Lots', holidayMods, 5);
  showSamples('Sample CC Items (Not Lots)', ccMods, 15);

  // Step 6: Apply changes if not dry run
  if (!DRY_RUN) {
    console.log('\n' + '='.repeat(70));
    console.log('APPLYING CHANGES');
    console.log('='.repeat(70) + '\n');

    let updatedCount = 0;

    // Update lot mods with new categories
    for (const result of results.filter((r) => !r.isReallyCC && r.suggestedContentType)) {
      await prisma.mod.update({
        where: { id: result.mod.id },
        data: { contentType: result.suggestedContentType! },
      });
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} lot mods with specific categories`);

    // Update CC mods that were incorrectly labeled as 'lot'
    let ccUpdatedCount = 0;
    for (const result of ccMods.filter((r) => r.suggestedCCType)) {
      await prisma.mod.update({
        where: { id: result.mod.id },
        data: { contentType: result.suggestedCCType! },
      });
      ccUpdatedCount++;
    }

    console.log(`Updated ${ccUpdatedCount} CC items with correct content types`);

    // Deactivate the 'lot' facet
    await deactivateLotFacet();
  }

  // Step 7: Verification (always show, even in dry run)
  console.log('\n--- Final Statistics ---');

  if (!DRY_RUN) {
    // Get actual counts from database
    const counts = await Promise.all([
      prisma.mod.count({ where: { contentType: 'lot' } }),
      prisma.mod.count({ where: { contentType: 'residential' } }),
      prisma.mod.count({ where: { contentType: 'commercial' } }),
      prisma.mod.count({ where: { contentType: 'entertainment' } }),
      prisma.mod.count({ where: { contentType: 'community' } }),
      prisma.mod.count({ where: { contentType: 'gym' } }),
      prisma.mod.count({ where: { contentType: 'holidays' } }),
    ]);

    console.log(`  Mods still with contentType='lot': ${counts[0]} (should be 0)`);
    console.log(`  Mods with contentType='residential': ${counts[1]}`);
    console.log(`  Mods with contentType='commercial': ${counts[2]}`);
    console.log(`  Mods with contentType='entertainment': ${counts[3]}`);
    console.log(`  Mods with contentType='community': ${counts[4]}`);
    console.log(`  Mods with contentType='gym': ${counts[5]}`);
    console.log(`  Mods with contentType='holidays': ${counts[6]}`);

    // Check lot facet status
    const lotFacet = await prisma.facetDefinition.findUnique({
      where: {
        facetType_value: {
          facetType: 'contentType',
          value: 'lot',
        },
      },
    });
    console.log(`  'lot' FacetDefinition isActive: ${lotFacet?.isActive ?? 'not found'}`);

    if (counts[0] === 0 && lotFacet?.isActive === false) {
      console.log('\n  ✓ Verification PASSED');
    } else {
      console.log('\n  ✗ Verification FAILED');
      if (counts[0] > 0) console.log(`    - ${counts[0]} mods still have contentType='lot'`);
      if (lotFacet?.isActive !== false) console.log(`    - 'lot' facet is still active`);
    }
  } else {
    console.log('[DRY RUN] Would result in:');
    console.log(`  - ${residentialMods.length} residential lots`);
    console.log(`  - ${commercialMods.length} commercial lots`);
    console.log(`  - ${entertainmentMods.length} entertainment lots`);
    console.log(`  - ${communityMods.length} community lots`);
    console.log(`  - ${gymMods.length} gym lots`);
    console.log(`  - ${holidayMods.length} holiday lots`);
    console.log(`  - ${ccMods.length} CC items recategorized`);
    console.log(`  - 'lot' FacetDefinition deactivated`);
  }

  console.log('\n' + '='.repeat(70));
  if (DRY_RUN) {
    console.log('DRY RUN COMPLETE');
    console.log('To apply these changes, run with --fix flag:');
    console.log('  npx tsx scripts/ralph/fix-lot-mods.ts --fix');
  } else {
    console.log('CHANGES APPLIED SUCCESSFULLY');
  }
  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
