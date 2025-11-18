import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate engagement score based on favorites and downloads
 * Returns a value between 1.0 and 5.0
 */
function calculateEngagementScore(favorites: number, downloads: number): number {
  const BASE_RATING = 3.0;

  // Favorites bonus: 0.5 stars per 100 favorites, max +1.5 stars
  const favoritesBonus = Math.min(1.5, (favorites / 100) * 0.5);

  // Downloads bonus: 0.1 stars per 1000 downloads, max +0.5 stars
  const downloadsBonus = Math.min(0.5, (downloads / 1000) * 0.1);

  const score = BASE_RATING + favoritesBonus + downloadsBonus;

  return Math.min(5.0, Math.max(1.0, score));
}

async function recalculateAllRatings() {
  console.log('🔄 Starting rating recalculation for all mods...\n');

  try {
    // Get all mods
    const mods = await prisma.mod.findMany({
      include: {
        _count: {
          select: {
            favorites: true,
            downloads: true,
            reviews: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    console.log(`📊 Found ${mods.length} mods to process\n`);

    let updated = 0;
    let skipped = 0;

    for (const mod of mods) {
      const favoritesCount = mod._count.favorites;
      const downloadsCount = mod._count.downloads;
      const reviewsCount = mod._count.reviews;

      let rating: number;
      let ratingCount: number;

      // If we have enough reviews, use review-based rating
      if (reviewsCount >= 10) {
        const avgReviewRating = mod.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount;
        rating = avgReviewRating;
        ratingCount = reviewsCount;
      }
      // If we have some reviews, blend them with engagement metrics
      else if (reviewsCount > 0) {
        const avgReviewRating = mod.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount;

        // Calculate engagement score
        const engagementScore = calculateEngagementScore(favoritesCount, downloadsCount);

        // Blend: 60% reviews, 40% engagement (since we don't have many reviews yet)
        rating = (avgReviewRating * 0.6) + (engagementScore * 0.4);
        ratingCount = reviewsCount;
      }
      // No reviews: use pure engagement metrics
      else {
        rating = calculateEngagementScore(favoritesCount, downloadsCount);
        ratingCount = 0; // Indicate this is calculated, not from real reviews
      }

      // Ensure rating is between 1.0 and 5.0
      rating = Math.min(5.0, Math.max(1.0, rating));

      // Update mod rating
      await prisma.mod.update({
        where: { id: mod.id },
        data: {
          rating: rating,
          ratingCount: ratingCount,
        },
      });

      updated++;

      if (updated % 100 === 0) {
        console.log(`✅ Processed ${updated}/${mods.length} mods...`);
      }
    }

    console.log(`\n✨ Rating recalculation complete!`);
    console.log(`📈 Updated: ${updated} mods`);
    console.log(`⏭️  Skipped: ${skipped} mods`);
  } catch (error) {
    console.error('❌ Error recalculating ratings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
recalculateAllRatings()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
