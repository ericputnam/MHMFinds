import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET /api/affiliates/[id] - Get single offer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offer = await prisma.affiliateOffer.findUnique({
      where: { id: params.id },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error fetching affiliate offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer' },
      { status: 500 }
    );
  }
}

// PUT /api/affiliates/[id] - Update offer (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      affiliateUrl,
      partner,
      partnerLogo,
      category,
      priority,
      isActive,
      promoText,
      promoColor,
      startDate,
      endDate,
    } = body;

    const offer = await prisma.affiliateOffer.update({
      where: { id: params.id },
      data: {
        name,
        description,
        imageUrl,
        affiliateUrl,
        partner,
        partnerLogo,
        category,
        priority,
        isActive,
        promoText,
        promoColor,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error updating affiliate offer:', error);
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

// DELETE /api/affiliates/[id] - Delete offer (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.affiliateOffer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting affiliate offer:', error);
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    );
  }
}
