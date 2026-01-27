#!/usr/bin/env npx tsx
/**
 * FC-001: Facet Audit Script
 *
 * Reports the current state of facet data across all mods to establish
 * a baseline for measuring cleanup progress.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Clothing-related contentTypes that CAN have gender
const CLOTHING_CONTENT_TYPES = [
  'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes',
  'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails',
  'tattoos', 'glasses', 'hats'
];

async function runAudit() {
  console.log('🔍 Starting Facet Data Audit...\n');

  const results: string[] = [];
  const timestamp = new Date().toISOString();
  results.push(`Facet Data Audit Report`);
  results.push(`Generated: ${timestamp}`);
  results.push('='.repeat(60));
  results.push('');

  // Get total mod count
  const totalMods = await prisma.mod.count();
  results.push(`Total Mods: ${totalMods}`);
  results.push('');

  // 1. Count mods with null contentType
  const nullContentType = await prisma.mod.count({
    where: { contentType: null }
  });
  results.push(`Mods with null contentType: ${nullContentType} (${((nullContentType / totalMods) * 100).toFixed(1)}%)`);
  console.log(`✓ Null contentType: ${nullContentType}`);

  // 2. Count mods with null visualStyle
  const nullVisualStyle = await prisma.mod.count({
    where: { visualStyle: null }
  });
  results.push(`Mods with null visualStyle: ${nullVisualStyle} (${((nullVisualStyle / totalMods) * 100).toFixed(1)}%)`);
  console.log(`✓ Null visualStyle: ${nullVisualStyle}`);

  // 3. Count mods with empty genderOptions
  const emptyGenderOptions = await prisma.mod.count({
    where: { genderOptions: { isEmpty: true } }
  });
  results.push(`Mods with empty genderOptions: ${emptyGenderOptions} (${((emptyGenderOptions / totalMods) * 100).toFixed(1)}%)`);
  console.log(`✓ Empty genderOptions: ${emptyGenderOptions}`);

  // 4. Count non-clothing mods that have gender set (should be zero)
  const nonClothingWithGender = await prisma.mod.count({
    where: {
      AND: [
        { genderOptions: { isEmpty: false } },
        {
          OR: [
            { contentType: null },
            { contentType: { notIn: CLOTHING_CONTENT_TYPES } }
          ]
        }
      ]
    }
  });
  results.push(`Non-clothing mods with gender set: ${nonClothingWithGender}`);
  console.log(`✓ Non-clothing with gender: ${nonClothingWithGender}`);

  // 5. Count mods with goth theme
  const gothTheme = await prisma.mod.count({
    where: { themes: { has: 'goth' } }
  });
  results.push(`Mods with goth theme: ${gothTheme}`);
  console.log(`✓ Goth theme: ${gothTheme}`);

  // Additional useful metrics
  results.push('');
  results.push('--- Additional Metrics ---');
  results.push('');

  // Empty themes
  const emptyThemes = await prisma.mod.count({
    where: { themes: { isEmpty: true } }
  });
  results.push(`Mods with empty themes: ${emptyThemes} (${((emptyThemes / totalMods) * 100).toFixed(1)}%)`);

  // Empty ageGroups
  const emptyAgeGroups = await prisma.mod.count({
    where: { ageGroups: { isEmpty: true } }
  });
  results.push(`Mods with empty ageGroups: ${emptyAgeGroups} (${((emptyAgeGroups / totalMods) * 100).toFixed(1)}%)`);

  // Content type breakdown
  results.push('');
  results.push('--- Content Type Breakdown ---');
  const contentTypeCounts = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  for (const ct of contentTypeCounts.slice(0, 20)) {
    const typeName = ct.contentType || '(null)';
    results.push(`  ${typeName}: ${ct._count.id}`);
  }

  // Visual style breakdown
  results.push('');
  results.push('--- Visual Style Breakdown ---');
  const visualStyleCounts = await prisma.mod.groupBy({
    by: ['visualStyle'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  for (const vs of visualStyleCounts) {
    const styleName = vs.visualStyle || '(null)';
    results.push(`  ${styleName}: ${vs._count.id}`);
  }

  // Gender breakdown for clothing items
  results.push('');
  results.push('--- Gender Options for Clothing Items ---');
  const clothingMods = await prisma.mod.findMany({
    where: { contentType: { in: CLOTHING_CONTENT_TYPES } },
    select: { genderOptions: true }
  });

  const genderStats = {
    masculine: 0,
    feminine: 0,
    both: 0,
    empty: 0
  };

  for (const mod of clothingMods) {
    if (mod.genderOptions.length === 0) {
      genderStats.empty++;
    } else if (mod.genderOptions.includes('masculine') && mod.genderOptions.includes('feminine')) {
      genderStats.both++;
    } else if (mod.genderOptions.includes('masculine')) {
      genderStats.masculine++;
    } else if (mod.genderOptions.includes('feminine')) {
      genderStats.feminine++;
    }
  }

  results.push(`  Masculine only: ${genderStats.masculine}`);
  results.push(`  Feminine only: ${genderStats.feminine}`);
  results.push(`  Both (unisex): ${genderStats.both}`);
  results.push(`  Empty (needs fix): ${genderStats.empty}`);

  // CAS items missing age groups
  results.push('');
  results.push('--- CAS Items Missing Age Groups ---');
  const casWithoutAge = await prisma.mod.count({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      ageGroups: { isEmpty: true }
    }
  });
  results.push(`  CAS items with empty ageGroups: ${casWithoutAge}`);

  // Save results to file
  const outputPath = path.join(__dirname, 'facet-audit-results.txt');
  const reportContent = results.join('\n');
  fs.writeFileSync(outputPath, reportContent);

  console.log('\n' + '='.repeat(60));
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log('='.repeat(60) + '\n');
  console.log(reportContent);

  await prisma.$disconnect();
}

runAudit().catch(async (e) => {
  console.error('Audit failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
