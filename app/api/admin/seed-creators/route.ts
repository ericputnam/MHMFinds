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

    // Pre-fetch all existing creators and users in bulk (avoids N+1 queries)
    const handles = creatorsData.map((c) => c.handle);

    const [existingCreators, existingUsers] = await Promise.all([
      prisma.creatorProfile.findMany({
        where: { handle: { in: handles } },
        select: { handle: true },
      }),
      prisma.user.findMany({
        where: { username: { in: handles } },
        select: { id: true, username: true },
      }),
    ]);

    const existingCreatorHandles = new Set(existingCreators.map((c) => c.handle));
    const existingUserMap = new Map(existingUsers.map((u) => [u.username, u.id]));

    console.log(`📊 Found ${existingCreatorHandles.size} existing creators, ${existingUserMap.size} existing users`);

    // Create creators that don't exist
    for (const creatorData of creatorsData) {
      try {
        console.log(`📝 Processing: ${creatorData.name} (@${creatorData.handle})...`);

        // Check if creator already exists (O(1) lookup)
        if (existingCreatorHandles.has(creatorData.handle)) {
          console.log(`⏭️  Creator @${creatorData.handle} already exists, skipping`);
          results.skippedCount++;
          continue;
        }

        // Use transaction to create user + profile atomically
        await prisma.$transaction(async (tx) => {
          let userId = existingUserMap.get(creatorData.handle);

          if (!userId) {
            // Create a new user for this creator
            const user = await tx.user.create({
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
            userId = user.id;
          }

          // Create creator profile
          await tx.creatorProfile.create({
            data: {
              userId,
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

    // Fetch all creators and unassigned mods in bulk (avoids N+1)
    const [creators, unassignedMods] = await Promise.all([
      prisma.creatorProfile.findMany({
        select: {
          id: true,
          handle: true,
        },
      }),
      prisma.mod.findMany({
        where: { creatorId: null, author: { not: null } },
        select: { id: true, author: true },
      }),
    ]);

    // Build association map in memory (O(n) instead of O(n*m) queries)
    const modsByCreator = new Map<string, string[]>();

    for (const creator of creators) {
      const handleLower = creator.handle.toLowerCase();
      const matchingModIds = unassignedMods
        .filter((mod) => mod.author?.toLowerCase().includes(handleLower))
        .map((mod) => mod.id);

      if (matchingModIds.length > 0) {
        modsByCreator.set(creator.id, matchingModIds);
      }
    }

    // Update all associations in batch
    const modsByCreatorEntries = Array.from(modsByCreator.entries());
    for (const [creatorId, modIds] of modsByCreatorEntries) {
      const creator = creators.find((c) => c.id === creatorId);
      await prisma.mod.updateMany({
        where: { id: { in: modIds } },
        data: { creatorId },
      });

      console.log(`✅ Associated ${modIds.length} mods with @${creator?.handle}`);
      results.modsAssociated += modIds.length;
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
