import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  HomeJsonLd,
  homePageJsonLd,
  HOME_WEBPAGE_ID,
  HOME_FAQ_ID,
} from '@/components/HomeJsonLd';
import { HOME_SHELL_LASTMOD } from '@/lib/seo/siteLastmod';

/**
 * E189 (2026-10-12, Sage): the homepage's own JSON-LD nodes stay on the homepage.
 *
 * Before E189 the root layout emitted `WebPage @id …/#webpage` (url = the site
 * root) and `FAQPage @id …/#faq` on every Next.js page. Live 10-12, all five
 * templates checked (`/`, a collection, `/mods/[id]`, `/creator/`, `/games/sims-4/`)
 * carried both nodes, so each one claimed to be the homepage.
 *
 * This file contains two checks.
 *   1. The layout check: the root layout emits only site-wide node types.
 *   2. The class scanner: no file under app/ or components/ other than the
 *      homepage builder names the homepage node ids. Copying the layout block
 *      into another template therefore fails this test as well.
 * Pre-fix tree: 1 and 2 are red (the layout names `WebPage`, `FAQPage`, `#webpage`, `#faq`).
 */

const ROOTS = ['app', 'components'];
const EXT = /\.(ts|tsx)$/;
const HOME_BUILDER = path.join('components', 'HomeJsonLd.tsx');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(p, out);
    } else if (EXT.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// Comments in these files deliberately name the ids they warn about.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const read = (rel: string) => stripComments(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));

/** Homepage-only node ids, matched as source text in either literal or template form. */
const HOME_ONLY_ID = /\/#(webpage|faq)\b/;

describe('E189: the root layout emits only site-wide JSON-LD nodes', () => {
  const layout = read(path.join('app', 'layout.tsx'));
  const types = Array.from(layout.matchAll(/'@type':\s*'([A-Za-z]+)'/g)).map((m) => m[1]);

  it('finds the layout graph (vacuity guard)', () => {
    expect(types).toContain('WebSite');
    expect(types).toContain('Organization');
  });

  it('has no page-level node types', () => {
    const pageTypes = types.filter((t) =>
      ['WebPage', 'FAQPage', 'CollectionPage', 'ItemPage', 'AboutPage'].includes(t),
    );
    expect(pageTypes).toEqual([]);
  });

  it('does not name the homepage node ids', () => {
    expect(HOME_ONLY_ID.test(layout)).toBe(false);
  });
});

describe('E189 scanner: only the homepage builder names #webpage / #faq', () => {
  const files = ROOTS.flatMap((r) => walk(path.join(process.cwd(), r))).map((f) =>
    path.relative(process.cwd(), f),
  );
  const naming = files.filter((f) => HOME_ONLY_ID.test(read(f)));

  it('scans a real population and finds the builder (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(naming).toContain(HOME_BUILDER);
  });

  it('no other file names the homepage node ids', () => {
    expect(naming.filter((f) => f !== HOME_BUILDER)).toEqual([]);
  });

  it('the scanner pattern catches the pre-fix layout shape (seen red)', () => {
    expect(HOME_ONLY_ID.test(`'@id': 'https://musthavemods.com/#webpage',`)).toBe(true);
    expect(HOME_ONLY_ID.test("'@id': `${SITE}/#faq`,")).toBe(true);
    expect(HOME_ONLY_ID.test(`'@id': 'https://musthavemods.com/#website',`)).toBe(false);
  });
});

describe('E189: the homepage renders its own WebPage + FAQPage', () => {
  it('app/page.tsx renders <HomeJsonLd />', () => {
    expect(read(path.join('app', 'page.tsx'))).toMatch(/<HomeJsonLd\s*\/>/);
  });

  it('the graph carries the homepage nodes with the E150 date', () => {
    const graph = homePageJsonLd()['@graph'] as Array<Record<string, unknown>>;
    const page = graph.find((n) => n['@type'] === 'WebPage');
    const faq = graph.find((n) => n['@type'] === 'FAQPage');
    expect(page?.['@id']).toBe(HOME_WEBPAGE_ID);
    expect(page?.url).toBe('https://musthavemods.com');
    expect(page?.dateModified).toBe(HOME_SHELL_LASTMOD);
    expect(faq?.['@id']).toBe(HOME_FAQ_ID);
    expect((faq?.mainEntity as unknown[]).length).toBe(3);
  });

  it('renders as one parseable ld+json script', () => {
    const html = renderToStaticMarkup(createElement(HomeJsonLd));
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*)<\/script>/);
    expect(m).not.toBeNull();
    const parsed = JSON.parse(m![1]);
    expect(parsed['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['WebPage', 'FAQPage']);
  });
});
