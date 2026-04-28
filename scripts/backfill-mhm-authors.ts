/**
 * Backfill null authors on MustHaveMods.com mods by running the V2 extractor
 * (lib/services/scraperExtraction/authorExtractor) against each mod's
 * downloadUrl.
 *
 * The V2 extractor with `fetchDestination: true` handles:
 *   - TSR /members/{name} and /staff/{name}                  → url-tsr-*
 *   - Tumblr {creator}.tumblr.com subdomains                 → url-tumblr-subdomain
 *   - Tumblr www.tumblr.com/{creator}/{postId}               → url-tumblr-path
 *   - itch.io subdomains                                     → url-itch-subdomain
 *   - Any site whose destination page exposes JSON-LD,
 *     <meta property="article:author">, OpenGraph site_name,
 *     or the TSR "{author}'s {title}" og:title pattern        → various
 *
 * The extractor SKIPS Patreon, CurseForge, Drive/Dropbox/Mediafire/Mega/
 * Simfileshare because those are Cloudflare-gated or JS-rendered — they need
 * a separate browser-based resolver.
 *
 * Safety: the final gate is isValidAuthor() from badAuthorPatterns.ts. Nothing
 * garbage reaches the DB from here.
 *
 * Usage:
 *   npx tsx scripts/backfill-mhm-authors.ts              # dry run
 *   npx tsx scripts/backfill-mhm-authors.ts --apply      # write to DB
 *   npx tsx scripts/backfill-mhm-authors.ts --apply --limit 20
 *   npx tsx scripts/backfill-mhm-authors.ts --host nexusmods.com
 */

import './lib/setup-env';
import { prisma } from '../lib/prisma';
import * as cheerio from 'cheerio';
import { extractAuthor } from '../lib/services/scraperExtraction/authorExtractor';

type Flags = {
  apply: boolean;
  limit?: number;
  host?: string;
  delayMs: number;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { apply: false, delayMs: 500 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') flags.apply = true;
    else if (a === '--limit' && argv[i + 1]) flags.limit = parseInt(argv[++i], 10);
    else if (a === '--host' && argv[i + 1]) flags.host = argv[++i];
    else if (a === '--delay' && argv[i + 1]) flags.delayMs = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        '\nUsage: backfill-mhm-authors.ts [--apply] [--limit N] [--host domain] [--delay ms]\n\n' +
          '  --apply       Actually write to DB (default: dry run)\n' +
          '  --limit N     Process at most N rows\n' +
          '  --host domain Only rows whose downloadUrl host contains this string\n' +
          '  --delay ms    Sleep between fetches (default: 500)\n',
      );
      process.exit(0);
    }
  }
  return flags;
}

