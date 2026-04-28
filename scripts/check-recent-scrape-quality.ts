/**
 * Quick diagnostic: print contentType distribution for the most recently
 * scraped articles. Usage: passes the article URL(s) on the command line, or
 * (default) reads the last 5 unique sourceUrls from the Mod table.
 */
import './lib/setup-env';

import { prisma } from '@/lib/prisma';

async function main() {
  let urls = process.argv.slice(2);
  if (urls.length === 0) {
    // Default: 5 most-recent distinct sourceUrls
    const grouped = await prisma.mod.groupBy({
      by: ['sourceUrl'],
      where: { sourceUrl: { not: null } },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 5,
    });
    urls = grouped.map(g => g.sourceUrl!).filter(Boolean);
  }

  for (const url of urls) {
    const mods = await prisma.mod.findMany({
      where: { sourceUrl: url },
      select: { contentType: true },
    });
    const counts: Record<string, number> = {};
    for (const m of mods) {
      const k = m.contentType ?? 'null';
      counts[k] = (counts[k] || 0) + 1;
    }
    console.log('\n' + url);
    console.log('  total:', mods.length);
    for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log('   ', k.padEnd(20), v);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
