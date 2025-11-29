import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PerplexityService } from '@/lib/services/perplexityService';

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

/**
 * Admin-only endpoint to populate creators
 * Call with: POST /api/admin/seed-creators
 * Headers: Authorization: Bearer YOUR_ADMIN_PASSWORD
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin credentials
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!authHeader || !adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('🔍 Researching top Sims 4 creators with Perplexity AI...');

    // Query Perplexity for top creators
    const response = await PerplexityService.researchTopSimsCreators();
    console.log('📊 Perplexity Response received');

    // Parse JSON response
    let creatorsData: CreatorData[];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      creatorsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Failed to parse Perplexity response as JSON');
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: parseError },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${creatorsData.length} creators to add`);

    const results = {
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      modsAssociated: 0,
      errors: [] as string[],
    };

    // Create creators
    for (const creatorData of creatorsData) {
      try {
        console.log(`📝 Processing: ${creatorData.name} (@${creatorData.handle})...`);

        // Check if creator already exists
        const existingCreator = await prisma.creatorProfile.findUnique({
          where: { handle: creatorData.handle },
        });

        if (existingCreator) {
          console.log(`⏭️  Creator @${creatorData.handle} already exists, skipping`);
          results.skippedCount++;
          continue;
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { username: creatorData.handle },
        });

        if (!user) {
          // Create a new user for this creator
          user = await prisma.user.create({
            data: {
              email: `${creatorData.handle}@musthavemods.generated`,
              username: creatorData.handle,
              displayName: creatorData.name,
              avatar: null,
              bio: creatorData.bio,
              isCreator: true,
              isPremium: false,
              isAdmin: false,
            },
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
              estimatedFollowers: creatorData.estimatedFollowers,
            },
            isVerified: creatorData.isVerified,
            isFeatured: true,
          },
        });

        console.log(`✅ Created creator profile for ${creatorData.name}`);
        results.successCount++;
      } catch (error) {
        const errorMsg = `Error creating creator ${creatorData.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        results.errorCount++;
        results.errors.push(errorMsg);
      }
    }

    // Associate existing mods with creators
    console.log('🔗 Attempting to associate existing mods with creators...');

    const creators = await prisma.creatorProfile.findMany({
      select: {
        id: true,
        handle: true,
      },
    });

    for (const creator of creators) {
      const mods = await prisma.mod.findMany({
        where: {
          author: {
            contains: creator.handle,
            mode: 'insensitive',
          },
          creatorId: null,
        },
      });

      if (mods.length > 0) {
        await prisma.mod.updateMany({
          where: {
            id: {
              in: mods.map((m) => m.id),
            },
          },
          data: {
            creatorId: creator.id,
          },
        });

        console.log(`✅ Associated ${mods.length} mods with @${creator.handle}`);
        results.modsAssociated += mods.length;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Creator population complete',
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Fatal error during creator population:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to populate creators',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
