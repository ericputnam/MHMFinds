/**
 * Guard: `next build` must not depend on fonts.gstatic.com.
 *
 * `next/font/google` downloads font files during the build. Between 11-05 and
 * 11-09 2026 that fetch timed out (ETIMEDOUT, Onest) on 5 Vercel production
 * builds (#468, #473, #474, 6d06235 → incident 2026-11-08-191540, 7895670).
 * The launcher fonts are now self-hosted via `next/font/local`
 * (components/launcher/fonts.ts). This test fails if any source file imports
 * `next/font/google` again, and it checks that every local font path resolves to
 * a real woff2 file, so a missing file fails here rather than in the build.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'components', 'lib', 'pages', 'hooks', 'contexts', 'src'];
const EXT = /\.(tsx?|jsx?|mjs|cjs)$/;
const SKIP = new Set(['node_modules', '.next', '.git']);

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (EXT.test(ent.name)) out.push(p);
  }
}

/** Comments in this repo quote the banned pattern on purpose; strip them first. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const files: string[] = [];
for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);
for (const f of ['middleware.ts', 'next.config.js']) {
  if (fs.existsSync(path.join(ROOT, f))) files.push(path.join(ROOT, f));
}

describe('no build-time Google Fonts fetch', () => {
  it('scans a real source tree (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((f) => f.endsWith(path.join('components', 'launcher', 'fonts.ts')))).toBe(true);
  });

  it('no source file imports next/font/google', () => {
    const offenders = files
      .filter((f) => /['"]next\/font\/google['"]/.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('the comment stripper does not hide a real import', () => {
    const real = `import { Onest } from 'next/font/google';\n// see next/font/google`;
    expect(/['"]next\/font\/google['"]/.test(stripComments(real))).toBe(true);
    const commentOnly = `/* import { Onest } from 'next/font/google'; */\n// 'next/font/google'`;
    expect(/['"]next\/font\/google['"]/.test(stripComments(commentOnly))).toBe(false);
  });

  it('every next/font/local path in the launcher fonts resolves to a woff2 file', () => {
    const fontsTs = path.join(ROOT, 'components', 'launcher', 'fonts.ts');
    const src = stripComments(fs.readFileSync(fontsTs, 'utf8'));
    expect(src).toMatch(/from ['"]next\/font\/local['"]/);
    const paths: string[] = [];
    const re = /path:\s*['"]([^'"]+)['"]/g;
    for (let m = re.exec(src); m; m = re.exec(src)) paths.push(m[1]);
    expect(paths.length).toBe(5);
    for (const p of paths) {
      const abs = path.resolve(path.dirname(fontsTs), p);
      expect(fs.existsSync(abs), `${p} missing`).toBe(true);
      expect(fs.readFileSync(abs).subarray(0, 4).toString('latin1'), `${p} not woff2`).toBe('wOF2');
    }
  });

  it('keeps the three CSS variables launcher.css reads', () => {
    const src = fs.readFileSync(path.join(ROOT, 'components', 'launcher', 'fonts.ts'), 'utf8');
    for (const v of ['--lx-font-display', '--lx-font-hud', '--lx-font-body']) {
      expect(src).toContain(`variable: '${v}'`);
    }
  });
});
