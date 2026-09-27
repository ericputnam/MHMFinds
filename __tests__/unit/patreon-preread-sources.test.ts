/**
 * E125 (Rio, 2026-09-27): the Q4 / rename-watch pre-read keeps the reachable
 * half when one source is degraded.
 *
 * On 09-26 three runs of `patreon-q4-gate-preread.ts` produced zero gate
 * numbers because `Promise.all` threw away the Members API result the moment
 * the production DB timed out (and vice versa). The E108 read on 10-02 / 10-09
 * needs the Members API leg (joins, cancels) even on a morning the DB is slow.
 *
 * Two layers, both pure / source-level — no network, no DB, no token:
 *   1. `gradeSources()` in patreon-members-lib.ts: which mode / exit code a
 *      pair of source outcomes produces (0 full · 2 partial · 1 none).
 *   2. Guards on the script's source: allSettled not all, a bounded deadline
 *      with ≤ 2 attempts inside `fetchMembers`, a truncated page walk is
 *      `unknown`, a partial report never overwrites the full one.
 *
 * Seen red against the pre-fix tree (26b2e89): cases 1–4 (gradeSources is not
 * exported → TypeError), 5 (Promise.all present), 6 (no deadline), 7 (page cap
 * silently truncates), 8 (no exit 2 / -partial suffix).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as lib from '../../scripts/agents/patreon-members-lib';

const root = join(__dirname, '..', '..');
const rawSrc = readFileSync(join(root, 'scripts', 'agents', 'patreon-q4-gate-preread.ts'), 'utf8');

/** Comments in this repo quote the patterns they warn about — strip them before asserting on code. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
const src = stripComments(rawSrc);

describe('gradeSources (E125): one degraded source is a partial report with exit 2, never a verdict', () => {
  const ok = { ok: true } as const;
  const down = { ok: false, error: 'redacted' } as const;

  it('1. both sources reachable → full report, exit 0, plain filename', () => {
    expect(lib.gradeSources(ok, ok)).toEqual({ mode: 'full', exitCode: 0, outSuffix: '' });
  });

  it('2. Members API ok, production DB down → members-only, exit 2, -partial filename', () => {
    expect(lib.gradeSources(ok, down)).toEqual({ mode: 'members-only', exitCode: 2, outSuffix: '-partial' });
  });

  it('3. Members API down, production DB ok → linked-only, exit 2, -partial filename', () => {
    expect(lib.gradeSources(down, ok)).toEqual({ mode: 'linked-only', exitCode: 2, outSuffix: '-partial' });
  });

  it('4. both down → none, exit 1 (nothing to write)', () => {
    const g = lib.gradeSources(down, down);
    expect(g.mode).toBe('none');
    expect(g.exitCode).toBe(1);
  });
});

describe('patreon-q4-gate-preread.ts source guards (E125)', () => {
  it('5. settles both sources independently: Promise.allSettled, never Promise.all', () => {
    expect(src).toMatch(/Promise\.allSettled\(\s*\[\s*fetchMembers\(\)\s*,\s*fetchLinked\(\)\s*\]\s*\)/);
    expect(src).not.toMatch(/Promise\.all\(/);
    expect(src).toMatch(/gradeSources\(/);
  });

  it('6. the Members API walk has a deadline and at most 2 attempts, ≤ 120 s of wall clock in total', () => {
    const ms = src.match(/PREREAD_DEADLINE_MS\s*=\s*([\d_]+)/);
    const attempts = src.match(/PREREAD_ATTEMPTS\s*=\s*(\d+)/);
    expect(ms, 'PREREAD_DEADLINE_MS constant').toBeTruthy();
    expect(attempts, 'PREREAD_ATTEMPTS constant').toBeTruthy();
    const deadline = Number(ms![1].replace(/_/g, ''));
    const n = Number(attempts![1]);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(2);
    expect(deadline * n).toBeLessThanOrEqual(120_000);
    // the deadline wraps the page walk itself, inside fetchMembers, not the caller
    expect(src).toMatch(/async function fetchMembers\(\)[\s\S]*?withDeadline\(fetchMembersOnce\(\), PREREAD_DEADLINE_MS/);
    // the DB leg is bounded the same way
    expect(src).toMatch(/withDeadline\([\s\S]*?PREREAD_DEADLINE_MS[\s\S]*?production DB/);
  });

  it('7. a page walk that hits the cap with links.next unexhausted is unknown, never a member count', () => {
    expect(src).toMatch(/MEMBERS_PAGE_CAP/);
    expect(src).toMatch(/if \(url\) throw new Error\([^)]*truncated/);
  });

  it('8. a partial read exits 2 through the grade, writes to a -partial file and prints the missing leg as unknown', () => {
    expect(src).toMatch(/process\.exit\(grade\.exitCode\)/);
    expect(src).toMatch(/grade\.outSuffix/);
    expect(src).toMatch(/\*\*UNKNOWN\*\*/);
    // the vacuity guard survives the refactor and is graded as a failed source, not a crash
    expect(src).toMatch(/returned 0 rows — refusing to write/);
  });

  it('still never interpolates an email, a Patreon id or a raw row, and redacts every source error', () => {
    expect(src).not.toMatch(/\$\{[^}]*\bemail\b[^}]*\}/i);
    expect(src).not.toMatch(/\$\{[^}]*providerAccountId[^}]*\}/);
    expect(src).not.toMatch(/\$\{[^}]*patreonUserId[^}]*\}/);
    expect(src).not.toMatch(/JSON\.stringify\((members|linked|rows)\b/);
    expect(src).toMatch(/redactError\(String\(\(r\.reason as Error\)\?\.message/);
  });
});
