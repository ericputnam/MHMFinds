import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const mod = await prisma.mod.findUnique({
      where: { id },
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

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedMod = {
      ...mod,
      price: mod.price?.toString() || null,
      rating: mod.rating?.toString() || null,
      _count: {
        reviews: mod._count.reviews,
        favorites: mod._count.favorites,
        downloads: mod._count.downloads,
      },
    };

    return NextResponse.json(transformedMod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod' },
      { status: 500 }
    );
  }
}

