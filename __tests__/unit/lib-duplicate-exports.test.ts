/**
 * No file under lib/ may export the same name twice.
 *
 * Why: on 2026-09-24 PR #167 (IndexNow --creators, E95) and PR #168
 * (/creator/ hub, E97) each added `export async function listCreators` and
 * `export interface CreatorListRow` to lib/creators.ts. Both branches built
 * green on their own base, the merge gate only checks commit age, and the
 * squash of #168 auto-merged both blocks without a textual conflict — so
 * `main` failed `next build` ("`listCreators` redefined here") while every
 * per-PR check was green. Vercel refused the deploy; production was never
 * touched, but nothing could ship until it was fixed forward.
 *
 * This scanner walks the filesystem (no hand-kept list) and fails on any
 * repeated top-level export name within one file. Against 9a16c30 it fails
 * on lib/creators.ts (CreatorListRow, listCreators); on every earlier main it
 * passes, so it is not decoration.
 *
 * Function overloads (`export function f(a: string): …; export function
 * f(a: number): …;`) would be a legitimate repeat; none exist under lib/
 * today (the scan reports none), so they are counted as duplicates on
 * purpose — add an explicit allowlist entry here if one is ever needed.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const LIB = path.join(ROOT, 'lib');

// Floors from the 2026-09-24 scan (85 files, 466 exports): the test must
// never pass by finding nothing.
const MIN_FILES = 40;
const MIN_EXPORTS = 200;

const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('lib/ exports are declared once per file', () => {
  const files = walk(LIB);
  let exportsSeen = 0;
  const duplicates: string[] = [];

  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf-8'));
    const counts = new Map<string, number>();
    for (const m of Array.from(src.matchAll(EXPORT_RE))) {
      exportsSeen += 1;
      counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    for (const [name, n] of Array.from(counts.entries())) {
      if (n > 1) duplicates.push(`${path.relative(ROOT, file)}: ${name} ×${n}`);
    }
  }

  it('scanned a real population (vacuity guard)', () => {
    expect(files.length).toBeGreaterThanOrEqual(MIN_FILES);
    expect(exportsSeen).toBeGreaterThanOrEqual(MIN_EXPORTS);
  });

  it('has no file that exports the same name twice', () => {
    expect(duplicates).toEqual([]);
  });
});
