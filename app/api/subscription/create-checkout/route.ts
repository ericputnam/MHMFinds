import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { StripeService } from '@/lib/services/stripeService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'priceId required' }, { status: 400 });
    }

    const subscription = await SubscriptionService.getOrCreateSubscription(session.user.id);

    // Get or create Stripe customer
    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await StripeService.createCustomer(
        subscription.user.email!,
        session.user.id
      );
      customerId = customer.id;

      // Save customer ID
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeCustomerId: customerId }
      });
    }

    // Create checkout session
    const checkoutSession = await StripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${process.env.NEXTAUTH_URL}/account/subscription?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      userId: session.user.id
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
