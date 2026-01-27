import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const categories = await prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            mods: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, parentId } = body;

    // Determine level and path based on parent
    let level = 0;
    let path = slug;

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}/${slug}`;
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        path,
        level,
        description,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
