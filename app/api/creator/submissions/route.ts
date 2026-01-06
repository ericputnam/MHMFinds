import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/creatorAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/submissions
 * Create a new mod submission for review
 */
export async function POST(request: NextRequest) {
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();

    // Create submission linked to authenticated user
    const submission = await prisma.modSubmission.create({
      data: {
        // Link to user
        userId: auth.user.id,

        // Basic info (required for all submissions)
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
        source: body.source || 'Creator Upload',
        author: body.author || auth.user.username,
        isFree: body.isFree ?? true,
        price: body.price || null,
        currency: body.currency || 'USD',
        isNSFW: body.isNSFW ?? false,

        // Status
        status: 'pending',
        isEdit: false,
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        submission,
        message: 'Mod submitted successfully for review',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/creator/submissions
 * List submissions for the authenticated creator
 * Query params:
 *   - status: Filter by status (pending, approved, rejected)
 */
export async function GET(request: NextRequest) {
  const auth = await requireCreator(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      userId: auth.user.id, // Creators only see their own submissions
    };

    if (status) {
      where.status = status;
    }

    // Fetch submissions
    const submissions = await prisma.modSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
            downloadCount: true,
            rating: true,
          },
        },
      },
    });

    // Get counts by status for stats
    const statusCounts = await prisma.modSubmission.groupBy({
      by: ['status'],
      where: { userId: auth.user.id },
      _count: true,
    });

    const counts = {
      total: submissions.length,
      pending: statusCounts.find((s) => s.status === 'pending')?._count || 0,
      approved: statusCounts.find((s) => s.status === 'approved')?._count || 0,
      rejected: statusCounts.find((s) => s.status === 'rejected')?._count || 0,
    };

    return NextResponse.json({
      submissions,
      counts,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
