#!/usr/bin/env npx tsx
/**
 * READ-ONLY ranking (Rowan, E186, 2026-10-11): which source blog posts have
 * the highest share of rows whose `contentType` disagrees with the post's own
 * URL category?
 *
 * WHY: E180 (10-07) found 34 of 41 rows wrong on two legacy posts
 * (/sims-4-bags-cc/, /best-sims-4-realistic-mods/). Legacy imports were typed
 * row by row from blog prose, so a bad post is bad wholesale while the facet
 * totals look fine. This ranks posts so the worst can be hand-audited with
 * `retag-junk-build-facets.ts --ids=` — it never decides a type itself.
 *
 * Method
 *   - URL category = `detectContentTypeFromUrl(sourceUrl)` — the same map the
 *     ingest uses. Posts with no URL category are counted, never ranked: a
 *     post this map cannot read (e.g. /sims-4-bags-cc/) is invisible here.
 *   - A row AGREES if its contentType is in the URL category's family
 *     (`FAMILY` below — a clothes post may hold dresses and shoes; a
 *     kitchen post holds build/buy, since room values are never a
 *     contentType, E147; a houses post holds residential/commercial). NULL,
 *     hand-audited (pinned) and `holidays` rows are counted separately and are
 *     never "disagree".
 *   - Ranked by disagree / (rows - null - pinned), posts with ≥ --min typed
 *     unpinned rows (default 10), ties by disagree count.
 *
 * Disagreement is a pointer to read a post, not a verdict on a row: a post's
 * URL category is itself a guess (a "house" slug can hold furniture). The
 * audit decides from titles.
 *
 *   npx tsx scripts/agents/catalog-post-disagreement.ts
 *   npx tsx scripts/agents/catalog-post-disagreement.ts --min=10 --top=25 \
 *     --out=reports/funnel/catalog-e186-post-disagreement-2026-10-11
 *   npx tsx scripts/agents/catalog-post-disagreement.ts --post=<sourceUrl> # list rows
 */
import '../lib/setup-env';

import { writeFileSync } from 'fs';
import { prisma } from '../../lib/prisma';
import { detectContentTypeFromUrl } from '../../lib/services/mhmScraperUtils';
import { HAND_AUDITED_CONTENT_TYPES } from '../lib/hand-audited-content-types';

const CLOTHING = ['tops', 'bottoms', 'dresses', 'full-body', 'swimwear', 'outerwear', 'shoes', 'hats', 'accessories', 'jewelry', 'glasses', 'watches', 'socks', 'sleepwear', 'workout'];
const BUILD = ['furniture', 'decor', 'clutter', 'lighting', 'plants', 'rugs', 'wall-art', 'gym', 'pet-furniture', 'entertainment', 'outdoor', 'curtains'];
const LOT = ['lot', 'residential', 'commercial', 'community', 'builds'];
const HAIR = ['hair', 'facial-hair', 'beard'];
/**
 * Seasonal values that E154 already made title-only: a `holidays` row on a
 * Christmas-decor post is a vocabulary choice, not a mis-type. Counted as
 * neutral, never agree or disagree.
 */
const NEUTRAL = ['holidays'];
const FACE = ['makeup', 'eyeliner', 'lipstick', 'blush', 'eyebrows', 'lashes', 'eyeshadow'];

/** URL category → contentTypes that agree with it. Unlisted = itself only. */
export const FAMILY: Record<string, string[]> = {
  lot: LOT,
  hair: HAIR,
  tops: CLOTHING,
  bottoms: CLOTHING,
  dresses: ['dresses', 'full-body'],
  shoes: ['shoes'],
  hats: ['hats', 'accessories'],
  accessories: ['accessories', 'jewelry', 'glasses', 'hats'],
  glasses: ['glasses', 'accessories'],
  makeup: [...FACE, 'skin'],
  eyeliner: FACE,
  lipstick: FACE,
  blush: FACE,
  eyebrows: FACE,
  lashes: FACE,
  furniture: BUILD,
  decor: BUILD,
  kitchen: BUILD,
  bathroom: BUILD,
  bedroom: BUILD,
  'gameplay-mod': ['gameplay-mod', 'script-mod', 'trait', 'career'],
  skin: ['skin', 'tattoos', 'makeup'],
  preset: ['preset', 'body-preset'],
};

export function agrees(urlType: string, contentType: string): boolean {
  return (FAMILY[urlType] ?? [urlType]).includes(contentType);
}

function arg(name: string): string | undefined {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : undefined;
}

