#!/usr/bin/env npx tsx
/**
 * CTB-008: Validate accessory vs furniture categorization
 *
 * Many furniture items are miscategorized as accessories - this script fixes them.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-008-fix-accessories.ts
 * 2. Find mods categorized as 'accessories' with furniture keywords: sink, toilet, shower, tub, sofa, couch, table, chair, desk, bed, shelf, cabinet
 * 3. Recategorize as appropriate furniture/decor type
 * 4. Find actual accessories miscategorized: bags, scarves, belts, watches, purses
 * 5. Ensure jewelry stays as jewelry not accessories
 * 6. Dry run first, apply with --fix flag
 * 7. npm run type-check passes
 *
 * Usage:
 *   npx tsx scripts/ralph/ctb-008-fix-accessories.ts          # Dry run
 *   npx tsx scripts/ralph/ctb-008-fix-accessories.ts --fix    # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectContentTypeWithConfidence,
  DetectionResult,
} from '../../lib/services/contentTypeDetector';

const prisma = new PrismaClient();

// ============================================
// CONFIGURATION
// ============================================

// Furniture keywords that should NOT be in 'accessories' category
// These must appear as standalone words (with word boundaries)
const FURNITURE_KEYWORDS = [
  'sink', 'kitchen sink', 'bathroom sink',
  'toilet', 'toilets',
  'shower', 'showers', 'shower set',
  'tub', 'bathtub', 'bath tub',
  'sofa', 'sofas', 'sofa set',
  'couch', 'couches',
  'dining table', 'coffee table', 'end table', 'side table', 'console table',
  'chair', 'chairs', 'dining chair', 'office chair', 'armchair',
  'desk', 'desks', 'computer desk', 'office desk',
  'bed frame', 'double bed', 'single bed', 'bunk bed', 'toddler bed',
  'shelf', 'shelves', 'bookshelf', 'wall shelf',
  'cabinet', 'cabinets', 'kitchen cabinet',
  'dresser', 'dressers',
  'wardrobe', 'wardrobes',
  'nightstand', 'nightstands', 'bedside table',
  'fireplace', 'fireplaces',
  'bench', 'benches',
  'stool', 'stools', 'bar stool',
  'ottoman', 'ottomans',
  'tv stand', 'entertainment center',
  'sideboard', 'buffet',
];

// Decor keywords that might be miscategorized as accessories
const DECOR_KEYWORDS = [
  'lamp', 'lamps', 'table lamp', 'floor lamp', 'desk lamp',
  'chandelier', 'chandeliers',
  'ceiling light', 'wall light', 'pendant light',
  'plant', 'plants', 'potted plant', 'houseplant',
  'rug', 'rugs', 'area rug', 'floor rug',
  'curtain', 'curtains', 'drapes',
  'painting', 'paintings', 'wall painting',
  'poster', 'posters', 'wall poster',
  'wall art', 'wall decor',
  'pillow', 'pillows', 'throw pillow', 'cushion', 'cushions',
  'vase', 'vases', 'decorative vase',
  'candle', 'candles', 'candle holder',
  'mirror', 'mirrors', 'wall mirror',
  'clock', 'clocks', 'wall clock',
  'sculpture', 'figurine', 'figurines',
];

// True accessory keywords - these SHOULD be 'accessories'
const TRUE_ACCESSORY_KEYWORDS = [
  'handbag', 'handbags', 'purse', 'purses', 'tote bag', 'clutch bag',
  'backpack', 'backpacks', 'messenger bag', 'shoulder bag', 'crossbody bag',
  'scarf', 'scarves', 'winter scarf', 'silk scarf',
  'belt', 'belts', 'leather belt',
  'watch', 'watches', 'wristwatch',
  'glove', 'gloves', 'winter gloves',
  'socks', 'ankle socks', 'knee socks',
  'tights', 'stockings', 'pantyhose',
  'suspenders',
  'necktie', 'bow tie', 'bowtie', 'cufflinks',
  'fanny pack', 'bum bag', 'waist bag',
];

// Jewelry keywords - should stay as 'jewelry', not 'accessories'
const JEWELRY_KEYWORDS = [
  'necklace', 'necklaces', 'chain necklace', 'pendant necklace',
  'earring', 'earrings', 'hoop earrings', 'stud earrings', 'drop earrings',
  'bracelet', 'bracelets', 'charm bracelet', 'bangle',
  'ring', 'rings', 'wedding ring', 'engagement ring', 'finger ring',
  'piercing', 'piercings', 'nose piercing', 'ear piercing', 'septum',
  'choker', 'chokers',
  'pendant', 'pendants',
  'anklet', 'anklets',
  'brooch', 'brooches',
  'jewelry', 'jewellery', 'jewelry set',
];

// Words that indicate the item is NOT furniture (even if furniture keywords appear)
// These are typically lot/house/CC pack names or CAS items
const FURNITURE_NEGATIVE_KEYWORDS = [
  'lot', 'house', 'home', 'residence', 'villa', 'mansion', 'cabin', 'cottage',
  'apartment', 'build', 'residential', 'cc pack', 'collection', 'set of',
  'braids', 'braid', 'hair', 'hairstyle', 'wig', 'ponytail',
  'outfit', 'clothing', 'clothes', 'dress', 'top', 'pants', 'jeans',
  'nails', 'makeup', 'skin', 'eyes', 'lipstick', 'eyeshadow',
  'vampire', 'fangs', 'teeth', // CAS items
  'belt', 'scarf', 'bag', 'gloves', // True accessories shouldn't become furniture
];

// Words that indicate the item should NOT be reclassified as accessories
// (even if accessory keywords appear in the title/description)
// These are outfits/clothing that INCLUDE accessories as part of the set
const ACCESSORY_NEGATIVE_KEYWORDS = [
  'outfit', 'suit', 'set', 'costume', 'bodysuit', 'jumpsuit', 'playsuit',
  'onesie', 'romper', 'dress', 'gown', 'kimono', 'uniform',
  'living room', 'furniture', 'decor', // Shouldn't change furniture to accessories
  'pose pack', 'posepack', 'poses', // Pose packs shouldn't become accessories
  'deco', 'decoration', // Decorative items
];

// Words that indicate the item should NOT be reclassified as jewelry
// (even if jewelry keywords appear in the title/description)
const JEWELRY_NEGATIVE_KEYWORDS = [
  'nails', 'nail', 'manicure', // Nail items that might mention rings
  'eyes', 'eye color', 'contacts', // Eye items
  'outfit', 'suit', 'set', 'costume', // Outfits that might include jewelry
  'tattoo', 'tattoos', // Tattoo items
  'pose pack', 'posepack', 'poses', // Pose packs
  'tee', 'shirt', 'top', 'dress', // Clothing items
  'sport', 'athletic', // Sports items
];

// ============================================
// TYPES
// ============================================

interface ModToProcess {
  id: string;
  title: string;
  description: string | null;
  contentType: string | null;
}

interface FixResult {
  mod: ModToProcess;
  oldContentType: string | null;
  newContentType: string;
  matchedKeywords: string[];
  category: 'furniture-in-accessories' | 'decor-in-accessories' | 'accessories-elsewhere' | 'jewelry-in-accessories';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if text contains a keyword as a standalone word (with word boundaries)
 * This prevents "bed" from matching in "Mahbed" or "embedded"
 */
