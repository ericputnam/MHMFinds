/**
 * Script to populate database with top Sims 4 mod creators
 * Uses Perplexity AI to research current top creators
 */

import { PrismaClient } from '@prisma/client';
import { PerplexityService } from '../lib/services/perplexityService';

const prisma = new PrismaClient();

interface CreatorData {
  name: string;
  handle: string;
  platform: string;
  profileUrl: string;
  bio: string;
  isVerified: boolean;
  specialization: string;
  estimatedFollowers?: string;
}

async function populateCreators() {
  console.log('🔍 Researching top Sims 4 creators with Perplexity AI...\n');

  try {
    // Query Perplexity for top creators
    const response = await PerplexityService.researchTopSimsCreators();
    console.log('📊 Perplexity Response received\n');

    // Parse JSON response
    let creatorsData: CreatorData[];
    try {
      // Try to parse the response as JSON
      // Perplexity sometimes includes markdown or extra text, so we need to extract JSON

      // First, try to find JSON array in the response
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        console.error('❌ No JSON array found in Perplexity response');
        console.error('Full response:', response);
        console.error('\n⚠️  Perplexity did not return structured data.');
        console.error('💡 Try using the manual seed script instead:');
        console.error('   npx tsx scripts/seed-creators-manual.ts');
        throw new Error('No JSON array found in response');
      }

      // Try to parse the extracted JSON
      creatorsData = JSON.parse(jsonMatch[0]);

      // Validate that we got an array
      if (!Array.isArray(creatorsData)) {
        throw new Error('Response is not a valid array');
      }

      // Validate that array has items
      if (creatorsData.length === 0) {
        throw new Error('Response array is empty');
      }

    } catch (parseError) {
      console.error('❌ Failed to parse Perplexity response as JSON');
      console.error('Parse error:', parseError);
      console.error('\nRaw response:');
      console.error('─'.repeat(50));
      console.error(response);
      console.error('─'.repeat(50));
      throw parseError;
    }

    console.log(`✅ Found ${creatorsData.length} creators to add\n`);

    // Create a default user for each creator
    let successCount = 0;
    let errorCount = 0;

    for (const creatorData of creatorsData) {
      try {
        console.log(`📝 Processing: ${creatorData.name} (@${creatorData.handle})...`);

        // Check if creator already exists
        const existingCreator = await prisma.creatorProfile.findUnique({
          where: { handle: creatorData.handle }
        });

        if (existingCreator) {
          console.log(`⏭️  Creator @${creatorData.handle} already exists, skipping`);
          continue;
        }

        // Check if user already exists with this handle as username
        let user = await prisma.user.findUnique({
          where: { username: creatorData.handle }
        });

        if (!user) {
          // Create a new user for this creator
          user = await prisma.user.create({
            data: {
              email: `${creatorData.handle}@musthavemods.generated`,
              username: creatorData.handle,
              displayName: creatorData.name,
              avatar: null, // Will be populated later if we scrape it
              bio: creatorData.bio,
              isCreator: true,
              isPremium: false,
              isAdmin: false,
            }
          });
        }

        // Create creator profile
        await prisma.creatorProfile.create({
          data: {
            userId: user.id,
            handle: creatorData.handle,
            bio: creatorData.bio,
            website: creatorData.profileUrl,
            socialLinks: {
              platform: creatorData.platform,
              url: creatorData.profileUrl,
              specialization: creatorData.specialization,
              estimatedFollowers: creatorData.estimatedFollowers
            },
            isVerified: creatorData.isVerified,
            isFeatured: true // Mark all imported creators as featured
          }
        });

        console.log(`✅ Created creator profile for ${creatorData.name}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error creating creator ${creatorData.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} creators`);
    console.log(`❌ Errors: ${errorCount} creators`);
    console.log('='.repeat(50) + '\n');

    // Now try to associate existing mods with creators
    console.log('🔗 Attempting to associate existing mods with creators...\n');

    const creators = await prisma.creatorProfile.findMany({
      select: {
        id: true,
        handle: true
      }
    });

    let modsAssociated = 0;

    for (const creator of creators) {
      // Find mods where author matches creator handle (case-insensitive)
      const mods = await prisma.mod.findMany({
        where: {
          author: {
            contains: creator.handle,
            mode: 'insensitive'
          },
          creatorId: null // Only update mods without a creator assigned
        }
      });

      if (mods.length > 0) {
        // Update mods to link to this creator
        await prisma.mod.updateMany({
          where: {
            id: {
              in: mods.map(m => m.id)
            }
          },
          data: {
            creatorId: creator.id
          }
        });

        console.log(`✅ Associated ${mods.length} mods with @${creator.handle}`);
        modsAssociated += mods.length;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🔗 Total mods associated: ${modsAssociated}`);
    console.log('='.repeat(50) + '\n');

    console.log('🎉 Creator population complete!');

  } catch (error) {
    console.error('❌ Fatal error during creator population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateCreators()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
