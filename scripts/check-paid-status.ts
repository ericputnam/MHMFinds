/**
 * Check whether the 11 remaining Patreon-null mods are correctly marked
 * as paid (isFree: false). Almost certainly not — the scraper has no
 * paywall detection.
 */
import './lib/setup-env';
import { prisma } from '../lib/prisma';
import axios from 'axios';

async function main() {
  // The remaining 11 Patreon-null mods after the API backfill
  const remaining = await prisma.mod.findMany({
    where: {
      author: null,
      downloadUrl: { contains: 'patreon.com' },
      source: 'MustHaveMods.com',
    },
    select: {
      id: true,
      title: true,
      downloadUrl: true,
      isFree: true,
      price: true,
      currency: true,
    },
  });

  console.log(`Examining ${remaining.length} Patreon-null mods:\n`);

  for (const m of remaining) {
    // Extract post ID and probe the API
    const match = m.downloadUrl?.match(/\/posts\/(?:.*-)?(\d+)/);
    const postId = match?.[1];

    let apiStatus = 'unknown';
    let apiCode = '';
    if (postId) {
      try {
        const r = await axios.get(`https://www.patreon.com/api/posts/${postId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000,
          validateStatus: s => s < 600,
        });
        if (r.status === 200) apiStatus = '200 OK';
        else if (r.data?.errors?.[0]?.code_name) {
          apiCode = r.data.errors[0].code_name;
          apiStatus = `${r.status} ${apiCode}`;
        } else apiStatus = `${r.status}`;
      } catch (e) {
        apiStatus = `error: ${e instanceof Error ? e.message : e}`;
      }
    }

    const paidLabel = m.isFree ? '🟢 isFree=true' : '💰 isFree=false';
    console.log(`  ${paidLabel.padEnd(20)} api=${apiStatus.padEnd(22)} ${m.title.slice(0, 50)}`);
    console.log(`    ${m.downloadUrl}`);
    await new Promise(r => setTimeout(r, 400));
  }

  // Also: count mods with isFree=false in MHM globally
  const paidCount = await prisma.mod.count({
    where: { source: 'MustHaveMods.com', isFree: false },
  });
  const freeCount = await prisma.mod.count({
    where: { source: 'MustHaveMods.com', isFree: true },
  });
  console.log(`\n📊 MHM global isFree distribution:`);
  console.log(`   isFree=true:  ${freeCount}`);
  console.log(`   isFree=false: ${paidCount}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
