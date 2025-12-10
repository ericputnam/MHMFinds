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
  console.log(`[WEBHOOK] Processing event: ${event.type}`, {
    eventId: event.id,
    created: new Date(event.created * 1000).toISOString()
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[WEBHOOK] Checkout completed:', {
          sessionId: event.data.object.id,
          customerId: event.data.object.customer,
          subscriptionId: event.data.object.subscription,
          clientReferenceId: event.data.object.client_reference_id
        });
        await SubscriptionService.handleCheckoutCompleted(event.data.object);
        console.log('[WEBHOOK] Checkout processing completed successfully');
        break;

      case 'customer.subscription.updated':
        console.log('[WEBHOOK] Subscription updated:', {
          subscriptionId: event.data.object.id,
          status: event.data.object.status
        });
        await SubscriptionService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('[WEBHOOK] Subscription deleted:', {
          subscriptionId: event.data.object.id
        });
        await SubscriptionService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        console.log('[WEBHOOK] Invoice paid:', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        console.log('[WEBHOOK] Payment failed:', event.data.object.id);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error processing ${event.type}:`, error);
    throw error;
  }
}
