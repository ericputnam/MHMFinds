import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function analyzeCategories() {
  console.log('=== CATEGORY & TAG ANALYSIS ===\n');

  // 1. Get all distinct categories with counts
  console.log('1. CURRENT CATEGORIES (with mod counts):');
  console.log('─'.repeat(50));

  const categoryGroups = await prisma.mod.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  categoryGroups.forEach(({ category, _count }) => {
    console.log(`  ${category.padEnd(25)} ${_count.id} mods`);
  });

  // 2. Identify potential duplicates
  console.log('\n2. POTENTIAL DUPLICATE CATEGORIES:');
  console.log('─'.repeat(50));

  const categories = categoryGroups.map(g => g.category);
  const duplicateCandidates: string[][] = [];

  // Check for similar categories
  const similarityGroups = [
    ['Script', 'Scripts', 'Script Mod', 'Script Mods'],
    ['CAS', 'Create-a-Sim', 'Create a Sim'],
    ['Build/Buy', 'Build', 'Buy', 'Build Mode', 'Buy Mode'],
    ['Hair', 'Hairs', 'Hairstyle', 'Hairstyles'],
    ['Clothing', 'Clothes', 'Tops', 'Bottoms', 'Dresses', 'Outfits'],
    ['Furniture', 'Decor', 'Decoration', 'Objects'],
    ['UI', 'UI/UX', 'UX', 'Interface'],
    ['Gameplay', 'Game Play'],
    ['Traits', 'Trait'],
    ['Careers', 'Career'],
  ];

  for (const group of similarityGroups) {
    const found = group.filter(g =>
      categories.some(c => c.toLowerCase() === g.toLowerCase())
    );
    if (found.length > 1) {
      console.log(`  Possible duplicates: ${found.join(' / ')}`);
    }
  }

  // 3. Analyze tags usage
  console.log('\n3. TAG USAGE ANALYSIS:');
  console.log('─'.repeat(50));

  const modsWithTags = await prisma.mod.count({
    where: { tags: { isEmpty: false } }
  });
  const totalMods = await prisma.mod.count();

  console.log(`  Mods with tags: ${modsWithTags} / ${totalMods} (${((modsWithTags/totalMods)*100).toFixed(1)}%)`);

  // Get all unique tags
  const allMods = await prisma.mod.findMany({
    select: { tags: true },
    where: { tags: { isEmpty: false } }
  });

  const tagCounts: Record<string, number> = {};
  allMods.forEach(mod => {
    mod.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  console.log('\n  Top 30 tags:');
  sortedTags.forEach(([tag, count]) => {
    console.log(`    ${tag.padEnd(30)} ${count} mods`);
  });

  // 4. Sample mods to understand categorization
  console.log('\n4. SAMPLE MODS BY CATEGORY:');
  console.log('─'.repeat(50));

  for (const { category } of categoryGroups.slice(0, 10)) {
    console.log(`\n  [${category}]:`);
    const samples = await prisma.mod.findMany({
      where: { category },
      select: { title: true, tags: true },
      take: 3
    });
    samples.forEach(m => {
      console.log(`    - ${m.title.substring(0, 50)}${m.title.length > 50 ? '...' : ''}`);
      if (m.tags.length > 0) {
        console.log(`      Tags: ${m.tags.join(', ')}`);
      }
    });
  }

  // 5. Mods that might need better categorization
  console.log('\n5. MODS WITH SEASONAL/THEME KEYWORDS (should have tags):');
  console.log('─'.repeat(50));

  const seasonalKeywords = ['christmas', 'xmas', 'halloween', 'easter', 'valentines', 'summer', 'winter', 'fall', 'autumn', 'spring'];

  for (const keyword of seasonalKeywords) {
    const count = await prisma.mod.count({
      where: {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } }
        ]
      }
    });
    if (count > 0) {
      console.log(`  "${keyword}": ${count} mods`);
    }
  }

  await prisma.$disconnect();
}

analyzeCategories().catch(console.error);
