#!/usr/bin/env npx tsx
/**
 * Generate lib/collectionCovers.ts — up to 3 static cover thumbnails per
 * Sims 4 collection, for the homepage "Browse Sims 4 CC by collection" block.
 *
 * Why a generated file: the homepage shell must cost no DB query
 * (app/page.tsx), so the covers are looked up once, here, and committed.
 *
 * Selection mirrors app/games/[game]/[topic]/page.tsx `fetchCollectionMods`
 * exactly: buildWhereClause(collection.filter) + gameVersion + isNSFW:false,
 * ordered by downloadCount desc, createdAt desc. On top of that a cover must
 * have a non-empty https thumbnail. Distinct authors are preferred; URLs are
 * de-duplicated.
 *
 * Usage:
 *   npx tsx scripts/generate-collection-covers.ts            # write lib/collectionCovers.ts
 *   npx tsx scripts/generate-collection-covers.ts --dry-run  # print summary, write nothing
 */

// CRITICAL: setup-env first (loads .env.local, swaps Accelerate URL for the direct URL).
import './lib/setup-env';

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { SIMS4_COLLECTIONS, buildWhereClause } from '../lib/collections';

const COVERS_PER_COLLECTION = 3;
/** How many top rows (by the collection page's own sort) to scan for covers. */
const SCAN_LIMIT = 60;
const OUT_FILE = path.resolve(__dirname, '../lib/collectionCovers.ts');

function isHttps(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u.startsWith('https://')) return false;
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function host(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '?';
  }
}

type Row = { id: string; title: string; thumbnail: string | null; author: string | null };

function pickCovers(rows: Row[]): Row[] {
  const picked: Row[] = [];
  const seenUrls = new Set<string>();
  const seenAuthors = new Set<string>();

  const eligible = rows.filter((r) => isHttps(r.thumbnail));

  // Pass 1: distinct authors. Pass 2: fill from the remaining rows in rank order.
  for (const pass of [1, 2]) {
    for (const r of eligible) {
      if (picked.length >= COVERS_PER_COLLECTION) break;
      const url = r.thumbnail!.trim();
      if (seenUrls.has(url)) continue;
      const authorKey = (r.author ?? '').trim().toLowerCase();
      if (pass === 1 && authorKey && seenAuthors.has(authorKey)) continue;
      picked.push({ ...r, thumbnail: url });
      seenUrls.add(url);
      if (authorKey) seenAuthors.add(authorKey);
    }
  }
  return picked;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result: Record<string, string[]> = {};
  const titles: Record<string, string[]> = {};

  for (const collection of SIMS4_COLLECTIONS) {
    // Same where as fetchCollectionMods() in app/games/[game]/[topic]/page.tsx.
    const where = {
      ...buildWhereClause(collection.filter),
      gameVersion: collection.game,
      isNSFW: false,
    };
    const rows = await prisma.mod.findMany({
      where: {
        ...where,
        // Only rows that can be a cover; the rank order among them is unchanged.
        AND: [{ thumbnail: { not: null } }, { thumbnail: { startsWith: 'https://' } }],
      },
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      take: SCAN_LIMIT,
      select: { id: true, title: true, thumbnail: true, author: true },
    });
    const covers = pickCovers(rows);
    result[collection.slug] = covers.map((c) => c.thumbnail!);
    titles[collection.slug] = covers.map((c) => c.title);
  }

  const slugs = Object.keys(result).sort();

  console.log(`${dryRun ? '[dry-run] ' : ''}${slugs.length} collections`);
  for (const slug of slugs) {
    const urls = result[slug];
    console.log(
      `${slug.padEnd(28)} covers=${urls.length}  host=${urls[0] ? host(urls[0]) : '-'}  #1="${
        titles[slug][0] ?? '-'
      }"`
    );
  }
  const zero = slugs.filter((s) => result[s].length === 0);
  console.log(zero.length ? `ZERO-COVER: ${zero.join(', ')}` : 'All collections have >= 1 cover');

  if (dryRun) {
    console.log('[dry-run] nothing written');
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const body = slugs
    .map((slug) => {
      const items = result[slug].map((u) => `    ${JSON.stringify(u)},`).join('\n');
      return `  ${JSON.stringify(slug)}: [${items ? `\n${items}\n  ` : ''}],`;
    })
    .join('\n');

  const out = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Cover thumbnails for the homepage "Browse Sims 4 CC by collection" cards.
 * Regenerate with:  npx tsx scripts/generate-collection-covers.ts
 * Generated on:     ${date}
 *
 * Each list is the top mods (by the collection page's own sort: downloads,
 * then newest; SFW only) that have an https thumbnail, preferring distinct
 * authors. Committed so the homepage shell needs no runtime DB query.
 */
export const COLLECTION_COVERS: Record<string, string[]> = {
${body}
};

export function collectionCovers(slug: string): string[] {
  return COLLECTION_COVERS[slug] ?? [];
}
`;
  fs.writeFileSync(OUT_FILE, out);
  console.log(`wrote ${path.relative(process.cwd(), OUT_FILE)}`);
}

main()
  .catch((err) => {
    console.error('generate-collection-covers failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
