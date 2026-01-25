#!/usr/bin/env npx tsx
/**
 * CTB-007: Fix NULL contentType mods
 *
 * Analyzes and categorizes mods with NULL contentType using the contentTypeDetector.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-007-fix-null-content.ts
 * 2. Query all mods where contentType IS NULL
 * 3. Run each through detectContentType function
 * 4. For mods where detection returns undefined, log for manual review
 * 5. For mods with confident detection, update contentType
 * 6. Create report of mods that couldn't be auto-categorized
 * 7. Dry run first, apply with --fix flag
 * 8. npm run type-check passes
 *
 * Usage:
 *   npx tsx scripts/ralph/ctb-007-fix-null-content.ts          # Dry run
 *   npx tsx scripts/ralph/ctb-007-fix-null-content.ts --fix    # Apply changes
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

interface ModToProcess {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  source: string | null;
}

interface ProcessingResult {
  mod: ModToProcess;
  detection: DetectionResult;
  willUpdate: boolean;
}

async function fixNullContentTypes(): Promise<void> {
  const isDryRun = !process.argv.includes('--fix');
  const timestamp = new Date().toISOString();

  console.log('='.repeat(80));
  console.log('CTB-007: Fix NULL contentType mods');
  console.log('='.repeat(80));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (use --fix to apply changes)' : 'APPLYING CHANGES'}`);
  console.log(`Started: ${timestamp}`);
  console.log('');

  // ============================================
  // STEP 1: Query all mods where contentType IS NULL
  // ============================================
  console.log('Step 1: Querying mods with NULL contentType...');

  const nullContentMods = await prisma.mod.findMany({
    where: { contentType: null },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      source: true,
    },
    orderBy: { title: 'asc' },
  });

  console.log(`Found ${nullContentMods.length} mods with NULL contentType`);
  console.log('');

  if (nullContentMods.length === 0) {
    console.log('No mods with NULL contentType found. Nothing to do!');
    await prisma.$disconnect();
    return;
  }

  // ============================================
  // STEP 2: Run each through detectContentType function
  // ============================================
  console.log('Step 2: Running content type detection on each mod...');
  console.log('');

  const results: ProcessingResult[] = [];
  const canAutoFix: ProcessingResult[] = [];
  const needsManualReview: ProcessingResult[] = [];

  for (const mod of nullContentMods) {
    const detection = detectContentTypeWithConfidence(
      mod.title,
      mod.description || undefined
    );

    // Determine if we should auto-fix:
    // - Detection returned a contentType (not undefined)
    // - Confidence is medium or high (detectContentType already filters low confidence)
    const willUpdate =
      detection.contentType !== undefined &&
      detection.confidence !== 'low';

    const result: ProcessingResult = {
      mod,
      detection,
      willUpdate,
    };

    results.push(result);

    if (willUpdate) {
      canAutoFix.push(result);
    } else {
      needsManualReview.push(result);
    }
  }

  // ============================================
  // STEP 3: Display and categorize results
  // ============================================
  console.log('='.repeat(80));
  console.log('DETECTION RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total mods processed: ${results.length}`);
  console.log(`Can auto-fix: ${canAutoFix.length}`);
  console.log(`Needs manual review: ${needsManualReview.length}`);
  console.log('');

  // Group auto-fix by detected content type
  const byContentType = new Map<string, ProcessingResult[]>();
  for (const result of canAutoFix) {
    const ct = result.detection.contentType!;
    if (!byContentType.has(ct)) {
      byContentType.set(ct, []);
    }
    byContentType.get(ct)!.push(result);
  }

  console.log('='.repeat(80));
  console.log('MODS THAT CAN BE AUTO-FIXED');
  console.log('='.repeat(80));
  console.log('');

  // Sort by content type name
  const sortedContentTypes = Array.from(byContentType.keys()).sort();

  for (const contentType of sortedContentTypes) {
    const modsForType = byContentType.get(contentType)!;
    console.log(`[${contentType}] - ${modsForType.length} mod(s)`);

    for (const result of modsForType) {
      const confidenceTag = `[${result.detection.confidence.toUpperCase()}]`;
      const keywords = result.detection.matchedKeywords.join(', ');
      console.log(`  ${confidenceTag} "${result.mod.title}"`);
      console.log(`    Matched: ${keywords}`);
      if (result.detection.reasoning) {
        console.log(`    Reason: ${result.detection.reasoning}`);
      }
    }
    console.log('');
  }

  // ============================================
  // STEP 4: Display mods needing manual review
  // ============================================
  console.log('='.repeat(80));
  console.log('MODS NEEDING MANUAL REVIEW (could not auto-detect)');
  console.log('='.repeat(80));
  console.log('');

  if (needsManualReview.length === 0) {
    console.log('All mods could be auto-categorized!');
  } else {
    for (const result of needsManualReview) {
      console.log(`ID: ${result.mod.id}`);
      console.log(`Title: "${result.mod.title}"`);
      console.log(`Legacy Category: ${result.mod.category || '(none)'}`);
      console.log(`Source: ${result.mod.source || '(unknown)'}`);
      if (result.mod.description) {
        const shortDesc = result.mod.description
          .substring(0, 150)
          .replace(/\n/g, ' ');
        console.log(
          `Description: ${shortDesc}${result.mod.description.length > 150 ? '...' : ''}`
        );
      }
      if (result.detection.matchedKeywords.length > 0) {
        console.log(
          `Partial matches (low confidence): ${result.detection.matchedKeywords.join(', ')}`
        );
      }
      if (result.detection.reasoning) {
        console.log(`Detection notes: ${result.detection.reasoning}`);
      }
      console.log('');
    }
  }

  // ============================================
  // STEP 5: Apply fixes (if not dry run)
  // ============================================
  if (!isDryRun && canAutoFix.length > 0) {
    console.log('='.repeat(80));
    console.log('APPLYING FIXES');
    console.log('='.repeat(80));
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const result of canAutoFix) {
      try {
        await prisma.mod.update({
          where: { id: result.mod.id },
          data: { contentType: result.detection.contentType },
        });
        successCount++;
        console.log(
          `[OK] Updated "${result.mod.title}" -> ${result.detection.contentType}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `[ERROR] Failed to update "${result.mod.title}":`,
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
  reportLines.push('CTB-007: Fix NULL contentType Mods - Report');
  reportLines.push('='.repeat(80));
  reportLines.push(`Generated: ${timestamp}`);
  reportLines.push(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLIED'}`);
  reportLines.push('');
  reportLines.push('SUMMARY');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Total mods with NULL contentType: ${results.length}`);
  reportLines.push(`Auto-categorized: ${canAutoFix.length}`);
  reportLines.push(`Needs manual review: ${needsManualReview.length}`);
  reportLines.push('');

  // Auto-fix breakdown
  reportLines.push('='.repeat(80));
  reportLines.push('AUTO-CATEGORIZED MODS BY CONTENT TYPE');
  reportLines.push('='.repeat(80));
  reportLines.push('');

  for (const contentType of sortedContentTypes) {
    const modsForType = byContentType.get(contentType)!;
    reportLines.push(`${contentType}: ${modsForType.length} mod(s)`);

    for (const result of modsForType) {
      reportLines.push(
        `  [${result.detection.confidence}] ${result.mod.title}`
      );
      reportLines.push(`    Keywords: ${result.detection.matchedKeywords.join(', ')}`);
    }
    reportLines.push('');
  }

  // Manual review section
  reportLines.push('='.repeat(80));
  reportLines.push('MODS REQUIRING MANUAL REVIEW');
  reportLines.push('='.repeat(80));
  reportLines.push('');

  if (needsManualReview.length === 0) {
    reportLines.push('None - all mods were auto-categorized!');
  } else {
    for (const result of needsManualReview) {
      reportLines.push(`ID: ${result.mod.id}`);
      reportLines.push(`Title: ${result.mod.title}`);
      reportLines.push(`Legacy Category: ${result.mod.category || '(none)'}`);
      reportLines.push(`Source: ${result.mod.source || '(unknown)'}`);
      if (result.mod.description) {
        const shortDesc = result.mod.description
          .substring(0, 200)
          .replace(/\n/g, ' ');
        reportLines.push(
          `Description: ${shortDesc}${result.mod.description.length > 200 ? '...' : ''}`
        );
      }
      if (result.detection.matchedKeywords.length > 0) {
        reportLines.push(
          `Partial matches: ${result.detection.matchedKeywords.join(', ')}`
        );
      }
      if (result.detection.reasoning) {
        reportLines.push(`Notes: ${result.detection.reasoning}`);
      }
      reportLines.push('');
    }
  }

  reportLines.push('='.repeat(80));
  reportLines.push('END OF REPORT');
  reportLines.push('='.repeat(80));

  // Write report to file
  const reportPath = path.join(__dirname, 'ctb-007-null-content-report.txt');
  fs.writeFileSync(reportPath, reportLines.join('\n'));

  console.log('');
  console.log('='.repeat(80));
  console.log('CTB-007 COMPLETE');
  console.log('='.repeat(80));
  console.log(`Report saved to: ${reportPath}`);
  console.log('');

  if (isDryRun && canAutoFix.length > 0) {
    console.log(`To apply ${canAutoFix.length} auto-fix changes, run:`);
    console.log('  npx tsx scripts/ralph/ctb-007-fix-null-content.ts --fix');
    console.log('');
  }

  // Final verification (if changes were applied)
  if (!isDryRun && canAutoFix.length > 0) {
    const remainingNull = await prisma.mod.count({
      where: { contentType: null },
    });
    console.log(`Remaining mods with NULL contentType: ${remainingNull}`);
  }

  await prisma.$disconnect();
}

fixNullContentTypes().catch(async (e) => {
  console.error('CTB-007 failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
