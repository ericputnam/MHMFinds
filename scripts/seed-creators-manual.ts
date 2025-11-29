/**
 * Manually seed specific Sims 4 creators
 * Run with: npx tsx scripts/seed-creators-manual.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Popular Sims 4 mod creators (curated list)
const CREATORS_TO_ADD = [
  {
    name: 'Ravasheen',
    handle: 'ravasheen',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/ravasheen',
    bio: 'Creator of quirky gameplay mods and unique build/buy items for The Sims 4',
    specialization: 'Gameplay & Build/Buy',
    isVerified: true,
  },
  {
    name: 'Sacrificial Mods',
    handle: 'sacrificialmods',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/sacrificialmods',
    bio: 'Creator of Extreme Violence, Life Tragedies, and other dark gameplay mods',
    specialization: 'Gameplay Scripts',
    isVerified: true,
  },
  {
    name: 'Basemental',
    handle: 'basemental',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/basemental',
    bio: 'Creator of Basemental Drugs and Gangs mods for realistic gameplay',
    specialization: 'Gameplay Overhauls',
    isVerified: true,
  },
  {
    name: 'MC Command Center',
    handle: 'mccc',
    platform: 'Website',
    profileUrl: 'https://www.patreon.com/deaderpool',
    bio: 'Creator of MC Command Center, the essential story progression and control mod',
    specialization: 'Core Gameplay',
    isVerified: true,
  },
  {
    name: 'LittleMsSam',
    handle: 'littlemssam',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/littlemssam',
    bio: 'Prolific creator of quality-of-life mods and gameplay tweaks',
    specialization: 'Gameplay Tweaks',
    isVerified: true,
  },
  {
    name: 'Kawaiistacie',
    handle: 'kawaiistacie',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/kawaiistaciemods',
    bio: 'Creator of Slice of Life, Explore Mod, and other immersive gameplay mods',
    specialization: 'Gameplay Overhauls',
    isVerified: true,
  },
  {
    name: 'Turbodriver',
    handle: 'turbodriver',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/turbodriver',
    bio: 'Creator of WickedWhims and other adult-oriented gameplay mods',
    specialization: 'Adult Content',
    isVerified: true,
  },
  {
    name: 'Nyx',
    handle: 'nyx',
    platform: 'Tumblr',
    profileUrl: 'https://nyx.tumblr.com',
    bio: 'Popular creator of Maxis Match CC including hair, clothing, and accessories',
    specialization: 'CAS - Maxis Match',
    isVerified: true,
  },
  {
    name: 'Simmer_Erin',
    handle: 'simmererin',
    platform: 'TSR',
    profileUrl: 'https://www.thesimsresource.com/members/Simmer_Erin',
    bio: 'Creator of realistic hair conversions and CAS content',
    specialization: 'CAS - Hair',
    isVerified: true,
  },
  {
    name: 'Peacemaker',
    handle: 'peacemaker',
    platform: 'TSR',
    profileUrl: 'https://www.thesimsresource.com/members/Peacemaker_ic',
    bio: 'Known for modern furniture sets and build/buy items',
    specialization: 'Build/Buy - Furniture',
    isVerified: true,
  },
  {
    name: 'Pralinesims',
    handle: 'pralinesims',
    platform: 'TSR',
    profileUrl: 'https://www.thesimsresource.com/members/Pralinesims',
    bio: 'Creator of stylish furniture and decor items',
    specialization: 'Build/Buy - Decor',
    isVerified: true,
  },
  {
    name: 'Wicked Whims',
    handle: 'wickedwhims',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/turbodriver',
    bio: 'The most popular adult mod for The Sims 4',
    specialization: 'Adult Gameplay',
    isVerified: true,
  },
  {
    name: 'Zerbu',
    handle: 'zerbu',
    platform: 'ModTheSims',
    profileUrl: 'https://modthesims.info/m/7170842',
    bio: 'Creator of Turbo Careers and other career enhancement mods',
    specialization: 'Career Mods',
    isVerified: true,
  },
  {
    name: 'Onyxium',
    handle: 'onyxium',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/onyxsims',
    bio: 'Creator of Royal Family Mod and medieval gameplay content',
    specialization: 'Historical Gameplay',
    isVerified: true,
  },
  {
    name: 'Nisa',
    handle: 'nisa',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/nisas',
    bio: 'Creator of Pervert, Wicked Perversions, and adult animations',
    specialization: 'Adult Animations',
    isVerified: true,
  },
  {
    name: 'SimRealist',
    handle: 'simrealist',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/simrealist',
    bio: 'Creator of SNBank, Bills, and realistic financial gameplay mods',
    specialization: 'Realism Mods',
    isVerified: true,
  },
  {
    name: 'LumiaLover Sims',
    handle: 'lumialover',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/lumialover',
    bio: 'Creator of Healthcare Redux and medical career mods',
    specialization: 'Career & Gameplay',
    isVerified: true,
  },
  {
    name: 'Sims4Nexus',
    handle: 'sims4nexus',
    platform: 'Patreon',
    profileUrl: 'https://www.patreon.com/sims4nexus',
    bio: 'Creator of pose packs and photography content',
    specialization: 'Poses & Photography',
    isVerified: true,
  },
  {
    name: 'Around The Sims',
    handle: 'aroundthesims',
    platform: 'Website',
    profileUrl: 'http://sims4.aroundthesims3.com/',
    bio: 'Massive collection of converted and original build/buy objects',
    specialization: 'Build/Buy - Objects',
    isVerified: true,
  },
  {
    name: 'MTS (ModTheSims)',
    handle: 'modthesims',
    platform: 'Website',
    profileUrl: 'https://modthesims.info',
    bio: 'Long-standing community platform for Sims mods',
    specialization: 'Community Platform',
    isVerified: true,
  },
];

async function seedCreators() {
  console.log('🌱 Starting manual creator seeding...\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const creatorData of CREATORS_TO_ADD) {
    try {
      console.log(`📝 Processing: ${creatorData.name} (@${creatorData.handle})...`);

      // Check if creator already exists
      const existingCreator = await prisma.creatorProfile.findUnique({
        where: { handle: creatorData.handle },
      });

      if (existingCreator) {
        console.log(`⏭️  Creator @${creatorData.handle} already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { username: creatorData.handle },
      });

      if (!user) {
        // Create a new user for this creator
        user = await prisma.user.create({
          data: {
            email: `${creatorData.handle}@musthavemods.generated`,
            username: creatorData.handle,
            displayName: creatorData.name,
            avatar: null,
            bio: creatorData.bio,
            isCreator: true,
            isPremium: false,
            isAdmin: false,
          },
        });
      }

      // Create creator profile
      await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          handle: creatorData.handle,
          bio: creatorData.bio,
          website: creatorData.profileUrl,
          socialLinks: {
            platform: creatorData.platform,
            url: creatorData.profileUrl,
            specialization: creatorData.specialization,
          },
          isVerified: creatorData.isVerified,
          isFeatured: true,
        },
      });

      console.log(`✅ Created creator profile for ${creatorData.name}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error creating creator ${creatorData.name}:`, error);
      errorCount++;
    }
  }

  // Associate existing mods with creators
  console.log('\n🔗 Attempting to associate existing mods with creators...');

  const creators = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      handle: true,
    },
  });

  let modsAssociated = 0;

  for (const creator of creators) {
    const mods = await prisma.mod.findMany({
      where: {
        author: {
          contains: creator.handle,
          mode: 'insensitive',
        },
        creatorId: null,
      },
    });

    if (mods.length > 0) {
      await prisma.mod.updateMany({
        where: {
          id: {
            in: mods.map((m) => m.id),
          },
        },
        data: {
          creatorId: creator.id,
        },
      });

      console.log(`✅ Associated ${mods.length} mods with @${creator.handle}`);
      modsAssociated += mods.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully created: ${successCount} creators`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount} creators`);
  console.log(`❌ Errors: ${errorCount} creators`);
  console.log(`🔗 Mods associated: ${modsAssociated}`);
  console.log('='.repeat(50) + '\n');

  console.log('🎉 Manual creator seeding complete!');
}

seedCreators()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
