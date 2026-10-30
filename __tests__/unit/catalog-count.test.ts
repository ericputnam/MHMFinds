import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CATALOG_FINDS } from '@/lib/seo/catalogCount';

/**
 * The catalogue size ("17,000+") lives in one constant, lib/seo/catalogCount.ts.
 * On 2026-10-26 the homepage served three different numbers at once: the
 * <title> said 17,000+ (hard-coded), the hero said 15,000+ in the SSR HTML and
 * 16,000+ after its client-side count resolved. This scans the source tree for
 * any other "NN,000+" literal so the next bump cannot miss a copy.
 */
const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['app', 'components', 'lib'];
const HOME = path.join(ROOT, 'lib/seo/catalogCount.ts');
const COUNT_LITERAL = /\b\d{1,3},000\+/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Comments here quote the old numbers on purpose (E259's history); only code counts.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\w\\])\/\/.*$/gm, '$1');
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

describe('catalogue count has one source', () => {
  it('scans a real tree (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(HOME);
  });

  it('the constant is a "NN,000+" label', () => {
    expect(CATALOG_FINDS).toMatch(/^\d{1,3},000\+$/);
  });

  it('no other source file hard-codes a "NN,000+" count', () => {
    const offenders = files
      .filter((f) => f !== HOME)
      .flatMap((f) =>
        (stripComments(fs.readFileSync(f, 'utf8')).match(COUNT_LITERAL) ?? []).map(
          (m) => `${path.relative(ROOT, f)}: ${m}`,
        ),
      );
    expect(offenders).toEqual([]);
  });

  it('every surface that states the count reads the constant', () => {
    const readers = [
      'app/layout.tsx',
      'app/llms.txt/route.ts',
      'app/llms-full.txt/route.ts',
      'components/HomeJsonLd.tsx',
      'components/launcher/LauncherHero.tsx',
    ];
    for (const r of readers) {
      const src = stripComments(fs.readFileSync(path.join(ROOT, r), 'utf8'));
      expect(src, r).toMatch(/import \{ CATALOG_FINDS \} from '@\/lib\/seo\/catalogCount'/);
      expect(src, r).toMatch(/\$\{CATALOG_FINDS\}|\{CATALOG_FINDS\}/);
    }
  });

  it('the hero no longer derives its number from a live count', () => {
    const hero = stripComments(fs.readFileSync(path.join(ROOT, 'components/launcher/LauncherHero.tsx'), 'utf8'));
    expect(hero).not.toMatch(/total/);
  });
});
