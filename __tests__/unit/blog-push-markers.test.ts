/**
 * The functions.php push scripts refuse to scp a local file that lacks
 * any CRITICAL_MARKERS entry. The guard is only as good as the arrays:
 * until 2026-10-26 the prod array was missing mhm_catalog_mod_links
 * even though the staging array (which its comment says to "keep in
 * sync") had it, so a prod push could have wiped that feature silently.
 *
 * Also pins the Amazon pack block's link hygiene: every Amazon link it
 * emits carries the live tag and rel="sponsored" (the retired
 * musthavemod08-20 tag earns nothing).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function markers(script: string): string[] {
  const src = read(script);
  const block = src.match(/^CRITICAL_MARKERS=\(\n([\s\S]*?)^\)/m);
  if (!block) throw new Error(`no CRITICAL_MARKERS in ${script}`);
  return block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('"') || l.startsWith("'"))
    .map((l) => l.slice(1).split('|')[0]);
}

const PROD = 'scripts/staging/push-blog-functions-prod.sh';
const STAGING = 'scripts/staging/push-blog-functions.sh';

describe('functions.php push-script CRITICAL_MARKERS', () => {
  const prod = markers(PROD);
  const staging = markers(STAGING);

  it('parses a non-trivial marker list from each script (vacuity guard)', () => {
    expect(prod.length).toBeGreaterThanOrEqual(8);
    expect(staging.length).toBeGreaterThanOrEqual(8);
  });

  it('prod and staging arrays name the same markers', () => {
    expect([...prod].sort()).toEqual([...staging].sort());
  });

  it('every prod marker is present in the prod functions.php', () => {
    const php = read('staging/wordpress/kadence-child-prod/functions.php');
    for (const m of prod) expect(php, m).toContain(m);
  });

  it('every staging marker is present in the staging functions.php', () => {
    const php = read('staging/wordpress/kadence-child/functions.php');
    for (const m of staging) expect(php, m).toContain(m);
  });

  it('the live-HTML sidebar check looks for the pack block', () => {
    expect(read('scripts/agents/check-blog-sidebar.sh')).toContain("'mhm-pack-picks|");
  });
});

describe('mhm_affiliate_pack_block link hygiene', () => {
  for (const file of [
    'staging/wordpress/kadence-child-prod/functions.php',
    'staging/wordpress/kadence-child/functions.php',
  ]) {
    const php = read(file);
    const start = php.indexOf('function mhm_affiliate_pack_catalog');
    const end = php.indexOf("add_filter( 'the_content', 'mhm_affiliate_pack_block', 22 );");

    it(`${file}: block exists and is registered`, () => {
      expect(start).toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
    });

    const block = php.slice(start, end);

    it(`${file}: every catalog ASIN is well-formed and unique`, () => {
      const asins = Array.from(block.matchAll(/'(B0[0-9A-Z]{8})'/g), (m) => m[1]);
      expect(asins.length).toBeGreaterThanOrEqual(40);
      const catalogFn = block.slice(0, block.indexOf('function mhm_affiliate_pack_fallback'));
      const catalog = Array.from(catalogFn.matchAll(/array\( '[^']+', '[^']+', '(B0[0-9A-Z]{8})'/g), (m) => m[1]);
      expect(catalog.length).toBeGreaterThanOrEqual(40);
      expect(new Set(catalog).size).toBe(catalog.length);
    });

    it(`${file}: links use the live tag and rel=sponsored`, () => {
      expect(block).toContain("'?tag=musthavemod04-20'");
      expect(block).not.toContain('musthavemod08-20');
      expect(block).toContain('rel="sponsored nofollow noopener"');
    });
  }
});
