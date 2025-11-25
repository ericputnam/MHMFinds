import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE - Bulk delete mods
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    await prisma.mod.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk deleting mods:', error);
    return NextResponse.json({ error: 'Failed to bulk delete mods' }, { status: 500 });
  }
}

// PATCH - Bulk update mods
export async function PATCH(request: NextRequest) {
  try {
    const { ids, updates } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 });
    }

    await prisma.mod.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: updates,
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk updating mods:', error);
    return NextResponse.json({ error: 'Failed to bulk update mods' }, { status: 500 });
  }
}
