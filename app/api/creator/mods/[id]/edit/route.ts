import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/creatorAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/mods/[id]/edit
 * Create a new submission for editing an existing mod
 * Creators can only edit their own mods, admins can edit any mod
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;

  try {
    const modId = params.id;

    // Fetch the mod with creator info
    const mod = await prisma.mod.findUnique({
      where: { id: modId },
      include: {
        creator: {
          include: {
            user: true,
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

    // Verify ownership (unless admin)
    if (!auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 401 }
      );
    }

    if (!auth.isAdmin && mod.creator?.userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own mods' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Create new submission for the edit
    const submission = await prisma.modSubmission.create({
      data: {
        // Link to user and mod
        userId: auth.user.id,
        approvedModId: modId,
        isEdit: true,

        // Basic info (required)
        modName: body.title,
        description: body.description,
        category: body.category,
        submitterName: auth.user.displayName || auth.user.username,
        submitterEmail: auth.user.email,
        modUrl: body.sourceUrl || body.downloadUrl || '',

        // Creator-specific fields
        shortDescription: body.shortDescription || null,
        version: body.version || null,
        gameVersion: body.gameVersion || null,
        tags: body.tags || [],
        thumbnail: body.thumbnail || null,
        images: body.images || [],
        downloadUrl: body.downloadUrl || null,
        sourceUrl: body.sourceUrl || null,
        source: body.source || mod.source,
        author: body.author || auth.user.username,
        isFree: body.isFree ?? true,
        price: body.price || null,
        currency: body.currency || 'USD',
        isNSFW: body.isNSFW ?? false,

        // Status
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        approvedMod: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        submission,
        message: 'Edit submitted for admin review. The mod will be updated once approved.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating edit submission:', error);
    return NextResponse.json(
      { error: 'Failed to create edit submission' },
      { status: 500 }
    );
  }
}
