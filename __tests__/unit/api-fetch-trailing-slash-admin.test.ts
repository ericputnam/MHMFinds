/**
 * Admin counterpart of api-fetch-trailing-slash.test.ts: `trailingSlash: true` applies
 * to /api/* too, so an admin page calling `/api/admin/x` paid a 308 on every request.
 * Walks app/admin and components/admin and fails on any fetch() literal whose path
 * does not end in a slash.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');

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

describe('admin client API calls end in a trailing slash', () => {
  let calls = 0;
  const offenders: string[] = [];
  for (const dir of ['app/admin', 'components/admin']) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, 'utf8');
      for (const m of Array.from(src.matchAll(CALL))) {
        calls++;
        if (!pathPart(m[2]).endsWith('/')) offenders.push(`${relative(ROOT, file)}: ${m[2]}`);
      }
    }
  }

  it('vacuity guard: the scan found the admin callers', () => {
    expect(calls).toBeGreaterThanOrEqual(40);
  });

  it('no fetch() to /api/* lacks the trailing slash', () => {
    expect(offenders).toEqual([]);
  });
});
