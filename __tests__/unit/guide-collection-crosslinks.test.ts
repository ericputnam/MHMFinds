/**
 * E433 (Sage, 2026-11-19): proxy-level "Browse the full collection" box on
 * the WordPress guides the collection registry already names as companions.
 *
 * Against pre-fix origin/main the module import fails and the middleware
 * source has no call site. The map is static (Edge bundle), so these tests
 * re-derive it from `SIMS4_COLLECTIONS` and from the functions.php map and
 * fail on drift in either direction.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  CROSSLINK_PINS,
  E433_BOX_CLASS,
  FUNCTIONS_PHP_CROSSLINK_SLUGS,
  GUIDE_COLLECTION_CROSSLINKS,
  applyGuideCollectionCrosslink,
  guideCollectionCrosslinkHtml,
} from '@/lib/seo/guideCollectionCrosslinks';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { REDIRECTED_POST_PATHS } from '@/lib/seo/wpGuides';

const paths = Object.keys(GUIDE_COLLECTION_CROSSLINKS);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Every guide path the registry names, with the hubs that name it. */
function registryGuides(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const c of SIMS4_COLLECTIONS) {
    const hrefs = new Set<string>();
    if (c.blogUrl) hrefs.add(c.blogUrl.replace('https://musthavemods.com', ''));
    for (const g of c.guides ?? []) hrefs.add(g.href);
    Array.from(hrefs).forEach((h) => out.set(h, [...(out.get(h) ?? []), c.slug]));
  }
  return out;
}

