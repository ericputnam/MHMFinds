/**
 * One-shot: clean up the 9 Stardew QoL mods that got Sims-4-leaked
 * contentTypes ("tops", "accessories") before game-gating was added.
 *
 * Sets:
 *   - contentType = 'gameplay-mod'  (the QoL article is gameplay enhancement)
 *   - gameVersion = 'Stardew Valley' if currently 'Sims 4'
 *
 * Authors stay null — Nexus Mods is Cloudflare-blocked and we don't have
 * a NEXUS_API_KEY wired in. They'll need to be filled in manually or via a
 * future Nexus API integration.
 *
 * Idempotent.
 */
import './lib/setup-env';

import { prisma } from '@/lib/prisma';

async function main() {
  const sourceUrl = 'https://musthavemods.com/stardew-valley-quality-of-life-mods/';

  const before = await prisma.mod.findMany({
    where: { sourceUrl },
    select: { id: true, title: true, contentType: true, gameVersion: true },
  });
  console.log(`\n📋 Found ${before.length} mods at ${sourceUrl}`);
  const beforeCT: Record<string, number> = {};
  const beforeGV: Record<string, number> = {};
  for (const m of before) {
    beforeCT[m.contentType ?? 'null'] = (beforeCT[m.contentType ?? 'null'] || 0) + 1;
    beforeGV[m.gameVersion ?? 'null'] = (beforeGV[m.gameVersion ?? 'null'] || 0) + 1;
  }
  console.log('   ContentType before:', beforeCT);
  console.log('   GameVersion before:', beforeGV);

  // Update contentType to 'gameplay-mod' for all
  const ctRes = await prisma.mod.updateMany({
    where: { sourceUrl },
    data: { contentType: 'gameplay-mod' },
  });
  console.log(`\n✅ Updated ${ctRes.count} mods → contentType='gameplay-mod'`);

  // Fix gameVersion if it was incorrectly set to Sims 4
  const gvRes = await prisma.mod.updateMany({
    where: { sourceUrl, gameVersion: 'Sims 4' },
    data: { gameVersion: 'Stardew Valley' },
  });
  console.log(`✅ Fixed ${gvRes.count} gameVersion → 'Stardew Valley'`);

  const after = await prisma.mod.findMany({
    where: { sourceUrl },
    select: { contentType: true, gameVersion: true },
  });
  const afterCT: Record<string, number> = {};
  const afterGV: Record<string, number> = {};
  for (const m of after) {
    afterCT[m.contentType ?? 'null'] = (afterCT[m.contentType ?? 'null'] || 0) + 1;
    afterGV[m.gameVersion ?? 'null'] = (afterGV[m.gameVersion ?? 'null'] || 0) + 1;
  }
  console.log('\n   ContentType after: ', afterCT);
  console.log('   GameVersion after: ', afterGV);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
