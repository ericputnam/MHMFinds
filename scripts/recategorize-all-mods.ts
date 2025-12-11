import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New improved categorization logic (same as in scrapers)
function categorizeMod(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Check in order of specificity (most specific first)

  // Hair (very common category)
  if (text.match(/\bhair(style)?s?\b/) || text.includes('hairstyle')) {
    return 'Hair';
  }

  // Poses & Animations
  if (text.match(/\bpose[sd]?\b/) || text.includes('animation') || text.includes('posing')) {
    return 'Poses';
  }

  // CAS - Makeup
  if (text.includes('makeup') || text.includes('blush') || text.includes('lipstick') ||
      text.includes('eyeshadow') || text.includes('eyeliner') || text.includes('cosmetic')) {
    return 'CAS - Makeup';
  }

  // CAS - Accessories
  if (text.includes('accessory') || text.includes('accessories') || text.includes('jewelry') ||
      text.includes('necklace') || text.includes('earring') || text.includes('bracelet') ||
      text.includes('glasses') || text.includes('hat ') || text.includes(' hats')) {
    return 'CAS - Accessories';
  }

  // CAS - Clothing (check before general CAS)
  if (text.includes('clothing') || text.includes('dress') || text.includes('outfit') ||
      text.includes('shirt') || text.includes('pants') || text.includes('shoes') ||
      text.includes('sweater') || text.includes('jacket') || text.includes('skirt') ||
      text.includes('top ') || text.includes(' tops') || text.includes('jeans') ||
      text.includes('bikini') || text.includes('swimwear')) {
    return 'CAS - Clothing';
  }

  // Build/Buy - Clutter
  if (text.includes('clutter') || text.includes('decor object') || text.includes('decoration')) {
    return 'Build/Buy - Clutter';
  }

  // Build/Buy (general)
  if (text.includes('build') || text.includes('buy') || text.includes('furniture') ||
      text.includes('chair') || text.includes('table') || text.includes('sofa') ||
      text.includes('bed ') || text.includes(' beds') || text.includes('kitchen') ||
      text.includes('bathroom') || text.includes('shelf') || text.includes('shelves') ||
      text.includes('cabinet') || text.includes('couch') || text.includes('decor') ||
      text.includes('shed') || text.includes('coop') || text.includes('house ') ||
      text.includes('lot ') || text.includes(' lots')) {
    return 'Build/Buy';
  }

  // Gameplay
  if (text.includes('gameplay') || text.includes('career') || text.includes('skill') ||
      text.includes('aspiration') || text.includes('reward') || text.includes('interaction')) {
    return 'Gameplay';
  }

  // Scripts/Mods
  if (text.includes('script') || text.includes('trait') || text.includes('mod ') ||
      text.match(/\bmods?\b/) && !text.includes('cc')) {
    return 'Scripts';
  }

  // CAS (general Create-a-Sim - last resort for CAS items)
  if (text.includes('cas') || text.includes('create-a-sim') || text.includes('create a sim')) {
    return 'CAS';
  }

  // Default
  return 'Other';
}

async function recategorizeAllMods() {
  console.log('=== RECATEGORIZING ALL MODS ===\n');
  console.log('This will apply the new improved categorization logic to all existing mods.\n');

  // Get all mods
  const allMods = await prisma.mod.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
    },
  });

  console.log(`Found ${allMods.length} total mods to recategorize.\n`);

  let updated = 0;
  let unchanged = 0;
  const categoryChanges: Record<string, { from: string; to: string; count: number }> = {};

  // Track category distribution before and after
  const beforeDistribution: Record<string, number> = {};
  const afterDistribution: Record<string, number> = {};

  for (const mod of allMods) {
    const oldCategory = mod.category || 'Other';
    const newCategory = categorizeMod(mod.title, mod.description || undefined);

    // Track before distribution
    beforeDistribution[oldCategory] = (beforeDistribution[oldCategory] || 0) + 1;
    afterDistribution[newCategory] = (afterDistribution[newCategory] || 0) + 1;

    if (oldCategory !== newCategory) {
      // Update the mod
      await prisma.mod.update({
        where: { id: mod.id },
        data: { category: newCategory },
      });

      updated++;

      // Track the change
      const changeKey = `${oldCategory} → ${newCategory}`;
      if (!categoryChanges[changeKey]) {
        categoryChanges[changeKey] = { from: oldCategory, to: newCategory, count: 0 };
      }
      categoryChanges[changeKey].count++;

      // Show progress every 1000 mods
      if (updated % 1000 === 0) {
        console.log(`Progress: ${updated} mods recategorized...`);
      }
    } else {
      unchanged++;
    }
  }

  console.log('\n=== RECATEGORIZATION COMPLETE ===\n');
  console.log(`Total mods processed: ${allMods.length}`);
  console.log(`Mods updated: ${updated}`);
  console.log(`Mods unchanged: ${unchanged}`);

  console.log('\n=== CATEGORY DISTRIBUTION BEFORE ===');
  Object.entries(beforeDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const percentage = ((count / allMods.length) * 100).toFixed(1);
      console.log(`  ${cat}: ${count} (${percentage}%)`);
    });

  console.log('\n=== CATEGORY DISTRIBUTION AFTER ===');
  Object.entries(afterDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const percentage = ((count / allMods.length) * 100).toFixed(1);
      console.log(`  ${cat}: ${count} (${percentage}%)`);
    });

  console.log('\n=== TOP CATEGORY CHANGES ===');
  Object.entries(categoryChanges)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([change, data]) => {
      console.log(`  ${change}: ${data.count} mods`);
    });

  await prisma.$disconnect();
}

recategorizeAllMods()
  .catch(console.error)
  .finally(() => process.exit(0));
