// Load environment variables FIRST, before any imports that need them
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

// Now import modules that depend on environment variables
import { prisma } from '../lib/prisma';

async function migrateImageUrls() {
  console.log('Starting image URL migration...');
  console.log('Updating URLs from www.musthavemods.com to blog.musthavemods.com\n');

  try {
    // Update mod thumbnails
    const thumbnailUpdate = await prisma.$executeRaw`
      UPDATE mods
      SET thumbnail = REPLACE(thumbnail, 'www.musthavemods.com', 'blog.musthavemods.com')
      WHERE thumbnail LIKE '%www.musthavemods.com%'
    `;
    console.log(`✅ Updated ${thumbnailUpdate} mod thumbnails`);

    // Update mod images array
    const imagesUpdate = await prisma.$executeRaw`
      UPDATE mods
      SET images = ARRAY(
        SELECT REPLACE(unnest(images)::text, 'www.musthavemods.com', 'blog.musthavemods.com')
      )
      WHERE EXISTS (
        SELECT 1 FROM unnest(images) AS img
        WHERE img LIKE '%www.musthavemods.com%'
      )
    `;
    console.log(`✅ Updated ${imagesUpdate} mod image arrays`);

    // Also update any http:// to https:// for blog domain
    const httpsUpdate = await prisma.$executeRaw`
      UPDATE mods
      SET thumbnail = REPLACE(thumbnail, 'http://blog.musthavemods.com', 'https://blog.musthavemods.com')
      WHERE thumbnail LIKE '%http://blog.musthavemods.com%'
    `;
    console.log(`✅ Updated ${httpsUpdate} thumbnails to HTTPS`);

    // Count total mods with blog images
    const totalWithBlogImages = await prisma.mod.count({
      where: {
        OR: [
          { thumbnail: { contains: 'blog.musthavemods.com' } },
          { images: { has: 'blog.musthavemods.com' } }
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
