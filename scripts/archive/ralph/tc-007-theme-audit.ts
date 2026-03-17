#!/usr/bin/env npx tsx
/**
 * TC-007: Audit theme distribution and identify over-applied themes
 *
 * Analyze which themes have suspiciously high counts and may need further cleanup.
 * For each high-count theme (>500), sample 20 random mods and check if theme is accurate.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Theme validation patterns - for spot checking accuracy
const THEME_VALIDATION_PATTERNS: Record<string, RegExp[]> = {
  goth: [
    /\bgoth(ic)?\b/i,
    /\bvampire\b/i,
    /\bdark\s*romantic\b/i,
    /\bskull\b/i,
    /\bpunk\b/i,
    /\bgrunge\b/i,
  ],
  cottagecore: [
    /\bcottage(core)?\b/i,
    /\bfarmhouse\b/i,
    /\brushtic\b/i,
    /\bfloral\b/i,
    /\bvintage\b/i,
    /\bpastoral\b/i,
    /\bcountry\b/i,
  ],
  cozy: [
    /\bcozy\b/i,
    /\bcosy\b/i,
    /\bhygge\b/i,
    /\bsweater\b/i,
    /\bblanket\b/i,
    /\bfireplace\b/i,
    /\bwarm(th)?\b/i,
    /\bwinter\b/i,
  ],
  romantic: [
    /\bromantic\b/i,
    /\bromance\b/i,
    /\bcouple\b/i,
    /\bwedding\b/i,
    /\bdate\b/i,
    /\bkiss\b/i,
    /\blove\b/i,
  ],
  minimalist: [
    /\bminimalist\b/i,
    /\bminimal\b/i,
    /\bsimple\b/i,
    /\bclean\b/i,
    /\bsleek\b/i,
    /\bmodern\b/i,
  ],
  boho: [
    /\bboho\b/i,
    /\bbohemian\b/i,
    /\bfree\s*spirit\b/i,
    /\bmacrame\b/i,
    /\brattan\b/i,
    /\bwicker\b/i,
  ],
  christmas: [
    /\bchristmas\b/i,
    /\bxmas\b/i,
    /\bsanta\b/i,
    /\breindeer\b/i,
    /\bornament\b/i,
    /\bstocking\b/i,
  ],
  halloween: [
    /\bhalloween\b/i,
    /\bspooky\b/i,
    /\bwitch\b/i,
    /\bghost\b/i,
    /\bpumpkin\b/i,
    /\bskeleton\b/i,
  ],
  valentines: [
    /\bvalentine\b/i,
    /\bcupid\b/i,
    /\bheart\b/i,
    /\blove\s*day\b/i,
  ],
  'mid-century-modern': [
    /\bmid\s*century\b/i,
    /\bmodernist\b/i,
    /\bretro\b/i,
    /\b50s\b/i,
    /\b60s\b/i,
  ],
  industrial: [
    /\bindustrial\b/i,
    /\bmetal\b/i,
    /\bfactory\b/i,
    /\bloft\b/i,
    /\bexposed\s*(brick|pipe)\b/i,
  ],
  luxury: [
    /\bluxury\b/i,
    /\bluxurious\b/i,
    /\belegant\b/i,
    /\bopulent\b/i,
    /\bhigh\s*end\b/i,
    /\bpremium\b/i,
  ],
  fall: [
    /\bfall\b/i,
    /\bautumn\b/i,
    /\bharvest\b/i,
    /\bleav(e)?s\b/i,
    /\borange\b/i,
  ],
  winter: [
    /\bwinter\b/i,
    /\bsnow\b/i,
    /\bice\b/i,
    /\bfrost\b/i,
    /\bcold\b/i,
  ],
  summer: [
    /\bsummer\b/i,
    /\bbeach\b/i,
    /\btropical\b/i,
    /\bsun\b/i,
    /\bswim\b/i,
  ],
  spring: [
    /\bspring\b/i,
    /\bblossom\b/i,
    /\bflower\b/i,
    /\bpastel\b/i,
    /\beaster\b/i,
  ],
};

interface ThemeStats {
  theme: string;
  count: number;
  sampleMods: { title: string; hasValidIndicators: boolean; matchedPatterns: string[] }[];
  accuracyPercentage: number;
}

/**
 * Check if a mod has valid indicators for a theme
 */
