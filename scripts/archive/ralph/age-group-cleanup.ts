#!/usr/bin/env npx tsx
/**
 * AGE-001 through AGE-007: Age Group Deep Cleanup
 *
 * This script audits and fixes age group misclassifications across all mods.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// CAS content types that SHOULD have age groups
const CAS_CONTENT_TYPES = [
  'hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes',
  'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails',
  'tattoos', 'glasses', 'hats', 'preset'
];

// Non-CAS content types that should NOT have age groups
const NON_CAS_CONTENT_TYPES = [
  'furniture', 'decor', 'lot', 'gameplay-mod', 'lighting', 'clutter',
  'plants', 'poses', 'animations', 'script-mod', 'trait', 'career',
  'food', 'ui-preset', 'cas-background', 'loading-screen', 'kitchen',
  'bathroom', 'bedroom', 'outdoor', 'rugs', 'curtains', 'electronics',
  'pet-furniture'
];

// Age detection patterns with strict word boundaries
const TODDLER_PATTERNS = [
  /\btoddler\b/i,
  /\btoddlers\b/i,
  /\btot\b/i,
  /\btots\b/i,
  /\bfor\s+td\b/i,
  /\btd\s+only\b/i,
  /\[td\]/i,
  /\(td\)/i
];

const CHILD_PATTERNS = [
  /\bchild\b/i,
  /\bchildren\b/i,
  /\bkid\b/i,
  /\bkids\b/i,
  /\bfor\s+kids\b/i,
  /\[child\]/i,
  /\(child\)/i,
  /\bchild\s+version\b/i
];

const INFANT_PATTERNS = [
  /\binfant\b/i,
  /\binfants\b/i,
  /\bnewborn\b/i,
  /\bbaby\s+sim\b/i,
  /\bfor\s+infants\b/i,
  /\[infant\]/i,
  /\(infant\)/i
];

const TEEN_PATTERNS = [
  /\bteen\b/i,
  /\bteens\b/i,
  /\bteenager\b/i,
  /\bteenagers\b/i,
  /\bfor\s+teens\b/i,
  /\[teen\]/i,
  /\(teen\)/i
];

const ELDER_PATTERNS = [
  /\belder\b/i,
  /\belders\b/i,
  /\belderly\b/i,
  /\bsenior\b/i,
  /\bseniors\b/i,
  /\bfor\s+elders\b/i,
  /\[elder\]/i,
  /\(elder\)/i
];

// False positive patterns - words that contain age terms but aren't about ages
const TODDLER_FALSE_POSITIVES = [
  /toddler\s*(?:proof|proofing|safe|safety)/i  // toddler-proofing furniture
];

const CHILD_FALSE_POSITIVES = [
  /child(?:hood|ish|like|less)/i,  // childhood, childish, childlike, childless
  /love\s+child/i,  // "love child" - unrelated
  /brain\s+child/i, // brainchild - unrelated
  /child\s+of\s+(?:the|my)/i // poetic expressions
];

const INFANT_FALSE_POSITIVES = [
  /infant(?:ry|ile)/i,  // infantry, infantile
  /baby\s+(?:pink|blue|shower|bump)/i  // colors/events, not age
];

interface AuditResult {
  ageGroup: string;
  totalAudited: number;
  totalFixed: number;
  validKept: number;
  removedMods: { id: string; title: string; reason: string }[];
}

interface CleanupStats {
  toddler: AuditResult;
  child: AuditResult;
  infant: AuditResult;
  teen: AuditResult;
  elder: AuditResult;
  nonCasCleanup: { count: number; details: Record<string, number> };
}

function hasValidAgeIndicators(
  title: string,
  description: string | null,
  tags: string[],
  ageGroup: string
): { valid: boolean; reason: string } {
  const text = `${title} ${description || ''} ${tags.join(' ')}`.toLowerCase();
  const titleLower = title.toLowerCase();

  switch (ageGroup) {
    case 'toddler': {
      // Check for false positives first
      if (TODDLER_FALSE_POSITIVES.some(p => p.test(text))) {
        return { valid: false, reason: 'false positive (toddler-proofing etc)' };
      }
      // Check for valid patterns
      if (TODDLER_PATTERNS.some(p => p.test(text))) {
        return { valid: true, reason: 'has toddler indicator' };
      }
      return { valid: false, reason: 'no toddler indicator found' };
    }

    case 'child': {
      // Check for false positives first
      if (CHILD_FALSE_POSITIVES.some(p => p.test(text))) {
        return { valid: false, reason: 'false positive (childhood, childish, etc)' };
      }
      // Check for valid patterns
      if (CHILD_PATTERNS.some(p => p.test(text))) {
        return { valid: true, reason: 'has child indicator' };
      }
      return { valid: false, reason: 'no child indicator found' };
    }

    case 'infant': {
      // Check for false positives first
      if (INFANT_FALSE_POSITIVES.some(p => p.test(text))) {
        return { valid: false, reason: 'false positive (baby pink, etc)' };
      }
      // Check for valid patterns
      if (INFANT_PATTERNS.some(p => p.test(text))) {
        return { valid: true, reason: 'has infant indicator' };
      }
      return { valid: false, reason: 'no infant indicator found' };
    }

    case 'teen': {
      // For CAS items, teen is usually part of default range - only validate explicit mentions
      if (TEEN_PATTERNS.some(p => p.test(titleLower))) {
        return { valid: true, reason: 'explicit teen mention in title' };
      }
      // Teen is often part of default CAS range (teen-elder), so we're more lenient
      // Only remove if it's clearly NOT for teens
      return { valid: true, reason: 'part of default CAS age range' };
    }

    case 'elder': {
      // Similar to teen - elder is usually part of default range
      if (ELDER_PATTERNS.some(p => p.test(titleLower))) {
        return { valid: true, reason: 'explicit elder mention in title' };
      }
      // Elder is often part of default CAS range, so we're more lenient
      return { valid: true, reason: 'part of default CAS age range' };
    }

    default:
      return { valid: true, reason: 'unknown age group' };
  }
}

async function auditAgeGroup(ageGroup: string): Promise<AuditResult> {
  console.log(`\n📊 Auditing '${ageGroup}' age group...`);

  const mods = await prisma.mod.findMany({
    where: {
      ageGroups: { has: ageGroup }
    },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      contentType: true,
      ageGroups: true
    }
  });

  console.log(`  Found ${mods.length} mods with '${ageGroup}' in ageGroups`);

  const result: AuditResult = {
    ageGroup,
    totalAudited: mods.length,
    totalFixed: 0,
    validKept: 0,
    removedMods: []
  };

  for (const mod of mods) {
    const validation = hasValidAgeIndicators(
      mod.title,
      mod.description,
      mod.tags,
      ageGroup
    );

    if (!validation.valid) {
      // Remove this age group from the mod
      const newAgeGroups = mod.ageGroups.filter(ag => ag !== ageGroup);

      await prisma.mod.update({
        where: { id: mod.id },
        data: { ageGroups: newAgeGroups }
      });

      result.totalFixed++;
      result.removedMods.push({
        id: mod.id,
        title: mod.title,
        reason: validation.reason
      });
    } else {
      result.validKept++;
    }
  }

  console.log(`  ✅ Valid: ${result.validKept}, Fixed: ${result.totalFixed}`);

  return result;
}

async function cleanupNonCasAgeGroups(): Promise<{ count: number; details: Record<string, number> }> {
  console.log(`\n📊 Removing age groups from non-CAS items...`);

  const nonCasMods = await prisma.mod.findMany({
    where: {
      contentType: { in: NON_CAS_CONTENT_TYPES },
      NOT: { ageGroups: { isEmpty: true } }
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      ageGroups: true
    }
  });

  console.log(`  Found ${nonCasMods.length} non-CAS mods with age groups`);

  const details: Record<string, number> = {};

  for (const mod of nonCasMods) {
    const contentType = mod.contentType || 'unknown';
    details[contentType] = (details[contentType] || 0) + 1;

    await prisma.mod.update({
      where: { id: mod.id },
      data: { ageGroups: [] }
    });
  }

  console.log(`  ✅ Cleared age groups from ${nonCasMods.length} non-CAS mods`);

  return { count: nonCasMods.length, details };
}

async function generateReport(stats: CleanupStats): Promise<string> {
  // Get final distribution
  const ageGroupCounts: Record<string, number> = {};
  const ageGroups = ['infant', 'toddler', 'child', 'teen', 'young-adult', 'adult', 'elder'];

  for (const age of ageGroups) {
    const count = await prisma.mod.count({
      where: { ageGroups: { has: age } }
    });
    ageGroupCounts[age] = count;
  }

  const totalMods = await prisma.mod.count();
  const modsWithAgeGroups = await prisma.mod.count({
    where: { NOT: { ageGroups: { isEmpty: true } } }
  });
  const modsWithoutAgeGroups = await prisma.mod.count({
    where: { ageGroups: { isEmpty: true } }
  });

  let report = `# Age Group Cleanup Report
Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Mods | ${totalMods} |
| Mods with Age Groups | ${modsWithAgeGroups} |
| Mods without Age Groups | ${modsWithoutAgeGroups} |

## Task Results

### AGE-001: Toddler Age Group Audit
- Audited: ${stats.toddler.totalAudited}
- Fixed (removed toddler): ${stats.toddler.totalFixed}
- Valid (kept): ${stats.toddler.validKept}

### AGE-002: Child Age Group Audit
- Audited: ${stats.child.totalAudited}
- Fixed (removed child): ${stats.child.totalFixed}
- Valid (kept): ${stats.child.validKept}

### AGE-003: Infant Age Group Audit
- Audited: ${stats.infant.totalAudited}
- Fixed (removed infant): ${stats.infant.totalFixed}
- Valid (kept): ${stats.infant.validKept}

### AGE-004: Teen Age Group Audit
- Audited: ${stats.teen.totalAudited}
- Fixed (removed teen): ${stats.teen.totalFixed}
- Valid (kept): ${stats.teen.validKept}

### AGE-005: Elder Age Group Audit
- Audited: ${stats.elder.totalAudited}
- Fixed (removed elder): ${stats.elder.totalFixed}
- Valid (kept): ${stats.elder.validKept}

### AGE-006: Non-CAS Items Cleanup
- Non-CAS mods with age groups cleared: ${stats.nonCasCleanup.count}
- By content type:
${Object.entries(stats.nonCasCleanup.details).map(([ct, c]) => `  - ${ct}: ${c}`).join('\n')}

## Final Age Group Distribution

| Age Group | Count |
|-----------|-------|
${Object.entries(ageGroupCounts).map(([age, count]) => `| ${age} | ${count} |`).join('\n')}

## Detailed Changes

### Toddler Removals (${stats.toddler.removedMods.length} total)
${stats.toddler.removedMods.slice(0, 20).map(m => `- "${m.title.substring(0, 50)}..." - ${m.reason}`).join('\n')}
${stats.toddler.removedMods.length > 20 ? `\n... and ${stats.toddler.removedMods.length - 20} more` : ''}

### Child Removals (${stats.child.removedMods.length} total)
${stats.child.removedMods.slice(0, 20).map(m => `- "${m.title.substring(0, 50)}..." - ${m.reason}`).join('\n')}
${stats.child.removedMods.length > 20 ? `\n... and ${stats.child.removedMods.length - 20} more` : ''}

### Infant Removals (${stats.infant.removedMods.length} total)
${stats.infant.removedMods.slice(0, 20).map(m => `- "${m.title.substring(0, 50)}..." - ${m.reason}`).join('\n')}
${stats.infant.removedMods.length > 20 ? `\n... and ${stats.infant.removedMods.length - 20} more` : ''}
`;

  return report;
}

async function main() {
  console.log('🔧 AGE-001 through AGE-007: Age Group Deep Cleanup\n');
  console.log('=' .repeat(60));

  const stats: CleanupStats = {
    toddler: { ageGroup: 'toddler', totalAudited: 0, totalFixed: 0, validKept: 0, removedMods: [] },
    child: { ageGroup: 'child', totalAudited: 0, totalFixed: 0, validKept: 0, removedMods: [] },
    infant: { ageGroup: 'infant', totalAudited: 0, totalFixed: 0, validKept: 0, removedMods: [] },
    teen: { ageGroup: 'teen', totalAudited: 0, totalFixed: 0, validKept: 0, removedMods: [] },
    elder: { ageGroup: 'elder', totalAudited: 0, totalFixed: 0, validKept: 0, removedMods: [] },
    nonCasCleanup: { count: 0, details: {} }
  };

  // AGE-001: Toddler cleanup
  console.log('\n--- AGE-001: Toddler Age Group Audit ---');
  stats.toddler = await auditAgeGroup('toddler');

  // AGE-002: Child cleanup
  console.log('\n--- AGE-002: Child Age Group Audit ---');
  stats.child = await auditAgeGroup('child');

  // AGE-003: Infant cleanup
  console.log('\n--- AGE-003: Infant Age Group Audit ---');
  stats.infant = await auditAgeGroup('infant');

  // AGE-004: Teen cleanup
  console.log('\n--- AGE-004: Teen Age Group Audit ---');
  stats.teen = await auditAgeGroup('teen');

  // AGE-005: Elder cleanup
  console.log('\n--- AGE-005: Elder Age Group Audit ---');
  stats.elder = await auditAgeGroup('elder');

  // AGE-006: Non-CAS cleanup
  console.log('\n--- AGE-006: Non-CAS Age Group Cleanup ---');
  stats.nonCasCleanup = await cleanupNonCasAgeGroups();

  // AGE-007: Generate report
  console.log('\n--- AGE-007: Generating Summary Report ---');
  const report = await generateReport(stats);

  const reportPath = 'scripts/ralph/age-group-cleanup-report.txt';
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));

  const totalFixed =
    stats.toddler.totalFixed +
    stats.child.totalFixed +
    stats.infant.totalFixed +
    stats.teen.totalFixed +
    stats.elder.totalFixed +
    stats.nonCasCleanup.count;

  console.log(`\nTotal mods fixed: ${totalFixed}`);
  console.log(`  - Toddler age removed: ${stats.toddler.totalFixed}`);
  console.log(`  - Child age removed: ${stats.child.totalFixed}`);
  console.log(`  - Infant age removed: ${stats.infant.totalFixed}`);
  console.log(`  - Teen age removed: ${stats.teen.totalFixed}`);
  console.log(`  - Elder age removed: ${stats.elder.totalFixed}`);
  console.log(`  - Non-CAS age groups cleared: ${stats.nonCasCleanup.count}`);

  console.log('\n✅ Age group cleanup complete!');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
