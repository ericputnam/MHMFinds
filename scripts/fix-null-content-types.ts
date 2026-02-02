#!/usr/bin/env npx tsx
/**
 * Fix mods with null contentType using intelligent content detection
 *
 * This script uses the contentTypeDetector library to analyze mod titles
 * and descriptions, applying content types only when confidence is sufficient.
 *
 * Usage:
 *   npx tsx scripts/fix-null-content-types.ts              # Dry run (preview)
 *   npx tsx scripts/fix-null-content-types.ts --apply      # Apply fixes
 *   npx tsx scripts/fix-null-content-types.ts --apply --verbose  # With details
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import {
  detectContentTypeWithConfidence,
  detectRoomThemes,
  ConfidenceLevel,
} from '../lib/services/contentTypeDetector';

interface FixResult {
  id: string;
  title: string;
  contentType: string;
  confidence: ConfidenceLevel;
  themes: string[];
  matchedKeywords: string[];
  reasoning?: string;
}

interface UnfixedMod {
  id: string;
  title: string;
  category: string | null;
  source: string | null;
  reasoning?: string;
}

interface InferenceResult {
  contentType: string;
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
  reasoning: string;
}

/**
 * Additional inference for mods the main detector couldn't classify.
 * Uses category, tags, and additional title patterns.
 */
