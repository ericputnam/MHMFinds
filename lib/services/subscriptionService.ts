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
          data: { lifetimeClicksUsed: { increment: 1 } }
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
    return await prisma.subscription.update({
      where: { userId },
      data: {
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
  }

  /**
   * Handle successful checkout completion
   */
  static async handleCheckoutCompleted(session: any) {
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('No userId in checkout session');
      return;
    }

    // Fetch full subscription from Stripe
    const stripeSubscription = await StripeService.retrieveSubscription(
      session.subscription
    );

    await this.upgradeToPremium(userId, {
      subscriptionId: stripeSubscription.id,
      customerId: stripeSubscription.customer as string,
      priceId: stripeSubscription.items.data[0].price.id,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    });

    console.log(`User ${userId} upgraded to premium`);
  }

  /**
   * Handle subscription cancellation
   */
  static async handleSubscriptionDeleted(subscription: any) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        isPremium: false,
        clickLimit: 5,
        status: 'CANCELED',
        canceledAt: new Date()
      }
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