async function main() {
  const min = Number(arg('min') ?? 10);
  const top = Number(arg('top') ?? 25);
  const out = arg('out');
  const post = arg('post');

  const rows = await prisma.mod.findMany({
    where: { sourceUrl: { not: null } },
    select: { id: true, title: true, contentType: true, sourceUrl: true, downloadCount: true },
  });
  if (rows.length < 10000) throw new Error(`vacuity guard: loaded ${rows.length} rows with a sourceUrl (<10,000)`);

  if (post) {
    const urlType = detectContentTypeFromUrl(post) ?? '(none)';
    console.log(`${post}  URL category: ${urlType}`);
    for (const r of rows.filter((x) => x.sourceUrl === post).sort((a, b) => a.title.localeCompare(b.title))) {
      const pin = HAND_AUDITED_CONTENT_TYPES[r.id];
      const verdict = pin ? 'PIN' : r.contentType == null ? 'NULL' : NEUTRAL.includes(r.contentType) ? 'neut' : urlType !== '(none)' && agrees(urlType, r.contentType) ? 'ok' : 'DIS';
      console.log(`${verdict.padEnd(4)} ${r.id}  ${String(r.contentType).padEnd(13)} dl=${String(r.downloadCount).padEnd(5)} ${r.title}`);
    }
    await prisma.$disconnect();
    return;
  }

  type Agg = { sourceUrl: string; urlType: string; rows: number; nulls: number; pinned: number; neutral: number; agree: number; disagree: number; disagreeTypes: Record<string, number>; downloads: number };
  const byPost = new Map<string, Agg>();
  let unmappedRows = 0;
  const unmappedPosts = new Set<string>();
  for (const r of rows) {
    const url = r.sourceUrl as string;
    const urlType = detectContentTypeFromUrl(url);
    if (!urlType) { unmappedRows++; unmappedPosts.add(url); continue; }
    let a = byPost.get(url);
    if (!a) { a = { sourceUrl: url, urlType, rows: 0, nulls: 0, pinned: 0, neutral: 0, agree: 0, disagree: 0, disagreeTypes: {}, downloads: 0 }; byPost.set(url, a); }
    a.rows++;
    a.downloads += r.downloadCount;
    if (HAND_AUDITED_CONTENT_TYPES[r.id]) a.pinned++;
    else if (r.contentType == null) a.nulls++;
    else if (NEUTRAL.includes(r.contentType)) a.neutral++;
    else if (agrees(urlType, r.contentType)) a.agree++;
    else { a.disagree++; a.disagreeTypes[r.contentType] = (a.disagreeTypes[r.contentType] ?? 0) + 1; }
  }

  const all = Array.from(byPost.values());
  const ranked = all
    .filter((a) => a.agree + a.disagree >= min)
    .map((a) => ({ ...a, share: a.disagree / (a.agree + a.disagree) }))
    .sort((x, y) => y.share - x.share || y.disagree - x.disagree);

  const totals = {
    rowsWithSourceUrl: rows.length,
    mappedPosts: all.length,
    mappedRows: all.reduce((s, a) => s + a.rows, 0),
    unmappedPosts: unmappedPosts.size,
    unmappedRows,
    rankedPosts: ranked.length,
    disagreeRowsAllMapped: all.reduce((s, a) => s + a.disagree, 0),
    typedUnpinnedRowsAllMapped: all.reduce((s, a) => s + a.agree + a.disagree, 0),
    postsOver50pct: ranked.filter((a) => a.share > 0.5).length,
  };

  console.log(`Loaded ${totals.rowsWithSourceUrl} rows with a sourceUrl`);
  console.log(`  URL category known: ${totals.mappedPosts} posts / ${totals.mappedRows} rows; unknown: ${totals.unmappedPosts} posts / ${totals.unmappedRows} rows (never ranked)`);
  console.log(`  disagree (typed, unpinned): ${totals.disagreeRowsAllMapped} / ${totals.typedUnpinnedRowsAllMapped}`);
  console.log(`  ranked (≥${min} typed unpinned rows): ${totals.rankedPosts}; >50% disagree: ${totals.postsOver50pct}\n`);
  console.log('rank  share  dis/typed  null pin  urlType       post  [disagreeing types]');
  ranked.slice(0, top).forEach((a, i) => {
    const types = Object.entries<number>(a.disagreeTypes).sort((x, y) => y[1] - x[1]).map(([t, n]) => `${t}:${n}`).join(' ');
    console.log(`${String(i + 1).padStart(4)}  ${(a.share * 100).toFixed(1).padStart(5)}%  ${String(a.disagree).padStart(3)}/${String(a.agree + a.disagree).padEnd(4)}  ${String(a.nulls).padStart(4)} ${String(a.pinned).padStart(3)}  ${a.urlType.padEnd(12)}  ${a.sourceUrl.replace('https://musthavemods.com', '')}  [${types}]`);
  });

  if (out) {
    const top_ = ranked.slice(0, top);
    writeFileSync(`${out}.json`, JSON.stringify({ writtenAt: new Date().toISOString(), mode: 'read-only', min, totals, ranked: top_ }, null, 1) + '\n');
    const md = [
      `# E186 — posts ranked by contentType vs URL-category disagreement (${new Date().toISOString().slice(0, 10)})`,
      '',
      'Read-only. `scripts/agents/catalog-post-disagreement.ts`. Disagreement = typed, unpinned row whose contentType is outside the URL category family; NULL and pinned rows never count.',
      '',
      `- Rows with a sourceUrl: ${totals.rowsWithSourceUrl}`,
      `- URL category known: ${totals.mappedPosts} posts / ${totals.mappedRows} rows; unknown: ${totals.unmappedPosts} posts / ${totals.unmappedRows} rows (not ranked)`,
      `- Disagree: ${totals.disagreeRowsAllMapped} of ${totals.typedUnpinnedRowsAllMapped} typed unpinned rows on mapped posts`,
      `- Ranked (≥${min} typed unpinned rows): ${totals.rankedPosts}; >50% disagree: ${totals.postsOver50pct}`,
      '',
      '| # | Share | Dis/typed | NULL | Pinned | URL type | Post | Disagreeing types |',
      '|---|---|---|---|---|---|---|---|',
      ...top_.map((a, i) => `| ${i + 1} | ${(a.share * 100).toFixed(1)}% | ${a.disagree}/${a.agree + a.disagree} | ${a.nulls} | ${a.pinned} | ${a.urlType} | ${a.sourceUrl.replace('https://musthavemods.com', '')} | ${Object.entries<number>(a.disagreeTypes).sort((x, y) => y[1] - x[1]).map(([t, n]) => `${t} ${n}`).join(', ')} |`),
      '',
    ].join('\n');
    writeFileSync(`${out}.md`, md);
    console.log(`\nWrote ${out}.json and ${out}.md`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
