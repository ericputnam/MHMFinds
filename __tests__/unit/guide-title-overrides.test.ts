/**
 * E429 (Sage, 2026-11-17): proxy-level `<title>` overrides for the treated
 * arm of a randomized guide-title test. Against pre-fix origin/main the module
 * import fails and the middleware source has no call site.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  E429_CONTROL,
  E429_PAIRS,
  E429_SALT,
  GUIDE_TITLE_OVERRIDES,
  applyGuideTitleOverride,
} from '@/lib/seo/guideTitleOverrides';
import { HOME_GUIDES, HOME_GUIDES_CONTROL } from '@/lib/homeGuides';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

const treated = Object.keys(GUIDE_TITLE_OVERRIDES);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('E429 arms', () => {
  it('are 9 vs 9, disjoint, and exactly the pairs', () => {
    expect(treated.length).toBe(9);
    expect(E429_CONTROL.length).toBe(9);
    expect(E429_PAIRS.length).toBe(9);
    const all = new Set([...treated, ...E429_CONTROL]);
    expect(all.size).toBe(18);
    expect(new Set(E429_PAIRS.flat())).toEqual(all);
  });

  it('match the salted hash, recomputed from the pairs', () => {
    const t: string[] = [];
    const c: string[] = [];
    for (const [a, b] of E429_PAIRS) {
      const firstTreated = createHash('sha256').update(`${E429_SALT}:${a}`).digest()[0] % 2 === 0;
      t.push(firstTreated ? a : b);
      c.push(firstTreated ? b : a);
    }
    expect(t).toEqual(treated);
    expect(c).toEqual([...E429_CONTROL]);
  });

  it('carry no other running treatment (E412 arms, E311 hair guides)', () => {
    const e412 = new Set([...HOME_GUIDES.map((g) => g.href), ...HOME_GUIDES_CONTROL]);
    expect(e412.size).toBe(40);
    const hair = SIMS4_COLLECTIONS.find((c) => c.slug === 'hair-cc');
    expect(hair).toBeDefined();
    const e311 = new Set((hair?.guides ?? []).map((g) => g.href));
    expect(e311.size).toBeGreaterThanOrEqual(6);
    for (const p of E429_PAIRS.flat()) {
      expect(e412.has(p), `${p} is an E412 arm`).toBe(false);
      expect(e311.has(p), `${p} is an E311 guide`).toBe(false);
      expect(p).not.toMatch(/^\/sims-4-male-sims?-download\/$/);
    }
  });

  it('paths have a trailing slash (trailingSlash: true)', () => {
    for (const p of E429_PAIRS.flat()) expect(p).toMatch(/^\/[a-z0-9-]+\/$/);
  });
});

describe('E429 titles', () => {
  it('are hand-written: 30–65 chars, head term first, no brand suffix, not the slug', () => {
    for (const [path, o] of Object.entries(GUIDE_TITLE_OVERRIDES)) {
      expect(o.title.length, `${path}: ${o.title}`).toBeGreaterThanOrEqual(30);
      expect(o.title.length, `${path}: ${o.title}`).toBeLessThanOrEqual(65);
      expect(o.title).not.toMatch(/Must Have Mods|MustHaveMods/);
      expect(o.title).not.toMatch(/&amp;|&lt;|&gt;/);
      expect(o.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).not.toBe(path.replace(/\//g, ''));
      expect(o.from.length).toBeGreaterThanOrEqual(12);
      expect(o.title).not.toBe(o.from);
    }
  });
});

describe('applyGuideTitleOverride', () => {
  const page = (title: string) =>
    `<!doctype html><html><head><title>${title}</title>` +
    `<meta property="og:title" content="${title}">` +
    `<meta name="description" content="desc"></head>` +
    `<body><svg><title>Expand</title></svg></body></html>`;

  it('rewrites only the head <title> of a treated path, leaving og:title and the body alone', () => {
    const live = '32+ Best Sims 4 Hats CC To Elevate Your Sim’s Wardrobe';
    const out = applyGuideTitleOverride('/sims-4-hats-cc/', page(live));
    expect(out).toContain(`<title>${GUIDE_TITLE_OVERRIDES['/sims-4-hats-cc/'].title}</title>`);
    expect(out).toContain(`<meta property="og:title" content="${live}">`);
    expect(out).toContain('<svg><title>Expand</title></svg>');
    expect(out).toContain('<meta name="description" content="desc">');
    expect(out.match(/<title>/g)?.length).toBe(2);
  });

  it('accepts the pathname without a trailing slash', () => {
    const out = applyGuideTitleOverride('/sims-4-hats-cc', page('Best Sims 4 Hats CC x'));
    expect(out).toContain(GUIDE_TITLE_OVERRIDES['/sims-4-hats-cc/'].title);
  });

  it('is a byte-for-byte no-op for control and unknown paths', () => {
    const html = page('Best Sims 4 Hats CC x');
    for (const p of [...E429_CONTROL, '/sims-4-hair-cc/', '/', '/blog/']) {
      expect(applyGuideTitleOverride(p, html)).toBe(html);
    }
  });

  it('retires itself once the live title no longer contains `from`', () => {
    const html = page('Hats for Sims, rewritten by the writer');
    expect(applyGuideTitleOverride('/sims-4-hats-cc/', html)).toBe(html);
  });

  it('is a no-op on HTML without a head', () => {
    expect(applyGuideTitleOverride('/sims-4-hats-cc/', 'Best Sims 4 Hats CC')).toBe('Best Sims 4 Hats CC');
  });

  it('escapes HTML in the replacement title', () => {
    const html = page('Best Sims 4 Hats CC');
    const out = applyGuideTitleOverride('/sims-4-hats-cc/', html);
    expect(out).not.toMatch(/<title>[^<]*[<>][^<]*<\/title>/);
  });
});

describe('middleware wiring', () => {
  it('calls applyGuideTitleOverride on proxied WordPress HTML', () => {
    const src = stripComments(readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8'));
    expect(src).toMatch(/import \{ applyGuideTitleOverride \} from '@\/lib\/seo\/guideTitleOverrides'/);
    expect(src).toMatch(/rewritten = applyGuideTitleOverride\(pathname, rewritten\)/);
  });

  it('keeps lib/seo/guideTitleOverrides.ts Edge-safe (no node imports)', () => {
    const src = stripComments(
      readFileSync(join(process.cwd(), 'lib/seo/guideTitleOverrides.ts'), 'utf8')
    );
    expect(src).not.toMatch(/from ['"]node:|require\(/);
    expect(src).not.toMatch(/\bimport\b/);
  });
});
