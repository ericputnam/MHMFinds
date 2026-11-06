/**
 * E352 (Pip, 2026-11-06) — share links for mod and collection pages.
 *
 * 1. buildShareUrl: apex host, trailing slash, `?via=share`, no stray query.
 * 2. Placement guard: every <ShareButton> in app/ and components/ sits
 *    outside every `.mv-ads` element and outside <aside>. It walks the real
 *    TSX AST (comments in these files quote the forbidden patterns on purpose,
 *    so a text search would match the documentation, not the code), and has a
 *    vacuity guard so it cannot pass by finding nothing.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  SHARE_PARAM,
  SHARE_VALUE,
  SITE_ORIGIN,
  buildShareUrl,
  isShareLanding,
} from '../../lib/share/pageShare';
import { collectionHref, getAllCollectionRoutes } from '../../lib/collections';

const ROOT = path.resolve(__dirname, '../..');

describe('buildShareUrl', () => {
  it('stamps the apex host, a trailing slash and via=share', () => {
    expect(buildShareUrl('/mods/abc123/')).toBe(`${SITE_ORIGIN}/mods/abc123/?${SHARE_PARAM}=${SHARE_VALUE}`);
    expect(buildShareUrl('/mods/abc123')).toBe(`${SITE_ORIGIN}/mods/abc123/?via=share`);
  });

  it('never keeps a foreign host, an existing query or a hash', () => {
    expect(buildShareUrl('https://blog.musthavemods.com/games/sims-4/hair-cc/?utm_source=x#grid')).toBe(
      `${SITE_ORIGIN}/games/sims-4/hair-cc/?via=share`,
    );
    expect(buildShareUrl('https://musthavemods.com.evil.example/x')).toBe(`${SITE_ORIGIN}/x/?via=share`);
  });

  it('builds a valid share URL for every registry collection', () => {
    const all = getAllCollectionRoutes().map((r) => ({ gameSlug: r.gameSlug, slug: r.topicSlug }));
    expect(all.length).toBeGreaterThan(10);
    for (const c of all) {
      const url = new URL(buildShareUrl(collectionHref(c)));
      expect(url.host).toBe('musthavemods.com');
      expect(url.pathname).toBe(collectionHref(c));
      expect(isShareLanding(url.toString())).toBe(true);
    }
  });

  it('isShareLanding reads a GA4 landingPagePlusQueryString value', () => {
    expect(isShareLanding('/mods/abc/?via=share')).toBe(true);
    expect(isShareLanding('/mods/abc/?ref=share')).toBe(false);
    expect(isShareLanding('/mods/abc/')).toBe(false);
  });
});

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsx(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function tagName(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  return node.tagName.getText();
}

function classNameText(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  for (const prop of node.attributes.properties) {
    if (ts.isJsxAttribute(prop) && prop.name.getText() === 'className' && prop.initializer) {
      return prop.initializer.getText();
    }
  }
  return '';
}

interface Usage {
  file: string;
  line: number;
  violations: string[];
}

function shareButtonUsages(file: string): Usage[] {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('ShareButton')) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const usages: Usage[] = [];

  const visit = (node: ts.Node) => {
    const isUse =
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && tagName(node) === 'ShareButton';
    if (isUse) {
      const violations: string[] = [];
      for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
        if (ts.isJsxElement(p) && p.openingElement !== node) {
          const open = p.openingElement;
          if (/\bmv-ads\b/.test(classNameText(open))) violations.push('inside .mv-ads');
          if (tagName(open) === 'aside') violations.push('inside <aside>');
        }
      }
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
      usages.push({ file: path.relative(ROOT, file), line: line + 1, violations });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return usages;
}

describe('ShareButton placement (Mediavine non-ad zones only)', () => {
  const files = [...walkTsx(path.join(ROOT, 'app')), ...walkTsx(path.join(ROOT, 'components'))];
  const usages = files.flatMap(shareButtonUsages);

  it('finds the treated templates (vacuity guard)', () => {
    const where = usages.map((u) => u.file);
    expect(where).toContain(path.join('app', 'mods', '[id]', 'ModDetailClient.tsx'));
    expect(where).toContain(path.join('app', 'games', '[game]', '[topic]', 'CollectionPageClient.tsx'));
    expect(usages.length).toBeGreaterThanOrEqual(2);
  });

  it('never renders inside .mv-ads or an <aside>', () => {
    const bad = usages.filter((u) => u.violations.length > 0);
    expect(bad).toEqual([]);
  });

  it('the guard itself catches a ShareButton inside .mv-ads', () => {
    const tmp = path.join(ROOT, 'node_modules', '.cache', 'share-guard-fixture.tsx');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(
      tmp,
      `export const X = () => (<div className="mv-ads space-y-6"><ShareButton path="/" title="t" contentType="mod" itemId="i" /></div>);\n` +
        `export const Y = () => (<aside id="secondary"><div><ShareButton path="/" title="t" contentType="mod" itemId="i" /></div></aside>);\n`,
    );
    try {
      const found = shareButtonUsages(tmp);
      expect(found).toHaveLength(2);
      expect(found[0].violations).toContain('inside .mv-ads');
      expect(found[1].violations).toContain('inside <aside>');
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });
});
