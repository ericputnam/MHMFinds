#!/usr/bin/env npx tsx
/**
 * CTB-009: Full Database Validation Pass
 *
 * Runs validation across the entire database to find remaining mismatches
 * between stored contentType and what the detector suggests.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-009-full-validation.ts
 * 2. For each mod, compare contentType vs detectContentType result
 * 3. Flag mods where detection differs from stored value with high confidence
 * 4. Generate report of potential mismatches for review
 * 5. Report should include mod ID, title, current contentType, suggested contentType, confidence
 * 6. Output to scripts/ralph/ctb-validation-report.txt
 * 7. npm run type-check passes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectContentTypeWithConfidence,
  type ConfidenceLevel,
  type DetectionResult,
} from '../../lib/services/contentTypeDetector';

const prisma = new PrismaClient();

interface MismatchResult {
  id: string;
  title: string;
  currentType: string | null;
  suggestedType: string | undefined;
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
  reasoning?: string;
}

interface ValidationStats {
  totalMods: number;
  modsWithMatches: number;
  modsWithMismatches: number;
  highConfidenceMismatches: number;
  mediumConfidenceMismatches: number;
  lowConfidenceMismatches: number;
  modsWithNullContentType: number;
  noDetectionPossible: number;
}

async function runFullValidation(): Promise<void> {
  console.log('Starting Full Database Validation (CTB-009)...\n');

  const results: string[] = [];
  const timestamp = new Date().toISOString();
  const BATCH_SIZE = 1000;

  results.push('='.repeat(80));
  results.push('CTB-009: FULL DATABASE VALIDATION REPORT');
  results.push('='.repeat(80));
  results.push(`Generated: ${timestamp}`);
  results.push('');

  // Initialize statistics
  const stats: ValidationStats = {
    totalMods: 0,
    modsWithMatches: 0,
    modsWithMismatches: 0,
    highConfidenceMismatches: 0,
    mediumConfidenceMismatches: 0,
    lowConfidenceMismatches: 0,
    modsWithNullContentType: 0,
    noDetectionPossible: 0,
  };

  // Collect all mismatches for categorization
  const highConfidenceMismatches: MismatchResult[] = [];
  const mediumConfidenceMismatches: MismatchResult[] = [];
  const nullContentTypeMods: MismatchResult[] = [];

  // Count total mods
  stats.totalMods = await prisma.mod.count();
  console.log(`Total mods to validate: ${stats.totalMods}`);
  results.push(`Total Mods in Database: ${stats.totalMods}`);
  results.push('');

  // Process in batches to avoid memory issues with Prisma Accelerate
  let offset = 0;
  let processedCount = 0;

  while (offset < stats.totalMods) {
    console.log(`Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (offset: ${offset})...`);

    const mods = await prisma.mod.findMany({
      select: {
        id: true,
        title: true,
        contentType: true,
        description: true,
      },
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { createdAt: 'desc' },
    });

    if (mods.length === 0) break;

    for (const mod of mods) {
      processedCount++;

      // Run content type detection
      const detection: DetectionResult = detectContentTypeWithConfidence(
        mod.title,
        mod.description || undefined
      );

      // Check for NULL content type
      if (mod.contentType === null) {
        stats.modsWithNullContentType++;

        if (detection.contentType) {
          nullContentTypeMods.push({
            id: mod.id,
            title: mod.title,
            currentType: null,
            suggestedType: detection.contentType,
            confidence: detection.confidence,
            matchedKeywords: detection.matchedKeywords,
            reasoning: detection.reasoning,
          });
        }
        continue;
      }

      // Check if detection returned a result
      if (!detection.contentType) {
        stats.noDetectionPossible++;
        continue;
      }

      // Compare stored vs detected
      if (mod.contentType === detection.contentType) {
        stats.modsWithMatches++;
      } else {
        stats.modsWithMismatches++;

        const mismatch: MismatchResult = {
          id: mod.id,
          title: mod.title,
          currentType: mod.contentType,
          suggestedType: detection.contentType,
          confidence: detection.confidence,
          matchedKeywords: detection.matchedKeywords,
          reasoning: detection.reasoning,
        };

        if (detection.confidence === 'high') {
          stats.highConfidenceMismatches++;
          highConfidenceMismatches.push(mismatch);
        } else if (detection.confidence === 'medium') {
          stats.mediumConfidenceMismatches++;
          mediumConfidenceMismatches.push(mismatch);
        } else {
          stats.lowConfidenceMismatches++;
        }
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\nProcessed ${processedCount} mods.`);

  // ============================================
  // SECTION 1: Summary Statistics
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 1: Validation Summary');
  results.push('='.repeat(80));
  results.push('');

  const matchRate = ((stats.modsWithMatches / (stats.totalMods - stats.modsWithNullContentType - stats.noDetectionPossible)) * 100).toFixed(2);

  results.push(`Total mods processed: ${stats.totalMods}`);
  results.push(`Mods with NULL contentType: ${stats.modsWithNullContentType}`);
  results.push(`Mods where detection was not possible: ${stats.noDetectionPossible}`);
  results.push('');
  results.push(`Mods where contentType MATCHES detection: ${stats.modsWithMatches}`);
  results.push(`Mods where contentType DIFFERS from detection: ${stats.modsWithMismatches}`);
  results.push(`  - High confidence mismatches: ${stats.highConfidenceMismatches}`);
  results.push(`  - Medium confidence mismatches: ${stats.mediumConfidenceMismatches}`);
  results.push(`  - Low confidence mismatches: ${stats.lowConfidenceMismatches}`);
  results.push('');
  results.push(`Match rate (excluding NULL and no-detection): ${matchRate}%`);
  results.push('');

  // ============================================
  // SECTION 2: Content Type Distribution (Current State)
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 2: Current Content Type Distribution');
  results.push('='.repeat(80));
  results.push('');

  const contentTypeCounts = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  results.push('Content Type                   Count      Percentage');
  results.push('-'.repeat(60));

  for (const ct of contentTypeCounts) {
    const typeName = ct.contentType || '(NULL)';
    const count = ct._count.id;
    const percentage = ((count / stats.totalMods) * 100).toFixed(2);
    results.push(`${typeName.padEnd(30)} ${String(count).padStart(6)}      ${percentage.padStart(6)}%`);
  }
  results.push('');

  // ============================================
  // SECTION 3: High Confidence Mismatches (Priority Review)
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 3: HIGH CONFIDENCE Mismatches (Priority Review)');
  results.push('='.repeat(80));
  results.push('');
  results.push(`Total: ${highConfidenceMismatches.length} mods`);
  results.push('');
  results.push('These mods have high-confidence detection suggesting a different contentType.');
  results.push('Consider reviewing and updating these records.');
  results.push('');

  // Group high confidence mismatches by current -> suggested transition
  const transitionGroups: Map<string, MismatchResult[]> = new Map();

  for (const mismatch of highConfidenceMismatches) {
    const key = `${mismatch.currentType} -> ${mismatch.suggestedType}`;
    if (!transitionGroups.has(key)) {
      transitionGroups.set(key, []);
    }
    transitionGroups.get(key)!.push(mismatch);
  }

  // Sort by count descending
  const sortedTransitions = Array.from(transitionGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  for (const [transition, mismatches] of sortedTransitions) {
    results.push('-'.repeat(80));
    results.push(`Transition: ${transition} (${mismatches.length} mods)`);
    results.push('-'.repeat(80));

    // Show up to 10 examples
    const examples = mismatches.slice(0, 10);
    for (const m of examples) {
      results.push(`  ID: ${m.id}`);
      results.push(`  Title: ${m.title}`);
      results.push(`  Current: ${m.currentType} -> Suggested: ${m.suggestedType}`);
      results.push(`  Keywords: ${m.matchedKeywords.join(', ')}`);
      results.push('');
    }

    if (mismatches.length > 10) {
      results.push(`  ... and ${mismatches.length - 10} more`);
      results.push('');
    }
  }

  // ============================================
  // SECTION 4: NULL Content Type Mods with Suggestions
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 4: NULL contentType Mods with Detection Suggestions');
  results.push('='.repeat(80));
  results.push('');
  results.push(`Total mods with NULL contentType: ${stats.modsWithNullContentType}`);
  results.push(`Mods with detection suggestions: ${nullContentTypeMods.length}`);
  results.push('');

  if (nullContentTypeMods.length > 0) {
    // Group by suggested type
    const nullSuggestionGroups: Map<string, MismatchResult[]> = new Map();

    for (const mod of nullContentTypeMods) {
      const key = mod.suggestedType || 'unknown';
      if (!nullSuggestionGroups.has(key)) {
        nullSuggestionGroups.set(key, []);
      }
      nullSuggestionGroups.get(key)!.push(mod);
    }

    const sortedNullGroups = Array.from(nullSuggestionGroups.entries())
      .sort((a, b) => b[1].length - a[1].length);

    for (const [suggestedType, mods] of sortedNullGroups) {
      results.push(`  ${suggestedType}: ${mods.length} mods`);
    }
    results.push('');

    results.push('Sample NULL mods with suggestions:');
    results.push('-'.repeat(60));

    for (const m of nullContentTypeMods.slice(0, 20)) {
      results.push(`  [${m.confidence}] ${m.title}`);
      results.push(`    Suggested: ${m.suggestedType} (keywords: ${m.matchedKeywords.join(', ')})`);
    }

    if (nullContentTypeMods.length > 20) {
      results.push(`  ... and ${nullContentTypeMods.length - 20} more`);
    }
    results.push('');
  }

  // ============================================
  // SECTION 5: Comparison with CTB-001 Baseline
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 5: Before/After Comparison (vs CTB-001 Baseline)');
  results.push('='.repeat(80));
  results.push('');

  // Read baseline from CTB-001 audit report
  const baselineReportPath = path.join(__dirname, 'ctb-audit-report.txt');
  let baselineStats: { nullCount: number; orphanedTypes: string[] } | null = null;

  if (fs.existsSync(baselineReportPath)) {
    const baselineContent = fs.readFileSync(baselineReportPath, 'utf-8');

    // Parse NULL count from baseline
    const nullMatch = baselineContent.match(/Total mods with NULL contentType: (\d+)/);
    const baselineNullCount = nullMatch ? parseInt(nullMatch[1], 10) : null;

    // Parse orphaned types from baseline
    const orphanedMatches = baselineContent.match(/\[MISSING\] ([a-z-]+)\s+/g);
    const orphanedTypes = orphanedMatches
      ? orphanedMatches.map(m => m.replace('[MISSING] ', '').trim())
      : [];

    baselineStats = {
      nullCount: baselineNullCount || 0,
      orphanedTypes,
    };

    results.push('CTB-001 Baseline (Before):');
    results.push(`  - NULL contentType mods: ${baselineStats.nullCount}`);
    results.push(`  - Orphaned content types: ${baselineStats.orphanedTypes.join(', ') || 'none'}`);
    results.push('');

    results.push('Current State (After CTB-001 through CTB-008):');
    results.push(`  - NULL contentType mods: ${stats.modsWithNullContentType}`);

    // Check for orphaned types now
    const facetDefinitions = await prisma.facetDefinition.findMany({
      where: { facetType: 'contentType' },
      select: { value: true },
    });
    const definedTypes = new Set(facetDefinitions.map(f => f.value));
    const currentOrphanedTypes = contentTypeCounts
      .filter(ct => ct.contentType && !definedTypes.has(ct.contentType))
      .map(ct => ct.contentType);

    results.push(`  - Orphaned content types: ${currentOrphanedTypes.join(', ') || 'none'}`);
    results.push('');

    results.push('Improvements:');
    if (baselineStats.nullCount > stats.modsWithNullContentType) {
      const fixed = baselineStats.nullCount - stats.modsWithNullContentType;
      results.push(`  - Fixed ${fixed} mods with NULL contentType (${((fixed / baselineStats.nullCount) * 100).toFixed(1)}% reduction)`);
    } else {
      results.push(`  - NULL contentType count unchanged or increased`);
    }

    if (baselineStats.orphanedTypes.length > currentOrphanedTypes.length) {
      const fixedOrphans = baselineStats.orphanedTypes.filter(t => !currentOrphanedTypes.includes(t));
      results.push(`  - Created FacetDefinitions for: ${fixedOrphans.join(', ')}`);
    }
  } else {
    results.push('CTB-001 baseline report not found - cannot perform comparison.');
    results.push('Run CTB-001 audit first to establish baseline.');
  }
  results.push('');

  // ============================================
  // SECTION 6: Edge Cases and Manual Review
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 6: Edge Cases Requiring Manual Review');
  results.push('='.repeat(80));
  results.push('');

  // Find mods where no detection was possible but contentType is also NULL
  const fullyUnknownMods = await prisma.mod.findMany({
    where: {
      contentType: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      source: true,
    },
    take: 50,
  });

  // Filter to those where detection fails
  const edgeCases = fullyUnknownMods.filter(mod => {
    const detection = detectContentTypeWithConfidence(mod.title, mod.description || undefined);
    return !detection.contentType || detection.confidence === 'low';
  });

  results.push(`Mods with NULL contentType that cannot be auto-detected: ${edgeCases.length}`);
  results.push('');

  if (edgeCases.length > 0) {
    results.push('These mods require manual categorization:');
    results.push('-'.repeat(60));

    for (const mod of edgeCases.slice(0, 30)) {
      results.push(`  ID: ${mod.id}`);
      results.push(`  Title: ${mod.title}`);
      results.push(`  Legacy Category: ${mod.category}`);
      results.push(`  Source: ${mod.source}`);
      if (mod.description) {
        const shortDesc = mod.description.substring(0, 80).replace(/\n/g, ' ');
        results.push(`  Description: ${shortDesc}...`);
      }
      results.push('');
    }

    if (edgeCases.length > 30) {
      results.push(`  ... and ${edgeCases.length - 30} more require manual review`);
      results.push('');
    }
  }

  // ============================================
  // FINAL SUMMARY
  // ============================================
  results.push('='.repeat(80));
  results.push('FINAL SUMMARY');
  results.push('='.repeat(80));
  results.push('');

  const healthScore = (
    (stats.modsWithMatches / (stats.totalMods - stats.noDetectionPossible)) * 100
  ).toFixed(1);

  results.push(`Database Health Score: ${healthScore}% content types validated`);
  results.push('');
  results.push('Metrics:');
  results.push(`  - Total mods: ${stats.totalMods}`);
  results.push(`  - Content types match detection: ${stats.modsWithMatches}`);
  results.push(`  - High confidence mismatches: ${stats.highConfidenceMismatches} (review recommended)`);
  results.push(`  - Medium confidence mismatches: ${stats.mediumConfidenceMismatches}`);
  results.push(`  - Mods with NULL contentType: ${stats.modsWithNullContentType}`);
  results.push(`  - Mods where detection not possible: ${stats.noDetectionPossible}`);
  results.push('');

  if (stats.highConfidenceMismatches > 0) {
    results.push('RECOMMENDATION: Review high-confidence mismatches in Section 3.');
    results.push('These may indicate:');
    results.push('  1. Mods that were miscategorized and need fixing');
    results.push('  2. Edge cases where the detector needs improvement');
    results.push('  3. Valid categorizations that differ from keyword-based detection');
  }

  if (stats.modsWithNullContentType > 0) {
    results.push('');
    results.push(`RECOMMENDATION: ${stats.modsWithNullContentType} mods still have NULL contentType.`);
    results.push('Review edge cases in Section 6 for manual categorization.');
  }

  results.push('');
  results.push('='.repeat(80));
  results.push('END OF REPORT');
  results.push('='.repeat(80));

  // Save results to file
  const outputPath = path.join(__dirname, 'ctb-validation-report.txt');
  const reportContent = results.join('\n');
  fs.writeFileSync(outputPath, reportContent);

  console.log('\n' + '='.repeat(80));
  console.log(`Validation report saved to: ${outputPath}`);
  console.log('='.repeat(80) + '\n');

  // Print summary to console
  console.log('SUMMARY:');
  console.log(`  Total mods: ${stats.totalMods}`);
  console.log(`  Match rate: ${matchRate}%`);
  console.log(`  High confidence mismatches: ${stats.highConfidenceMismatches}`);
  console.log(`  NULL contentType remaining: ${stats.modsWithNullContentType}`);

  await prisma.$disconnect();
}

runFullValidation().catch(async (e) => {
  console.error('Validation failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
