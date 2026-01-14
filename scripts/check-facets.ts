#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mods = await prisma.mod.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      title: true,
      contentType: true,
      visualStyle: true,
      themes: true,
    }
  });

  console.log('\nFirst 50 mods facets:');
  console.log('='.repeat(100));
  console.log(`${'#'.padStart(3)} | ${'Title'.padEnd(40)} | ${'Content Type'.padEnd(15)} | ${'Style'.padEnd(12)} | Themes`);
  console.log('-'.repeat(100));

  mods.forEach((m, i) => {
    const title = m.title.length > 38 ? m.title.substring(0, 38) + '..' : m.title;
    const themes = m.themes.length > 0 ? m.themes.join(', ') : '-';
    console.log(`${(i+1).toString().padStart(3)} | ${title.padEnd(40)} | ${(m.contentType || '-').padEnd(15)} | ${(m.visualStyle || '-').padEnd(12)} | ${themes}`);
  });

  // Summary stats
  console.log('\n' + '='.repeat(100));
  console.log('Summary:');

  const stats = await prisma.mod.groupBy({
    by: ['contentType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  console.log('\nTop Content Types:');
  stats.forEach(s => {
    console.log(`  ${(s.contentType || 'null').padEnd(20)} ${s._count.id}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
