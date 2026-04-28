/**
 * Deactivate (hide) MHM mods whose Patreon /posts/{id} URL returns
 * 404 ResourceMissing — the post no longer exists on Patreon.
 *
 * What "deactivate" means here:
 *   We set `isVerified: false`. The listing API (app/api/mods/route.ts) filters
 *   `isVerified: true`, so flipping this hides the mod from the public site
 *   without deleting the row.
 *
 * Why we DON'T delete:
 *   The MHM scraper dedups by `downloadUrl` (lib/services/mhmScraper.ts ~L1352).
 *   Keeping the row prevents the scraper from re-creating a duplicate on the
 *   next full scrape. The scraper's update path (~L1387) never touches
 *   `isVerified`, so the deactivated state sticks.
 *
 * Targeting:
 *   We probe Patreon's public API for each mod's post ID and only deactivate
 *   when the API explicitly returns `code_name: 'ResourceMissing'`. We do NOT
 *   deactivate paywalled (403 ViewForbidden) posts — those still exist, just
 *   require auth (handled by scripts/resolve-paywalled-patreon.ts).
 *
 * Idempotent: re-running is safe. Already-deactivated mods are reported but
 * not re-written.
 *
 * Usage:
 *   npx tsx scripts/deactivate-deleted-patreon-posts.ts          # dry run
 *   npx tsx scripts/deactivate-deleted-patreon-posts.ts --apply  # write
 *   npx tsx scripts/deactivate-deleted-patreon-posts.ts --apply --limit 20
 */

import './lib/setup-env';
import axios from 'axios';
import { prisma } from '../lib/prisma';

interface Flags {
  apply: boolean;
  limit?: number;
  delayMs: number;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { apply: false, delayMs: 600 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') flags.apply = true;
    else if (a === '--limit' && argv[i + 1]) flags.limit = parseInt(argv[++i], 10);
    else if (a === '--delay' && argv[i + 1]) flags.delayMs = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        '\nUsage: deactivate-deleted-patreon-posts.ts [--apply] [--limit N] [--delay ms]\n\n' +
          '  --apply     Actually write to DB (default: dry run)\n' +
          '  --limit N   Process at most N rows\n' +
          '  --delay ms  Sleep between API calls (default: 600)\n',
      );
      process.exit(0);
    }
  }
  return flags;
}

function extractPostId(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (!parsed.hostname.toLowerCase().includes('patreon.com')) return null;
  const m = parsed.pathname.match(/^\/posts\/(?:.*-)?(\d+)\/?$/);
  return m?.[1] ?? null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Probe Patreon's public API and return the canonical status string.
 * Only "deleted" callers should act on — everything else means the post still
 * exists in some form (publicly readable, paywalled, transient error, etc.).
 */
type Probe =
  | { status: 'deleted' }     // 404 ResourceMissing — confirmed gone
  | { status: 'exists' }      // 200 OK or other non-404
  | { status: 'paywalled' }   // 403 ViewForbidden — exists but auth-gated
  | { status: 'unknown'; reason: string }; // network errors, 5xx, etc.

async function probePostStatus(postId: string): Promise<Probe> {
  try {
    const r = await axios.get(`https://www.patreon.com/api/posts/${postId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      timeout: 10000,
      validateStatus: s => s < 600,
    });

    if (r.status === 404) {
      const code = r.data?.errors?.[0]?.code_name;
      if (code === 'ResourceMissing') return { status: 'deleted' };
      return { status: 'unknown', reason: `404:${code ?? 'no-code'}` };
    }
    if (r.status === 403) {
      const code = r.data?.errors?.[0]?.code_name;
      if (code === 'ViewForbidden') return { status: 'paywalled' };
      return { status: 'unknown', reason: `403:${code ?? 'no-code'}` };
    }
    if (r.status === 200) return { status: 'exists' };
    return { status: 'unknown', reason: `status-${r.status}` };
  } catch (e) {
    return { status: 'unknown', reason: e instanceof Error ? e.message : 'unknown' };
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  console.log(`🪦 Deactivate deleted Patreon posts (404 ResourceMissing)`);
  console.log(`   mode: ${flags.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`   delay: ${flags.delayMs}ms\n`);

  // Candidate set: MHM mods on Patreon /posts/{id} URLs that we couldn't
  // resolve an author for. After the standard backfill, these are exactly
  // the mods that are either:
  //   (a) deleted (404 ResourceMissing) — what THIS script handles, OR
  //   (b) paywalled (403 ViewForbidden) — handled by resolve-paywalled-patreon.ts
  //
  // Successfully-resolved Patreon mods all have authors written, so probing
  // them again would just waste 432 API calls. If you ever need to re-check
  // an existing-author mod, drop the `author: null` filter.
  const rows = await prisma.mod.findMany({
    where: {
      source: 'MustHaveMods.com',
      author: null,
      downloadUrl: { contains: 'patreon.com/posts/' },
    },
    select: {
      id: true,
      title: true,
      downloadUrl: true,
      isVerified: true,
      author: true,
    },
    take: flags.limit,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${rows.length} MHM Patreon /posts/ mods to probe.\n`);

  const stats = {
    probed: 0,
    deleted: 0,
    deactivated: 0,
    alreadyDeactivated: 0,
    paywalled: 0,
    exists: 0,
    unknown: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const mod = rows[i];
    const postId = mod.downloadUrl ? extractPostId(mod.downloadUrl) : null;
    if (!postId) continue;

    const probe = await probePostStatus(postId);
    stats.probed++;

    if (probe.status === 'deleted') {
      stats.deleted++;
      const isAlreadyHidden = mod.isVerified === false;
      if (isAlreadyHidden) {
        stats.alreadyDeactivated++;
        console.log(
          `  ✓ [${String(i + 1).padStart(3, ' ')}/${rows.length}] already hidden — ${mod.title.slice(0, 60)}`,
        );
      } else {
        const marker = flags.apply ? '🪦' : '👀';
        console.log(
          `  ${marker} [${String(i + 1).padStart(3, ' ')}/${rows.length}] DEACTIVATE — ${mod.title.slice(0, 60)}`,
        );
        if (flags.apply) {
          try {
            await prisma.mod.update({
              where: { id: mod.id },
              data: { isVerified: false },
            });
            stats.deactivated++;
          } catch (err) {
            console.log(
              `      ⚠️  update failed: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    } else if (probe.status === 'paywalled') {
      stats.paywalled++;
    } else if (probe.status === 'exists') {
      stats.exists++;
    } else {
      stats.unknown++;
      console.log(
        `  ? [${String(i + 1).padStart(3, ' ')}/${rows.length}] unknown:${probe.reason} — ${mod.title.slice(0, 50)}`,
      );
    }

    if (flags.delayMs > 0 && i < rows.length - 1) {
      await sleep(flags.delayMs);
    }
  }

  console.log('\n📊 Summary');
  console.log(`   probed:               ${stats.probed}`);
  console.log(`   deleted (404):        ${stats.deleted}`);
  console.log(`     ↳ newly deactivated: ${stats.deactivated}`);
  console.log(`     ↳ already hidden:    ${stats.alreadyDeactivated}`);
  console.log(`   paywalled (403):      ${stats.paywalled}  (handled separately)`);
  console.log(`   exists (200):         ${stats.exists}`);
  console.log(`   unknown:              ${stats.unknown}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
