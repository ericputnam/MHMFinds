import { prisma } from '@/lib/prisma';

/**
 * Manually upgrade a user to premium (for when webhook fails in dev)
 */
async function manuallyUpgradeUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/manually-upgrade-user.ts <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    if (!user.subscription) {
      console.log(`❌ No subscription found for user`);
      return;
    }

    console.log(`\n🔄 Upgrading ${email} to premium...`);

    // Update subscription to premium
    const updated = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        isPremium: true,
        clickLimit: -1, // Unlimited
        status: 'ACTIVE',
        lifetimeClicksUsed: 0, // Reset clicks for premium user
        // Note: Not setting Stripe subscription ID since this is manual
        // In production, this would come from the webhook
      }
    });

    // Also update user isPremium flag
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: true }
    });

    console.log(`✅ Successfully upgraded ${email} to premium!`);
    console.log(`\n📊 New Status:`);
    console.log(`   Premium: ✅ Yes`);
    console.log(`   Click Limit: Unlimited`);
    console.log(`   Status: ${updated.status}`);
    console.log(`\n⚠️  Note: This is a manual upgrade. In production, this would be handled by Stripe webhooks.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manuallyUpgradeUser();
