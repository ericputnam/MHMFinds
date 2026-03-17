#!/usr/bin/env npx tsx
/**
 * CTB-001: Content Type Audit Script
 *
 * Creates a comprehensive audit of all content types currently in use,
 * identifies mismatches, and documents patterns.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-001-audit.ts script
 * 2. Query all unique contentType values and their counts
 * 3. Identify mods with NULL contentType
 * 4. Identify content types in use WITHOUT FacetDefinitions (pet-furniture, cas-background, loading-screen, preset)
 * 5. Sample 20 mods from each contentType and log title + contentType for review
 * 6. Output audit report to scripts/ralph/ctb-audit-report.txt
 * 7. npm run type-check passes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runContentTypeAudit(): Promise<void> {
  console.log('Starting Content Type Audit (CTB-001)...\n');

  const results: string[] = [];
  const timestamp = new Date().toISOString();

  results.push('='.repeat(80));
  results.push('CONTENT TYPE AUDIT REPORT (CTB-001)');
  results.push('='.repeat(80));
  results.push(`Generated: ${timestamp}`);
  results.push('');

  // Get total mod count
  const totalMods = await prisma.mod.count();
  results.push(`Total Mods in Database: ${totalMods}`);
  results.push('');

  // ============================================
  // SECTION 1: Query all unique contentType values and their counts
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 1: Content Type Distribution');
  results.push('='.repeat(80));
  results.push('');

  const contentTypeCounts = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log(`Found ${contentTypeCounts.length} unique contentType values`);

  results.push('Content Type                   Count      Percentage');
  results.push('-'.repeat(60));

  for (const ct of contentTypeCounts) {
    const typeName = ct.contentType || '(NULL)';
    const count = ct._count.id;
    const percentage = ((count / totalMods) * 100).toFixed(2);
    results.push(`${typeName.padEnd(30)} ${String(count).padStart(6)}      ${percentage.padStart(6)}%`);
  }
  results.push('');

  // ============================================
  // SECTION 2: Identify mods with NULL contentType
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 2: Mods with NULL contentType');
  results.push('='.repeat(80));
  results.push('');

  const nullCount = await prisma.mod.count({ where: { contentType: null } });
  results.push(`Total mods with NULL contentType: ${nullCount}`);
  results.push('');

  console.log(`Found ${nullCount} mods with NULL contentType`);

  if (nullCount > 0) {
    const nullContentTypeMods = await prisma.mod.findMany({
      where: { contentType: null },
      select: {
        id: true,
        title: true,
        category: true,
        source: true,
        description: true,
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    results.push('Sample of mods with NULL contentType (up to 50):');
    results.push('-'.repeat(80));

    for (const mod of nullContentTypeMods) {
      results.push(`ID: ${mod.id}`);
      results.push(`Title: ${mod.title}`);
      results.push(`Legacy Category: ${mod.category}`);
      results.push(`Source: ${mod.source}`);
      if (mod.description) {
        const shortDesc = mod.description.substring(0, 100).replace(/\n/g, ' ');
        results.push(`Description: ${shortDesc}${mod.description.length > 100 ? '...' : ''}`);
      }
      results.push('');
    }
  }

  // ============================================
  // SECTION 3: Identify content types in use WITHOUT FacetDefinitions
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 3: Content Types WITHOUT FacetDefinitions');
  results.push('='.repeat(80));
  results.push('');
  results.push('(Specifically looking for: pet-furniture, cas-background, loading-screen, preset)');
  results.push('');

  // Get all FacetDefinitions with facetType = 'contentType'
  const facetDefinitions = await prisma.facetDefinition.findMany({
    where: { facetType: 'contentType' },
    select: { value: true, displayName: true, isActive: true },
  });

  const definedContentTypes = new Set(facetDefinitions.map((f) => f.value));

  console.log(`Found ${definedContentTypes.size} FacetDefinitions for contentType`);

  results.push(`Total FacetDefinitions for contentType: ${facetDefinitions.length}`);
  results.push('');
  results.push('Existing FacetDefinitions:');
  results.push('-'.repeat(60));
  for (const fd of facetDefinitions.sort((a, b) => a.value.localeCompare(b.value))) {
    const activeStatus = fd.isActive ? 'active' : 'inactive';
    results.push(`  ${fd.value.padEnd(25)} "${fd.displayName}" (${activeStatus})`);
  }
  results.push('');

  // Get all content types actually in use (excluding NULL)
  const usedContentTypes = contentTypeCounts
    .map((ct) => ct.contentType)
    .filter((ct): ct is string => ct !== null);

  // Find orphaned content types (in use but no FacetDefinition)
  const orphanedContentTypes: { type: string; count: number }[] = [];

  for (const ct of contentTypeCounts) {
    if (ct.contentType && !definedContentTypes.has(ct.contentType)) {
      orphanedContentTypes.push({ type: ct.contentType, count: ct._count.id });
    }
  }

  if (orphanedContentTypes.length > 0) {
    results.push(`Found ${orphanedContentTypes.length} content types WITHOUT FacetDefinitions:`);
    results.push('-'.repeat(60));
    for (const orphan of orphanedContentTypes) {
      results.push(`  [MISSING] ${orphan.type.padEnd(25)} (${orphan.count} mods)`);
    }
    console.log(`Found ${orphanedContentTypes.length} orphaned content types:`, orphanedContentTypes.map(o => o.type).join(', '));
  } else {
    results.push('All content types have FacetDefinitions');
    console.log('No orphaned content types found');
  }
  results.push('');

  // Specifically check for the mentioned types
  const specificTypesToCheck = ['pet-furniture', 'cas-background', 'loading-screen', 'preset'];
  results.push('Status of specifically mentioned types:');
  results.push('-'.repeat(60));
  for (const typeToCheck of specificTypesToCheck) {
    const hasFacet = definedContentTypes.has(typeToCheck);
    const modCount = contentTypeCounts.find(ct => ct.contentType === typeToCheck)?._count.id || 0;
    const status = hasFacet ? 'Has FacetDefinition' : 'MISSING FacetDefinition';
    results.push(`  ${typeToCheck.padEnd(20)} ${modCount} mods - ${status}`);
  }
  results.push('');

  // Also check for FacetDefinitions that have no mods
  const unusedFacetDefinitions = facetDefinitions.filter(
    (f) => !usedContentTypes.includes(f.value)
  );

  if (unusedFacetDefinitions.length > 0) {
    results.push(`FacetDefinitions with NO mods using them:`);
    results.push('-'.repeat(60));
    for (const unused of unusedFacetDefinitions) {
      results.push(`  [UNUSED] ${unused.value.padEnd(25)} "${unused.displayName}"`);
    }
    results.push('');
  }

  // ============================================
  // SECTION 4: Sample 20 mods from each contentType
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 4: Sample Mods by Content Type (20 per type)');
  results.push('='.repeat(80));
  results.push('');
  results.push('(For manual review to verify correct categorization)');
  results.push('');

  console.log('Sampling 20 mods from each contentType...');

  for (const ct of contentTypeCounts) {
    const typeName = ct.contentType || '(NULL)';
    results.push('-'.repeat(80));
    results.push(`Content Type: ${typeName}`);
    results.push(`Total Mods: ${ct._count.id}`);
    results.push('-'.repeat(80));

    const samples = await prisma.mod.findMany({
      where: { contentType: ct.contentType },
      select: { id: true, title: true, contentType: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    for (let i = 0; i < samples.length; i++) {
      const mod = samples[i];
      const contentTypeLabel = mod.contentType || '(NULL)';
      results.push(`  ${(i + 1).toString().padStart(2)}. [${contentTypeLabel}] ${mod.title}`);
    }
    results.push('');
  }

  // ============================================
  // SECTION 5: Pattern Analysis
  // ============================================
  results.push('='.repeat(80));
  results.push('SECTION 5: Pattern Analysis');
  results.push('='.repeat(80));
  results.push('');

  // Check for potential miscategorization patterns
  const potentialMiscategorizations: { pattern: string; query: string; suggestion: string }[] = [
    { pattern: 'eyebrow', query: 'eyebrow', suggestion: 'eyebrows' },
    { pattern: 'lash/eyelash', query: 'lash', suggestion: 'lashes' },
    { pattern: 'eyeliner', query: 'eyeliner', suggestion: 'eyeliner or makeup' },
    { pattern: 'lipstick', query: 'lipstick', suggestion: 'lipstick or makeup' },
    { pattern: 'blush', query: 'blush', suggestion: 'blush or makeup' },
    { pattern: 'beard', query: 'beard', suggestion: 'beard or facial-hair' },
    { pattern: 'mustache', query: 'mustache', suggestion: 'facial-hair' },
    { pattern: 'bathroom', query: 'bathroom', suggestion: 'furniture with bathroom theme' },
    { pattern: 'kitchen', query: 'kitchen', suggestion: 'furniture with kitchen theme' },
    { pattern: 'bedroom', query: 'bedroom', suggestion: 'furniture with bedroom theme' },
  ];

  results.push('Potential miscategorization patterns found:');
  results.push('-'.repeat(80));

  for (const check of potentialMiscategorizations) {
    const modsByPattern = await prisma.mod.groupBy({
      by: ['contentType'],
      where: {
        title: {
          contains: check.query,
          mode: 'insensitive',
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (modsByPattern.length > 0) {
      results.push('');
      results.push(`Pattern: "${check.pattern}" (suggested: ${check.suggestion})`);
      for (const group of modsByPattern) {
        const typeName = group.contentType || '(NULL)';
        results.push(`  Currently in "${typeName}": ${group._count.id} mods`);
      }
    }
  }
  results.push('');

  // ============================================
  // SUMMARY
  // ============================================
  results.push('='.repeat(80));
  results.push('SUMMARY');
  results.push('='.repeat(80));
  results.push('');
  results.push(`Total mods: ${totalMods}`);
  results.push(`Unique content types (including NULL): ${contentTypeCounts.length}`);
  results.push(`Mods with NULL contentType: ${nullCount} (${((nullCount / totalMods) * 100).toFixed(2)}%)`);
  results.push(`Content types WITHOUT FacetDefinitions: ${orphanedContentTypes.length}`);
  results.push(`FacetDefinitions without mods: ${unusedFacetDefinitions.length}`);
  results.push('');

  if (orphanedContentTypes.length > 0) {
    results.push('Action Required - Create FacetDefinitions for:');
    for (const orphan of orphanedContentTypes) {
      results.push(`  - ${orphan.type} (${orphan.count} mods)`);
    }
    results.push('');
  }

  if (nullCount > 0) {
    results.push(`Action Required - Categorize ${nullCount} mods with NULL contentType`);
    results.push('');
  }

  results.push('='.repeat(80));
  results.push('END OF REPORT');
  results.push('='.repeat(80));

  // Save results to file
  const outputPath = path.join(__dirname, 'ctb-audit-report.txt');
  const reportContent = results.join('\n');
  fs.writeFileSync(outputPath, reportContent);

  console.log('\n' + '='.repeat(80));
  console.log(`Audit report saved to: ${outputPath}`);
  console.log('='.repeat(80) + '\n');

  // Print summary to console
  console.log('SUMMARY:');
  console.log(`  Total mods: ${totalMods}`);
  console.log(`  Unique content types: ${contentTypeCounts.length}`);
  console.log(`  NULL contentType: ${nullCount}`);
  console.log(`  Orphaned content types: ${orphanedContentTypes.length}`);
  if (orphanedContentTypes.length > 0) {
    console.log('  Orphaned types:', orphanedContentTypes.map((o) => o.type).join(', '));
  }

  await prisma.$disconnect();
}

runContentTypeAudit().catch(async (e) => {
  console.error('Audit failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
