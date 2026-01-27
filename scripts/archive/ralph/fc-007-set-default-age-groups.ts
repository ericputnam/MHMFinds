#!/usr/bin/env npx tsx
/**
 * FC-007: Set default ageGroups for CAS items
 *
 * CAS items without ageGroups should default to common ages.
 * Check title/tags for specific age mentions, otherwise default to teen-elder.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CAS content types that should have age groups
const CAS_CONTENT_TYPES = [
  'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes',
  'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails',
  'tattoos', 'glasses', 'hats'
];

// Age detection patterns (from acceptance criteria)
const AGE_PATTERNS: { patterns: RegExp[]; ageGroup: string }[] = [
  // Infant
  {
    patterns: [/\binfant\b/i, /\bnewborn\b/i, /\bbaby\b/i],
    ageGroup: 'infant'
  },
  // Toddler (from AC: toddler, tot, td)
  {
    patterns: [/\btoddler\b/i, /\btot\b/i, /\btd\b/i, /\btoddlers?\b/i],
    ageGroup: 'toddler'
  },
  // Child (from AC: child, kid)
  {
    patterns: [/\bchild\b/i, /\bkid\b/i, /\bchildren\b/i, /\bkids\b/i],
    ageGroup: 'child'
  },
  // Teen (from AC: teen)
  {
    patterns: [/\bteen\b/i, /\bteens\b/i, /\bteenage\b/i, /\badolescent\b/i],
    ageGroup: 'teen'
  },
  // Elder (from AC: elder)
  {
    patterns: [/\belder\b/i, /\belders\b/i, /\belderly\b/i, /\bsenior\b/i],
    ageGroup: 'elder'
  }
];

// Default ages for most CAS items (teen through elder)
const DEFAULT_AGES = ['teen', 'young-adult', 'adult', 'elder'];

// All ages pattern (for items that explicitly support all ages)
const ALL_AGES_PATTERNS = [
  /\ball ages\b/i,
  /\ball-ages\b/i,
  /\bevery age\b/i,
  /\ball life stages\b/i
];

const ALL_AGES = ['infant', 'toddler', 'child', 'teen', 'young-adult', 'adult', 'elder'];

/**
 * Detect age groups from text
 */
function detectAgeGroups(title: string, description: string | null, tags: string[]): string[] {
  const text = title + ' ' + (description || '') + ' ' + tags.join(' ');

  // Check for "all ages" first
  if (ALL_AGES_PATTERNS.some(p => p.test(text))) {
    return ALL_AGES;
  }

  // Check for specific ages
  const detectedAges: string[] = [];
  for (const { patterns, ageGroup } of AGE_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      detectedAges.push(ageGroup);
    }
  }

  // If specific ages detected, return those
  // If only young ages detected (toddler, child, infant), return only those
  // If only teen+ detected, add the full teen-elder range
  if (detectedAges.length > 0) {
    const hasYoungOnly = detectedAges.every(a => ['infant', 'toddler', 'child'].includes(a));
    if (hasYoungOnly) {
      return detectedAges;
    }

    // If teen or elder mentioned, they probably meant the full adult range
    if (detectedAges.includes('teen') || detectedAges.includes('elder')) {
      // Combine detected with default range
      const combined = new Set([...detectedAges, ...DEFAULT_AGES]);
      return Array.from(combined);
    }

    return detectedAges;
  }

  // No specific age detected - return default (teen through elder)
  return DEFAULT_AGES;
}

async function setDefaultAgeGroups() {
  console.log('🔧 FC-007: Set default ageGroups for CAS items\n');

  // Find CAS mods with empty ageGroups
  const casMods = await prisma.mod.findMany({
    where: {
      contentType: { in: CAS_CONTENT_TYPES },
      ageGroups: { isEmpty: true }
    },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      contentType: true
    }
  });

  console.log(`Found ${casMods.length} CAS mods with empty ageGroups\n`);

  const stats = {
    detectedSpecific: 0,
    defaultApplied: 0,
    byAge: {} as Record<string, number>
  };

  const updates: { id: string; ageGroups: string[]; title: string }[] = [];

  for (const mod of casMods) {
    const ageGroups = detectAgeGroups(mod.title, mod.description, mod.tags);

    // Track if it was a specific detection or default
    const isDefault = JSON.stringify(ageGroups.sort()) === JSON.stringify(DEFAULT_AGES.sort());
    if (isDefault) {
      stats.defaultApplied++;
    } else {
      stats.detectedSpecific++;
    }

    // Track age group distribution
    for (const age of ageGroups) {
      stats.byAge[age] = (stats.byAge[age] || 0) + 1;
    }

    updates.push({ id: mod.id, ageGroups, title: mod.title });
  }

  console.log('--- Detection Results ---');
  console.log(`  Specific age detected: ${stats.detectedSpecific}`);
  console.log(`  Default applied: ${stats.defaultApplied}`);

  console.log('\n--- Age Group Distribution ---');
  const sortedAges = Object.entries(stats.byAge).sort((a, b) => b[1] - a[1]);
  for (const [age, count] of sortedAges) {
    console.log(`  ${age}: ${count}`);
  }

  // Show sample of specific detections
  const specificDetections = updates.filter(u =>
    JSON.stringify(u.ageGroups.sort()) !== JSON.stringify(DEFAULT_AGES.sort())
  );
  if (specificDetections.length > 0) {
    console.log('\n--- Sample Specific Age Detections (first 15) ---');
    for (const item of specificDetections.slice(0, 15)) {
      console.log(`  - "${item.title.substring(0, 45)}..." -> [${item.ageGroups.join(', ')}]`);
    }
  }

  // Apply updates
  console.log('\n🔧 Applying updates...');
  let updated = 0;
  for (const update of updates) {
    await prisma.mod.update({
      where: { id: update.id },
      data: { ageGroups: update.ageGroups }
    });
    updated++;
    if (updated % 500 === 0) {
      console.log(`  Progress: ${updated}/${updates.length}`);
    }
  }

  console.log(`\n✅ Updated ${updated} mods`);

  // Verify
  const remainingEmpty = await prisma.mod.count({
    where: {
      contentType: { in: CAS_CONTENT_TYPES },
      ageGroups: { isEmpty: true }
    }
  });
  console.log(`📊 CAS mods with empty ageGroups remaining: ${remainingEmpty}`);

  await prisma.$disconnect();
}

setDefaultAgeGroups().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
