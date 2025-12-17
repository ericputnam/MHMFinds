import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    // Get your email from command line args or use a default
    const email = process.argv[2];

    if (!email) {
      console.error('❌ Please provide your email address');
      console.log('Usage: npx tsx scripts/make-me-admin.ts your@email.com');
      process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
      }
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`\n📋 Current user status:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Admin: ${user.isAdmin ? '✅ Yes' : '❌ No'}`);

    if (user.isAdmin) {
      console.log(`\n✅ User is already an admin!`);
      process.exit(0);
    }

    console.log(`\n🔄 Setting admin status to true...`);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });

    console.log(`\n✅ Success! ${updatedUser.email} is now an admin.`);
    console.log(`\nYou can now access the admin dashboard at /admin`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
