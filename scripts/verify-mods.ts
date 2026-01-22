/**
 * Verify Mods Script
 *
 * This script marks mods as verified so they appear on the homepage.
 *
 * Usage:
 *   npx tsx scripts/verify-mods.ts              # Dry run - show unverified mods
 *   npx tsx scripts/verify-mods.ts --verify     # Verify all unverified mods
 *   npx tsx scripts/verify-mods.ts --verify --limit=100  # Verify first 100
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('VERIFY MODS');
  console.log('='.repeat(60));
  console.log('');

  const args = process.argv.slice(2);
  const verify = args.includes('--verify');
  let limit: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    }
  }

  console.log(`Mode: ${verify ? 'VERIFY' : 'DRY RUN (preview only)'}`);
  if (limit) console.log(`Limit: ${limit} mods`);
  console.log('');

  // Find unverified mods
  const unverifiedMods = await prisma.mod.findMany({
    where: { isVerified: false },
    select: {
      id: true,
      title: true,
      author: true,
      thumbnail: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  console.log(`Found ${unverifiedMods.length} unverified mods`);
  console.log('');

  if (unverifiedMods.length === 0) {
    console.log('No unverified mods found.');
    return;
  }

  // Preview first 20
  console.log('Preview (first 20):');
  for (let i = 0; i < Math.min(20, unverifiedMods.length); i++) {
    const mod = unverifiedMods[i];
    const hasImage = mod.thumbnail ? 'yes' : 'NO IMAGE';
    console.log(`  ${i + 1}. ${mod.title} by ${mod.author} [image: ${hasImage}]`);
  }

  if (unverifiedMods.length > 20) {
    console.log(`  ... and ${unverifiedMods.length - 20} more`);
  }
  console.log('');

  if (verify) {
    // Only verify mods that have a thumbnail
    const modsWithImages = unverifiedMods.filter(m => m.thumbnail);
    console.log(`Verifying ${modsWithImages.length} mods (with images)...`);

    const result = await prisma.mod.updateMany({
      where: {
        id: { in: modsWithImages.map(m => m.id) },
      },
      data: {
        isVerified: true,
      },
    });

    console.log(`Verified ${result.count} mods`);

    const modsWithoutImages = unverifiedMods.filter(m => !m.thumbnail);
    if (modsWithoutImages.length > 0) {
      console.log(`Skipped ${modsWithoutImages.length} mods without images`);
    }
  } else {
    console.log('Run with --verify to mark mods as verified');
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
