import { prisma } from '@/lib/prisma';

/**
 * Fix mod titles that have incorrect listicle number prefixes
 *
 * This script finds and fixes titles like:
 * - ") Teresa Hairstyle" → "Teresa Hairstyle"
 * - "( Some Mod" → "Some Mod"
 * - ") " at the start → remove it
 *
 * These were caused by a bug in the mhmScraper that didn't handle "1.) " pattern correctly
 */
async function fixListicleTitles() {
  console.log('🔍 Finding mods with incorrect listicle prefixes...\n');

  try {
    // Find all mods
    const allMods = await prisma.mod.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    console.log(`📊 Total mods in database: ${allMods.length}\n`);

    // Filter mods that have the bug
    const affectedMods = allMods.filter(mod => {
      // Check if title starts with `) `, `( `, or just `)`
      return mod.title.startsWith(') ') ||
             mod.title.startsWith('( ') ||
             mod.title.startsWith(')');
    });

    console.log(`🐛 Found ${affectedMods.length} mods with incorrect prefixes:\n`);

    if (affectedMods.length === 0) {
      console.log('✅ No mods to fix!');
      return;
    }

    // Show all affected mods
    affectedMods.forEach((mod, i) => {
      console.log(`${i + 1}. "${mod.title}"`);
    });

    console.log('\n🔧 Fixing titles...\n');

    let fixedCount = 0;
    let skippedCount = 0;

    for (const mod of affectedMods) {
      const originalTitle = mod.title;
      let newTitle = originalTitle;

      // Remove the incorrect prefix
      // Pattern 1: ") Some Title" → "Some Title"
      if (newTitle.startsWith(') ')) {
        newTitle = newTitle.substring(2).trim();
      }
      // Pattern 2: ") SomeTitle" (no space) → "SomeTitle"
      else if (newTitle.startsWith(')')) {
        newTitle = newTitle.substring(1).trim();
      }
      // Pattern 3: "( Some Title" → "Some Title"
      else if (newTitle.startsWith('( ')) {
        newTitle = newTitle.substring(2).trim();
      }

      // Only update if we actually changed something and the new title is valid
      if (newTitle !== originalTitle && newTitle.length > 0) {
        try {
          await prisma.mod.update({
            where: { id: mod.id },
            data: { title: newTitle },
          });

          console.log(`✅ Fixed: "${originalTitle}" → "${newTitle}"`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error updating mod ${mod.id}:`, error);
          skippedCount++;
        }
      } else {
        console.log(`⏭️  Skipped: "${originalTitle}" (no valid fix found)`);
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} mods`);
    console.log(`   ⏭️  Skipped: ${skippedCount} mods`);
    console.log(`   📝 Total affected: ${affectedMods.length} mods`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixListicleTitles()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
