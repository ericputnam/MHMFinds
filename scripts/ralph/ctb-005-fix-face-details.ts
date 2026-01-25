#!/usr/bin/env npx tsx
/**
 * CTB-005: Fix Face Details Miscategorization Script
 *
 * Identifies and fixes mods with face-related keywords in their titles
 * that are incorrectly categorized (e.g., eyebrow mods not in 'eyebrows').
 *
 * Acceptance Criteria:
 * 1. Find all mods with 'eyebrow' in title not categorized as 'eyebrows'
 * 2. Find all mods with 'lash' or 'eyelash' in title not categorized as 'lashes'
 * 3. Find all mods with 'eyeliner' in title not categorized as 'eyeliner' or 'makeup'
 * 4. Find all mods with 'lipstick' or 'lip' in title not categorized as 'lipstick' or 'makeup'
 * 5. Find all mods with 'blush' in title not categorized as 'blush' or 'makeup'
 * 6. Find all mods with 'beard' or 'mustache' or 'facial hair' in title
 * 7. Dry run first logging all changes
 * 8. Apply fixes with --fix flag
 * 9. Log all changes made
 * 10. npm run type-check passes
 *
 * Usage:
 *   npx tsx scripts/ralph/ctb-005-fix-face-details.ts          # Dry run
 *   npx tsx scripts/ralph/ctb-005-fix-face-details.ts --fix    # Apply fixes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Face detail categories and their detection rules
interface FaceDetailRule {
  name: string;
  keywords: string[];
  negativeKeywords?: string[];    // Keywords that indicate this is NOT a face detail mod
  correctContentTypes: string[];  // Any of these is considered correct
  targetContentType: string;      // What to change to if incorrect
}

const FACE_DETAIL_RULES: FaceDetailRule[] = [
  {
    name: 'Eyebrows',
    keywords: ['eyebrow', 'eyebrows', 'brow ', 'brows'],  // Space after 'brow' to avoid 'brown'
    correctContentTypes: ['eyebrows'],
    targetContentType: 'eyebrows',
  },
  {
    name: 'Lashes/Eyelashes',
    keywords: ['eyelash', 'eyelashes', ' lash', ' lashes', '3d lash', '3d lashes', 'mink lash'],
    // Use space before 'lash' to avoid: splash, backsplash, slasher, whiplash, clash
    negativeKeywords: ['splash', 'slasher', 'whiplash', 'clash', 'backsplash', 'eyelash'],  // eyelash matched above
    correctContentTypes: ['lashes'],
    targetContentType: 'lashes',
  },
  {
    name: 'Eyeliner',
    keywords: ['eyeliner', 'eye liner'],
    correctContentTypes: ['eyeliner', 'makeup'],
    targetContentType: 'eyeliner',
  },
  {
    name: 'Lipstick/Lips',
    keywords: ['lipstick', 'lip stick', 'lip gloss', 'lipgloss', 'lip color', 'lip colour'],
    correctContentTypes: ['lipstick', 'makeup'],
    targetContentType: 'lipstick',
  },
  {
    name: 'Blush',
    keywords: ['blush', 'blusher', 'cheek color'],
    correctContentTypes: ['blush', 'makeup'],
    targetContentType: 'blush',
  },
  {
    name: 'Beard',
    keywords: ['beard', 'beards', 'goatee', 'stubble'],
    correctContentTypes: ['beard', 'facial-hair'],
    targetContentType: 'beard',
  },
  {
    name: 'Mustache/Facial Hair',
    keywords: ['mustache', 'moustache', 'facial hair', 'facial-hair', 'sideburns'],
    correctContentTypes: ['facial-hair', 'beard'],
    targetContentType: 'facial-hair',
  },
];

interface MiscategorizedMod {
  id: string;
  title: string;
  currentContentType: string | null;
  suggestedContentType: string;
  matchedKeyword: string;
  category: string;
}

async function findMiscategorizedMods(): Promise<Map<string, MiscategorizedMod[]>> {
  const results = new Map<string, MiscategorizedMod[]>();

  for (const rule of FACE_DETAIL_RULES) {
    const miscategorized: MiscategorizedMod[] = [];

    // Build OR conditions for all keywords
    const keywordConditions = rule.keywords.map(keyword => ({
      title: {
        contains: keyword,
        mode: 'insensitive' as const,
      },
    }));

    // Find mods with these keywords that are NOT in the correct content types
    const mods = await prisma.mod.findMany({
      where: {
        OR: keywordConditions,
        NOT: {
          contentType: {
            in: rule.correctContentTypes,
          },
        },
      },
      select: {
        id: true,
        title: true,
        contentType: true,
      },
      orderBy: { title: 'asc' },
    });

    // Determine which keyword matched for each mod (with negative keyword filtering)
    for (const mod of mods) {
      const titleLower = mod.title.toLowerCase();

      // Check for negative keywords first
      if (rule.negativeKeywords) {
        let hasNegative = false;
        for (const negKeyword of rule.negativeKeywords) {
          if (titleLower.includes(negKeyword.toLowerCase())) {
            hasNegative = true;
            break;
          }
        }
        if (hasNegative) {
          continue;  // Skip this mod - it's a false positive
        }
      }

      let matchedKeyword = '';
      for (const keyword of rule.keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          matchedKeyword = keyword;
          break;
        }
      }

      miscategorized.push({
        id: mod.id,
        title: mod.title,
        currentContentType: mod.contentType,
        suggestedContentType: rule.targetContentType,
        matchedKeyword,
        category: rule.name,
      });
    }

    if (miscategorized.length > 0) {
      results.set(rule.name, miscategorized);
    }
  }

  return results;
}

async function applyFixes(miscategorizedByCategory: Map<string, MiscategorizedMod[]>): Promise<number> {
  let totalFixed = 0;

  const entries = Array.from(miscategorizedByCategory.entries());
  for (const [category, mods] of entries) {
    console.log(`\nApplying fixes for ${category}...`);

    for (const mod of mods) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { contentType: mod.suggestedContentType },
      });
      totalFixed++;

      console.log(`  [FIXED] "${mod.title.substring(0, 50)}${mod.title.length > 50 ? '...' : ''}"`);
      console.log(`          ${mod.currentContentType || '(NULL)'} -> ${mod.suggestedContentType}`);
    }
  }

  return totalFixed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('=' .repeat(80));
  console.log('CTB-005: Fix Face Details Miscategorization');
  console.log('=' .repeat(80));
  console.log(`Mode: ${shouldFix ? 'FIX (applying changes)' : 'DRY RUN (no changes will be made)'}`);
  console.log('');

  // Find all miscategorized mods
  console.log('Scanning for miscategorized face detail mods...\n');
  const miscategorizedByCategory = await findMiscategorizedMods();

  // Calculate totals
  let totalMiscategorized = 0;
  const allModsArrays = Array.from(miscategorizedByCategory.values());
  for (const mods of allModsArrays) {
    totalMiscategorized += mods.length;
  }

  if (totalMiscategorized === 0) {
    console.log('No miscategorized face detail mods found.');
    console.log('All mods with face detail keywords are correctly categorized.');
    await prisma.$disconnect();
    return;
  }

  // Display findings
  console.log(`Found ${totalMiscategorized} miscategorized mods across ${miscategorizedByCategory.size} categories:\n`);

  const categoryEntries = Array.from(miscategorizedByCategory.entries());
  for (const [category, mods] of categoryEntries) {
    console.log('-'.repeat(80));
    console.log(`${category}: ${mods.length} mods need recategorization`);
    console.log('-'.repeat(80));

    // Group by current content type for better reporting
    const byCurrentType = new Map<string, MiscategorizedMod[]>();
    for (const mod of mods) {
      const key = mod.currentContentType || '(NULL)';
      if (!byCurrentType.has(key)) {
        byCurrentType.set(key, []);
      }
      byCurrentType.get(key)!.push(mod);
    }

    const typeEntries = Array.from(byCurrentType.entries());
    for (const [currentType, modsInType] of typeEntries) {
      console.log(`\n  Currently "${currentType}" -> should be "${mods[0].suggestedContentType}":`);

      // Show up to 10 examples per type
      const examples = modsInType.slice(0, 10);
      for (const mod of examples) {
        console.log(`    - "${mod.title.substring(0, 60)}${mod.title.length > 60 ? '...' : ''}" (matched: ${mod.matchedKeyword})`);
      }

      if (modsInType.length > 10) {
        console.log(`    ... and ${modsInType.length - 10} more`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));
  console.log('');
  console.log('Changes to be made:');
  const summaryEntries = Array.from(miscategorizedByCategory.entries());
  for (const [category, mods] of summaryEntries) {
    const target = mods[0].suggestedContentType;
    console.log(`  ${category}: ${mods.length} mods -> "${target}"`);
  }
  console.log(`\nTotal: ${totalMiscategorized} mods to update`);
  console.log('');

  // Apply fixes if --fix flag is set
  if (shouldFix) {
    console.log('=' .repeat(80));
    console.log('APPLYING FIXES');
    console.log('=' .repeat(80));

    const totalFixed = await applyFixes(miscategorizedByCategory);

    console.log('\n' + '=' .repeat(80));
    console.log('COMPLETE');
    console.log('=' .repeat(80));
    console.log(`Successfully updated ${totalFixed} mods.`);
  } else {
    console.log('=' .repeat(80));
    console.log('DRY RUN COMPLETE');
    console.log('=' .repeat(80));
    console.log('');
    console.log('To apply these changes, run:');
    console.log('  npx tsx scripts/ralph/ctb-005-fix-face-details.ts --fix');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
