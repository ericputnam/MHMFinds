/**
 * One-off: dump details for the Stardew QoL article so we can see what the
 * scraper produced — download URLs, authors, contentTypes — before fixing.
 */
import './lib/setup-env';

import { prisma } from '@/lib/prisma';

async function main() {
  const sourceUrl = 'https://musthavemods.com/stardew-valley-quality-of-life-mods/';
  const mods = await prisma.mod.findMany({
    where: { sourceUrl },
    select: {
      id: true,
      title: true,
      author: true,
      contentType: true,
      downloadUrl: true,
      isFree: true,
      source: true,
      category: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n=== ${mods.length} mods at ${sourceUrl} ===\n`);
  for (const m of mods) {
    console.log(`Title:       ${m.title}`);
    console.log(`Author:      ${m.author ?? 'NULL'}`);
    console.log(`ContentType: ${m.contentType ?? 'NULL'}`);
    console.log(`Category:    ${m.category ?? 'NULL'}`);
    console.log(`Source:      ${m.source ?? 'NULL'}`);
    console.log(`Download:    ${m.downloadUrl}`);
    console.log(`isFree:      ${m.isFree}`);
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
