/**
 * E354 (Sage, 2026-11-06): every collection hub's CollectionPage JSON-LD
 * carries `dateModified`, and it is the same value its /sitemap-nextjs.xml
 * <lastmod> declares.
 *
 * Live 2026-11-06 the CollectionPage node on all hubs had url/name/
 * description/isPartOf/mainEntity and no date, while the sitemap already
 * dated each hub with collectionLastmod(). The hubs take most of the site's
 * AI-referral landings (chatgpt 28d 10-08→11-04: /games/sims-4/cc 89,
 * gshade-presets 71, skin-details 70, male-clothes 64, build-cc 61).
 *
 * Guarded at source level (comments stripped — the doc comment names the
 * function too) because page.tsx may only export Next.js page fields:
 *   1. the page imports collectionLastmod from lib/sitemapLastmod — the same
 *      import the sitemap route uses — and calls it with the hub's slugs;
 *   2. the CollectionPage node in buildJsonLd emits dateModified;
 *   3. no other date source (new Date(), toISOString, a literal) feeds it.
 * Pre-fix tree: 1 and 2 are red.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const read = (rel: string) => stripComments(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));

const PAGE = path.join('app', 'games', '[game]', '[topic]', 'page.tsx');
const SITEMAP = path.join('app', 'sitemap-nextjs.xml', 'route.ts');

describe('E354: hub CollectionPage dateModified mirrors the sitemap lastmod', () => {
  const page = read(PAGE);

  it('the sitemap and the page take the date from the same lib function', () => {
    expect(read(SITEMAP)).toMatch(/collectionLastmod\(/);
    expect(page).toMatch(/import \{ collectionLastmod \} from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/sitemapLastmod';/);
    expect(page).toMatch(/collectionLastmod\(collection\.gameSlug, collection\.slug\)/);
  });

  it('the CollectionPage node emits dateModified', () => {
    const node = page.slice(page.indexOf("'@type': 'CollectionPage'"));
    expect(node.length).toBeGreaterThan(0);
    const body = node.slice(0, node.indexOf('mainEntity'));
    expect(body).toMatch(/\bdateModified\b/);
  });

  it('the value is passed into buildJsonLd, not computed from "now"', () => {
    expect(page).toMatch(/buildJsonLd\(collection, mods, totalCount, dateModified\)/);
    const builder = page.slice(page.indexOf('function buildJsonLd'), page.indexOf('export default'));
    expect(builder.length).toBeGreaterThan(100);
    expect(builder).not.toMatch(/new Date\(|toISOString|toDateStamp|\d{4}-\d{2}-\d{2}/);
  });
});