function hostOf(url: string | null | undefined): string {
  if (!url) return 'invalid';
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'invalid';
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  console.log('🔧 MHM author backfill');
  console.log(`   mode: ${flags.apply ? 'APPLY' : 'DRY RUN'}`);
  if (flags.limit) console.log(`   limit: ${flags.limit}`);
  if (flags.host) console.log(`   host filter: contains "${flags.host}"`);
  console.log(`   per-fetch delay: ${flags.delayMs}ms`);
  console.log();

  const where: any = {
    source: 'MustHaveMods.com',
    author: null,
    downloadUrl: { not: null },
  };
  if (flags.host) {
    where.downloadUrl = { contains: flags.host };
  }

  const rows = await prisma.mod.findMany({
    where,
    // isFree included so we don't redundantly write it (and so the dry-run
    // log can show what would change). Paywalled posts that already have
    // isFree=false are reported but not written again.
    select: { id: true, title: true, downloadUrl: true, isFree: true },
    take: flags.limit,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${rows.length} MHM mods with null author to process.\n`);

  const emptyDom = cheerio.load('');
  const stats = {
    total: rows.length,
    fetched: 0,
    recovered: 0,
    written: 0,
    paywalledDetected: 0,
    paywalledMarkedPaid: 0,
    byHost: {} as Record<string, { tried: number; recovered: number }>,
    byStrategy: {} as Record<string, number>,
  };

  for (let i = 0; i < rows.length; i++) {
    const mod = rows[i];
    const host = hostOf(mod.downloadUrl);
    stats.byHost[host] ??= { tried: 0, recovered: 0 };
    stats.byHost[host].tried++;
    stats.fetched++;

    const result = await extractAuthor({
      url: mod.downloadUrl!,
      title: mod.title,
      $: emptyDom,
      prisma: prisma as any,
      fetchDestination: true,
    });

    stats.byStrategy[result.strategy] = (stats.byStrategy[result.strategy] ?? 0) + 1;

    // Paywall detection — independent of author recovery. A post can be
    // paywalled AND we recovered the author via campaign/vanity fallback,
    // OR paywalled and unrecoverable. In either case, we should set
    // isFree=false on the mod.
    const shouldMarkPaid = result.isPaywalled === true && mod.isFree !== false;
    if (result.isPaywalled) stats.paywalledDetected++;

    if (result.value) {
      stats.recovered++;
      stats.byHost[host].recovered++;
      const marker = flags.apply ? '💾' : '👀';
      const paidNote = shouldMarkPaid ? ' [paid]' : result.isPaywalled ? ' (already paid)' : '';
      console.log(
        `  ${marker} [${String(i + 1).padStart(3, ' ')}/${rows.length}] ${host.padEnd(28)} ${result.value.padEnd(25)} (${result.strategy})${paidNote} — ${mod.title.slice(0, 50)}`,
      );
      if (flags.apply) {
        try {
          await prisma.mod.update({
            where: { id: mod.id },
            data: {
              author: result.value,
              ...(shouldMarkPaid ? { isFree: false } : {}),
            },
          });
          stats.written++;
          if (shouldMarkPaid) stats.paywalledMarkedPaid++;
        } catch (err) {
          console.log(
            `      ⚠️  update failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } else if (shouldMarkPaid) {
      // No author recovered, but the API told us this post is paywalled.
      // Still useful — flip isFree=false so the UI doesn't mislabel it as
      // free. Author will require Tier-2 cookie auth to recover.
      const marker = flags.apply ? '💰' : '👀';
      console.log(
        `  ${marker} [${String(i + 1).padStart(3, ' ')}/${rows.length}] ${host.padEnd(28)} ${'(paywalled, author unrecovered)'.padEnd(25)} (${result.strategy}) — ${mod.title.slice(0, 50)}`,
      );
      if (flags.apply) {
        try {
          await prisma.mod.update({
            where: { id: mod.id },
            data: { isFree: false },
          });
          stats.paywalledMarkedPaid++;
        } catch (err) {
          console.log(
            `      ⚠️  paid-flag update failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } else if (i % 25 === 0) {
      console.log(
        `  … [${String(i + 1).padStart(3, ' ')}/${rows.length}] ${host} — no author (${result.strategy})`,
      );
    }

    if (flags.delayMs > 0 && i < rows.length - 1) {
      await sleep(flags.delayMs);
    }
  }

  console.log('\n📊 Summary');
  console.log(`   processed: ${stats.fetched}`);
  console.log(`   recovered: ${stats.recovered} (${stats.fetched > 0 ? Math.round((100 * stats.recovered) / stats.fetched) : 0}%)`);
  if (flags.apply) console.log(`   written:   ${stats.written}`);
  console.log(`   paywalled: ${stats.paywalledDetected} (Patreon API said paid)`);
  if (flags.apply) console.log(`   marked paid: ${stats.paywalledMarkedPaid}`);

  console.log('\n   by host:');
  for (const [h, s] of Object.entries(stats.byHost).sort((a, b) => b[1].tried - a[1].tried)) {
    console.log(`     ${h.padEnd(30)} ${s.recovered}/${s.tried}`);
  }

  console.log('\n   by strategy:');
  for (const [k, v] of Object.entries(stats.byStrategy).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(30)} ${v}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
