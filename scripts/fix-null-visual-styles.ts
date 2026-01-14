#!/usr/bin/env npx tsx
/**
 * Fix mods with null visualStyle by inferring from title/description keywords
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Maxis-match keywords
const MAXIS_MATCH_PATTERNS = [
  /\bmaxis\s*match\b/i,
  /\bmaxis-match\b/i,
  /\bmm\b/i,  // Common abbreviation
  /\bea\s*style\b/i,
  /\bbase\s*game\s*compatible\b/i,
  /\bbgc\b/i,
];

// Alpha keywords
const ALPHA_PATTERNS = [
  /\balpha\b/i,
  /\brealistic\b/i,
  /\bhq\b/i,  // High Quality
  /\bhigh\s*quality\b/i,
  /\b4k\b/i,
  /\bultra\s*hd\b/i,
  /\bphotorealistic\b/i,
];

function inferVisualStyle(title: string, description: string | null): string | null {
  const text = title + ' ' + (description || '');

  // Check for maxis-match first (more specific patterns)
  if (MAXIS_MATCH_PATTERNS.some(p => p.test(text))) {
    return 'maxis-match';
  }

  // Check for alpha
  if (ALPHA_PATTERNS.some(p => p.test(text))) {
    return 'alpha';
  }

  return null;
}

async function main() {
  console.log('🔍 Finding mods with null visualStyle...\n');

  const mods = await prisma.mod.findMany({
    where: { visualStyle: null },
    select: { id: true, title: true, description: true },
  });

  console.log(`Found ${mods.length} mods with null visualStyle\n`);

  const fixes: { mod: typeof mods[0]; newStyle: string }[] = [];
  const unfixed: typeof mods = [];

  for (const mod of mods) {
    const inferred = inferVisualStyle(mod.title, mod.description);
    if (inferred) {
      fixes.push({ mod, newStyle: inferred });
    } else {
      unfixed.push(mod);
    }
  }

  console.log(`Can infer visualStyle for ${fixes.length} mods`);
  console.log(`Cannot infer for ${unfixed.length} mods\n`);

  // Show distribution of inferred styles
  const alphaCt = fixes.filter(f => f.newStyle === 'alpha').length;
  const mmCt = fixes.filter(f => f.newStyle === 'maxis-match').length;
  console.log(`  Alpha: ${alphaCt}`);
  console.log(`  Maxis-Match: ${mmCt}\n`);

  // Show examples
  console.log('Preview of fixes (first 20):');
  for (const { mod, newStyle } of fixes.slice(0, 20)) {
    console.log(`  [${newStyle.padEnd(12)}] ${mod.title.slice(0, 55)}`);
  }
  if (fixes.length > 20) console.log(`  ... and ${fixes.length - 20} more\n`);

  // Apply fixes
  console.log('\n🔧 Applying fixes...');
  let fixed = 0;
  for (const { mod, newStyle } of fixes) {
    await prisma.mod.update({
      where: { id: mod.id },
      data: { visualStyle: newStyle },
    });
    fixed++;
    if (fixed % 50 === 0) console.log(`  Fixed ${fixed}/${fixes.length}...`);
  }

  console.log(`\n✅ Fixed ${fixed} mods`);

  // Final stats
  const remaining = await prisma.mod.count({ where: { visualStyle: null } });
  console.log(`Remaining mods with null visualStyle: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
