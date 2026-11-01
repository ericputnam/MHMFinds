/**
 * E312 (Sage, 2026-11-01): every collection hub emits a BreadcrumbList that
 * mirrors its visible crumb trail.
 *
 * /mods/[id] has carried a BreadcrumbList since E171; the 35 hubs emitted only
 * CollectionPage + ItemList (+ the site-wide WebSite/Organization from the
 * layout), so Google inferred the trail under a hub result from the URL. Live
 * 2026-11-01, hubs read 285 clicks / 8,165 impressions (3.49% CTR) over GSC
 * 10-02→10-29, and GSC searchAppearance returned no rows for them.
 *
 * Three checks:
 *   1. The helper, run over every registry entry, yields exactly the three
 *      crumbs the client renders (Home → game → collection.title), each with
 *      an absolute trailing-slash `item` and the hub's canonical last.
 *   2. The page's @graph actually includes the node (source scan, comments
 *      stripped — the comment above the call names the function too).
 *   3. The client markup still renders the same three names in the same
 *      order, so a copy edit to the crumbs cannot drift from the JSON-LD.
 * Pre-fix tree: 2 is red (page.tsx never calls the helper); 1 and 3 fail to
 * compile because the helper does not exist.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import {
  collectionBreadcrumbJsonLd,
  collectionBreadcrumbs,
  collectionCanonical,
} from '@/lib/seo/collectionMetadata';

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const read = (rel: string) => stripComments(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));

const PAGE = path.join('app', 'games', '[game]', '[topic]', 'page.tsx');
const CLIENT = path.join('app', 'games', '[game]', '[topic]', 'CollectionPageClient.tsx');

describe('E312: collection hubs emit a BreadcrumbList that mirrors the visible crumbs', () => {
  it('scans a non-trivial registry (vacuity guard)', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThan(20);
  });

  it.each(SIMS4_COLLECTIONS.map((c) => [c.slug, c] as const))(
    '%s: Home → game → title, absolute trailing-slash items, canonical last',
    (_slug, c) => {
      const crumbs = collectionBreadcrumbs(c);
      expect(crumbs.map((x) => x.name)).toEqual(['Home', c.game, c.title]);
      expect(crumbs.map((x) => x.item)).toEqual([
        'https://musthavemods.com/',
        `https://musthavemods.com/games/${c.gameSlug}/`,
        collectionCanonical(c),
      ]);
      for (const x of crumbs) {
        expect(x.item).toMatch(/^https:\/\/musthavemods\.com\/(?:.*\/)?$/);
        expect(x.href.endsWith('/')).toBe(true);
      }

      const node = collectionBreadcrumbJsonLd(c) as Record<string, unknown>;
      expect(node['@type']).toBe('BreadcrumbList');
      // Embedded in the page @graph, which carries the @context.
      expect(node).not.toHaveProperty('@context');
      const items = node.itemListElement as Array<Record<string, unknown>>;
      expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(items.map((i) => i.name)).toEqual(['Home', c.game, c.title]);
      expect(items[2].item).toBe(collectionCanonical(c));
    },
  );

  it('the page @graph includes the BreadcrumbList node', () => {
    const src = read(PAGE);
    expect(src).toMatch(/collectionBreadcrumbJsonLd\(collection\)/);
    expect(src).toMatch(/import \{[^}]*collectionBreadcrumbJsonLd[^}]*\} from '[^']*lib\/seo\/collectionMetadata'/);
  });

  it('the client crumb trail still renders Home → {collection.game} → {collection.title} in that order', () => {
    const src = read(CLIENT);
    const nav = src.match(/<nav className="crumbs"[\s\S]*?<\/nav>/)?.[0];
    expect(nav, 'crumb <nav> not found in CollectionPageClient').toBeTruthy();
    const home = nav!.indexOf('>Home<');
    const game = nav!.indexOf('{collection.game}');
    const title = nav!.indexOf('{collection.title}');
    expect(home).toBeGreaterThan(-1);
    expect(game).toBeGreaterThan(home);
    expect(title).toBeGreaterThan(game);
    expect(nav).toContain('aria-current="page"');
  });
});
