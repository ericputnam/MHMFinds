#!/usr/bin/env npx tsx
/**
 * TC-001: Clean up seasonal theme conflicts
 *
 * Mods should not have conflicting seasonal themes (e.g., both Christmas AND Valentine's).
 * For each conflicting mod, analyze title/description/tags to determine correct theme.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Christmas indicators
const CHRISTMAS_PATTERNS = [
  /\bchristmas\b/i,
  /\bxmas\b/i,
  /\bsanta\b/i,
  /\breindeer\b/i,
  /\bsnowman\b/i,
  /\bornament\b/i,
  /\bchristmas\s*tree\b/i,
  /\bgift\s*box(es)?\b/i,
  /\bpresent(s)?\b/i,
  /\bholiday\s*decor\b/i,
  /\bjingle\b/i,
  /\bcandy\s*cane\b/i,
  /\bnutcracker\b/i,
  /\bgingerbread\b/i,
  /\belf\b/i,
  /\belves\b/i,
  /\bnoel\b/i,
  /\byuletide\b/i,
  /\bfestive\b/i,
  /\bcarol\b/i,
  /\bstocking\b/i,
  /\bmistletoe\b/i,
  /\bwreath\b/i,
];

// Valentine's indicators
const VALENTINES_PATTERNS = [
  /\bvalentine'?s?\b/i,
  /\bheart\s*(shaped?|pattern|print|motif)\b/i,
  /\bcupid\b/i,
  /\blovely\b/i,
  /\blove\s*(day|letter|note)\b/i,
  /\bsweet\s*heart\b/i,
  /\bsweetheart\b/i,
  /\bbemy\s*valentine\b/i,
  /\bxoxo\b/i,
  /\bhugs?\s*(and|&|n)\s*kisses?\b/i,
  /\bheart(s)?\b/i, // hearts in isolation
];

// Halloween indicators
const HALLOWEEN_PATTERNS = [
  /\bhalloween\b/i,
  /\bspooky\b/i,
  /\bwitch(es|y)?\b/i,
  /\bghost(s|ly)?\b/i,
  /\bpumpkin(s)?\b/i,
  /\bskeleton(s)?\b/i,
  /\bzombie(s)?\b/i,
  /\bhaunted\b/i,
  /\btrick\s*(or|n)\s*treat\b/i,
  /\bscary\b/i,
  /\bhorror\b/i,
  /\bmonster(s)?\b/i,
  /\bcobweb(s)?\b/i,
  /\bspider(s)?\b/i,
  /\bbat(s)?\b/i,
  /\bcostume\b/i,
  /\bjack\s*o\s*lantern\b/i,
  /\bcandycorn\b/i,
  /\bcandy\s*corn\b/i,
  /\bfrankenstein\b/i,
  /\bdracula\b/i,
  /\bmummy\b/i,
  /\bcemetery\b/i,
  /\bgraveyard\b/i,
];

type SeasonalTheme = 'christmas' | 'valentines' | 'halloween';

interface ThemeScore {
  theme: SeasonalTheme;
  score: number;
  matches: string[];
}

/**
 * Calculate how strongly a text matches a seasonal theme
 */
function scoreTheme(
  text: string,
  patterns: RegExp[],
  themeName: SeasonalTheme
): ThemeScore {
  const matches: string[] = [];
  let score = 0;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      score += 1;
      matches.push(match[0]);
    }
  }

  return { theme: themeName, score, matches };
}

/**
 * Determine which seasonal theme is correct for a mod
 */
function determineCorrectTheme(
  title: string,
  description: string | null,
  tags: string[]
): { keep: SeasonalTheme[]; remove: SeasonalTheme[]; reason: string } {
  const combinedText = [title, description || '', ...tags].join(' ');

  const christmasScore = scoreTheme(combinedText, CHRISTMAS_PATTERNS, 'christmas');
  const valentinesScore = scoreTheme(combinedText, VALENTINES_PATTERNS, 'valentines');
  const halloweenScore = scoreTheme(combinedText, HALLOWEEN_PATTERNS, 'halloween');

  const scores = [christmasScore, valentinesScore, halloweenScore].filter(
    (s) => s.score > 0
  );

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    // No indicators found - keep none
    return {
      keep: [],
      remove: ['christmas', 'valentines', 'halloween'],
      reason: 'No seasonal indicators found',
    };
  }

  if (scores.length === 1) {
    // Only one theme has matches - keep it
    return {
      keep: [scores[0].theme],
      remove: ['christmas', 'valentines', 'halloween'].filter(
        (t) => t !== scores[0].theme
      ) as SeasonalTheme[],
      reason: `Only ${scores[0].theme} indicators found: ${scores[0].matches.join(', ')}`,
    };
  }

  // Multiple themes have matches - keep the one with highest score
  const winner = scores[0];
  const losers = scores.slice(1);

  // If it's a close call (within 1 point), report uncertainty
  if (losers.some((l) => l.score >= winner.score - 1)) {
    return {
      keep: [winner.theme],
      remove: losers.map((l) => l.theme),
      reason: `Close call - keeping ${winner.theme} (${winner.score} matches: ${winner.matches.join(', ')}) over ${losers.map((l) => `${l.theme} (${l.score})`).join(', ')}`,
    };
  }

  return {
    keep: [winner.theme],
    remove: losers.map((l) => l.theme),
    reason: `Clear winner: ${winner.theme} (${winner.score} matches) vs ${losers.map((l) => `${l.theme} (${l.score})`).join(', ')}`,
  };
}