function containsKeywordAsWord(text: string, keywords: string[]): string[] {
  const textLower = text.toLowerCase();
  return keywords.filter(kw => {
    const kwLower = kw.toLowerCase();
    // Create a regex that matches the keyword as a complete word
    // \b is word boundary
    const regex = new RegExp(`\\b${escapeRegex(kwLower)}\\b`, 'i');
    return regex.test(textLower);
  });
}

/**
 * Simple keyword contains check (used for negative keywords)
 */
function containsKeyword(text: string, keywords: string[]): string[] {
  const textLower = text.toLowerCase();
  return keywords.filter(kw => textLower.includes(kw.toLowerCase()));
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if title indicates this is likely a lot/house/CC pack
 */
function isLikelyLotOrPack(title: string, description: string | null): boolean {
  const combined = `${title} ${description || ''}`.toLowerCase();
  const negativeMatches = containsKeyword(combined, FURNITURE_NEGATIVE_KEYWORDS);
  return negativeMatches.length > 0;
}

function determineFurnitureSubtype(title: string, description: string | null): string {
  const combined = `${title} ${description || ''}`.toLowerCase();

  // Check for specific furniture subtypes
  if (combined.includes('lamp') || combined.includes('light') || combined.includes('chandelier')) {
    return 'lighting';
  }
  if (combined.includes('plant') || combined.includes('succulent') || combined.includes('flower')) {
    return 'plants';
  }
  if (combined.includes('rug') || combined.includes('carpet')) {
    return 'rugs';
  }
  if (combined.includes('curtain') || combined.includes('drape') || combined.includes('blinds')) {
    return 'curtains';
  }
  if (combined.includes('painting') || combined.includes('poster') || combined.includes('wall art') || combined.includes('canvas')) {
    return 'wall-art';
  }
  if (combined.includes('pillow') || combined.includes('cushion') || combined.includes('vase') ||
      combined.includes('candle') || combined.includes('figurine') || combined.includes('clutter')) {
    return 'clutter';
  }
  if (combined.includes('decor') || combined.includes('decoration') || combined.includes('ornament')) {
    return 'decor';
  }

  // Default to furniture for actual furniture items
  return 'furniture';
}

// ============================================
// MAIN FUNCTION
// ============================================

async function fixAccessoryCategorization(): Promise<void> {
  const isDryRun = !process.argv.includes('--fix');
  const timestamp = new Date().toISOString();

  console.log('='.repeat(80));
  console.log('CTB-008: Validate accessory vs furniture categorization');
  console.log('='.repeat(80));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (use --fix to apply changes)' : 'APPLYING CHANGES'}`);
  console.log(`Started: ${timestamp}`);
  console.log('');

  const allFixes: FixResult[] = [];

  // ============================================
  // STEP 1: Find furniture items miscategorized as accessories
  // ============================================
  console.log('Step 1: Finding furniture items miscategorized as accessories...');

  const accessoriesMods = await prisma.mod.findMany({
    where: { contentType: 'accessories' },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
    },
  });

  console.log(`Found ${accessoriesMods.length} mods currently categorized as 'accessories'`);

  const furnitureInAccessories: FixResult[] = [];
  const decorInAccessories: FixResult[] = [];
  const jewelryInAccessories: FixResult[] = [];

  for (const mod of accessoriesMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`;

    // Check for jewelry - should be 'jewelry' not 'accessories'
    // Use word boundary matching for jewelry
    const jewelryMatches = containsKeywordAsWord(combinedText, JEWELRY_KEYWORDS);
    if (jewelryMatches.length > 0) {
      jewelryInAccessories.push({
        mod,
        oldContentType: mod.contentType,
        newContentType: 'jewelry',
        matchedKeywords: jewelryMatches,
        category: 'jewelry-in-accessories',
      });
      continue;
    }

    // Skip if this looks like a lot/house/CC pack - furniture keywords in those contexts
    // are describing what's IN the lot, not that the item IS furniture
    if (isLikelyLotOrPack(mod.title, mod.description)) {
      continue;
    }

    // Skip if the item has true accessory keywords - it's correctly categorized!
    // This prevents items like "Pearl Belt" from being changed to curtains
    const trueAccessoryMatches = containsKeywordAsWord(combinedText, TRUE_ACCESSORY_KEYWORDS);
    if (trueAccessoryMatches.length > 0) {
      continue;  // Already correctly categorized as accessories
    }

    // Check for furniture keywords (with word boundary matching)
    const furnitureMatches = containsKeywordAsWord(combinedText, FURNITURE_KEYWORDS);
    if (furnitureMatches.length > 0) {
      // Use the content type detector for better subtype determination
      const detection = detectContentTypeWithConfidence(mod.title, mod.description || undefined);
      const newType = detection.contentType && detection.confidence !== 'low'
        ? detection.contentType
        : determineFurnitureSubtype(mod.title, mod.description);

      furnitureInAccessories.push({
        mod,
        oldContentType: mod.contentType,
        newContentType: newType,
        matchedKeywords: furnitureMatches,
        category: 'furniture-in-accessories',
      });
      continue;
    }

    // Check for decor keywords (with word boundary matching)
    const decorMatches = containsKeywordAsWord(combinedText, DECOR_KEYWORDS);
    if (decorMatches.length > 0) {
      // Use the content type detector for better subtype determination
      const detection = detectContentTypeWithConfidence(mod.title, mod.description || undefined);
      const newType = detection.contentType && detection.confidence !== 'low'
        ? detection.contentType
        : determineFurnitureSubtype(mod.title, mod.description);

      decorInAccessories.push({
        mod,
        oldContentType: mod.contentType,
        newContentType: newType,
        matchedKeywords: decorMatches,
        category: 'decor-in-accessories',
      });
    }
  }

  console.log(`  - Found ${furnitureInAccessories.length} furniture items in accessories`);
  console.log(`  - Found ${decorInAccessories.length} decor items in accessories`);
  console.log(`  - Found ${jewelryInAccessories.length} jewelry items in accessories`);
  console.log('');

  allFixes.push(...furnitureInAccessories, ...decorInAccessories, ...jewelryInAccessories);

  // ============================================
  // STEP 2: Find true accessories miscategorized elsewhere
  // ============================================
  console.log('Step 2: Finding true accessories miscategorized elsewhere...');

  // Query mods that are NOT accessories but have accessory keywords
  const nonAccessoryMods = await prisma.mod.findMany({
    where: {
      contentType: {
        not: 'accessories',
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
    },
  });

  console.log(`Checking ${nonAccessoryMods.length} non-accessory mods for misplaced accessories...`);

  const accessoriesElsewhere: FixResult[] = [];
  const jewelryElsewhere: FixResult[] = [];

  for (const mod of nonAccessoryMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`;

    // Check if it has jewelry keywords - should be jewelry
    // Use word boundary matching
    const jewelryMatches = containsKeywordAsWord(combinedText, JEWELRY_KEYWORDS);
    if (jewelryMatches.length > 0) {
      // Skip if this looks like an item that just mentions jewelry
      const negativeMatches = containsKeyword(combinedText, JEWELRY_NEGATIVE_KEYWORDS);
      if (negativeMatches.length > 0) {
        continue;
      }

      // If currently something other than jewelry, should be jewelry
      if (mod.contentType !== 'jewelry') {
        // Use detector to confirm
        const detection = detectContentTypeWithConfidence(mod.title, mod.description || undefined);
        if (detection.contentType === 'jewelry' && detection.confidence !== 'low') {
          jewelryElsewhere.push({
            mod,
            oldContentType: mod.contentType,
            newContentType: 'jewelry',
            matchedKeywords: jewelryMatches,
            category: 'accessories-elsewhere',
          });
        }
      }
      continue;
    }

    // Check for true accessory keywords (with word boundary matching)
    const accessoryMatches = containsKeywordAsWord(combinedText, TRUE_ACCESSORY_KEYWORDS);
    if (accessoryMatches.length > 0) {
      // Skip if this looks like an outfit/set that includes accessories as part of it
      const negativeMatches = containsKeyword(combinedText, ACCESSORY_NEGATIVE_KEYWORDS);
      if (negativeMatches.length > 0) {
        continue;
      }

      // Verify with the detector
      const detection = detectContentTypeWithConfidence(mod.title, mod.description || undefined);

      // Only reclassify if detector also thinks it's accessories
      if (detection.contentType === 'accessories' && detection.confidence !== 'low') {
        accessoriesElsewhere.push({
          mod,
          oldContentType: mod.contentType,
          newContentType: 'accessories',
          matchedKeywords: accessoryMatches,
          category: 'accessories-elsewhere',
        });
      }
    }
  }

  console.log(`  - Found ${accessoriesElsewhere.length} accessories in other categories`);
  console.log(`  - Found ${jewelryElsewhere.length} jewelry items in other categories`);
  console.log('');

  allFixes.push(...accessoriesElsewhere, ...jewelryElsewhere);

  // ============================================
  // STEP 3: Display results
  // ============================================
  console.log('='.repeat(80));
  console.log('DETECTION RESULTS');
  console.log('='.repeat(80));
  console.log('');

  console.log('FURNITURE ITEMS MISCATEGORIZED AS ACCESSORIES:');
  console.log('-'.repeat(40));
  if (furnitureInAccessories.length === 0) {
    console.log('  (none found)');
  } else {
    for (const fix of furnitureInAccessories) {
      console.log(`  "${fix.mod.title}"`);
      console.log(`    accessories -> ${fix.newContentType}`);
      console.log(`    Matched: ${fix.matchedKeywords.join(', ')}`);
    }
  }
  console.log('');

  console.log('DECOR ITEMS MISCATEGORIZED AS ACCESSORIES:');
  console.log('-'.repeat(40));
  if (decorInAccessories.length === 0) {
    console.log('  (none found)');
  } else {
    for (const fix of decorInAccessories) {
      console.log(`  "${fix.mod.title}"`);
      console.log(`    accessories -> ${fix.newContentType}`);
      console.log(`    Matched: ${fix.matchedKeywords.join(', ')}`);
    }
  }
  console.log('');

  console.log('JEWELRY ITEMS MISCATEGORIZED AS ACCESSORIES:');
  console.log('-'.repeat(40));
  if (jewelryInAccessories.length === 0) {
    console.log('  (none found)');
  } else {
    for (const fix of jewelryInAccessories) {
      console.log(`  "${fix.mod.title}"`);
      console.log(`    accessories -> ${fix.newContentType}`);
      console.log(`    Matched: ${fix.matchedKeywords.join(', ')}`);
    }
  }
  console.log('');

  console.log('TRUE ACCESSORIES IN WRONG CATEGORIES:');
  console.log('-'.repeat(40));
  if (accessoriesElsewhere.length === 0) {
    console.log('  (none found)');
  } else {
    for (const fix of accessoriesElsewhere) {
      console.log(`  "${fix.mod.title}"`);
      console.log(`    ${fix.oldContentType || '(null)'} -> ${fix.newContentType}`);
      console.log(`    Matched: ${fix.matchedKeywords.join(', ')}`);
    }
  }
  console.log('');

  console.log('JEWELRY ITEMS IN WRONG CATEGORIES:');
  console.log('-'.repeat(40));
  if (jewelryElsewhere.length === 0) {
    console.log('  (none found)');
  } else {
    for (const fix of jewelryElsewhere) {
      console.log(`  "${fix.mod.title}"`);
      console.log(`    ${fix.oldContentType || '(null)'} -> ${fix.newContentType}`);
      console.log(`    Matched: ${fix.matchedKeywords.join(', ')}`);
    }
  }
  console.log('');

  // ============================================
  // STEP 4: Summary
  // ============================================
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total mods to fix: ${allFixes.length}`);
  console.log(`  - Furniture in accessories: ${furnitureInAccessories.length}`);
  console.log(`  - Decor in accessories: ${decorInAccessories.length}`);
  console.log(`  - Jewelry in accessories: ${jewelryInAccessories.length}`);
  console.log(`  - Accessories elsewhere: ${accessoriesElsewhere.length}`);
  console.log(`  - Jewelry elsewhere: ${jewelryElsewhere.length}`);
  console.log('');

  // Group by new content type for statistics
  const byNewType = new Map<string, number>();
  for (const fix of allFixes) {
    const count = byNewType.get(fix.newContentType) || 0;
    byNewType.set(fix.newContentType, count + 1);
  }

  console.log('Changes by target content type:');
  const sortedTypes = Array.from(byNewType.entries()).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');

  // ============================================
  // STEP 5: Apply fixes (if not dry run)
  // ============================================
  if (!isDryRun && allFixes.length > 0) {
    console.log('='.repeat(80));
    console.log('APPLYING FIXES');
    console.log('='.repeat(80));
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const fix of allFixes) {
      try {
        await prisma.mod.update({
          where: { id: fix.mod.id },
          data: { contentType: fix.newContentType },
        });
        successCount++;
        console.log(`[OK] "${fix.mod.title}": ${fix.oldContentType} -> ${fix.newContentType}`);
      } catch (error) {
        errorCount++;
        console.error(
          `[ERROR] Failed to update "${fix.mod.title}":`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('');
    console.log(`Updates complete: ${successCount} successful, ${errorCount} failed`);
  }

  // ============================================
  // STEP 6: Generate report file
  // ============================================
  const reportLines: string[] = [];

  reportLines.push('='.repeat(80));
  reportLines.push('CTB-008: Validate accessory vs furniture categorization - Report');
  reportLines.push('='.repeat(80));
  reportLines.push(`Generated: ${timestamp}`);
  reportLines.push(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLIED'}`);
  reportLines.push('');
  reportLines.push('SUMMARY');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Total mods to fix: ${allFixes.length}`);
  reportLines.push(`  - Furniture in accessories: ${furnitureInAccessories.length}`);
  reportLines.push(`  - Decor in accessories: ${decorInAccessories.length}`);
  reportLines.push(`  - Jewelry in accessories: ${jewelryInAccessories.length}`);
  reportLines.push(`  - Accessories elsewhere: ${accessoriesElsewhere.length}`);
  reportLines.push(`  - Jewelry elsewhere: ${jewelryElsewhere.length}`);
  reportLines.push('');

  reportLines.push('CHANGES BY TARGET CONTENT TYPE');
  reportLines.push('-'.repeat(40));
  for (const [type, count] of sortedTypes) {
    reportLines.push(`  ${type}: ${count}`);
  }
  reportLines.push('');

  reportLines.push('='.repeat(80));
  reportLines.push('DETAILED CHANGES');
  reportLines.push('='.repeat(80));
  reportLines.push('');

  if (furnitureInAccessories.length > 0) {
    reportLines.push('FURNITURE ITEMS MISCATEGORIZED AS ACCESSORIES:');
    reportLines.push('-'.repeat(40));
    for (const fix of furnitureInAccessories) {
      reportLines.push(`ID: ${fix.mod.id}`);
      reportLines.push(`Title: ${fix.mod.title}`);
      reportLines.push(`Change: accessories -> ${fix.newContentType}`);
      reportLines.push(`Keywords: ${fix.matchedKeywords.join(', ')}`);
      reportLines.push('');
    }
  }

  if (decorInAccessories.length > 0) {
    reportLines.push('DECOR ITEMS MISCATEGORIZED AS ACCESSORIES:');
    reportLines.push('-'.repeat(40));
    for (const fix of decorInAccessories) {
      reportLines.push(`ID: ${fix.mod.id}`);
      reportLines.push(`Title: ${fix.mod.title}`);
      reportLines.push(`Change: accessories -> ${fix.newContentType}`);
      reportLines.push(`Keywords: ${fix.matchedKeywords.join(', ')}`);
      reportLines.push('');
    }
  }

  if (jewelryInAccessories.length > 0) {
    reportLines.push('JEWELRY ITEMS MISCATEGORIZED AS ACCESSORIES:');
    reportLines.push('-'.repeat(40));
    for (const fix of jewelryInAccessories) {
      reportLines.push(`ID: ${fix.mod.id}`);
      reportLines.push(`Title: ${fix.mod.title}`);
      reportLines.push(`Change: accessories -> ${fix.newContentType}`);
      reportLines.push(`Keywords: ${fix.matchedKeywords.join(', ')}`);
      reportLines.push('');
    }
  }

  if (accessoriesElsewhere.length > 0) {
    reportLines.push('TRUE ACCESSORIES IN WRONG CATEGORIES:');
    reportLines.push('-'.repeat(40));
    for (const fix of accessoriesElsewhere) {
      reportLines.push(`ID: ${fix.mod.id}`);
      reportLines.push(`Title: ${fix.mod.title}`);
      reportLines.push(`Change: ${fix.oldContentType || '(null)'} -> ${fix.newContentType}`);
      reportLines.push(`Keywords: ${fix.matchedKeywords.join(', ')}`);
      reportLines.push('');
    }
  }

  if (jewelryElsewhere.length > 0) {
    reportLines.push('JEWELRY ITEMS IN WRONG CATEGORIES:');
    reportLines.push('-'.repeat(40));
    for (const fix of jewelryElsewhere) {
      reportLines.push(`ID: ${fix.mod.id}`);
      reportLines.push(`Title: ${fix.mod.title}`);
      reportLines.push(`Change: ${fix.oldContentType || '(null)'} -> ${fix.newContentType}`);
      reportLines.push(`Keywords: ${fix.matchedKeywords.join(', ')}`);
      reportLines.push('');
    }
  }

  reportLines.push('='.repeat(80));
  reportLines.push('END OF REPORT');
  reportLines.push('='.repeat(80));

  // Write report to file
  const reportPath = path.join(__dirname, 'ctb-008-accessories-report.txt');
  fs.writeFileSync(reportPath, reportLines.join('\n'));

  console.log('');
  console.log('='.repeat(80));
  console.log('CTB-008 COMPLETE');
  console.log('='.repeat(80));
  console.log(`Report saved to: ${reportPath}`);
  console.log('');

  if (isDryRun && allFixes.length > 0) {
    console.log(`To apply ${allFixes.length} fixes, run:`);
    console.log('  npx tsx scripts/ralph/ctb-008-fix-accessories.ts --fix');
    console.log('');
  }

  await prisma.$disconnect();
}

fixAccessoryCategorization().catch(async (e) => {
  console.error('CTB-008 failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
