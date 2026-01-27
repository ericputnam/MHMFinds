import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/cache';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Invalidate cache for all deleted mods
    await Promise.all(ids.map((id: string) => CacheService.invalidateMod(id)));

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

    // Invalidate cache for all updated mods
    await Promise.all(ids.map((id: string) => CacheService.invalidateMod(id)));

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk updating mods:', error);
    return NextResponse.json({ error: 'Failed to bulk update mods' }, { status: 500 });
  }
}
