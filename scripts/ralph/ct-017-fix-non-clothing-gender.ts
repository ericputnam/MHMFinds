/**
 * CT-017: Fix non-clothing mods that still have gender set
 *
 * After the content type cleanup (CT-001 through CT-015), some mods were
 * reclassified from clothing types (like accessories) to non-clothing types
 * (like decor, furniture). These mods still have genderOptions set, which
 * should be cleared.
 */

import { prisma } from '@/lib/prisma';

const NON_CLOTHING_TYPES = [
  'furniture', 'lighting', 'decor', 'clutter', 'kitchen', 'bathroom',
  'bedroom', 'outdoor', 'plants', 'rugs', 'curtains', 'electronics',
  'poses', 'animations', 'gameplay-mod', 'script-mod', 'trait', 'career',
  'food', 'lot', 'ui-preset', 'cas-background', 'loading-screen'
];

async function main() {
  console.log('🔧 CT-017: Fix non-clothing mods with gender set\n');

  // Find all non-clothing mods that have gender set
  const modsWithGender = await prisma.mod.findMany({
    where: {
      OR: [
        { contentType: { in: NON_CLOTHING_TYPES } },
        { contentType: null }
      ],
      genderOptions: { isEmpty: false }
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      genderOptions: true
    }
  });

  console.log(`Found ${modsWithGender.length} non-clothing mods with gender set\n`);

  if (modsWithGender.length === 0) {
    console.log('✅ No mods to fix - all non-clothing mods already have empty genderOptions');
    await prisma.$disconnect();
    return;
  }

  // Group by content type for logging
  const byType: Record<string, typeof modsWithGender> = {};
  for (const mod of modsWithGender) {
    const type = mod.contentType || 'null';
    if (!byType[type]) byType[type] = [];
    byType[type].push(mod);
  }

  console.log('Distribution by content type:');
  for (const [type, mods] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${type}: ${mods.length}`);
  }
  console.log('');

  // Clear gender for all non-clothing mods
  const result = await prisma.mod.updateMany({
    where: {
      OR: [
        { contentType: { in: NON_CLOTHING_TYPES } },
        { contentType: null }
      ],
      genderOptions: { isEmpty: false }
    },
    data: {
      genderOptions: []
    }
  });

  console.log(`✅ Cleared genderOptions for ${result.count} non-clothing mods\n`);

  // Sample of what was fixed
  console.log('Sample of mods fixed:');
  modsWithGender.slice(0, 10).forEach(mod => {
    console.log(`  [${mod.contentType || 'null'}] "${mod.title?.slice(0, 50)}..." had gender: ${mod.genderOptions.join(', ')}`);
  });

  // Verify
  const remaining = await prisma.mod.count({
    where: {
      OR: [
        { contentType: { in: NON_CLOTHING_TYPES } },
        { contentType: null }
      ],
      genderOptions: { isEmpty: false }
    }
  });

  console.log(`\n📊 Verification: ${remaining} non-clothing mods still have gender set`);

  if (remaining === 0) {
    console.log('✅ All non-clothing mods now have empty genderOptions');
  } else {
    console.log('⚠️ Some mods still have gender - may need investigation');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