/** Keys of mhm_collection_crosslink_map() in the prod functions.php. */
function phpCrosslinkSlugs(): string[] {
  const php = readFileSync(
    join(process.cwd(), 'staging/wordpress/kadence-child-prod/functions.php'),
    'utf8',
  );
  const m = /function mhm_collection_crosslink_map\(\)\s*\{([\s\S]*?)\n\}/.exec(php);
  expect(m, 'mhm_collection_crosslink_map() not found in functions.php').toBeTruthy();
  const body = stripComments(m![1]).replace(/^\s*\/\/.*$/gm, '');
  const keys = Array.from(body.matchAll(/^\s*'([a-z0-9-]+)'\s*=>\s*array\(/gm)).map((x) => x[1]);
  expect(keys.length).toBeGreaterThan(10);
  return keys;
}

describe('E433 map', () => {
  it('has a non-trivial number of guides, all trailing-slash apex paths', () => {
    expect(paths.length).toBeGreaterThanOrEqual(80);
    for (const p of paths) expect(p).toMatch(/^\/[a-z0-9-]+\/$/);
  });

  it('is exactly the registry companions minus the functions.php-covered slugs', () => {
    const php = new Set(phpCrosslinkSlugs());
    const expected = Array.from(registryGuides().keys())
      .filter((p) => !php.has(p.replace(/\//g, '')))
      .sort();
    expect([...paths].sort()).toEqual(expected);
  });

  it('matches the functions.php map key for key (no second box, no gap)', () => {
    expect([...FUNCTIONS_PHP_CROSSLINK_SLUGS].sort()).toEqual([...phpCrosslinkSlugs()].sort());
    for (const slug of FUNCTIONS_PHP_CROSSLINK_SLUGS) {
      expect(paths).not.toContain(`/${slug}/`);
    }
  });

  it('points every guide at a hub the registry lists it under, or at a recorded pin', () => {
    const reg = registryGuides();
    const slugs = new Set(SIMS4_COLLECTIONS.map((c) => c.slug));
    for (const [p, link] of Object.entries(GUIDE_COLLECTION_CROSSLINKS)) {
      expect(slugs.has(link.topic), `${p} → unknown hub ${link.topic}`).toBe(true);
      const listed = reg.get(p) ?? [];
      const pin = CROSSLINK_PINS[p];
      if (pin) {
        expect(link.topic).toBe(pin.topic);
        expect(pin.why.length).toBeGreaterThan(20);
      } else {
        expect(listed, `${p} listed under ${listed.join('|')} needs a pin`).toHaveLength(1);
        expect(link.topic).toBe(listed[0]);
      }
    }
  });

  it('pins only what needs pinning', () => {
    const reg = registryGuides();
    for (const [p, pin] of Object.entries(CROSSLINK_PINS)) {
      const listed = reg.get(p) ?? [];
      const ambiguous = listed.length > 1;
      const redirected = listed.length === 1 && listed[0] !== pin.topic;
      expect(ambiguous || redirected, `${p} is single-mapped to its pin; drop the pin`).toBe(true);
    }
  });

  it('uses the hub heading minus the "Sims 4 " prefix as the box title', () => {
    const bySlug = new Map(SIMS4_COLLECTIONS.map((c) => [c.slug, c]));
    for (const link of Object.values(GUIDE_COLLECTION_CROSSLINKS)) {
      const c = bySlug.get(link.topic)!;
      expect(link.title).toBe(c.heading.replace(/^Sims 4 /, ''));
      expect(link.title).not.toMatch(/^Sims 4/);
    }
  });

  it('never links from a 301ed listicle', () => {
    for (const p of REDIRECTED_POST_PATHS) expect(paths).not.toContain(p);
  });
});

describe('E433 box', () => {
  it('links to the clean hub URL with no utm', () => {
    const html = guideCollectionCrosslinkHtml({ topic: 'hair-cc', title: 'Hair CC & Hair Mods' });
    expect(html).toContain('href="https://musthavemods.com/games/sims-4/hair-cc/"');
    expect(html).not.toMatch(/utm_/);
    expect(html).toContain('Browse the full Sims 4 Hair CC &amp; Hair Mods collection');
    expect(html).toContain(`class="${E433_BOX_CLASS}"`);
    expect(html).toContain('data-mhm-e433="hair-cc"');
  });

  it('carries no Mediavine selector and no ad anchor', () => {
    const src = stripComments(
      readFileSync(join(process.cwd(), 'lib/seo/guideCollectionCrosslinks.ts'), 'utf8'),
    );
    expect(src).not.toMatch(/mv-ads|secondary|mediavine|position:\s*(sticky|fixed)/i);
  });
});

const GUIDE = (body: string) =>
  `<html><head><title>x</title></head><body><aside id="secondary"></aside><article><div class="entry-content">${body}</div><!-- .entry-content --> </div> </article></body></html>`;

describe('applyGuideCollectionCrosslink', () => {
  it('inserts the box at the end of the entry content on a mapped guide', () => {
    const out = applyGuideCollectionCrosslink('/sims-4-career-mods/', GUIDE('<p>hi</p>'));
    const box = out.indexOf(E433_BOX_CLASS);
    expect(box).toBeGreaterThan(out.indexOf('<p>hi</p>'));
    expect(box).toBeLessThan(out.indexOf('<!-- .entry-content -->'));
    expect(out).toContain('/games/sims-4/gameplay-mods/');
    // The closing </div> of entry-content still immediately precedes the marker.
    expect(out).toMatch(/<\/div><\/div><!-- \.entry-content -->/);
    // Nothing before or after the entry content changed.
    expect(out.startsWith('<html><head><title>x</title></head><body><aside id="secondary"></aside>')).toBe(true);
    expect(out.endsWith('<!-- .entry-content --> </div> </article></body></html>')).toBe(true);
  });

  it('accepts a pathname without the trailing slash', () => {
    expect(applyGuideCollectionCrosslink('/sims-4-career-mods', GUIDE(''))).toContain(E433_BOX_CLASS);
  });

  it('is a byte-for-byte no-op for unmapped paths', () => {
    const html = GUIDE('<p>hi</p>');
    expect(applyGuideCollectionCrosslink('/sims-4-not-a-guide/', html)).toBe(html);
    expect(applyGuideCollectionCrosslink('/', html)).toBe(html);
    expect(applyGuideCollectionCrosslink('/blog/', html)).toBe(html);
  });

  it('is a no-op when functions.php already placed a box', () => {
    const html = GUIDE('<p>hi</p><div class="mhm-collection-crosslink">x</div>');
    expect(applyGuideCollectionCrosslink('/sims-4-career-mods/', html)).toBe(html);
  });

  it('is idempotent', () => {
    const once = applyGuideCollectionCrosslink('/sims-4-career-mods/', GUIDE('<p>hi</p>'));
    expect(applyGuideCollectionCrosslink('/sims-4-career-mods/', once)).toBe(once);
  });

  it('is a no-op without the Kadence entry-content marker', () => {
    const html = '<html><body><div>no marker</div></body></html>';
    expect(applyGuideCollectionCrosslink('/sims-4-career-mods/', html)).toBe(html);
  });
});

describe('middleware wiring', () => {
  it('imports the module and applies it after the E429 title override', () => {
    const src = stripComments(readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8'));
    expect(src).toMatch(/import \{ applyGuideCollectionCrosslink \} from '@\/lib\/seo\/guideCollectionCrosslinks';/);
    const title = src.indexOf('rewritten = applyGuideTitleOverride(pathname, rewritten);');
    const box = src.indexOf('rewritten = applyGuideCollectionCrosslink(pathname, rewritten);');
    expect(title).toBeGreaterThan(-1);
    expect(box).toBeGreaterThan(title);
  });

  it('the module is Edge-safe: no imports at all', () => {
    const src = stripComments(
      readFileSync(join(process.cwd(), 'lib/seo/guideCollectionCrosslinks.ts'), 'utf8'),
    );
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/node:|require\(/);
  });
});
