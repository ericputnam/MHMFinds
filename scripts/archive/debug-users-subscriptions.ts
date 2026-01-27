/**
 * Debug script to check users and subscriptions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUsersAndSubscriptions() {
  console.log('🔍 Checking users and subscriptions...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isPremium: true,
        subscription: {
          select: {
            id: true,
            isPremium: true,
            clickLimit: true,
            lifetimeClicksUsed: true,
          }
        }
      }
    });

    console.log(`📊 Total users: ${users.length}\n`);

    const usersWithSubscription = users.filter(u => u.subscription);
    const usersWithoutSubscription = users.filter(u => !u.subscription);

    console.log(`✅ Users WITH subscriptions: ${usersWithSubscription.length}`);
    console.log(`❌ Users WITHOUT subscriptions: ${usersWithoutSubscription.length}\n`);

    if (usersWithoutSubscription.length > 0) {
      console.log('Users missing subscriptions:');
      usersWithoutSubscription.forEach(user => {
        console.log(`  - ${user.email} (${user.username}) - ID: ${user.id}`);
      });
      console.log('');
    }

    // Show first few users with subscriptions
    console.log('Sample users with subscriptions:');
    usersWithSubscription.slice(0, 5).forEach(user => {
      console.log(`  ✓ ${user.email}`);
      console.log(`    - Clicks: ${user.subscription!.lifetimeClicksUsed}/${user.subscription!.clickLimit}`);
      console.log(`    - Premium: ${user.subscription!.isPremium}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUsersAndSubscriptions();
