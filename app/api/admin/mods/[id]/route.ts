import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AISearchService } from '@/lib/services/aiSearch';
import { CacheService } from '@/lib/cache';

// GET - Get single mod
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mod = await prisma.mod.findUnique({
      where: { id: params.id },
    });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json(mod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json({ error: 'Failed to fetch mod' }, { status: 500 });
  }
}

// PATCH - Update mod
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const mod = await prisma.mod.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription }),
        ...(body.category && { category: body.category }),
        ...(body.author !== undefined && { author: body.author }),
        ...(body.thumbnail !== undefined && { thumbnail: body.thumbnail }),
        ...(body.images !== undefined && { images: body.images }),
        ...(body.downloadUrl !== undefined && { downloadUrl: body.downloadUrl }),
        ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.isFree !== undefined && { isFree: body.isFree }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.isVerified !== undefined && { isVerified: body.isVerified }),
        ...(body.isNSFW !== undefined && { isNSFW: body.isNSFW }),
        ...(body.gameVersion !== undefined && { gameVersion: body.gameVersion }),
        ...(body.version !== undefined && { version: body.version }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.downloadCount !== undefined && { downloadCount: body.downloadCount }),
        ...(body.viewCount !== undefined && { viewCount: body.viewCount }),
        ...(body.rating !== undefined && { rating: body.rating }),
      },
    });

    // Update AI search embeddings if title, description, or tags changed
    if (body.title || body.description !== undefined || body.tags !== undefined) {
      try {
        const aiSearchService = new AISearchService();
        await aiSearchService.updateSearchIndex(params.id);
      } catch (searchError) {
        console.error('Failed to update search index:', searchError);
        // Don't fail the whole request if search indexing fails
      }
    }

    // Invalidate cache when mod is updated
    await CacheService.invalidateMod(params.id);

    return NextResponse.json(mod);
  } catch (error) {
    console.error('Error updating mod:', error);
    return NextResponse.json({ error: 'Failed to update mod' }, { status: 500 });
  }
}

// DELETE - Delete mod
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mod.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mod:', error);
    return NextResponse.json({ error: 'Failed to delete mod' }, { status: 500 });
  }
}
