import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixJohnbob() {
  try {
    // Find user first
    const user = await prisma.user.findUnique({
      where: { email: 'john@gmail.com' },
      include: { subscription: true }
    });

    if (!user) {
      console.error('User not found');
      return;
    }

    // Update User.isPremium
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: true }
    });

    // Update Subscription.isPremium (if exists)
    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          isPremium: true,
          clickLimit: -1,
          status: 'ACTIVE'
        }
      });
      console.log('✅ Updated both User and Subscription to premium');
    } else {
      console.log('✅ Updated User to premium (no subscription record found)');
    }

    // Verify
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true }
    });

    console.log('\nFinal state:');
    console.log('User.isPremium:', updated?.isPremium);
    console.log('Subscription.isPremium:', updated?.subscription?.isPremium);
    console.log('Subscription.clickLimit:', updated?.subscription?.clickLimit);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJohnbob();
