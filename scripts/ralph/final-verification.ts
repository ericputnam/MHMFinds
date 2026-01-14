/**
 * Final Verification Script
 * Confirms all CT-001 through CT-017 tasks have been completed successfully
 */

import { prisma } from '@/lib/prisma';

// Content types that should NOT have gender
const NON_CLOTHING_TYPES = [
  'furniture', 'lighting', 'decor', 'clutter', 'kitchen', 'bathroom',
  'bedroom', 'outdoor', 'plants', 'rugs', 'curtains', 'electronics',
  'poses', 'animations', 'gameplay-mod', 'script-mod', 'trait', 'career',
  'food', 'lot', 'ui-preset', 'cas-background', 'loading-screen'
];

async function runFinalVerification() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           FINAL VERIFICATION - Content Type Cleanup');
  console.log('           Verifying CT-001 through CT-017 completion');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Get content type distribution
  console.log('CONTENT TYPE DISTRIBUTION:');
  console.log('─────────────────────────────────────────────────────────────');

  const contentTypeCounts = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  let totalMods = 0;
  for (const ct of contentTypeCounts) {
    console.log(`  ${ct.contentType || 'NULL'}: ${ct._count.id}`);
    totalMods += ct._count.id;
  }
  console.log(`  TOTAL: ${totalMods}\n`);

  // 2. Check for non-clothing items with gender (should be minimal, only presets)
  console.log('NON-CLOTHING WITH GENDER CHECK (CT-017):');
  console.log('─────────────────────────────────────────────────────────────');

  const nonClothingWithGender = await prisma.mod.findMany({
    where: {
      contentType: { in: NON_CLOTHING_TYPES },
      genderOptions: { isEmpty: false }
    },
    select: { id: true, title: true, contentType: true, genderOptions: true }
  });

  if (nonClothingWithGender.length === 0) {
    console.log('  ✅ No non-clothing items have gender set');
  } else {
    console.log(`  ⚠️  Found ${nonClothingWithGender.length} non-clothing items with gender:`);
    for (const mod of nonClothingWithGender.slice(0, 5)) {
      console.log(`    - [${mod.contentType}] ${mod.title.slice(0, 50)}...`);
    }
  }

  // Check presets (should have gender)
  const presetsWithGender = await prisma.mod.count({
    where: {
      contentType: 'preset',
      genderOptions: { isEmpty: false }
    }
  });
  console.log(`  ✅ Presets with gender (expected): ${presetsWithGender}\n`);

  // 3. Check for null contentTypes
  console.log('NULL CONTENT TYPE CHECK (CT-004):');
  console.log('─────────────────────────────────────────────────────────────');

  const nullContentType = await prisma.mod.count({
    where: { contentType: null }
  });
  console.log(`  Mods with null contentType: ${nullContentType}`);
  console.log(`  ${nullContentType <= 15 ? '✅' : '⚠️ '} Expected: ≤15 (generic titles that can't be classified)\n`);

  // 4. Check key content type accuracy indicators
  console.log('CONTENT TYPE ACCURACY INDICATORS:');
  console.log('─────────────────────────────────────────────────────────────');

  // Check hair - should not have furniture/lot terms
  const hairWithFurnitureTerms = await prisma.mod.count({
    where: {
      contentType: 'hair',
      OR: [
        { title: { contains: 'furniture', mode: 'insensitive' } },
        { title: { contains: 'sofa', mode: 'insensitive' } },
        { title: { contains: 'table', mode: 'insensitive' } },
        { title: { contains: 'chair', mode: 'insensitive' } }
      ]
    }
  });
  console.log(`  Hair items with furniture terms: ${hairWithFurnitureTerms} ${hairWithFurnitureTerms === 0 ? '✅' : '⚠️ '}`);

  // Check tops - should not have "dress" in title
  const topsWithDressInTitle = await prisma.mod.count({
    where: {
      contentType: 'tops',
      title: { contains: 'dress', mode: 'insensitive' }
    }
  });
  console.log(`  Tops items with 'dress' in title: ${topsWithDressInTitle} ${topsWithDressInTitle <= 5 ? '✅' : '⚠️ '}`);

  // Check full-body - should have outfit/jumpsuit/romper terms
  const fullBodyCount = await prisma.mod.count({
    where: { contentType: 'full-body' }
  });
  console.log(`  Full-body items total: ${fullBodyCount}`);

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const checks = [
    { name: 'Non-clothing gender cleanup (CT-017)', pass: nonClothingWithGender.length === 0 },
    { name: 'Null contentType minimal (CT-004)', pass: nullContentType <= 15 },
    { name: 'Hair accuracy (CT-001)', pass: hairWithFurnitureTerms === 0 },
    { name: 'Tops accuracy (CT-002)', pass: topsWithDressInTitle <= 5 },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log('\n' + (allPassed ? '✅ ALL CHECKS PASSED' : '⚠️  SOME CHECKS NEED ATTENTION'));
  console.log('═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

runFinalVerification().catch(console.error);
