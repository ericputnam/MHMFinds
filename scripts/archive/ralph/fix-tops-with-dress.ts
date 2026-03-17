/**
 * Fix Tops with "dress" in title
 * Per CT-002: Items with 'dress' in title should have contentType='dresses'
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import '../lib/setup-env';

import { prisma } from '@/lib/prisma';

async function fixTopsWithDress() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           FIX TOPS WITH "DRESS" IN TITLE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Find all tops with 'dress' in title
  const topsWithDress = await prisma.mod.findMany({
    where: {
      contentType: 'tops',
      title: { contains: 'dress', mode: 'insensitive' }
    },
    select: { id: true, title: true, description: true }
  });

  console.log(`Found ${topsWithDress.length} tops with 'dress' in title\n`);

  // Analyze each one - some might be false positives like "dresser" or "address"
  const toFix: { id: string; title: string; reason: string }[] = [];
  const falsePositives: { id: string; title: string; reason: string }[] = [];

  // Patterns that indicate actual dresses vs false positives
  const dressPatterns = [
    /\bdress\b/i,        // "dress" as a word
    /\bdresses\b/i,      // "dresses"
    /\bdressy\b/i,       // "dressy"
    /\bmini\s*dress/i,   // "mini dress"
    /\bmaxi\s*dress/i,   // "maxi dress"
    /\bgown\b/i,         // often implies dress
    /\bundress/i,        // "sundress" etc.
  ];

  const notDressPatterns = [
    /\bdresser\b/i,      // furniture
    /\baddress\b/i,      // not clothing
    /\bdressed\b/i,      // could be "well dressed" outfit - needs context check
    /\bdressing\b/i,     // "dressing table" or "salad dressing"
    /\bdress\s*(shirt|pants|shoes|code)/i, // "dress shirt" is NOT a dress
  ];

  for (const mod of topsWithDress) {
    const titleLower = mod.title.toLowerCase();

    // Check for false positive patterns
    let isFalsePositive = false;
    let reason = '';

    for (const pattern of notDressPatterns) {
      if (pattern.test(mod.title)) {
        isFalsePositive = true;
        reason = `Contains '${pattern.source}' - not an actual dress`;
        break;
      }
    }

    // "dress shirt" is a top, not a dress
    if (/dress\s*shirt/i.test(mod.title)) {
      isFalsePositive = true;
      reason = 'Dress shirt is a type of top';
    }

    // Check if it's actually a dress
    if (!isFalsePositive) {
      // Check for standalone "dress" word
      if (/\bdress(es)?\b/i.test(mod.title) && !/dress\s*(shirt|pants|shoes|code)/i.test(mod.title)) {
        toFix.push({ id: mod.id, title: mod.title, reason: 'Contains "dress" as standalone word' });
      } else {
        falsePositives.push({ id: mod.id, title: mod.title, reason: 'Contains dress but in compound word' });
      }
    } else {
      falsePositives.push({ id: mod.id, title: mod.title, reason });
    }
  }

  console.log(`To fix (actual dresses): ${toFix.length}`);
  console.log(`False positives (keeping as tops): ${falsePositives.length}\n`);

  if (toFix.length > 0) {
    console.log('FIXING THE FOLLOWING:');
    console.log('─────────────────────────────────────────────────────────────');
    for (const item of toFix) {
      console.log(`  [${item.id}] "${item.title.slice(0, 60)}..."`);
      console.log(`    Reason: ${item.reason}`);
    }

    // Update them
    const result = await prisma.mod.updateMany({
      where: { id: { in: toFix.map(t => t.id) } },
      data: { contentType: 'dresses' }
    });

    console.log(`\n✅ Updated ${result.count} mods from 'tops' to 'dresses'\n`);
  }

  if (falsePositives.length > 0) {
    console.log('\nFALSE POSITIVES (keeping as tops):');
    console.log('─────────────────────────────────────────────────────────────');
    for (const item of falsePositives) {
      console.log(`  [${item.id}] "${item.title.slice(0, 60)}..."`);
      console.log(`    Reason: ${item.reason}`);
    }
  }

  // Verify
  const remaining = await prisma.mod.count({
    where: {
      contentType: 'tops',
      title: { contains: 'dress', mode: 'insensitive' }
    }
  });

  console.log(`\nRemaining tops with 'dress' in title: ${remaining}`);

  await prisma.$disconnect();
}

fixTopsWithDress().catch(console.error);