function checkThemeValidity(
  theme: string,
  title: string,
  description: string | null,
  tags: string[]
): { isValid: boolean; matches: string[] } {
  const patterns = THEME_VALIDATION_PATTERNS[theme];
  if (!patterns) {
    // No validation patterns defined - assume valid
    return { isValid: true, matches: ['no patterns defined'] };
  }

  const combinedText = [title, description || '', ...tags].join(' ');
  const matches: string[] = [];

  for (const pattern of patterns) {
    const match = combinedText.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  return { isValid: matches.length > 0, matches };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function auditThemes() {
  console.log('🔧 TC-007: Audit theme distribution and identify over-applied themes\n');

  // Get all unique themes and their counts
  const allMods = await prisma.mod.findMany({
    where: {
      themes: { isEmpty: false },
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  // Count themes
  const themeCounts: Record<string, number> = {};
  for (const mod of allMods) {
    for (const theme of mod.themes) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  }

  // Sort by count (descending)
  const sortedThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('📊 Theme Distribution:\n');
  console.log('Theme                          Count    Status');
  console.log('-'.repeat(55));

  for (const [theme, count] of sortedThemes) {
    const status = count > 500 ? '⚠️  HIGH' : count > 200 ? '📋 MODERATE' : '✅ OK';
    console.log(`${theme.padEnd(30)} ${count.toString().padStart(5)}    ${status}`);
  }

  // Identify high-count themes (>500) for sampling
  const highCountThemes = sortedThemes.filter(([, count]) => count > 500);

  console.log(`\n\n📊 Detailed Analysis of High-Count Themes (>500):\n`);

  const themeStats: ThemeStats[] = [];

  for (const [theme] of highCountThemes) {
    // Get all mods with this theme
    const modsWithTheme = allMods.filter((m) => m.themes.includes(theme));

    // Sample 20 random mods
    const shuffled = shuffleArray(modsWithTheme);
    const sample = shuffled.slice(0, 20);

    const sampleResults: ThemeStats['sampleMods'] = [];
    let validCount = 0;

    for (const mod of sample) {
      const { isValid, matches } = checkThemeValidity(theme, mod.title, mod.description, mod.tags);
      if (isValid) validCount++;
      sampleResults.push({
        title: mod.title,
        hasValidIndicators: isValid,
        matchedPatterns: matches,
      });
    }

    const accuracy = (validCount / sample.length) * 100;

    themeStats.push({
      theme,
      count: modsWithTheme.length,
      sampleMods: sampleResults,
      accuracyPercentage: accuracy,
    });

    console.log(`\n--- ${theme.toUpperCase()} (${modsWithTheme.length} mods) ---`);
    console.log(`Sample Accuracy: ${accuracy.toFixed(1)}% (${validCount}/${sample.length} valid)\n`);

    console.log('Sample mods:');
    for (const result of sampleResults.slice(0, 10)) {
      const status = result.hasValidIndicators ? '✓' : '✗';
      console.log(`  ${status} "${result.title.substring(0, 50)}${result.title.length > 50 ? '...' : ''}"`);
      if (result.hasValidIndicators && result.matchedPatterns.length > 0) {
        console.log(`      Matches: ${result.matchedPatterns.join(', ')}`);
      }
    }
    if (sampleResults.length > 10) {
      const remainingValid = sampleResults.slice(10).filter((r) => r.hasValidIndicators).length;
      const remainingInvalid = sampleResults.slice(10).filter((r) => !r.hasValidIndicators).length;
      console.log(`  ... and ${remainingValid} more valid, ${remainingInvalid} more invalid`);
    }
  }

  // Summary and recommendations
  console.log('\n\n📋 SUMMARY AND RECOMMENDATIONS:\n');
  console.log('Theme                   Count    Accuracy    Recommendation');
  console.log('-'.repeat(70));

  const needsCleanup: string[] = [];

  for (const stat of themeStats) {
    let recommendation: string;
    if (stat.accuracyPercentage >= 80) {
      recommendation = '✅ Acceptable';
    } else if (stat.accuracyPercentage >= 60) {
      recommendation = '📋 Monitor';
    } else {
      recommendation = '⚠️  NEEDS CLEANUP';
      needsCleanup.push(stat.theme);
    }

    console.log(
      `${stat.theme.padEnd(23)} ${stat.count.toString().padStart(5)}    ${stat.accuracyPercentage.toFixed(1).padStart(6)}%    ${recommendation}`
    );
  }

  console.log('\n\nThemes that may need additional cleanup scripts:');
  if (needsCleanup.length === 0) {
    console.log('  ✅ All high-count themes have acceptable accuracy (>60%)');
  } else {
    for (const theme of needsCleanup) {
      console.log(`  - ${theme}`);
    }
  }

  // Save results to file
  const outputPath = path.join(__dirname, 'theme-audit-results.txt');
  const output = [
    'TC-007: Theme Distribution Audit Results',
    '=' .repeat(50),
    '',
    'Theme Distribution:',
    '',
    ...sortedThemes.map(([theme, count]) => `${theme}: ${count}`),
    '',
    '',
    'High-Count Themes Analysis (>500 mods):',
    '',
    ...themeStats.map((stat) => [
      `${stat.theme}:`,
      `  Count: ${stat.count}`,
      `  Sample Accuracy: ${stat.accuracyPercentage.toFixed(1)}%`,
      `  Status: ${stat.accuracyPercentage >= 80 ? 'Acceptable' : stat.accuracyPercentage >= 60 ? 'Monitor' : 'NEEDS CLEANUP'}`,
      '',
    ].join('\n')),
    '',
    'Themes Needing Additional Cleanup:',
    needsCleanup.length === 0 ? '  None - all acceptable' : needsCleanup.map((t) => `  - ${t}`).join('\n'),
  ].join('\n');

  fs.writeFileSync(outputPath, output);
  console.log(`\n\n📄 Results saved to: ${outputPath}`);

  await prisma.$disconnect();
}

auditThemes().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
