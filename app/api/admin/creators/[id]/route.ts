import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const creator = await prisma.creatorProfile.update({
      where: { id: params.id },
      data: {
        ...(body.handle && { handle: body.handle }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.isVerified !== undefined && { isVerified: body.isVerified }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
      },
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error('Error updating creator:', error);
    return NextResponse.json({ error: 'Failed to update creator' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.creatorProfile.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting creator:', error);
    return NextResponse.json({ error: 'Failed to delete creator' }, { status: 500 });
  }
}