async function cleanupSeasonalConflicts() {
  console.log('🔧 TC-001: Clean up seasonal theme conflicts\n');

  // Find mods with Christmas AND Valentine's
  const christmasValentines = await prisma.mod.findMany({
    where: {
      AND: [{ themes: { has: 'christmas' } }, { themes: { has: 'valentines' } }],
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  // Find mods with Christmas AND Halloween
  const christmasHalloween = await prisma.mod.findMany({
    where: {
      AND: [{ themes: { has: 'christmas' } }, { themes: { has: 'halloween' } }],
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  // Find mods with Halloween AND Valentine's
  const halloweenValentines = await prisma.mod.findMany({
    where: {
      AND: [{ themes: { has: 'halloween' } }, { themes: { has: 'valentines' } }],
    },
    select: { id: true, title: true, description: true, tags: true, themes: true },
  });

  console.log('--- Conflict Counts ---');
  console.log(`  Christmas + Valentine's: ${christmasValentines.length}`);
  console.log(`  Christmas + Halloween: ${christmasHalloween.length}`);
  console.log(`  Halloween + Valentine's: ${halloweenValentines.length}`);

  // Combine all conflicts (deduplicated by id)
  const allConflicts = new Map<
    string,
    {
      id: string;
      title: string;
      description: string | null;
      tags: string[];
      themes: string[];
    }
  >();
  [...christmasValentines, ...christmasHalloween, ...halloweenValentines].forEach(
    (mod) => {
      allConflicts.set(mod.id, mod);
    }
  );

  console.log(`\n  Total unique mods with conflicts: ${allConflicts.size}\n`);

  if (allConflicts.size === 0) {
    console.log('✅ No seasonal theme conflicts found!');
    await prisma.$disconnect();
    return;
  }

  // Analyze and fix each conflict
  const fixes: {
    id: string;
    title: string;
    keep: SeasonalTheme[];
    remove: SeasonalTheme[];
    reason: string;
  }[] = [];

  for (const mod of Array.from(allConflicts.values())) {
    const analysis = determineCorrectTheme(mod.title, mod.description, mod.tags);

    // Only add to fixes if there's something to remove
    const toRemove = analysis.remove.filter((t) => mod.themes.includes(t));
    if (toRemove.length > 0) {
      fixes.push({
        id: mod.id,
        title: mod.title,
        keep: analysis.keep.filter((t) => mod.themes.includes(t)),
        remove: toRemove,
        reason: analysis.reason,
      });
    }
  }

  // Show analysis
  console.log('--- Analysis Results ---');
  for (const fix of fixes.slice(0, 30)) {
    console.log(`\n  "${fix.title.substring(0, 60)}${fix.title.length > 60 ? '...' : ''}"`);
    console.log(`    Keep: ${fix.keep.join(', ') || 'none'}`);
    console.log(`    Remove: ${fix.remove.join(', ')}`);
    console.log(`    Reason: ${fix.reason}`);
  }
  if (fixes.length > 30) {
    console.log(`\n  ... and ${fixes.length - 30} more`);
  }

  // Apply fixes
  console.log('\n🔧 Applying fixes...');
  let christmasRemoved = 0;
  let valentinesRemoved = 0;
  let halloweenRemoved = 0;

  for (const fix of fixes) {
    const mod = await prisma.mod.findUnique({
      where: { id: fix.id },
      select: { themes: true },
    });

    if (mod) {
      const newThemes = mod.themes.filter((t) => !fix.remove.includes(t as SeasonalTheme));
      await prisma.mod.update({
        where: { id: fix.id },
        data: { themes: newThemes },
      });

      if (fix.remove.includes('christmas')) christmasRemoved++;
      if (fix.remove.includes('valentines')) valentinesRemoved++;
      if (fix.remove.includes('halloween')) halloweenRemoved++;
    }
  }

  console.log('\n--- Fix Summary ---');
  console.log(`  Christmas removed: ${christmasRemoved}`);
  console.log(`  Valentine's removed: ${valentinesRemoved}`);
  console.log(`  Halloween removed: ${halloweenRemoved}`);
  console.log(`  Total mods fixed: ${fixes.length}`);

  // Verify - re-check for conflicts
  const remainingChristmasValentines = await prisma.mod.count({
    where: {
      AND: [{ themes: { has: 'christmas' } }, { themes: { has: 'valentines' } }],
    },
  });
  const remainingChristmasHalloween = await prisma.mod.count({
    where: {
      AND: [{ themes: { has: 'christmas' } }, { themes: { has: 'halloween' } }],
    },
  });
  const remainingHalloweenValentines = await prisma.mod.count({
    where: {
      AND: [{ themes: { has: 'halloween' } }, { themes: { has: 'valentines' } }],
    },
  });

  console.log('\n📊 Remaining conflicts:');
  console.log(`  Christmas + Valentine's: ${remainingChristmasValentines}`);
  console.log(`  Christmas + Halloween: ${remainingChristmasHalloween}`);
  console.log(`  Halloween + Valentine's: ${remainingHalloweenValentines}`);

  await prisma.$disconnect();
}

cleanupSeasonalConflicts().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
