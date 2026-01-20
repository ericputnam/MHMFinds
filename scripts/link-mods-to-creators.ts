#!/usr/bin/env npx tsx
/**
 * Links mods to CreatorProfile records based on author name matching.
 *
 * The problem: Scraped mods have the `author` string field populated but
 * the `creatorId` foreign key is NULL. This script finds matches and links them.
 *
 * Usage:
 *   npx tsx scripts/link-mods-to-creators.ts              # Dry run
 *   npx tsx scripts/link-mods-to-creators.ts --fix        # Apply fixes
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkModsToCreators(fix: boolean) {
  console.log('🔗 Link Mods to Creator Profiles');
  console.log('='.repeat(60));
  console.log(`Mode: ${fix ? '🔧 FIX MODE' : '📊 DRY RUN (report only)'}`);
  console.log('');

  // Get all creator profiles
  const creators = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      handle: true,
      user: {
        select: {
          displayName: true,
        },
      },
    },
  });

  console.log(`Found ${creators.length} creator profiles`);
  console.log('');

  let totalLinked = 0;
  let totalAlreadyLinked = 0;

  for (const creator of creators) {
    const creatorName = creator.user.displayName || creator.handle;

    // Find mods where author matches (case-insensitive) but creatorId is null
    const unlinkedMods = await prisma.mod.findMany({
      where: {
        creatorId: null,
        OR: [
          { author: { equals: creatorName, mode: 'insensitive' } },
          { author: { equals: creator.handle, mode: 'insensitive' } },
          // Also try variations without spaces
          { author: { equals: creator.handle.replace(/-/g, ''), mode: 'insensitive' } },
          { author: { equals: creator.handle.replace(/_/g, ''), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
      },
    });

    // Count already linked mods
    const linkedMods = await prisma.mod.count({
      where: {
        creatorId: creator.id,
      },
    });

    if (unlinkedMods.length > 0 || linkedMods > 0) {
      console.log(`📌 ${creatorName} (@${creator.handle})`);
      console.log(`   Already linked: ${linkedMods} mods`);
      console.log(`   Unlinked matches: ${unlinkedMods.length} mods`);

      if (unlinkedMods.length > 0) {
        // Show sample
        console.log(`   Sample unlinked:`);
        for (const mod of unlinkedMods.slice(0, 3)) {
          console.log(`     - "${mod.title}" (author: "${mod.author}")`);
        }
        if (unlinkedMods.length > 3) {
          console.log(`     ... and ${unlinkedMods.length - 3} more`);
        }

        if (fix) {
          // Link the mods
          const result = await prisma.mod.updateMany({
            where: {
              id: { in: unlinkedMods.map(m => m.id) },
            },
            data: {
              creatorId: creator.id,
            },
          });
          console.log(`   ✅ Linked ${result.count} mods`);
          totalLinked += result.count;
        } else {
          console.log(`   📝 Would link ${unlinkedMods.length} mods (dry run)`);
          totalLinked += unlinkedMods.length;
        }
      }
      console.log('');
    }

    totalAlreadyLinked += linkedMods;
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Creator profiles: ${creators.length}`);
  console.log(`   Already linked mods: ${totalAlreadyLinked}`);
  console.log(`   ${fix ? 'Newly linked' : 'Would link'}: ${totalLinked}`);

  if (!fix && totalLinked > 0) {
    console.log('');
    console.log('💡 Run with --fix to apply changes');
  }

  await prisma.$disconnect();
}

// Main
const args = process.argv.slice(2);
const fix = args.includes('--fix');

linkModsToCreators(fix).catch(console.error);
