import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModJsonLd } from '@/components/ModJsonLd';
import type { Mod } from '@/lib/api';

/**
 * E143 (2026-09-30, Sage) — no content date is ever fed by `updatedAt`.
 *
 * `Mod.updatedAt` is a Prisma `@updatedAt` column: every download-counter
 * write and retag pass bumps it (6,070 of 16,524 mods "updated" in 28 d on
 * a catalog that grew 673). E136 (#221) took it out of /sitemap-mods.xml
 * <lastmod>; the SoftwareApplication JSON-LD on every /mods/[id] page still
 * emitted `dateModified = updatedAt`, so the page and its sitemap entry
 * disagreed (live 09-30: sitemap 2026-09-26, JSON-LD 2026-09-29).
 *
 * Section 1 is a class scanner over app/ and components/ — any
 * dateModified / lastmod / lastModified field or <lastmod> element whose
 * value expression mentions `updatedAt` fails. Section 2 renders the
 * component with a fixture whose updatedAt is newer than every content date.
 */

const ROOTS = ['app', 'components'];
const EXT = /\.(ts|tsx)$/;

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

// Comments here deliberately quote the bad pattern; strip them first.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/** Every place a content-date field is set, with the expression that feeds it. */
function contentDateSites(src: string): { key: string; expr: string }[] {
  const lines = src.split('\n');
  const sites: { key: string; expr: string }[] = [];
  const KEY = /\b(dateModified|lastmod|lastModified)\b\s*[:=]|<lastmod>/i;
  lines.forEach((line, i) => {
    const m = line.match(KEY);
    if (!m) return;
    // The feeding expression: the line itself, the next line (wrapped
    // values), and up to two preceding lines (the `...(x.updatedAt ? {`
    // conditional-spread shape the pre-fix ModJsonLd used).
    const expr = lines.slice(Math.max(0, i - 2), i + 2).join('\n');
    sites.push({ key: m[0], expr });
  });
  return sites;
}

describe('E143 scanner: no dateModified/lastmod fed by updatedAt in app/ or components/', () => {
  const files = ROOTS.flatMap((r) => walk(path.join(process.cwd(), r)));
  const all = files.flatMap((f) =>
    contentDateSites(stripComments(fs.readFileSync(f, 'utf8'))).map((s) => ({
      file: path.relative(process.cwd(), f),
      ...s,
    })),
  );

  it('finds the content-date sites it is meant to police (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(100);
    // ModJsonLd, layout.tsx and the five sitemap routes all set one.
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(all.some((s) => s.file === path.join('components', 'ModJsonLd.tsx'))).toBe(true);
  });

  it('no site mentions updatedAt in its feeding expression', () => {
    const offenders = all
      .filter((s) => /\bupdatedAt\b/.test(s.expr))
      .map((s) => `${s.file}: ${s.key}`);
    expect(offenders).toEqual([]);
  });

  it('the scanner flags the pre-fix ModJsonLd shape (seen red)', () => {
    const preFix = `
    ...(mod.updatedAt
      ? { dateModified: new Date(mod.updatedAt).toISOString().split('T')[0] }
      : {}),`;
    expect(contentDateSites(preFix).some((s) => /\bupdatedAt\b/.test(s.expr))).toBe(true);
    expect(
      contentDateSites('const lastmod = m.updatedAt.toISOString();').some((s) =>
        /\bupdatedAt\b/.test(s.expr),
      ),
    ).toBe(true);
  });
});

function fixture(over: Partial<Mod> = {}): Mod {
  return {
    id: 'mod-e143',
    title: 'Fixture Hair',
    description: 'A fixture.',
    shortDescription: 'A fixture.',
    category: 'Hair',
    gameVersion: 'Sims 4',
    isFree: true,
    price: null,
    thumbnail: null,
    images: [],
    createdAt: '2026-03-01T12:00:00.000Z',
    // Deliberately newer than every content date: a leak fails the asserts.
    updatedAt: '2026-09-29T00:00:00.000Z',
    publishedAt: null,
    lastScraped: null,
    ...over,
  } as unknown as Mod;
}

function softwareNode(mod: Mod): Record<string, unknown> {
  const html = renderToStaticMarkup(createElement(ModJsonLd, { mod }));
  const blocks = Array.from(
    html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ).map((m) => JSON.parse(m[1]));
  const node = blocks.find((b) => b['@type'] === 'SoftwareApplication');
  expect(node).toBeTruthy();
  return node;
}

describe('ModJsonLd dateModified (E143)', () => {
  it('is createdAt when never re-scraped, not updatedAt', () => {
    expect(softwareNode(fixture()).dateModified).toBe('2026-03-01');
  });

  it('is the re-scrape date when lastScraped is later than createdAt', () => {
    expect(softwareNode(fixture({ lastScraped: '2026-04-10T08:00:00.000Z' } as Partial<Mod>)).dateModified).toBe(
      '2026-04-10',
    );
  });

  it('never precedes datePublished', () => {
    const node = softwareNode(fixture({ publishedAt: '2026-05-05T00:00:00.000Z' } as Partial<Mod>));
    expect(node.datePublished).toBe('2026-05-05');
    expect(node.dateModified).toBe('2026-05-05');
  });

  it('is omitted, not thrown, when createdAt is unparseable', () => {
    const node = softwareNode(fixture({ createdAt: 'nope' } as Partial<Mod>));
    expect(node.dateModified).toBeUndefined();
    expect(node.name).toBe('Fixture Hair');
  });
});
