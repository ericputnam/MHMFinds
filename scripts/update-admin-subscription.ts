/**
 * Update admin user subscription to premium with unlimited downloads
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminSubscription() {
  console.log('🔍 Finding admin users...\n');

  try {
    // Find all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { isPremium: true }
        ]
      },
      include: {
        subscription: true
      }
    });

    console.log(`Found ${adminUsers.length} admin/premium users\n`);

    let updatedCount = 0;

    for (const user of adminUsers) {
      if (!user.subscription) {
        console.log(`❌ ${user.email} has no subscription - run create-subscriptions script first`);
        continue;
      }

      // Update subscription to premium with unlimited downloads
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          isPremium: true,
          clickLimit: -1,
          status: 'ACTIVE'
        }
      });

      console.log(`✅ Updated ${user.email} to premium (unlimited downloads)`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated ${updatedCount} subscriptions to premium`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminSubscription()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
