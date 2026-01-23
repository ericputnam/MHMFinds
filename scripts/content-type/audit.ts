#!/usr/bin/env npx tsx
/**
 * CTB-001: Content Type Audit Script
 *
 * Creates a comprehensive audit of all content types currently in use,
 * identifies mismatches, and documents patterns.
 *
 * Acceptance Criteria:
 * - Query all unique contentType values and their counts
 * - Identify mods with NULL contentType
 * - Identify content types in use WITHOUT FacetDefinitions
 * - Sample 20 mods from each contentType and log title + contentType for review
 * - Output audit report to scripts/ralph/ctb-audit-report.txt
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runContentTypeAudit() {
  console.log('🔍 Starting Content Type Audit (CTB-001)...\n');

  const results: string[] = [];
  const timestamp = new Date().toISOString();

  results.push('Content Type Audit Report (CTB-001)');
  results.push(`Generated: ${timestamp}`);
  results.push('='.repeat(70));
  results.push('');

  // Get total mod count
  const totalMods = await prisma.mod.count();
  results.push(`Total Mods in Database: ${totalMods}`);
  results.push('');

  // ============================================
  // 1. Query all unique contentType values and their counts
  // ============================================
  results.push('='.repeat(70));
  results.push('SECTION 1: Content Type Distribution');
  results.push('='.repeat(70));
  results.push('');

  const contentTypeCounts = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log(`✓ Found ${contentTypeCounts.length} unique contentType values`);

  for (const ct of contentTypeCounts) {
    const typeName = ct.contentType || '(NULL)';
    const count = ct._count.id;
    const percentage = ((count / totalMods) * 100).toFixed(1);
    results.push(`  ${typeName.padEnd(25)} ${String(count).padStart(6)} mods (${percentage}%)`);
  }
  results.push('');

  // ============================================
  // 2. Identify mods with NULL contentType
  // ============================================
  results.push('='.repeat(70));
  results.push('SECTION 2: Mods with NULL contentType');
  results.push('='.repeat(70));
  results.push('');

  const nullContentTypeMods = await prisma.mod.findMany({
    where: { contentType: null },
    select: { id: true, title: true, category: true, source: true },
    take: 50,
  });

  const nullCount = await prisma.mod.count({ where: { contentType: null } });

  results.push(`Total mods with NULL contentType: ${nullCount}`);
  results.push('');
  results.push('Sample of mods with NULL contentType (up to 50):');
  results.push('-'.repeat(70));

  console.log(`✓ Found ${nullCount} mods with NULL contentType`);

  for (const mod of nullContentTypeMods) {
    results.push(`  ID: ${mod.id}`);
    results.push(`  Title: ${mod.title}`);
    results.push(`  Legacy Category: ${mod.category}`);
    results.push(`  Source: ${mod.source}`);
    results.push('');
  }

  // ============================================
  // 3. Identify content types in use WITHOUT FacetDefinitions
  // ============================================
  results.push('='.repeat(70));
  results.push('SECTION 3: Content Types WITHOUT FacetDefinitions');
  results.push('='.repeat(70));
  results.push('');

  // Get all FacetDefinitions with facetType = 'contentType'
  const facetDefinitions = await prisma.facetDefinition.findMany({
    where: { facetType: 'contentType' },
    select: { value: true, displayName: true },
  });

  const definedContentTypes = new Set(facetDefinitions.map((f) => f.value));

  console.log(`✓ Found ${definedContentTypes.size} FacetDefinitions for contentType`);

  // Get all content types actually in use
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
    results.push('');
    for (const orphan of orphanedContentTypes) {
      results.push(`  ❌ ${orphan.type.padEnd(25)} (${orphan.count} mods)`);
    }
    console.log(`✓ Found ${orphanedContentTypes.length} orphaned content types`);
  } else {
    results.push('All content types have FacetDefinitions ✓');
    console.log(`✓ No orphaned content types found`);
  }
  results.push('');

  // Also check for FacetDefinitions that have no mods
  const unusedFacetDefinitions = facetDefinitions.filter(
    (f) => !usedContentTypes.includes(f.value)
  );

  if (unusedFacetDefinitions.length > 0) {
    results.push(`FacetDefinitions with NO mods using them:`);
    for (const unused of unusedFacetDefinitions) {
      results.push(`  ⚠️  ${unused.value.padEnd(25)} (${unused.displayName})`);
    }
    results.push('');
  }

  // ============================================
  // 4. Sample 20 mods from each contentType
  // ============================================
  results.push('='.repeat(70));
  results.push('SECTION 4: Sample Mods by Content Type (20 per type)');
  results.push('='.repeat(70));
  results.push('');

  console.log('✓ Sampling 20 mods from each contentType...');

  for (const ct of contentTypeCounts) {
    const typeName = ct.contentType || '(NULL)';
    results.push('-'.repeat(70));
    results.push(`Content Type: ${typeName} (${ct._count.id} total)`);
    results.push('-'.repeat(70));

    const samples = await prisma.mod.findMany({
      where: { contentType: ct.contentType },
      select: { id: true, title: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    for (let i = 0; i < samples.length; i++) {
      const mod = samples[i];
      results.push(`  ${(i + 1).toString().padStart(2)}. ${mod.title}`);
    }
    results.push('');
  }

  // ============================================
  // Summary Statistics
  // ============================================
  results.push('='.repeat(70));
  results.push('SUMMARY');
  results.push('='.repeat(70));
  results.push('');
  results.push(`Total mods: ${totalMods}`);
  results.push(`Unique content types (including NULL): ${contentTypeCounts.length}`);
  results.push(`Mods with NULL contentType: ${nullCount} (${((nullCount / totalMods) * 100).toFixed(1)}%)`);
  results.push(`Content types WITHOUT FacetDefinitions: ${orphanedContentTypes.length}`);
  results.push(`FacetDefinitions without mods: ${unusedFacetDefinitions.length}`);
  results.push('');

  if (orphanedContentTypes.length > 0) {
    results.push('Orphaned content types needing FacetDefinitions:');
    for (const orphan of orphanedContentTypes) {
      results.push(`  - ${orphan.type}`);
    }
  }

  // Save results to file
  const outputDir = path.join(__dirname, '..', 'ralph');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'ctb-audit-report.txt');
  const reportContent = results.join('\n');
  fs.writeFileSync(outputPath, reportContent);

  console.log('\n' + '='.repeat(70));
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log('='.repeat(70) + '\n');

  // Also print the summary to console
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
