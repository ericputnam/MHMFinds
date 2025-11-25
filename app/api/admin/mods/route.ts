import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List mods with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    // Get mods and total count
    const [mods, total] = await Promise.all([
      prisma.mod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          author: true,
          downloadCount: true,
          rating: true,
          isFeatured: true,
          isVerified: true,
          createdAt: true,
          thumbnail: true,
          downloadUrl: true,
        },
      }),
      prisma.mod.count({ where }),
    ]);

    return NextResponse.json({
      mods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json({ error: 'Failed to fetch mods' }, { status: 500 });
  }
}

// POST - Create new mod
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const mod = await prisma.mod.create({
      data: {
        title: body.title,
        description: body.description,
        shortDescription: body.shortDescription,
        category: body.category,
        author: body.author,
        thumbnail: body.thumbnail,
        images: body.images || [],
        downloadUrl: body.downloadUrl,
        sourceUrl: body.sourceUrl,
        source: body.source || 'Manual',
        tags: body.tags || [],
        isFree: body.isFree ?? true,
        price: body.price,
        isFeatured: body.isFeatured ?? false,
        isVerified: body.isVerified ?? false,
      },
    });

    return NextResponse.json(mod, { status: 201 });
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json({ error: 'Failed to create mod' }, { status: 500 });
  }
}
