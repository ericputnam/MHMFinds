import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategoryData() {
  console.log('=== CATEGORY DATA ANALYSIS ===\n');

  // 1. Check the problematic mod
  console.log('1. Checking the Cottagecore mod:');
  const cottagecore = await prisma.mod.findMany({
    where: {
      OR: [
        { title: { contains: 'Cottagecore', mode: 'insensitive' } },
        { title: { contains: 'Animal Shed', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      category: true,
      categoryId: true,
      gameVersion: true,
      categoryRel: {
        select: {
          id: true,
          name: true,
          slug: true,
          path: true,
          level: true,
        },
      },
    },
  });
  console.log(JSON.stringify(cottagecore, null, 2));

  // 2. Check data completeness
  console.log('\n2. Data completeness analysis:');
  const totalMods = await prisma.mod.count();
  const modsWithCategory = await prisma.mod.count({
    where: { category: { not: '' } },
  });
  const modsWithCategoryId = await prisma.mod.count({
    where: { categoryId: { not: null } },
  });
  const modsWithBoth = await prisma.mod.count({
    where: {
      AND: [
        { category: { not: '' } },
        { categoryId: { not: null } },
      ],
    },
  });

  console.log({
    totalMods,
    modsWithCategory,
    modsWithCategoryId,
    modsWithBoth,
    percentWithCategory: ((modsWithCategory / totalMods) * 100).toFixed(1) + '%',
    percentWithCategoryId: ((modsWithCategoryId / totalMods) * 100).toFixed(1) + '%',
  });

  // 3. Check hierarchical Category table
  console.log('\n3. Hierarchical Category table (first 20):');
  const categories = await prisma.category.findMany({
    orderBy: [{ level: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    take: 20,
  });
  console.log(JSON.stringify(categories, null, 2));

  // 4. Sample comparison for Sims 4 mods
  console.log('\n4. Sample Sims 4 mods comparison (category vs categoryId):');
  const sampleMods = await prisma.mod.findMany({
    where: { gameVersion: 'Sims 4' },
    select: {
      title: true,
      category: true,
      categoryId: true,
      categoryRel: {
        select: {
          name: true,
          path: true,
        },
      },
    },
    take: 10,
  });
  console.log(JSON.stringify(sampleMods, null, 2));

  // 5. Check for mismatches
  console.log('\n5. Looking for category mismatches:');
  const allMods = await prisma.mod.findMany({
    where: {
      category: { not: null as any },
      categoryId: { not: null as any },
    },
    select: {
      id: true,
      title: true,
      category: true,
      categoryRel: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    take: 50,
  });

  const mismatches = allMods.filter(mod => {
    if (!mod.categoryRel) return false;
    // Check if the flat category name roughly matches the hierarchical category
    const flatCat = mod.category?.toLowerCase() || '';
    const hierarchicalCat = mod.categoryRel.name?.toLowerCase() || '';
    return !flatCat.includes(hierarchicalCat) && !hierarchicalCat.includes(flatCat);
  });

  console.log(`Found ${mismatches.length} mismatches out of ${allMods.length} mods with both fields`);
  console.log('Sample mismatches:');
  console.log(JSON.stringify(mismatches.slice(0, 5), null, 2));

  await prisma.$disconnect();
}

checkCategoryData()
  .catch(console.error)
  .finally(() => process.exit(0));
