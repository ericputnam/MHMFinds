/**
 * Every Next.js top-level route must be listed in middleware.ts NEXTJS_PREFIXES
 * (Cass, 2026-09-14, E49).
 *
 * Why this exists: getWordPressUrl()'s catch-all proxies any dot-free first
 * path segment that is not in NEXTJS_PREFIXES to blog.musthavemods.com. A
 * missing entry passes `next build` and `tsc` — the visitor simply gets a
 * WordPress 404. It has now happened twice: `/play` (caught before merge,
 * PR #84) and the password-reset pair `/forgot-password/` + `/set-password/`
 * (shipped 09-12 in PR #85, found proxied in production on 09-14 — including
 * the reset link inside every password email).
 *
 * The existing guard (`play-page.test.ts`) hardcodes 'play'. This file tests
 * the class instead: it enumerates `app/` on disk, so the next new route
 * cannot ship proxied without turning this suite red.
 *
 * Offline, source-level: no middleware import, no network, no DB.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const APP_DIR = path.join(ROOT, 'app');
const middlewareSource = readFileSync(path.join(ROOT, 'middleware.ts'), 'utf8');

/** Parse the string literals out of `const NEXTJS_PREFIXES = new Set([...])`. */
export function parseNextjsPrefixes(source: string): Set<string> {
  const start = source.indexOf('const NEXTJS_PREFIXES');
  if (start === -1) throw new Error('NEXTJS_PREFIXES not found in middleware.ts');
  const end = source.indexOf(']);', start);
  if (end === -1) throw new Error('NEXTJS_PREFIXES literal is not closed with "]);"');
  // Drop comments inside the literal before matching, so a commented-out
  // entry does not count as present.
  const body = source
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const out = new Set<string>();
  for (const m of Array.from(body.matchAll(/['"]([^'"]+)['"]/g))) out.add(m[1]);
  return out;
}

const ROUTE_FILE = /^(page|route)\.(tsx?|jsx?|mdx?)$/;

/** True if `dir` (recursively) contains a page.* or route.* file. */
function containsRouteFile(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (containsRouteFile(path.join(dir, entry.name))) return true;
    } else if (ROUTE_FILE.test(entry.name)) {
      return true;
    }
  }
  return false;
}

/**
 * The first URL segment of every routable top-level directory under app/.
 *
 * Excluded, matching the middleware's own rules and Next.js conventions:
 *  - names containing '.' (robots.txt, sitemap*.xml, llms.txt): the catch-all
 *    already skips them via `!firstSegment.includes('.')`;
 *  - route groups `(group)` and private folders `_name`: they are not URL
 *    segments;
 *  - directories with no page/route file anywhere below them
 *    (app/components is a helper folder, not a route).
 */
export function routableTopLevelSegments(appDir: string): string[] {
  return readdirSync(appDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.includes('.'))
    .filter((name) => !name.startsWith('(') && !name.startsWith('_'))
    .filter((name) => containsRouteFile(path.join(appDir, name)))
    .sort();
}

describe('middleware.ts NEXTJS_PREFIXES covers every Next.js top-level route', () => {
  const prefixes = parseNextjsPrefixes(middlewareSource);
  const segments = routableTopLevelSegments(APP_DIR);

  it('the WordPress catch-all still gates on NEXTJS_PREFIXES and skips dotted segments', () => {
    expect(middlewareSource).toMatch(/!NEXTJS_PREFIXES\.has\(firstSegment\)/);
    expect(middlewareSource).toMatch(/!firstSegment\.includes\('\.'\)/);
  });

  it('enumerates a sane set of routes from app/ (sanity check on the scanner)', () => {
    expect(segments.length).toBeGreaterThanOrEqual(15);
    expect(segments).toContain('api');
    expect(segments).toContain('mods');
    expect(segments).toContain('play');
    expect(segments).not.toContain('components'); // helper folder, no page/route
    expect(segments.some((s) => s.includes('.'))).toBe(false);
  });

  it('every routable top-level directory under app/ is in NEXTJS_PREFIXES', () => {
    const missing = segments.filter((s) => !prefixes.has(s));
    expect(
      missing,
      `Routes that would be proxied to WordPress (add to NEXTJS_PREFIXES in middleware.ts): ${missing.join(', ')}`
    ).toEqual([]);
  });

  // The two instances that motivated the class test. Kept as explicit
  // assertions so a future refactor of the scanner cannot silently drop them.
  it.each(['forgot-password', 'set-password', 'play', 'feeds'])(
    "NEXTJS_PREFIXES contains '%s'",
    (segment) => {
      expect(prefixes.has(segment)).toBe(true);
      expect(existsSync(path.join(APP_DIR, segment))).toBe(true);
      expect(statSync(path.join(APP_DIR, segment)).isDirectory()).toBe(true);
    }
  );

  it('does not treat a commented-out entry as present', () => {
    const fake = `const NEXTJS_PREFIXES = new Set([\n  'api', // 'ghost',\n  /* 'phantom', */ 'mods',\n]);`;
    const parsed = parseNextjsPrefixes(fake);
    expect(parsed.has('api')).toBe(true);
    expect(parsed.has('mods')).toBe(true);
    expect(parsed.has('ghost')).toBe(false);
    expect(parsed.has('phantom')).toBe(false);
  });
});
