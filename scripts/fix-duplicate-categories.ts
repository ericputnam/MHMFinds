import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Category merge mapping: old -> new
const CATEGORY_MERGES: Record<string, string> = {
  'Script Mod': 'Scripts',
  'Makeup': 'CAS - Makeup',
  'Clothing': 'CAS - Clothing',
};

async function fixDuplicateCategories() {
  console.log('=== FIXING DUPLICATE CATEGORIES ===\n');

  for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MERGES)) {
    // Count mods in old category
    const count = await prisma.mod.count({
      where: { category: oldCategory }
    });

    if (count === 0) {
      console.log(`✓ "${oldCategory}" - No mods found (already cleaned)`);
      continue;
    }

    console.log(`Merging "${oldCategory}" → "${newCategory}" (${count} mods)`);

    // Update all mods
    const result = await prisma.mod.updateMany({
      where: { category: oldCategory },
      data: { category: newCategory }
    });

    console.log(`  ✓ Updated ${result.count} mods\n`);
  }

  // Verify results
  console.log('\n=== VERIFICATION ===');
  console.log('Final category counts:');

  const categoryGroups = await prisma.mod.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  categoryGroups.forEach(({ category, _count }) => {
    console.log(`  ${category.padEnd(25)} ${_count.id} mods`);
  });

  await prisma.$disconnect();
  console.log('\n✓ Done!');
}

fixDuplicateCategories().catch(console.error);
