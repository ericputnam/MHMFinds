/**
 * Never emit a /creator/ link the target would 404 (Nova, E113, 2026-09-26).
 *
 * The E85 mod-page author link was built from the raw author string
 * (`creatorHref(authorSlug(mod.author))`), gated only on "is the slug
 * junk" — so every creator with 2–4 mods (dreamgirl, 2 mods) got a link to
 * a /creator/ page that 404s below MIN_MODS_FOR_PAGE. E113 takes the href
 * from the server-resolved moreFromCreator.creatorHref instead.
 *
 * Red against pre-E113 origin/main: "ModDetailClient takes the author href
 * from moreFromCreator.creatorHref" (the source still called
 * creatorHref(authorSlug(...))) and the class scan "no source builds a
 * creator href from a raw author string" (same line). The E113 related-
 * creators cases are red because lib/creatorHubRelated.ts did not exist.
 *
 * Offline: lib/prisma is mocked; wiring checks read source from disk.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

vi.mock('../../lib/prisma', () => ({ prisma: {}, default: {} }));

import { MIN_MODS_FOR_PAGE } from '../../lib/creators';
import { creatorHrefFor } from '../../lib/creatorMods';
import { neighbourCreators, RELATED_CREATORS } from '../../lib/creatorHubRelated';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('mod-page author link (E85) is gated on MIN_MODS_FOR_PAGE', () => {
  it('the gate itself: a 2–4-mod creator gets no href, a >= MIN creator does', () => {
    expect(creatorHrefFor('dreamgirl', 2)).toBeNull();
    expect(creatorHrefFor('dreamgirl', MIN_MODS_FOR_PAGE - 1)).toBeNull();
    expect(creatorHrefFor('dreamgirl', MIN_MODS_FOR_PAGE)).toBe('/creator/dreamgirl/');
  });

  it('ModDetailClient takes the author href from moreFromCreator.creatorHref', () => {
    const src = stripComments(read('app/mods/[id]/ModDetailClient.tsx'));
    expect(src).toMatch(/href=\{moreFromCreator\.creatorHref\}/);
    expect(src).not.toMatch(/creatorHref\(\s*authorSlug\(/);
    expect(src).not.toMatch(/['"`]\/creator\/\$\{/);
  });
});

describe('class scan: no source builds a creator href from a raw author string', () => {
  const files = ['app', 'components', 'lib'].flatMap((d) => walk(path.join(ROOT, d)));

  it('finds the tree (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no creatorHref(authorSlug(...)) anywhere — a count-gated helper must decide', () => {
    const offenders = files.filter((f) => /creatorHref\(\s*authorSlug\(/.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

describe('related creators on /creator/[slug]/ (E113)', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ slug: `c${i}`, mods: 10, downloads: 1000 - i }));

  it('returns RELATED_CREATORS peers ranked next to the creator, never itself', () => {
    const mid = neighbourCreators(rows, 'c15');
    expect(mid.map((r) => r.slug)).toEqual(['c11', 'c12', 'c13', 'c14', 'c16', 'c17', 'c18', 'c19']);
    for (const s of ['c0', 'c29']) {
      const edge = neighbourCreators(rows, s);
      expect(edge).toHaveLength(RELATED_CREATORS);
      expect(edge.some((r) => r.slug === s)).toBe(false);
    }
  });

  it('a slug outside the page population gets no block (it has no page)', () => {
    expect(neighbourCreators(rows, 'dreamgirl')).toEqual([]);
  });

  it('is server-resolved and rendered as plain links outside the ad anchor', () => {
    const page = stripComments(read('app/creator/[slug]/page.tsx'));
    expect(page).toMatch(/await getRelatedCreators\(/);
    expect(page).toMatch(/related=\{related\}/);
    const client = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));
    const nav = client.indexOf('data-testid="related-creators"');
    const aside = client.indexOf('id="secondary"');
    expect(nav).toBeGreaterThan(0);
    expect(aside).toBeGreaterThan(nav);
    expect(client).not.toMatch(/fetch\([^)]*creator/);
  });
});
