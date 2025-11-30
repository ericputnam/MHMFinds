import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripeService';
import { SubscriptionService } from '@/lib/services/subscriptionService';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event;
  try {
    event = StripeService.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process webhook asynchronously to return 200 quickly
  processWebhookEvent(event).catch(err => {
    console.error('Webhook processing error:', err);
  });

  return NextResponse.json({ received: true });
}

async function processWebhookEvent(event: any) {
  console.log(`Processing webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await SubscriptionService.handleCheckoutCompleted(event.data.object);
      break;

    case 'customer.subscription.updated':
      await SubscriptionService.handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await SubscriptionService.handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.paid':
      console.log('Invoice paid:', event.data.object.id);
      break;

    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;
  }
}