function inferFromContextClues(
  title: string,
  category: string | null,
  tags: string[]
): InferenceResult | null {
  const titleLower = title.toLowerCase();
  const categoryLower = (category || '').toLowerCase();
  const tagsLower = tags.map(t => t.toLowerCase());

  // Pattern-based inference with medium confidence
  const patterns: { test: () => boolean; contentType: string; keywords: string[] }[] = [
    // Lipstick/Lips patterns (before generic makeup)
    {
      test: () => /\b(lippi|lippy|lips|gloss|lippiez)\b/i.test(title),
      contentType: 'lipstick',
      keywords: ['lipstick', 'lips', 'gloss'],
    },
    // Shoe store/Shoes in title
    {
      test: () => /\bshoe\b/i.test(title),
      contentType: 'shoes',
      keywords: ['shoe'],
    },
    // Tees/T-shirts
    {
      test: () => /\b(tees?|t-shirts?|tshirts?)\b/i.test(title),
      contentType: 'tops',
      keywords: ['tees', 't-shirt'],
    },
    // Dungarees/Overalls
    {
      test: () => /\b(dungarees|overalls|romper|jumpsuit)\b/i.test(title),
      contentType: 'full-body',
      keywords: ['dungarees', 'overalls'],
    },
    // Body parts (horns, tail, ears, wings) are accessories
    {
      test: () => /\b(horns?|tail|ears|wings|hooves|fangs|demon\s*parts?)\b/i.test(title),
      contentType: 'accessories',
      keywords: ['horns', 'tail', 'ears', 'wings'],
    },
    // Head/Face items are accessories
    {
      test: () => /\b(head|face)\b/i.test(title) && !titleLower.includes('hair') && !titleLower.includes('makeup'),
      contentType: 'accessories',
      keywords: ['head', 'face'],
    },
    // Wedding themed (usually full-body)
    {
      test: () => /\bwedding\b/i.test(title),
      contentType: 'full-body',
      keywords: ['wedding'],
    },
    // CC Sets/Packs are usually full-body clothing
    {
      test: () => /\b(cc\s*set|cc\s*pack|clothing\s*set|clothes\s*set)\b/i.test(title),
      contentType: 'full-body',
      keywords: ['cc set', 'cc pack'],
    },
    // Collections are usually full-body
    {
      test: () => /\bcollection\b/i.test(title) && !titleLower.includes('furniture') && !titleLower.includes('decor'),
      contentType: 'full-body',
      keywords: ['collection'],
    },
    // Fashion sets are full-body
    {
      test: () => /\b(fashion|street\s*fashion|outfit)\s*(set|pack)?\b/i.test(title),
      contentType: 'full-body',
      keywords: ['fashion', 'outfit'],
    },
    // Toddler/Child/Teen sets are usually full-body
    {
      test: () => /\b(toddler|child|teen|kid)\s*(set|pack|cc)\b/i.test(title),
      contentType: 'full-body',
      keywords: ['toddler set', 'child set', 'teen set'],
    },
    // Generic "Set" at end (likely clothing) - but be careful
    {
      test: () => /\bset\s*$/i.test(title) && !titleLower.includes('kitchen') && !titleLower.includes('bathroom') && !titleLower.includes('living') && !titleLower.includes('bedroom') && !titleLower.includes('furniture'),
      contentType: 'full-body',
      keywords: ['set'],
    },
    // Plush/Plushie items are decor
    {
      test: () => /\b(plush|plushie|stuffed)\b/i.test(title),
      contentType: 'decor',
      keywords: ['plush', 'plushie'],
    },
    // TV/Electronics are decor
    {
      test: () => /\b(tv|television|monitor|computer|laptop|phone)\b/i.test(title),
      contentType: 'decor',
      keywords: ['tv', 'electronics'],
    },
    // Party themed items (without other context) likely decor or full-body
    {
      test: () => /\bparty\b/i.test(title) && !titleLower.includes('dress'),
      contentType: 'decor',
      keywords: ['party'],
    },
    // Shoe sets
    {
      test: () => /\bshoe\s*(set|pack|collection)\b/i.test(title),
      contentType: 'shoes',
      keywords: ['shoe set'],
    },
    // Hair sets
    {
      test: () => /\bhair\s*(set|pack|collection)\b/i.test(title),
      contentType: 'hair',
      keywords: ['hair set'],
    },
    // Makeup sets
    {
      test: () => /\b(makeup|make-up|cosmetic)\s*(set|pack|collection)\b/i.test(title),
      contentType: 'makeup',
      keywords: ['makeup set'],
    },
    // Mods (gameplay/script)
    {
      test: () => /\bmod\b/i.test(title) && !titleLower.includes('remod'),
      contentType: 'gameplay-mod',
      keywords: ['mod'],
    },
    // Override/Replacement usually script mods
    {
      test: () => /\b(override|replacement|recolor)\b/i.test(title),
      contentType: 'script-mod',
      keywords: ['override', 'replacement'],
    },
    // Living room sets
    {
      test: () => /\bliving\s*room\b/i.test(title),
      contentType: 'furniture',
      keywords: ['living room'],
    },
    // Bedroom sets
    {
      test: () => /\bbedroom\b/i.test(title) && !titleLower.includes('hair'),
      contentType: 'furniture',
      keywords: ['bedroom'],
    },
    // Selfie/Photo spots are decor
    {
      test: () => /\b(selfie|photo)\s*(spot|booth)\b/i.test(title),
      contentType: 'decor',
      keywords: ['selfie spot', 'photo booth'],
    },
    // Functional items are usually decor or furniture
    {
      test: () => /\bfunctional\b/i.test(title),
      contentType: 'decor',
      keywords: ['functional'],
    },
    // Pack CC or just Pack (likely clothing)
    {
      test: () => /\bpack\s*(cc)?\s*$/i.test(title) && !titleLower.includes('furniture') && !titleLower.includes('decor'),
      contentType: 'full-body',
      keywords: ['pack'],
    },
    // "Living Pack" when not furniture-related
    {
      test: () => /\bliving\s*pack\b/i.test(title),
      contentType: 'full-body',
      keywords: ['living pack'],
    },
    // Hair style names (twists, braids, locs)
    {
      test: () => /\b(twists?|braids?|locs?|dreads?|cornrows?|afro)\b/i.test(title) && !titleLower.includes('furniture'),
      contentType: 'hair',
      keywords: ['twists', 'braids', 'locs'],
    },
  ];

  for (const pattern of patterns) {
    if (pattern.test()) {
      return {
        contentType: pattern.contentType,
        confidence: 'medium',
        matchedKeywords: pattern.keywords,
        reasoning: `Inferred from pattern: ${pattern.keywords.join(', ')}`,
      };
    }
  }

  // Category-based fallback (lower confidence)
  if (categoryLower) {
    const categoryMappings: Record<string, string | null> = {
      'hair': 'hair',
      'cas - hair': 'hair',
      'cas - clothing': 'full-body',
      'cas - makeup': 'makeup',
      'cas - accessories': 'accessories',
      'cas - skin': 'skin',
      'cas': 'full-body',
      'build/buy': 'furniture',
      'build/buy - clutter': 'clutter',
      'gameplay': 'gameplay-mod',
      'poses': 'poses',
      'other': null, // Don't infer from "Other"
    };

    for (const [cat, contentType] of Object.entries(categoryMappings)) {
      if (categoryLower.includes(cat) && contentType) {
        return {
          contentType,
          confidence: 'medium',
          matchedKeywords: [cat],
          reasoning: `Inferred from category: ${category}`,
        };
      }
    }
  }

  // Tag-based inference
  const tagMappings: Record<string, string> = {
    'hair': 'hair',
    'clothing': 'full-body',
    'outfit': 'full-body',
    'dress': 'dresses',
    'top': 'tops',
    'bottom': 'bottoms',
    'shoes': 'shoes',
    'makeup': 'makeup',
    'furniture': 'furniture',
    'decor': 'decor',
    'build': 'lot',
    'gameplay': 'gameplay-mod',
  };

  for (const tag of tagsLower) {
    for (const [keyword, contentType] of Object.entries(tagMappings)) {
      if (tag.includes(keyword)) {
        return {
          contentType,
          confidence: 'medium',
          matchedKeywords: [tag],
          reasoning: `Inferred from tag: ${tag}`,
        };
      }
    }
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  const verbose = args.includes('--verbose');

  console.log('='.repeat(70));
  console.log('🔧 Fix Null Content Types - Intelligent Detection');
  console.log('='.repeat(70));
  console.log('');

  if (!shouldApply) {
    console.log('🔍 DRY RUN MODE - Use --apply to make changes\n');
  } else {
    console.log('⚠️  APPLY MODE - Changes will be written to database\n');
  }

  // Step 1: Find all mods with null contentType
  console.log('📊 Querying mods with null contentType...\n');

  const mods = await prisma.mod.findMany({
    where: { contentType: null },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      category: true,
      source: true,
      tags: true,
    },
    orderBy: { title: 'asc' },
  });

  console.log(`   Found ${mods.length} mods with null contentType\n`);

  if (mods.length === 0) {
    console.log('✅ No mods need fixing!');
    return;
  }

  // Step 2: Analyze each mod
  console.log('🔬 Analyzing mods with content type detector...\n');

  const fixes: FixResult[] = [];
  const unfixed: UnfixedMod[] = [];
  const byConfidence: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const byContentType: Record<string, number> = {};

  for (const mod of mods) {
    // Clean up title - remove leading numbers from listicle scraping
    const cleanTitle = mod.title.replace(/^\d+\s+/, '').trim();

    // Combine description sources for better detection
    const description = mod.description || mod.shortDescription || '';

    // Also check tags for hints
    const tagsText = mod.tags?.join(' ') || '';

    // Run the intelligent detector on clean title
    let result = detectContentTypeWithConfidence(cleanTitle, description + ' ' + tagsText);
    let themes = detectRoomThemes(cleanTitle, description);

    // If low confidence, try additional inference strategies
    if (result.confidence === 'low' || !result.contentType) {
      const inferred = inferFromContextClues(cleanTitle, mod.category, mod.tags || []);
      if (inferred) {
        result = {
          contentType: inferred.contentType,
          confidence: inferred.confidence,
          matchedKeywords: inferred.matchedKeywords,
          reasoning: inferred.reasoning,
        };
      }
    }

    byConfidence[result.confidence]++;

    if (result.contentType && result.confidence !== 'low') {
      // We can fix this one
      fixes.push({
        id: mod.id,
        title: mod.title,
        contentType: result.contentType,
        confidence: result.confidence,
        themes,
        matchedKeywords: result.matchedKeywords,
        reasoning: result.reasoning,
      });

      byContentType[result.contentType] = (byContentType[result.contentType] || 0) + 1;
    } else {
      // Cannot confidently determine content type
      unfixed.push({
        id: mod.id,
        title: mod.title,
        category: mod.category,
        source: mod.source,
        reasoning: result.reasoning,
      });
    }
  }

  // Step 3: Show analysis summary
  console.log('📈 Analysis Summary:');
  console.log('─'.repeat(50));
  console.log(`   High confidence:   ${byConfidence.high} mods`);
  console.log(`   Medium confidence: ${byConfidence.medium} mods`);
  console.log(`   Low confidence:    ${byConfidence.low} mods (will not fix)`);
  console.log('');
  console.log(`   ✅ Can fix: ${fixes.length} mods`);
  console.log(`   ❓ Cannot determine: ${unfixed.length} mods`);
  console.log('');

  // Step 4: Show content type breakdown
  console.log('📊 Content Types to Assign:');
  console.log('─'.repeat(50));

  const sortedTypes = Object.entries(byContentType)
    .sort((a, b) => b[1] - a[1]);

  for (const [type, count] of sortedTypes) {
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`   ${type.padEnd(18)} ${String(count).padStart(4)} ${bar}`);
  }
  console.log('');

  // Step 5: Show sample fixes
  if (verbose || !shouldApply) {
    console.log('📝 Sample Fixes (by confidence):');
    console.log('─'.repeat(70));

    // Show high confidence samples
    const highConf = fixes.filter(f => f.confidence === 'high').slice(0, 10);
    if (highConf.length > 0) {
      console.log('\n🟢 HIGH CONFIDENCE:');
      for (const fix of highConf) {
        const themesStr = fix.themes.length > 0 ? ` [themes: ${fix.themes.join(', ')}]` : '';
        console.log(`   [${fix.contentType.padEnd(15)}] ${fix.title.slice(0, 50)}${themesStr}`);
        if (verbose) {
          console.log(`      Keywords: ${fix.matchedKeywords.join(', ')}`);
        }
      }
    }

    // Show medium confidence samples
    const medConf = fixes.filter(f => f.confidence === 'medium').slice(0, 10);
    if (medConf.length > 0) {
      console.log('\n🟡 MEDIUM CONFIDENCE:');
      for (const fix of medConf) {
        const themesStr = fix.themes.length > 0 ? ` [themes: ${fix.themes.join(', ')}]` : '';
        console.log(`   [${fix.contentType.padEnd(15)}] ${fix.title.slice(0, 50)}${themesStr}`);
        if (verbose) {
          console.log(`      Keywords: ${fix.matchedKeywords.join(', ')}`);
        }
      }
    }
    console.log('');
  }

  // Step 6: Show unfixed mods
  if (unfixed.length > 0 && (verbose || !shouldApply)) {
    console.log('❓ Cannot Determine (sample of 15):');
    console.log('─'.repeat(70));

    for (const mod of unfixed.slice(0, 15)) {
      const source = mod.source ? ` (${mod.source})` : '';
      console.log(`   ${mod.title.slice(0, 60)}${source}`);
      if (verbose && mod.reasoning) {
        console.log(`      Reason: ${mod.reasoning}`);
      }
    }

    if (unfixed.length > 15) {
      console.log(`   ... and ${unfixed.length - 15} more`);
    }
    console.log('');
  }

  // Step 7: Apply fixes if requested
  if (shouldApply && fixes.length > 0) {
    console.log('🔧 Applying fixes...');
    console.log('─'.repeat(50));

    let applied = 0;
    let errors = 0;

    for (const fix of fixes) {
      try {
        await prisma.mod.update({
          where: { id: fix.id },
          data: {
            contentType: fix.contentType,
            themes: fix.themes.length > 0 ? fix.themes : undefined,
          },
        });

        applied++;

        // Progress indicator
        if (applied % 50 === 0) {
          console.log(`   ✅ Applied ${applied}/${fixes.length} fixes...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error fixing "${fix.title}": ${error}`);
      }
    }

    console.log('');
    console.log('='.repeat(50));
    console.log(`✅ Applied ${applied} fixes`);
    if (errors > 0) {
      console.log(`❌ ${errors} errors`);
    }
  } else if (!shouldApply && fixes.length > 0) {
    console.log('💡 To apply these fixes, run with --apply flag:');
    console.log('   npx tsx scripts/fix-null-content-types.ts --apply');
    console.log('');
  }

  // Final stats
  const remaining = await prisma.mod.count({ where: { contentType: null } });
  console.log(`\n📊 Remaining mods with null contentType: ${remaining}`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
