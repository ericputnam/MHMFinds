/**
 * Script to create subscription records for existing users
 * Run this once to backfill subscriptions for users created before the subscription system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSubscriptionsForExistingUsers() {
  console.log('🔍 Finding users without subscriptions...\n');

  try {
    // Find all users that don't have a subscription
    const usersWithoutSubscription = await prisma.user.findMany({
      where: {
        subscription: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        isPremium: true,
        isAdmin: true,
      }
    });

    if (usersWithoutSubscription.length === 0) {
      console.log('✅ All users already have subscriptions!');
      return;
    }

    console.log(`Found ${usersWithoutSubscription.length} users without subscriptions:\n`);
    usersWithoutSubscription.forEach(user => {
      console.log(`  - ${user.email} (${user.username})`);
    });

    console.log('\n📝 Creating subscription records...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutSubscription) {
      try {
        // Admin users should be premium with unlimited downloads
        const isPremiumUser = user.isPremium || user.isAdmin;

        await prisma.subscription.create({
          data: {
            userId: user.id,
            isPremium: isPremiumUser,
            clickLimit: isPremiumUser ? -1 : 5, // -1 means unlimited
            lifetimeClicksUsed: 0,
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created subscription for ${user.email}${isPremiumUser ? ' (Premium/Admin)' : ''}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error creating subscription for ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} subscriptions`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSubscriptionsForExistingUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
