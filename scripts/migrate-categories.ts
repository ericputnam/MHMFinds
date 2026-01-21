// Load environment variables FIRST, before any imports that need them
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

// Now import modules that depend on environment variables
import { prisma } from '../lib/prisma';
import { aiCategorizer } from '../lib/services/aiCategorizer';

/**
 * Migrate existing mods from flat categories to hierarchical categories
 * This script analyzes each mod's flat category and converts it to a hierarchical categoryId
 */
async function migrateCategories() {
  console.log('🔄 Starting category migration...\n');

  // Get all mods that don't have a categoryId yet
  const modsToMigrate = await prisma.mod.findMany({
    where: {
      categoryId: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      sourceUrl: true,
    },
  });

  console.log(`📊 Found ${modsToMigrate.length} mods to migrate\n`);

  if (modsToMigrate.length === 0) {
    console.log('✅ All mods already migrated!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < modsToMigrate.length; i++) {
    const mod = modsToMigrate[i];

    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${modsToMigrate.length} (${Math.round((i + 1) / modsToMigrate.length * 100)}%)`);
    }

    try {
      // Extract URL slug from sourceUrl if available
      let urlSlug = '';
      if (mod.sourceUrl) {
        try {
          const url = new URL(mod.sourceUrl);
          const pathParts = url.pathname.split('/').filter(p => p.length > 0);
          urlSlug = pathParts[pathParts.length - 1] || '';
        } catch (e) {
          // Invalid URL, skip
        }
      }

      // Use AI categorizer to determine hierarchical category
      // If we have a URL slug, use it; otherwise fall back to the flat category + title
      const categoryId = await aiCategorizer.categorizeFromSlug(
        urlSlug || mod.category || '',
        mod.title,
        mod.category
      );

      // Update the mod with the new categoryId
      await prisma.mod.update({
        where: { id: mod.id },
        data: { categoryId },
      });

      successCount++;
    } catch (error) {
      console.error(`   ❌ Error migrating mod "${mod.title}":`, error);
      errorCount++;
    }

    // Add a small delay to avoid overwhelming the AI API (every 5 mods)
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successfully migrated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total: ${modsToMigrate.length}`);

  // Show the category tree
  console.log('\n🏷️  Category Tree:');
  const tree = await aiCategorizer.getCategoryTree();
  printTree(tree);

  console.log('\n✅ Migration complete!');
}

function printTree(nodes: any[], indent = '') {
  for (const node of nodes) {
    console.log(`${indent}📁 ${node.name} (${node.path}) - ${node.children?.length || 0} children`);
    if (node.children && node.children.length > 0) {
      printTree(node.children, indent + '  ');
    }
  }
}

migrateCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
