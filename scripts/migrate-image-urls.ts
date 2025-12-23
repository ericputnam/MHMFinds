// Load environment variables FIRST, before any imports that need them
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

// Now import modules that depend on environment variables
import { prisma } from '../lib/prisma';

async function migrateImageUrls() {
  console.log('Starting image URL migration...');
  console.log('Updating URLs from musthavemods.com to blog.musthavemods.com\n');

  try {
    // Update thumbnails: both www.musthavemods.com and musthavemods.com (no www)
    const thumbnailUpdate1 = await prisma.$executeRaw`
      UPDATE mods
      SET thumbnail = REPLACE(REPLACE(thumbnail, 'http://www.musthavemods.com', 'https://blog.musthavemods.com'), 'https://www.musthavemods.com', 'https://blog.musthavemods.com')
      WHERE thumbnail LIKE '%www.musthavemods.com%'
    `;
    console.log(`✅ Updated ${thumbnailUpdate1} thumbnails (www.musthavemods.com → blog.musthavemods.com)`);

    const thumbnailUpdate2 = await prisma.$executeRaw`
      UPDATE mods
      SET thumbnail = REPLACE(REPLACE(thumbnail, 'http://musthavemods.com', 'https://blog.musthavemods.com'), 'https://musthavemods.com', 'https://blog.musthavemods.com')
      WHERE thumbnail LIKE '%musthavemods.com%' AND thumbnail NOT LIKE '%blog.musthavemods.com%'
    `;
    console.log(`✅ Updated ${thumbnailUpdate2} thumbnails (musthavemods.com → blog.musthavemods.com)`);

    // Update images arrays: both www.musthavemods.com and musthavemods.com (no www)
    const imagesUpdate1 = await prisma.$executeRaw`
      UPDATE mods
      SET images = ARRAY(
        SELECT REPLACE(REPLACE(unnest(images)::text, 'http://www.musthavemods.com', 'https://blog.musthavemods.com'), 'https://www.musthavemods.com', 'https://blog.musthavemods.com')
      )
      WHERE EXISTS (
        SELECT 1 FROM unnest(images) AS img
        WHERE img LIKE '%www.musthavemods.com%'
      )
    `;
    console.log(`✅ Updated ${imagesUpdate1} image arrays (www.musthavemods.com → blog.musthavemods.com)`);

    const imagesUpdate2 = await prisma.$executeRaw`
      UPDATE mods
      SET images = ARRAY(
        SELECT REPLACE(REPLACE(unnest(images)::text, 'http://musthavemods.com', 'https://blog.musthavemods.com'), 'https://musthavemods.com', 'https://blog.musthavemods.com')
      )
      WHERE EXISTS (
        SELECT 1 FROM unnest(images) AS img
        WHERE img LIKE '%musthavemods.com%' AND img NOT LIKE '%blog.musthavemods.com%'
      )
    `;
    console.log(`✅ Updated ${imagesUpdate2} image arrays (musthavemods.com → blog.musthavemods.com)`);

    // Count total mods with blog images
    const totalWithBlogImages = await prisma.mod.count({
      where: {
        OR: [
          { thumbnail: { contains: 'blog.musthavemods.com' } },
        ]
      }
    });

    console.log(`\n📊 Total mods with blog.musthavemods.com images: ${totalWithBlogImages}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateImageUrls()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
