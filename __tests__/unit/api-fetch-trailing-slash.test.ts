/**
 * `trailingSlash: true` applies to /api/* too: a client call to `/api/x` gets a 308
 * to `/api/x/` and pays a second round trip on every request (CLAUDE.md, "Standing
 * rules"). On 2026-11-11, 84 of 89 client calls were missing the slash.
 *
 * This walks the public client code (admin pages are covered by their own file) and
 * fails on any fetch()/sendBeacon() literal whose path does not end in a slash.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');
const isAdmin = (f: string) => f.startsWith('app/admin/') || f.startsWith('components/admin/');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && name !== 'route.ts') out.push(full);
  }
  return out;
}

const CALL = /(?:fetch|sendBeacon)\(\s*([`'"])(\/api\/[^`'"]*)\1/g;

/** The path part of a call literal: everything before `?` or a trailing query-string variable. */
function pathPart(url: string): string {
  const q = url.indexOf('?');
  if (q !== -1) return url.slice(0, q);
  return url.replace(/\$\{(qs|params)\}$/, '');
}

export function scan(isIncluded: (rel: string) => boolean): { calls: number; offenders: string[] } {
  let calls = 0;
  const offenders: string[] = [];
  for (const dir of ['app', 'components', 'lib']) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      if (!isIncluded(rel)) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of Array.from(src.matchAll(CALL))) {
        calls++;
        if (!pathPart(m[2]).endsWith('/')) offenders.push(`${rel}: ${m[2]}`);
      }
    }
  }
  return { calls, offenders };
}

describe('public client API calls end in a trailing slash', () => {
  const { calls, offenders } = scan((rel) => !isAdmin(rel));

  it('vacuity guard: the scan found the public callers', () => {
    expect(calls).toBeGreaterThanOrEqual(25);
  });

  it('no fetch()/sendBeacon() to /api/* lacks the trailing slash', () => {
    expect(offenders).toEqual([]);
  });
});
