import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * E336 (Pip, 2026-11-05): every site-relative image the source names must
 * exist under public/.
 *
 * app/layout.tsx pointed og:image and twitter:image at `/og-image.jpg` since
 * launch, and the file was never committed: https://musthavemods.com/og-image.jpg
 * returned 404 on 2026-11-05. Every page that inherits the root image (the
 * homepage, /about/, /submit-mod/, /top-creators/, /go/*) and every page whose
 * twitter:image falls back to it (/play/, /games/<game>/) unfurled in Discord,
 * iMessage, X, Facebook and Bluesky with a broken picture. The same scan found
 * the Organization JSON-LD logo (`/logo.png`, 404) and the ModJsonLd fallback
 * image (`/og-image.png`, 404). `next build` is silent about all three.
 *
 * The scanner walks app/, components/ and lib/ (comments stripped — they
 * quote paths on purpose), so a new reference is checked the day it lands.
 * Red on the pre-fix tree: 3 of 4 cases; 5 missing refs (/og-image.jpg ×2
 * in app/layout.tsx, /logo.png ×2 in the Organization JSON-LD,
 * /og-image.png ×1 in components/ModJsonLd.tsx).
 */
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'public');
const SCAN_DIRS = ['app', 'components', 'lib'];

const REF_RE =
  /['"`](?:https:\/\/musthavemods\.com)?(\/[A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:jpe?g|png|webp|svg|gif|ico))['"`]/g;

function stripComments(src: string): string {
  // Line comments first: `// /games/* hubs` would otherwise open a block
  // comment that swallows code up to the next `*/`.
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(p);
  }
  return out;
}

type Ref = { file: string; ref: string };

function collectRefs(): Ref[] {
  const refs: Ref[] = [];
  for (const d of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, d))) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const re = new RegExp(REF_RE.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const ref = m[1];
        if (ref.startsWith('/wp-content/') || ref.startsWith('//')) continue; // WordPress-served, not public/
        refs.push({ file: path.relative(ROOT, file), ref });
      }
    }
  }
  return refs;
}

describe('site-relative images named in source exist in public/ (E336)', () => {
  const refs = collectRefs();

  it('finds the known references (vacuity guard)', () => {
    expect(refs.length).toBeGreaterThanOrEqual(8);
    expect(refs.some((r) => r.file === 'app/layout.tsx' && r.ref === '/og-image.jpg')).toBe(true);
  });

  it('every referenced image is a file in public/', () => {
    const missing = refs.filter((r) => !fs.existsSync(path.join(PUBLIC, r.ref)));
    expect(missing).toEqual([]);
  });

  it('public/og-image.jpg is a real 1200x630 JPEG', () => {
    const buf = fs.readFileSync(path.join(PUBLIC, 'og-image.jpg'));
    expect(buf.length).toBeGreaterThan(10_000);
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    // Find the SOF0/SOF2 marker and read height/width.
    let i = 2;
    let dims: { w: number; h: number } | null = null;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        dims = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        break;
      }
      i += 2 + len;
    }
    expect(dims).toEqual({ w: 1200, h: 630 });
  });

  it('root metadata still names the committed share image', () => {
    const layout = stripComments(fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8'));
    expect(layout).toContain("url: '/og-image.jpg'");
    expect(layout).toContain("images: ['/og-image.jpg']");
    expect(layout).not.toContain('logo.png');
  });
});
