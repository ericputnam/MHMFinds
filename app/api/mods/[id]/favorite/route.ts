import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';

// Session-dependent on every method — never statically rendered or cached.
export const dynamic = 'force-dynamic';

/**
 * GET — is this mod in the signed-in visitor's favorites? (E138, Cass,
 * 2026-09-29). `/mods/[id]` used to start every visitor at "not favorited",
 * so a signed-in visitor who had already saved the mod saw "Add to
 * Favorites" and the E130 "Save this find" offer, and one click on the heart
 * POSTed a duplicate (400) instead of removing it. The client calls this
 * only when `useSession()` reports `authenticated` — anonymous visitors make
 * no request. Read-only: GET never mutates.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const noStore = { 'Cache-Control': 'private, no-store' };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_modId: {
          userId: session.user.id,
          modId: params.id,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ favorited: favorite !== null }, { headers: noStore });
  } catch (error) {
    console.error('Error reading favorite state:', error);
    return NextResponse.json(
      { error: 'Failed to read favorite state' },
      { status: 500, headers: noStore }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const modId = params.id;

    // Check if mod exists
    const mod = await prisma.mod.findUnique({
      where: { id: modId },
    });

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_modId: {
          userId: session.user.id,
          modId: modId,
        },
      },
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: 'Already favorited' },
        { status: 400 }
      );
    }

    // Create favorite
    await prisma.favorite.create({
      data: {
        userId: session.user.id,
        modId: modId,
      },
    });

    // Recalculate mod rating
    await recalculateModRating(modId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const modId = params.id;

    // Delete favorite
    await prisma.favorite.delete({
      where: {
        userId_modId: {
          userId: session.user.id,
          modId: modId,
        },
      },
    });

    // Recalculate mod rating
    await recalculateModRating(modId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}

/**
 * Calculate mod rating based on favorites, downloads, and reviews
 * Rating algorithm (1-5 stars):
 *
 * If mod has 10+ reviews: Use average review rating
 * Otherwise: Calculate based on engagement metrics
 *
 * Base: 3.0 stars (neutral)
 * + Favorites bonus: min(1.5, favorites / 100 * 0.5)
 * + Downloads bonus: min(0.5, downloads / 1000 * 0.1)
 * + Reviews bonus: If 1-9 reviews, blend review average with engagement score
 *
 * This gives popular mods higher ratings while still respecting actual user reviews
 */
async function recalculateModRating(modId: string) {
  try {
    // Get mod with counts
    const mod = await prisma.mod.findUnique({
      where: { id: modId },
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

    if (!mod) return;

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
      where: { id: modId },
      data: {
        rating: rating,
        ratingCount: ratingCount,
      },
    });
  } catch (error) {
    console.error('Error recalculating rating:', error);
  }
}

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
