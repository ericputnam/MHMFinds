import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCategories() {
  console.log('=== FIXING MISCATEGORIZED MODS ===\n');

  // Find mods with obvious categorization errors
  const patterns = [
    { pattern: ['Chicken Coop', 'Animal Shed', 'Shed'], wrongCat: 'Hair', correctCat: 'Build/Buy' },
    { pattern: ['Furniture', 'Chair', 'Table', 'Sofa', 'Bed'], wrongCat: 'Hair', correctCat: 'Build/Buy' },
    { pattern: ['Kitchen', 'Bathroom', 'Decor'], wrongCat: 'Hair', correctCat: 'Build/Buy' },
    { pattern: ['Lot', 'House', 'Building'], wrongCat: 'Hair', correctCat: 'Build/Buy' },
  ];

  let totalFixed = 0;

  for (const { pattern, wrongCat, correctCat } of patterns) {
    console.log(`\nChecking for ${pattern.join('/')} items miscategorized as ${wrongCat}...`);

    const incorrectMods = await prisma.mod.findMany({
      where: {
        OR: pattern.map(p => ({
          title: { contains: p, mode: 'insensitive' },
        })),
        category: wrongCat,
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
    });

    if (incorrectMods.length > 0) {
      console.log(`Found ${incorrectMods.length} mods to fix:`);

      for (const mod of incorrectMods) {
        console.log(`  - ${mod.title}`);

        // Actually update the category
        await prisma.mod.update({
          where: { id: mod.id },
          data: { category: correctCat },
        });
      }

      totalFixed += incorrectMods.length;
      console.log(`✓ Fixed ${incorrectMods.length} mods (${wrongCat} → ${correctCat})`);
    } else {
      console.log(`  No issues found.`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total mods fixed: ${totalFixed}`);

  // Show current category distribution for Sims 4
  console.log('\nCurrent Sims 4 category distribution:');
  const categoryStats = await prisma.mod.groupBy({
    by: ['category'],
    where: { gameVersion: 'Sims 4' },
    _count: true,
    orderBy: {
      _count: {
        category: 'desc',
      },
    },
  });

  categoryStats.forEach(stat => {
    console.log(`  ${stat.category}: ${stat._count}`);
  });

  await prisma.$disconnect();
}

fixCategories()
  .catch(console.error)
  .finally(() => process.exit(0));
