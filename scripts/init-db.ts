import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing ModVault database...');

  // Create content sources
  console.log('📡 Creating content sources...');
  
  const contentSources = [
    {
      name: 'Patreon',
      baseUrl: 'https://www.patreon.com',
      apiEndpoint: null,
      apiKey: null,
      isActive: true,
      scrapeInterval: 3600, // 1 hour
      rateLimit: 100,
    },
    {
      name: 'CurseForge',
      baseUrl: 'https://www.curseforge.com',
      apiEndpoint: 'https://api.curseforge.com/v1',
      apiKey: process.env.CURSEFORGE_API_KEY || null,
      isActive: true,
      scrapeInterval: 1800, // 30 minutes
      rateLimit: 200,
    },
    {
      name: 'Tumblr',
      baseUrl: 'https://www.tumblr.com',
      apiEndpoint: null,
      apiKey: null,
      isActive: true,
      scrapeInterval: 7200, // 2 hours
      rateLimit: 50,
    },
    {
      name: 'The Sims Resource',
      baseUrl: 'https://www.thesimsresource.com',
      apiEndpoint: null,
      apiKey: null,
      isActive: true,
      scrapeInterval: 3600, // 1 hour
      rateLimit: 80,
    },
    {
      name: 'ModTheSims',
      baseUrl: 'https://modthesims.info',
      apiEndpoint: null,
      apiKey: null,
      isActive: true,
      scrapeInterval: 7200, // 2 hours
      rateLimit: 60,
    },
  ];

  for (const source of contentSources) {
    await prisma.contentSource.upsert({
      where: { name: source.name },
      update: source,
      create: source,
    });
  }

  // Create sample categories and tags
  console.log('🏷️ Creating sample categories and tags...');
  
  const sampleMods = [
    {
      title: 'Modern Living Room Set',
      description: 'A beautiful collection of modern living room furniture including sofas, coffee tables, and decorative items.',
      shortDescription: 'Modern living room furniture collection',
      version: '1.0',
      gameVersion: 'Sims 4',
      category: 'Build/Buy',
      tags: ['furniture', 'living room', 'modern', 'decorative'],
      thumbnail: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Modern+Furniture',
      images: ['https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Modern+Furniture+1'],
      downloadUrl: 'https://example.com/modern-furniture',
      sourceUrl: 'https://example.com/modern-furniture',
      source: 'Sample',
      isFree: true,
      isNSFW: false,
      isVerified: true,
      isFeatured: true,
    },
    {
      title: 'Casual Streetwear Collection',
      description: 'Trendy streetwear clothing for teens and young adults, including hoodies, jeans, and sneakers.',
      shortDescription: 'Trendy streetwear clothing collection',
      version: '2.1',
      gameVersion: 'Sims 4',
      category: 'CAS',
      tags: ['clothing', 'streetwear', 'casual', 'teens'],
      thumbnail: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Streetwear',
      images: ['https://via.placeholder.com/800x600/DC2626/FFFFFF?text=Streetwear+1'],
      downloadUrl: 'https://example.com/streetwear',
      sourceUrl: 'https://example.com/streetwear',
      source: 'Sample',
      isFree: true,
      isNSFW: false,
      isVerified: true,
      isFeatured: false,
    },
    {
      title: 'Career Overhaul: Tech Industry',
      description: 'Completely reimagines the tech career with new interactions, skills, and progression paths.',
      shortDescription: 'Tech career overhaul with new features',
      version: '3.0',
      gameVersion: 'Sims 4',
      category: 'Gameplay',
      tags: ['career', 'tech', 'overhaul', 'interactions'],
      thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Tech+Career',
      images: ['https://via.placeholder.com/800x600/059669/FFFFFF?text=Tech+Career+1'],
      downloadUrl: 'https://example.com/tech-career',
      sourceUrl: 'https://example.com/tech-career',
      source: 'Sample',
      isFree: false,
      price: 4.99,
      isNSFW: false,
      isVerified: true,
      isFeatured: true,
    },
    {
      title: 'Advanced Gardening System',
      description: 'Enhanced gardening mechanics with new plant types, seasons, and cross-breeding system.',
      shortDescription: 'Enhanced gardening with new features',
      version: '1.5',
      gameVersion: 'Sims 4',
      category: 'Gameplay',
      tags: ['gardening', 'plants', 'seasons', 'cross-breeding'],
      thumbnail: 'https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Gardening',
      images: ['https://via.placeholder.com/800x600/7C3AED/FFFFFF?text=Gardening+1'],
      downloadUrl: 'https://example.com/gardening',
      sourceUrl: 'https://example.com/gardening',
      source: 'Sample',
      isFree: true,
      isNSFW: false,
      isVerified: true,
      isFeatured: false,
    },
    {
      title: 'Realistic Weather Effects',
      description: 'Adds realistic weather patterns including rain, snow, storms, and seasonal changes.',
      shortDescription: 'Realistic weather patterns and effects',
      version: '2.0',
      gameVersion: 'Sims 4',
      category: 'Scripts',
      tags: ['weather', 'realistic', 'seasons', 'effects'],
      thumbnail: 'https://via.placeholder.com/300x200/0EA5E9/FFFFFF?text=Weather',
      images: ['https://via.placeholder.com/800x600/0EA5E9/FFFFFF?text=Weather+1'],
      downloadUrl: 'https://example.com/weather',
      sourceUrl: 'https://example.com/weather',
      source: 'Sample',
      isFree: true,
      isNSFW: false,
      isVerified: true,
      isFeatured: true,
    },
  ];

  console.log('📦 Creating sample mods...');
  
  for (const modData of sampleMods) {
    await prisma.mod.create({
      data: modData,
    });
  }

  // Create sample users
  console.log('👥 Creating sample users...');
  
  const sampleUsers = [
    {
      email: 'admin@modvault.com',
      username: 'admin',
      displayName: 'ModVault Admin',
      isCreator: true,
      isPremium: true,
      isAdmin: true,
    },
    {
      email: 'creator@modvault.com',
      username: 'samplecreator',
      displayName: 'Sample Creator',
      isCreator: true,
      isPremium: false,
      isAdmin: false,
    },
    {
      email: 'user@modvault.com',
      username: 'sampleuser',
      displayName: 'Sample User',
      isCreator: false,
      isPremium: false,
      isAdmin: false,
    },
  ];

  for (const userData of sampleUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });
  }

  // Create creator profiles
  console.log('🎨 Creating creator profiles...');
  
  const creatorProfiles = [
    {
      userId: (await prisma.user.findUnique({ where: { email: 'creator@modvault.com' } }))!.id,
      handle: 'samplecreator',
      bio: 'Passionate Sims mod creator specializing in furniture and CAS items.',
      website: 'https://example.com',
      socialLinks: {
        twitter: 'https://twitter.com/samplecreator',
        instagram: 'https://instagram.com/samplecreator',
        youtube: 'https://youtube.com/samplecreator',
      },
      isVerified: true,
      isFeatured: true,
    },
  ];

  for (const profileData of creatorProfiles) {
    await prisma.creatorProfile.upsert({
      where: { userId: profileData.userId },
      update: profileData,
      create: profileData,
    });
  }

  // Create sample collections
  console.log('📚 Creating sample collections...');
  
  const sampleCollections = [
    {
      userId: (await prisma.user.findUnique({ where: { email: 'user@modvault.com' } }))!.id,
      name: 'My Favorite Build Items',
      description: 'A collection of my favorite build and buy items for creating beautiful homes.',
      isPublic: true,
      isFeatured: false,
    },
    {
      userId: (await prisma.user.findUnique({ where: { email: 'user@modvault.com' } }))!.id,
      name: 'Essential Gameplay Mods',
      description: 'Must-have gameplay mods that enhance the Sims experience.',
      isPublic: true,
      isFeatured: false,
    },
  ];

  for (const collectionData of sampleCollections) {
    await prisma.collection.create({
      data: collectionData,
    });
  }

  // Create sample reviews
  console.log('⭐ Creating sample reviews...');
  
  const sampleReviews = [
    {
      userId: (await prisma.user.findUnique({ where: { email: 'user@modvault.com' } }))!.id,
      modId: (await prisma.mod.findFirst({ where: { title: 'Modern Living Room Set' } }))!.id,
      rating: 5,
      comment: 'Absolutely love this furniture set! The quality is amazing and it fits perfectly in my modern builds.',
      isVerified: true,
    },
    {
      userId: (await prisma.user.findUnique({ where: { email: 'user@modvault.com' } }))!.id,
      modId: (await prisma.mod.findFirst({ where: { title: 'Career Overhaul: Tech Industry' } }))!.id,
      rating: 4,
      comment: 'Great mod that adds depth to the tech career. The new interactions are really engaging.',
      isVerified: true,
    },
  ];

  for (const reviewData of sampleReviews) {
    await prisma.review.create({
      data: reviewData,
    });
  }

  console.log('✅ Database initialization completed successfully!');
  console.log('');
  console.log('📊 Sample data created:');
  console.log(`   - ${contentSources.length} content sources`);
  console.log(`   - ${sampleMods.length} sample mods`);
  console.log(`   - ${sampleUsers.length} sample users`);
  console.log(`   - ${creatorProfiles.length} creator profiles`);
  console.log(`   - ${sampleCollections.length} sample collections`);
  console.log(`   - ${sampleReviews.length} sample reviews`);
  console.log('');
  console.log('🚀 You can now start the development server and explore ModVault!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database initialization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
