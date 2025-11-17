import { prisma } from '../lib/prisma';

async function getSampleUrls() {
  const mods = await prisma.mod.findMany({
    where: { source: 'MustHaveMods.com' },
    select: { sourceUrl: true },
    distinct: ['sourceUrl'],
    take: 5,
  });

  console.log(mods.map(m => m.sourceUrl).join('\n'));
  await prisma.$disconnect();
}

getSampleUrls();
