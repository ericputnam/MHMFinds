/**
 * Every Next.js app route must bucket as an app page, never as 'blog'
 * (Nova, 2026-09-29, E137-b).
 *
 * Why this exists: `bucketFor` in scripts/agents/page-rpm-lib.ts mirrors the
 * middleware catch-all — any dot-free first segment it does not know is
 * counted as a WordPress article. `/creator/*` (534 public creator pages,
 * E85) shipped 09-23 into NEXTJS_PREFIXES but not into OTHER_APP_PREFIXES,
 * so every creator-page pageview was being added to the blog RPM bucket.
 *
 * Class test, not an instance test: it reads NEXTJS_PREFIXES out of
 * middleware.ts *and* enumerates app/ on disk, so the next new route cannot
 * silently land in the blog bucket either. Offline, source-level.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { bucketFor } from '../../scripts/agents/page-rpm-lib';

const ROOT = path.resolve(__dirname, '../..');
const APP_DIR = path.join(ROOT, 'app');

function parseNextjsPrefixes(source: string): string[] {
  const start = source.indexOf('const NEXTJS_PREFIXES');
  if (start === -1) throw new Error('NEXTJS_PREFIXES not found in middleware.ts');
  const end = source.indexOf(']);', start);
  const body = source
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  return Array.from(body.matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1]);
}

const ROUTE_FILE = /^(page|route)\.(tsx?|jsx?|mdx?)$/;
function containsRouteFile(dir: string): boolean {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() ? containsRouteFile(path.join(dir, e.name)) : ROUTE_FILE.test(e.name)) {
      return true;
    }
  }
  return false;
}

function appSegments(): string[] {
  return readdirSync(APP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => !n.includes('.') && !n.startsWith('(') && !n.startsWith('_'))
    .filter((n) => containsRouteFile(path.join(APP_DIR, n)));
}

describe('bucketFor never counts a Next.js app route as a blog article', () => {
  const prefixes = parseNextjsPrefixes(readFileSync(path.join(ROOT, 'middleware.ts'), 'utf8'));
  const segments = Array.from(new Set([...prefixes, ...appSegments()])).sort();

  it('found a non-trivial population (vacuity guard)', () => {
    expect(prefixes.length).toBeGreaterThan(20);
    expect(segments.length).toBeGreaterThan(20);
    expect(segments).toContain('creator');
  });

  it.each(segments)('/%s/… is not bucketed as blog', (seg) => {
    expect(bucketFor(`/${seg}/some-slug/`)).not.toBe('blog');
  });

  it('buckets public creator pages and the hub as other', () => {
    expect(bucketFor('/creator/')).toBe('other');
    expect(bucketFor('/creator/seoulsoul-sims/')).toBe('other');
  });
});
