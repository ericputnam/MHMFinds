// Load environment variables FIRST
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function categorizeMod(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Hair
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

  // CAS - Accessories (including nails, rings, piercings, watches)
  if (text.includes('accessory') || text.includes('accessories') || text.includes('jewelry') ||
      text.includes('necklace') || text.includes('earring') || text.includes('bracelet') ||
      text.includes('glasses') || text.includes('hat ') || text.includes(' hats') ||
      text.match(/\bnails?\b/) || text.includes('ring ') || text.includes(' rings') ||
      text.includes('piercing') || text.includes('watch ') || text.includes(' watches')) {
    return 'CAS - Accessories';
  }

  // CAS - Clothing
  if (text.includes('clothing') || text.includes('dress') || text.includes('outfit') ||
      text.includes('shirt') || text.includes('pants') || text.includes('shoes') ||
      text.includes('sweater') || text.includes('jacket') || text.includes('skirt') ||
      text.includes('top ') || text.includes(' tops') || text.includes('jeans') ||
      text.includes('bikini') || text.includes('swimwear') || text.includes('boots') ||
      text.includes('sneakers') || text.includes('heels')) {
    return 'CAS - Clothing';
  }

  // Build/Buy - Clutter
  if (text.includes('clutter') || text.includes('decor object') || text.includes('decoration')) {
    return 'Build/Buy - Clutter';
  }

  // Build/Buy
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
      (text.match(/\bmods?\b/) && !text.includes('cc'))) {
    return 'Scripts';
  }

  // CAS (general)
  if (text.includes('cas') || text.includes('create-a-sim') || text.includes('create a sim')) {
    return 'CAS';
  }

  return 'Other';
}

async function recategorizeRecentMods() {
  // Get mods created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`🔄 Recategorizing mods created since ${today.toISOString()}...\n`);

  const recentMods = await prisma.mod.findMany({
    where: {
      createdAt: { gte: today },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
    },
  });

  console.log(`📊 Found ${recentMods.length} mods created today\n`);

  if (recentMods.length === 0) {
    console.log('✅ No recent mods to recategorize!');
    return;
  }

  let updated = 0;
  let unchanged = 0;

  for (const mod of recentMods) {
    const oldCategory = mod.category || 'Other';
    const newCategory = categorizeMod(mod.title, mod.description || undefined);

    if (oldCategory !== newCategory) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: { category: newCategory },
      });
      console.log(`   ✏️  "${mod.title.substring(0, 40)}..." : ${oldCategory} → ${newCategory}`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Unchanged: ${unchanged}`);
}

recategorizeRecentMods()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
