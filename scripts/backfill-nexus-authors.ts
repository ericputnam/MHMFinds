/**
 * Backfill authors for mods whose downloadUrl is a Nexus Mods URL and whose
 * `author` is currently null/empty. Uses the new `fromNexusApi()` strategy.
 *
 * Default scope: the 9 Stardew QoL mods at the post
 *   https://musthavemods.com/stardew-valley-quality-of-life-mods/
 * Pass --all to scan every Nexus mod with a null author.
 *
 * Idempotent: only writes to mods that currently have null/empty authors. If
 * the API can't recover an author, the row is left alone.
 *
 * Rate-limit safe: inserts a 700ms gap between requests so a worst-case run
 * of ~85 mods stays well under the 100/hr Nexus free-tier limit.
 *
 * Usage:
 *   npx tsx scripts/backfill-nexus-authors.ts                  # 9 QoL mods, dry run
 *   npx tsx scripts/backfill-nexus-authors.ts --apply          # apply
 *   npx tsx scripts/backfill-nexus-authors.ts --all            # all null-author Nexus mods, dry run
 *   npx tsx scripts/backfill-nexus-authors.ts --all --apply
 */
import './lib/setup-env';

import { prisma } from '@/lib/prisma';
import { fromNexusApi, parseNexusUrl } from '@/lib/services/scraperExtraction/nexusApiClient';

const SLEEP_MS = 700;
const QOL_SOURCE_URL = 'https://musthavemods.com/stardew-valley-quality-of-life-mods/';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const ALL = args.has('--all');

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.NEXUS_API_KEY) {
    console.error('❌ NEXUS_API_KEY is not set. Add it to .env.local.');
    process.exit(1);
  }

  // Build the candidate set. Mods are Nexus mods if their downloadUrl
  // hostname is nexusmods.com (the original sourceUrl is the MHM blog post,
  // not Nexus, so we filter on downloadUrl).
  const where = ALL
    ? {
        OR: [{ author: null }, { author: '' }],
        downloadUrl: { contains: 'nexusmods.com' },
      }
    : {
        sourceUrl: QOL_SOURCE_URL,
        OR: [{ author: null }, { author: '' }],
      };

  const candidates = await prisma.mod.findMany({
    where,
    select: { id: true, title: true, downloadUrl: true, author: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(
    `\n📋 Scope: ${ALL ? 'ALL null-author Nexus mods' : 'QoL batch only'}`,
  );
  console.log(`   Candidates: ${candidates.length}`);
  console.log(`   Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  let resolved = 0;
  let skippedNotNexus = 0;
  let noCandidate = 0;

  for (const mod of candidates) {
    const dl = mod.downloadUrl ?? '';
    const parts = parseNexusUrl(dl);

    if (!parts) {
      // Mod is in scope (sourceUrl matches the QoL post) but its downloadUrl
      // isn't a Nexus URL. Skip and report so we know if a non-Nexus link
      // sneaked into the QoL post.
      console.log(`⏭  ${mod.title}`);
      console.log(`     downloadUrl is not Nexus: ${dl || '(empty)'}`);
      skippedNotNexus++;
      continue;
    }

    const result = await fromNexusApi(dl);
    const author = result?.candidate?.value ?? null;

    if (!author) {
      console.log(`❓ ${mod.title}`);
      console.log(`     Nexus: ${parts.gameDomain}/mods/${parts.modId} → no author`);
      if (result?.isMissing) {
        console.log(`     (mod was deleted/hidden on Nexus)`);
      }
      noCandidate++;
    } else {
      console.log(`✅ ${mod.title}`);
      console.log(`     ${parts.gameDomain}/mods/${parts.modId} → "${author}"`);
      if (APPLY) {
        await prisma.mod.update({
          where: { id: mod.id },
          data: { author },
        });
      }
      resolved++;
    }

    // Be polite — 700ms between calls keeps us under the 100/hr free-tier
    // burst limit even on a 100-mod run.
    await sleep(SLEEP_MS);
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Resolved:        ${resolved}${APPLY ? ' (written)' : ' (would write)'}`);
  console.log(`No candidate:    ${noCandidate}`);
  console.log(`Skipped non-Nexus: ${skippedNotNexus}`);
  if (!APPLY && resolved > 0) {
    console.log(`\n👉 Re-run with --apply to write changes to the database.`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
