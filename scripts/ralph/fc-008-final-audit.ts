#!/usr/bin/env npx tsx
/**
 * FC-008: Final Facet Audit and Validation
 *
 * Re-runs the audit to verify improvements and compare to baseline.
 * Documents improvement percentages and identifies remaining issues.
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

// Baseline from FC-001 audit
const BASELINE = {
  totalMods: 9989,
  nullContentType: 19,
  nullVisualStyle: 7940,
  emptyGenderOptions: 5819,
  nonClothingWithGender: 8,
  gothTheme: 232,
  emptyThemes: 4025,
  emptyAgeGroups: 8140,
  casWithoutAge: 5448,
  clothingGender: {
    masculine: 582,
    feminine: 2772,
    both: 442,
    empty: 2731
  }
};

function calculateImprovement(baseline: number, current: number, lowerIsBetter: boolean = true): string {
  const diff = baseline - current;
  const pct = ((Math.abs(diff) / baseline) * 100).toFixed(1);

  if (lowerIsBetter) {
    if (diff > 0) return `Improved by ${diff} (-${pct}%)`;
    if (diff < 0) return `Worsened by ${Math.abs(diff)} (+${pct}%)`;
  } else {
    if (diff < 0) return `Improved by ${Math.abs(diff)} (+${pct}%)`;
    if (diff > 0) return `Worsened by ${diff} (-${pct}%)`;
  }
  return 'No change';
}

async function runFinalAudit() {
  console.log('🔍 FC-008: Final Facet Audit and Validation\n');

  const results: string[] = [];
  const timestamp = new Date().toISOString();
  results.push('='.repeat(70));
  results.push('FINAL FACET AUDIT REPORT - Comparison with Baseline');
  results.push('='.repeat(70));
  results.push(`Generated: ${timestamp}`);
  results.push(`Baseline from: FC-001 audit`);
  results.push('');

  // Get total mod count
  const totalMods = await prisma.mod.count();
  results.push(`Total Mods: ${totalMods} (baseline: ${BASELINE.totalMods})`);
  results.push('');

  results.push('-'.repeat(70));
  results.push('CORE METRICS COMPARISON');
  results.push('-'.repeat(70));
  results.push('');

  // 1. Null contentType
  const nullContentType = await prisma.mod.count({ where: { contentType: null } });
  results.push(`Mods with null contentType:`);
  results.push(`  Current: ${nullContentType} (${((nullContentType / totalMods) * 100).toFixed(1)}%)`);
  results.push(`  Baseline: ${BASELINE.nullContentType} (${((BASELINE.nullContentType / BASELINE.totalMods) * 100).toFixed(1)}%)`);
  results.push(`  ${calculateImprovement(BASELINE.nullContentType, nullContentType)}`);
  results.push('');

  // 2. Null visualStyle
  const nullVisualStyle = await prisma.mod.count({ where: { visualStyle: null } });
  results.push(`Mods with null visualStyle:`);
  results.push(`  Current: ${nullVisualStyle} (${((nullVisualStyle / totalMods) * 100).toFixed(1)}%)`);
  results.push(`  Baseline: ${BASELINE.nullVisualStyle} (${((BASELINE.nullVisualStyle / BASELINE.totalMods) * 100).toFixed(1)}%)`);
  results.push(`  ${calculateImprovement(BASELINE.nullVisualStyle, nullVisualStyle)}`);
  results.push('');

  // 3. Empty genderOptions
  const emptyGenderOptions = await prisma.mod.count({ where: { genderOptions: { isEmpty: true } } });
  results.push(`Mods with empty genderOptions:`);
  results.push(`  Current: ${emptyGenderOptions} (${((emptyGenderOptions / totalMods) * 100).toFixed(1)}%)`);
  results.push(`  Baseline: ${BASELINE.emptyGenderOptions} (${((BASELINE.emptyGenderOptions / BASELINE.totalMods) * 100).toFixed(1)}%)`);
  results.push(`  ${calculateImprovement(BASELINE.emptyGenderOptions, emptyGenderOptions)}`);
  results.push('');

  // 4. Non-clothing with gender (FC-002 metric)
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
  results.push(`Non-clothing mods with gender set (FC-002):`);
  results.push(`  Current: ${nonClothingWithGender}`);
  results.push(`  Baseline: ${BASELINE.nonClothingWithGender}`);
  results.push(`  ${calculateImprovement(BASELINE.nonClothingWithGender, nonClothingWithGender)}`);
  results.push('');

  // 5. Goth theme (FC-006 metric)
  const gothTheme = await prisma.mod.count({ where: { themes: { has: 'goth' } } });
  results.push(`Mods with goth theme (FC-006):`);
  results.push(`  Current: ${gothTheme}`);
  results.push(`  Baseline: ${BASELINE.gothTheme}`);
  const gothDiff = BASELINE.gothTheme - gothTheme;
  results.push(`  Removed ${gothDiff} false positive goth tags`);
  results.push('');

  // 6. Empty ageGroups
  const emptyAgeGroups = await prisma.mod.count({ where: { ageGroups: { isEmpty: true } } });
  results.push(`Mods with empty ageGroups:`);
  results.push(`  Current: ${emptyAgeGroups} (${((emptyAgeGroups / totalMods) * 100).toFixed(1)}%)`);
  results.push(`  Baseline: ${BASELINE.emptyAgeGroups} (${((BASELINE.emptyAgeGroups / BASELINE.totalMods) * 100).toFixed(1)}%)`);
  results.push(`  ${calculateImprovement(BASELINE.emptyAgeGroups, emptyAgeGroups)}`);
  results.push('');

  // 7. CAS items without age groups (FC-007 metric)
  const casWithoutAge = await prisma.mod.count({
    where: {
      contentType: { in: CLOTHING_CONTENT_TYPES },
      ageGroups: { isEmpty: true }
    }
  });
  results.push(`CAS items with empty ageGroups (FC-007):`);
  results.push(`  Current: ${casWithoutAge}`);
  results.push(`  Baseline: ${BASELINE.casWithoutAge}`);
  results.push(`  ${calculateImprovement(BASELINE.casWithoutAge, casWithoutAge)}`);
  results.push('');

  // Gender breakdown for clothing
  results.push('-'.repeat(70));
  results.push('CLOTHING GENDER DISTRIBUTION (FC-003)');
  results.push('-'.repeat(70));
  results.push('');

  const clothingMods = await prisma.mod.findMany({
    where: { contentType: { in: CLOTHING_CONTENT_TYPES } },
    select: { genderOptions: true }
  });

  const genderStats = { masculine: 0, feminine: 0, both: 0, empty: 0 };
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

  results.push(`  Masculine only: ${genderStats.masculine} (baseline: ${BASELINE.clothingGender.masculine})`);
  results.push(`  Feminine only: ${genderStats.feminine} (baseline: ${BASELINE.clothingGender.feminine})`);
  results.push(`  Both (unisex): ${genderStats.both} (baseline: ${BASELINE.clothingGender.both})`);
  results.push(`  Empty (unresolved): ${genderStats.empty} (baseline: ${BASELINE.clothingGender.empty})`);
  results.push('');
  const clothingFixed = BASELINE.clothingGender.empty - genderStats.empty;
  results.push(`  Fixed ${clothingFixed} clothing items with empty gender`);
  results.push('');

  // Summary
  results.push('='.repeat(70));
  results.push('SUMMARY OF IMPROVEMENTS');
  results.push('='.repeat(70));
  results.push('');

  const improvements = [
    { task: 'FC-002', desc: 'Non-clothing gender cleanup', baseline: BASELINE.nonClothingWithGender, current: nonClothingWithGender },
    { task: 'FC-003', desc: 'Clothing gender assignment', baseline: BASELINE.clothingGender.empty, current: genderStats.empty },
    { task: 'FC-004', desc: 'Null contentType fix', baseline: BASELINE.nullContentType, current: nullContentType },
    { task: 'FC-005', desc: 'Null visualStyle fix', baseline: BASELINE.nullVisualStyle, current: nullVisualStyle },
    { task: 'FC-006', desc: 'False goth theme cleanup', baseline: BASELINE.gothTheme, current: gothTheme },
    { task: 'FC-007', desc: 'CAS age groups', baseline: BASELINE.casWithoutAge, current: casWithoutAge },
  ];

  for (const imp of improvements) {
    const fixed = imp.baseline - imp.current;
    const pct = imp.baseline > 0 ? ((fixed / imp.baseline) * 100).toFixed(1) : 0;
    const status = imp.current === 0 ? '100% COMPLETE' : `${pct}% improved`;
    results.push(`${imp.task}: ${imp.desc}`);
    results.push(`  ${imp.baseline} -> ${imp.current} (${status})`);
  }

  results.push('');
  results.push('-'.repeat(70));
  results.push('REMAINING ISSUES');
  results.push('-'.repeat(70));
  results.push('');

  if (nullContentType > 0) {
    results.push(`- ${nullContentType} mods still have null contentType (generic titles, hard to classify)`);
  }
  if (nullVisualStyle > 0) {
    results.push(`- ${nullVisualStyle} mods still have null visualStyle (no clear indicators in text)`);
  }
  if (genderStats.empty > 0) {
    results.push(`- ${genderStats.empty} clothing items still have empty genderOptions (no gender indicators)`);
  }
  if (nullContentType === 0 && nullVisualStyle === 0 && genderStats.empty === 0) {
    results.push('No remaining issues - all facet data is complete!');
  }

  results.push('');
  results.push('='.repeat(70));
  results.push('END OF REPORT');
  results.push('='.repeat(70));

  // Save results
  const outputPath = path.join(__dirname, 'facet-final-audit.txt');
  const reportContent = results.join('\n');
  fs.writeFileSync(outputPath, reportContent);

  console.log(reportContent);
  console.log(`\n📄 Results saved to: ${outputPath}`);

  await prisma.$disconnect();
}

runFinalAudit().catch(async (e) => {
  console.error('Final audit failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
