import { NextRequest, NextResponse } from 'next/server';
import { prisma, cacheStrategies } from '@/lib/prisma';

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
      // Prisma Accelerate: Cache mod details for 15s, serve stale for 30s while revalidating
      cacheStrategy: cacheStrategies.modDetail,
    });

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Serialize Decimal fields to numbers
    const serializedMod = {
      ...mod,
      rating: mod.rating ? Number(mod.rating) : null,
      price: mod.price ? Number(mod.price) : null,
    };

    return NextResponse.json(serializedMod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod' },
      { status: 500 }
    );
  }
}

