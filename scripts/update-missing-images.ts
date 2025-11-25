import { prisma } from '../lib/prisma';
import { mhmScraper } from '../lib/services/mhmScraper';

/**
 * Update mods that are missing thumbnail images
 * by re-scraping their source URLs
 */
async function updateMissingImages() {
  console.log('🔍 Finding mods without thumbnails...\n');

  try {
    // Find all mods without thumbnails
    const modsWithoutImages = await prisma.mod.findMany({
      where: {
        OR: [
          { thumbnail: null },
          { thumbnail: '' },
        ],
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        source: true,
      },
    });

    console.log(`Found ${modsWithoutImages.length} mods without thumbnails\n`);

    if (modsWithoutImages.length === 0) {
      console.log('✅ All mods have thumbnails!');
      return;
    }

    // Group by source URL to avoid re-scraping the same page multiple times
    const urlMap = new Map<string, string[]>();
    for (const mod of modsWithoutImages) {
      if (!mod.sourceUrl) continue; // Skip mods without source URL
      const modIds = urlMap.get(mod.sourceUrl) || [];
      modIds.push(mod.id);
      urlMap.set(mod.sourceUrl, modIds);
    }

    console.log(`📄 Need to re-scrape ${urlMap.size} unique pages\n`);

    let updatedCount = 0;
    let processedUrls = 0;

    // Process each unique source URL
    for (const [sourceUrl, modIds] of Array.from(urlMap.entries())) {
      processedUrls++;
      console.log(`\n[${processedUrls}/${urlMap.size}] Re-scraping: ${sourceUrl}`);

      try {
        // Re-scrape the page
        const scrapedMods = await mhmScraper.scrapeModsFromPost(sourceUrl);
        console.log(`   Found ${scrapedMods.length} mods on page`);

        if (scrapedMods.length === 0) {
          console.log('   ⚠️  No mods found - page may have changed');
          continue;
        }

        // Update each mod from this page
        for (const modId of modIds) {
          const existingMod = await prisma.mod.findUnique({
            where: { id: modId },
          });

          if (!existingMod) continue;

          // Try to find matching scraped mod by title or download URL
          const matchingScraped = scrapedMods.find(
            (scraped) =>
              scraped.title.toLowerCase() === existingMod.title.toLowerCase() ||
              (scraped.downloadUrl && scraped.downloadUrl === existingMod.downloadUrl)
          );

          if (matchingScraped && matchingScraped.thumbnail) {
            await prisma.mod.update({
              where: { id: modId },
              data: {
                thumbnail: matchingScraped.thumbnail,
                images: matchingScraped.images.length > 0 ? matchingScraped.images : existingMod.images,
              },
            });
            updatedCount++;
            console.log(`   ✅ Updated: ${existingMod.title}`);
          } else {
            console.log(`   ⏭️  No match found for: ${existingMod.title}`);
          }
        }

        // Be respectful - wait between requests
        if (processedUrls < urlMap.size) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   ❌ Error re-scraping ${sourceUrl}:`, error);
      }
    }

    console.log('\n✅ Update complete!');
    console.log(`📊 Updated ${updatedCount} mods with images`);
    console.log(`⏭️  Still missing: ${modsWithoutImages.length - updatedCount}`);
  } catch (error) {
    console.error('Error updating missing images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateMissingImages();
