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

    // Check if user is being promoted to admin or premium
    const isPromotingToAdmin = body.isAdmin === true;
    const isPromotingToPremium = body.isPremium === true;

    // Use transaction to update both user and subscription together
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const user = await tx.user.update({
        where: { id: params.id },
        data: {
          ...(body.isCreator !== undefined && { isCreator: body.isCreator }),
          ...(body.isPremium !== undefined && { isPremium: body.isPremium }),
          ...(body.isAdmin !== undefined && { isAdmin: body.isAdmin }),
        },
      });

      // If user is being promoted to admin or premium, upgrade their subscription
      if (isPromotingToAdmin || isPromotingToPremium) {
        // Get or create subscription
        let subscription = await tx.subscription.findUnique({
          where: { userId: params.id }
        });

        if (!subscription) {
          // Create subscription if it doesn't exist
          subscription = await tx.subscription.create({
            data: {
              userId: params.id,
              isPremium: true,
              clickLimit: -1, // Unlimited
              lifetimeClicksUsed: 0,
              status: 'ACTIVE'
            }
          });
        } else {
          // Update existing subscription to premium
          subscription = await tx.subscription.update({
            where: { userId: params.id },
            data: {
              isPremium: true,
              clickLimit: -1, // Unlimited
              lifetimeClicksUsed: 0, // Reset click count
              status: 'ACTIVE'
            }
          });
        }

        console.log(`✅ User ${user.email} promoted to ${isPromotingToAdmin ? 'admin' : 'premium'} - subscription upgraded to unlimited`);
      }

      return user;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
