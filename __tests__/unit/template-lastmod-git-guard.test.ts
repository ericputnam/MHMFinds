/**
 * Template <lastmod> constants vs git (E303, Sage, 2026-10-31).
 *
 * /sitemap-nextjs.xml and /sitemap-creators.xml stamp each URL with the later
 * of a hand-pinned template date and the page's newest data. The pinned date
 * only moves when someone remembers: after E267 + E292 rewrote every creator
 * page, 169 of 554 creator entries still said January (E299), and the day
 * after E299 pinned the creator date, the collection template changed again
 * (E298 og:image) with COLLECTION_TEMPLATE_LASTMOD still on 2026-07-03.
 *
 * This guard asks git instead of memory: for each constant in
 * TEMPLATE_LASTMOD_SOURCES, the newest commit date touching its source paths
 * must be <= the constant. It reads the real constants (never a copy) and
 * fails — not skips — when a listed path no longer exists, because a renamed
 * template is exactly the drift it exists to catch.
 *
 * "Could not run" is not "broken": no git binary, not a git checkout, or a
 * shallow clone → the suite skips with the reason printed, never a verdict.
 */
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// lib/sitemapLastmod.ts imports the Prisma client for its DB-backed helpers;
// this guard only reads constants, so keep the DB out of the test.
vi.mock('@/lib/prisma', () => ({ prisma: {}, default: {} }));

import { TEMPLATE_LASTMOD_SOURCES } from '@/lib/sitemapLastmod';

const ROOT = process.cwd();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** null = git cannot answer here (skip); otherwise the YYYY-MM-DD of the newest commit touching `paths`. */
function newestCommitDate(paths: readonly string[]): string | null {
  const out = git(['log', '-1', '--format=%cs', '--', ...paths]);
  if (out === null) return null;
  return out;
}

const inRepo = git(['rev-parse', '--is-inside-work-tree']) === 'true';
const shallow = git(['rev-parse', '--is-shallow-repository']) === 'true';
const canRun = inRepo && !shallow;
if (!canRun) {
  // eslint-disable-next-line no-console
  console.warn(`[template-lastmod-git-guard] skipped: ${inRepo ? 'shallow clone' : 'git unavailable or not a checkout'}`);
}

describe('template lastmod constants are not older than their template sources (E303)', () => {
  it('names at least the three sitemap template constants', () => {
    const names = TEMPLATE_LASTMOD_SOURCES.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['APP_LASTMOD', 'COLLECTION_TEMPLATE_LASTMOD', 'CREATOR_TEMPLATE_LASTMOD']),
    );
    for (const s of TEMPLATE_LASTMOD_SOURCES) {
      expect(s.lastmod, s.name).toMatch(DATE_RE);
      expect(s.paths.length, s.name).toBeGreaterThan(0);
    }
  });

  it('every listed source path exists (a renamed template fails, never skips)', () => {
    for (const s of TEMPLATE_LASTMOD_SOURCES) {
      for (const p of s.paths) {
        expect(existsSync(join(ROOT, p)), `${s.name}: ${p}`).toBe(true);
      }
    }
  });

  for (const s of TEMPLATE_LASTMOD_SOURCES) {
    it.skipIf(!canRun)(`${s.name} (${s.lastmod}) >= newest commit touching its sources`, () => {
      const newest = newestCommitDate(s.paths);
      // An empty answer here means git found no commit for these paths —
      // with the existence check above that is a real error, not a skip.
      expect(newest, `${s.name}: git log returned nothing for ${s.paths.join(', ')}`).toMatch(DATE_RE);
      expect(
        s.lastmod >= (newest as string),
        `${s.name} = ${s.lastmod} but ${s.paths.join(', ')} last changed ${newest}; bump the constant in lib/sitemapLastmod.ts`,
      ).toBe(true);
    });
  }
});
