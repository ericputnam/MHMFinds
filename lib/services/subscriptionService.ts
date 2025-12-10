import { prisma } from '@/lib/prisma';
import { StripeService } from './stripeService';

export class SubscriptionService {
  /**
   * Get or create subscription record for user
   */
  static async getOrCreateSubscription(userId: string) {
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!subscription) {
      // Check if user exists before trying to create subscription
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!userExists) {
        throw new Error(`User not found: ${userId}. Please sign out and sign in again.`);
      }

      subscription = await prisma.subscription.create({
        data: {
          userId,
          isPremium: false,
          clickLimit: 5,
          lifetimeClicksUsed: 0,
          status: 'ACTIVE'
        },
        include: { user: true }
      });
    }

    return subscription;
  }

  /**
   * Check if user can download (has clicks remaining or is premium)
   */
  static async canDownload(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);

    if (subscription.isPremium) {
      return {
        allowed: true,
        clicksRemaining: -1, // -1 means unlimited
        isPremium: true,
        needsUpgrade: false
      };
    }

    const remaining = subscription.clickLimit - subscription.lifetimeClicksUsed;
    return {
      allowed: remaining > 0,
      clicksRemaining: remaining,
      isPremium: false,
      needsUpgrade: remaining <= 0
    };
  }

  /**
   * Track a download click and increment counter
   */
  static async trackClick(userId: string, modId: string, metadata: {
    ipAddress?: string | null;
    userAgent?: string | null;
    referrer?: string | null;
  }) {
    const subscription = await this.getOrCreateSubscription(userId);

    // Use transaction with extended timeout for critical operations only
    const updatedSub = await prisma.$transaction(async (tx) => {
      // Create click record
      await tx.downloadClick.create({
        data: {
          userId,
          modId,
          subscriptionId: subscription.id,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          referrer: metadata.referrer
        }
      });

      // Increment click counter (only if not premium)
      let updated = subscription;
      if (!subscription.isPremium) {
        updated = await tx.subscription.update({
          where: { id: subscription.id },
          data: { lifetimeClicksUsed: { increment: 1 } },
          include: { user: true }
        });
      }

      return updated;
    }, {
      maxWait: 10000, // Wait up to 10s for transaction slot
      timeout: 15000, // Transaction can run for up to 15s
    });

    // Update mod download count asynchronously (non-blocking, non-critical)
    prisma.mod.update({
      where: { id: modId },
      data: { downloadCount: { increment: 1 } }
    }).catch(error => {
      console.error('Failed to update mod download count:', error);
      // Don't throw - this is non-critical
    });

    return {
      success: true,
      clicksRemaining: updatedSub.isPremium
        ? -1
        : updatedSub.clickLimit - updatedSub.lifetimeClicksUsed
    };
  }

  /**
   * Upgrade user to premium after successful payment
   */
  static async upgradeToPremium(userId: string, stripeData: {
    subscriptionId: string;
    customerId: string;
    priceId: string;
    currentPeriodEnd: Date;
  }) {
    console.log('[SUBSCRIPTION] upgradeToPremium starting for user:', userId, stripeData);

    // Update both Subscription AND User in a transaction with extended timeout
    const result = await prisma.$transaction(async (tx) => {
      console.log('[SUBSCRIPTION] Updating User.isPremium to true for user:', userId);

      // Update User.isPremium
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { isPremium: true }
      });

      console.log('[SUBSCRIPTION] User updated successfully:', {
        userId: updatedUser.id,
        isPremium: updatedUser.isPremium
      });

      console.log('[SUBSCRIPTION] Upserting Subscription record');

      // Upsert Subscription record (create if doesn't exist, update if it does)
      const subscription = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          isPremium: true,
          clickLimit: -1, // Unlimited
          lifetimeClicksUsed: 0,
          status: 'ACTIVE',
          stripeSubscriptionId: stripeData.subscriptionId,
          stripeCustomerId: stripeData.customerId,
          stripePriceId: stripeData.priceId,
          stripeCurrentPeriodEnd: stripeData.currentPeriodEnd,
          cancelAtPeriodEnd: false
        },
        update: {
          isPremium: true,
          clickLimit: -1, // Unlimited
          status: 'ACTIVE',
          stripeSubscriptionId: stripeData.subscriptionId,
          stripeCustomerId: stripeData.customerId,
          stripePriceId: stripeData.priceId,
          stripeCurrentPeriodEnd: stripeData.currentPeriodEnd,
          cancelAtPeriodEnd: false
        }
      });

      console.log('[SUBSCRIPTION] Subscription upserted successfully:', {
        subscriptionId: subscription.id,
        isPremium: subscription.isPremium,
        stripeSubscriptionId: subscription.stripeSubscriptionId
      });

      return subscription;
    }, {
      maxWait: 15000, // Wait up to 15s for transaction slot (critical for webhooks)
      timeout: 30000, // Transaction can run for up to 30s
    });

    console.log('[SUBSCRIPTION] ✓ Transaction completed successfully for user:', userId);
    return result;
  }

  /**
   * Handle successful checkout completion
   */
  static async handleCheckoutCompleted(session: any) {
    console.log('[SUBSCRIPTION] handleCheckoutCompleted called', {
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
      subscription: session.subscription
    });

    const userId = session.client_reference_id;
    if (!userId) {
      console.error('[SUBSCRIPTION] ERROR: No userId in checkout session', {
        sessionId: session.id,
        sessionData: JSON.stringify(session, null, 2)
      });
      return;
    }

    console.log(`[SUBSCRIPTION] Fetching Stripe subscription for user ${userId}`);

    // Fetch full subscription from Stripe
    const stripeSubscription = await StripeService.retrieveSubscription(
      session.subscription
    );

    console.log('[SUBSCRIPTION] Stripe subscription retrieved:', {
      subscriptionId: stripeSubscription.id,
      customerId: stripeSubscription.customer,
      status: stripeSubscription.status,
      current_period_end: (stripeSubscription as any).current_period_end,
      current_period_end_type: typeof (stripeSubscription as any).current_period_end,
      rawSubscription: JSON.stringify(stripeSubscription)
    });

    // Parse the current period end date safely
    let currentPeriodEndTimestamp = (stripeSubscription as any).current_period_end as number | undefined;

    if (!currentPeriodEndTimestamp || typeof currentPeriodEndTimestamp !== 'number') {
      console.warn('[SUBSCRIPTION] WARNING: current_period_end missing, using 30 days from now as fallback');
      // Use 30 days from now as fallback
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 30);
      currentPeriodEndTimestamp = Math.floor(fallbackDate.getTime() / 1000);
    }

    const currentPeriodEnd = new Date(currentPeriodEndTimestamp * 1000);
    if (isNaN(currentPeriodEnd.getTime())) {
      console.error('[SUBSCRIPTION] ERROR: Date conversion resulted in Invalid Date:', {
        timestamp: currentPeriodEndTimestamp,
        dateString: currentPeriodEnd.toString()
      });
      throw new Error(`Failed to convert timestamp to valid Date: ${currentPeriodEndTimestamp}`);
    }

    const upgradeData = {
      subscriptionId: stripeSubscription.id,
      customerId: stripeSubscription.customer as string,
      priceId: stripeSubscription.items.data[0].price.id,
      currentPeriodEnd
    };

    console.log('[SUBSCRIPTION] Calling upgradeToPremium with:', upgradeData);

    await this.upgradeToPremium(userId, upgradeData);

    console.log(`[SUBSCRIPTION] ✓ User ${userId} successfully upgraded to premium`);
  }

  /**
   * Handle subscription cancellation
   */
  static async handleSubscriptionDeleted(subscription: any) {
    // Update both Subscription AND User in a transaction
    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { userId: true }
    });

    if (!sub) {
      console.error(`Subscription ${subscription.id} not found in database`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update User.isPremium to false
      await tx.user.update({
        where: { id: sub.userId },
        data: { isPremium: false }
      });

      // Update Subscription record
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          isPremium: false,
          clickLimit: 5,
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });
    }, {
      maxWait: 15000, // Wait up to 15s for transaction slot
      timeout: 30000, // Transaction can run for up to 30s
    });

    console.log(`Subscription ${subscription.id} canceled`);
  }

  /**
   * Handle subscription updates (renewals, changes)
   */
  static async handleSubscriptionUpdated(subscription: any) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: subscription.status.toUpperCase(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
  }
}
