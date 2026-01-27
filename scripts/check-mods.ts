// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Checking mods in database...\n');

    const total = await prisma.mod.count();
    console.log(`Total mods: ${total}\n`);

    const mods = await prisma.mod.findMany({
      take: 5,
      include: {
        creator: true,
      },
    });

    console.log('Sample mods:');
    mods.forEach((mod, i) => {
      console.log(`\n${i + 1}. ${mod.title}`);
      console.log(`   Category: ${mod.category}`);
      console.log(`   Source: ${mod.source}`);
      console.log(`   Download URL: ${mod.downloadUrl || 'N/A'}`);
      console.log(`   Rating: ${mod.rating}`);
      console.log(`   Price: ${mod.price}`);
      console.log(`   Creator: ${mod.creator?.handle || 'N/A'}`);
    });

    // Try the same query the API uses
    console.log('\n\nTesting API query...');
    const apiResult = await prisma.mod.findMany({
      where: {
        isVerified: true,
        isNSFW: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            downloads: true,
          },
        },
      },
    });

    console.log(`API query returned ${apiResult.length} mods`);
    console.log('\nAPI query successful!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
