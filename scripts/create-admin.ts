// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Script to create an admin user
 * Usage: npm run admin:create
 *
 * Credentials are read from environment variables:
 * - ADMIN_USERNAME (default: adminuser45)
 * - ADMIN_PASSWORD (required!)
 */
async function createAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'adminuser45';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // No fallback: a default password in source is a committed secret.
    console.error('ADMIN_PASSWORD is not set. Run: ADMIN_PASSWORD=... npm run admin:create');
    process.exit(1);
  }
  const email = `${username}@admin.local`;

  console.log('🔧 Admin User Setup');
  console.log('==================\n');

  try {
    console.log('🔐 Creating admin user...');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Admin user already exists!');

      // Update existing user to be admin
      await prisma.user.update({
        where: { email },
        data: {
          isAdmin: true,
          username,
        },
      });

      console.log('✅ Updated existing user to admin role');
      return;
    }

    // Hash password with bcrypt (12 rounds)
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        displayName: 'Administrator',
        isAdmin: true,
        isCreator: false,
        isPremium: true,
        emailVerified: new Date(),
      },
    });

    // Store hashed password in a separate AdminCredentials table
    // Note: We need to create this table or use Account table
    // For now, we'll use the Account table with a 'credentials' provider
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: adminUser.id,
        // Store hashed password in id_token field (not ideal but works)
        id_token: hashedPassword,
      },
    });

    // Create default Favorites collection
    await prisma.collection.create({
      data: {
        userId: adminUser.id,
        name: 'Favorites',
        description: 'Admin favorites',
        isPublic: false,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the ADMIN_PASSWORD you supplied — not printed)');
    console.log(`   Email: ${email}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('🔗 Admin dashboard: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  });
