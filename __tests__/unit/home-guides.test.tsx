/**
 * E412 (Sage, 2026-11-15): homepage "Popular Sims 4 guides" block, the treated
 * arm of a randomized link test. Against pre-fix origin/main the module import
 * fails and the render case finds no guide links.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { E412_PAIRS, E412_SALT, HOME_GUIDES, HOME_GUIDES_CONTROL } from '@/lib/homeGuides';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { REDIRECTED_POST_PATHS } from '@/lib/seo/wpGuides';
import { HomeCollections } from '@/app/HomeCollections';

const treated = HOME_GUIDES.map((g) => g.href);

describe('E412 arms', () => {
  it('are 20 vs 20, disjoint, and exactly the pairs', () => {
    expect(treated.length).toBe(20);
    expect(HOME_GUIDES_CONTROL.length).toBe(20);
    expect(E412_PAIRS.length).toBe(20);
    const all = new Set([...treated, ...HOME_GUIDES_CONTROL]);
    expect(all.size).toBe(40);
    expect(new Set(E412_PAIRS.flat())).toEqual(all);
  });

  it('match the salted hash, recomputed from the pairs', () => {
    const t: string[] = [];
    const c: string[] = [];
    for (const [a, b] of E412_PAIRS) {
      const firstTreated = createHash('sha256').update(`${E412_SALT}:${a}`).digest()[0] % 2 === 0;
      t.push(firstTreated ? a : b);
      c.push(firstTreated ? b : a);
    }
    expect(t).toEqual(treated);
    expect(c).toEqual([...HOME_GUIDES_CONTROL]);
  });

  it('every href is a relative apex post path with a trailing slash and no redirect', () => {
    for (const p of [...treated, ...HOME_GUIDES_CONTROL]) {
      expect(p, p).toMatch(/^\/[a-z0-9-]+\/$/);
      expect(REDIRECTED_POST_PATHS).not.toContain(p);
    }
  });

  it('labels are hand-written, short, and never the slug', () => {
    for (const g of HOME_GUIDES) {
      const slugWords = g.href.replace(/\//g, '').replace(/-/g, ' ');
      expect(g.label.toLowerCase(), g.href).not.toBe(slugWords);
      expect(g.label.length, g.href).toBeLessThanOrEqual(40);
      expect(g.label, g.href).not.toMatch(/adult|wicked|whims/i);
    }
  });
});

describe('no other site link touches either arm', () => {
  it('lib/collections.ts links none of the 40 (keeps Pip E375/E376 and this read clean)', () => {
    const hubLinks = new Set<string>();
    for (const c of SIMS4_COLLECTIONS) {
      if (c.blogUrl) hubLinks.add(c.blogUrl.replace('https://musthavemods.com', ''));
      for (const g of c.guides ?? []) hubLinks.add(g.href.replace('https://musthavemods.com', ''));
    }
    expect(hubLinks.size).toBeGreaterThan(20); // vacuity guard
    for (const p of [...treated, ...HOME_GUIDES_CONTROL]) expect(hubLinks.has(p), p).toBe(false);
  });

  it('no app/, components/ or lib/ source names a control path except lib/homeGuides.ts', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p);
      }
    };
    for (const d of ['app', 'components', 'lib']) walk(join(process.cwd(), d));
    expect(files.length).toBeGreaterThan(100); // vacuity guard
    for (const f of files) {
      if (f.endsWith(join('lib', 'homeGuides.ts'))) continue;
      const src = readFileSync(f, 'utf8');
      for (const p of HOME_GUIDES_CONTROL) expect(src.includes(`'${p}'`) || src.includes(`"${p}"`), `${f} names ${p}`).toBe(false);
    }
  });
});

describe('HomeCollections renders the treated links', () => {
  it('20 plain links in served HTML, none inside an ad container', () => {
    const { container } = render(<HomeCollections />);
    const block = container.querySelector('[data-testid="home-guides"]');
    expect(block).not.toBeNull();
    const hrefs = Array.from(block!.querySelectorAll("a")).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(treated);
    expect(block!.closest('.mv-ads')).toBeNull();
    expect(container.querySelector('.mv-ads')).toBeNull();
    // The collections block still comes first.
    expect(container.querySelector('#collections')).not.toBeNull();
  });
});
