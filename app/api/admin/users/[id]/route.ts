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

      // Revoking premium must also downgrade the Subscription row. It used to stay
      // `isPremium: true, clickLimit: -1`, so the two records disagreed forever.
      // An admin keeps unlimited access, and a Stripe-paid subscription is left alone
      // (cancel it in Stripe; the webhook downgrades the row).
      if (body.isPremium === false && !user.isAdmin) {
        await tx.subscription.updateMany({
          where: { userId: params.id, stripeSubscriptionId: null },
          data: { isPremium: false, clickLimit: 5 },
        });
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

    // Deleting your own account cascades to everything you own and can leave the
    // site with no admin at all.
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
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
