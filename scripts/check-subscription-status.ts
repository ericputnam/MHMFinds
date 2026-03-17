// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '@/lib/prisma';

/**
 * Check subscription status for a user by email
 */
async function checkSubscriptionStatus() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/check-subscription-status.ts <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log('\n📊 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   ID: ${user.id}`);

    if (user.subscription) {
      console.log('\n💳 Subscription Status:');
      console.log(`   Premium: ${user.subscription.isPremium ? '✅ Yes' : '❌ No'}`);
      console.log(`   Status: ${user.subscription.status}`);
      console.log(`   Click Limit: ${user.subscription.clickLimit === -1 ? 'Unlimited' : user.subscription.clickLimit}`);
      console.log(`   Clicks Used: ${user.subscription.lifetimeClicksUsed}`);
      console.log(`   Clicks Remaining: ${user.subscription.isPremium ? 'Unlimited' : user.subscription.clickLimit - user.subscription.lifetimeClicksUsed}`);

      if (user.subscription.stripeCustomerId) {
        console.log(`\n💰 Stripe Information:`);
        console.log(`   Customer ID: ${user.subscription.stripeCustomerId}`);
        console.log(`   Subscription ID: ${user.subscription.stripeSubscriptionId || 'None'}`);
        console.log(`   Price ID: ${user.subscription.stripePriceId || 'None'}`);
        if (user.subscription.stripeCurrentPeriodEnd) {
          console.log(`   Period End: ${user.subscription.stripeCurrentPeriodEnd}`);
        }
      }
    } else {
      console.log('\n❌ No subscription found for this user');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscriptionStatus();
