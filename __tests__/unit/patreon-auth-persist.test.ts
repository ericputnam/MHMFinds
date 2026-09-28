/**
 * E131 (Rio, 2026-09-28): a Patreon token refresh from an agent worktree must
 * never strand the operator's single-use refresh token, and every Members API
 * page walk must be bounded.
 *
 * Why: `scripts/_patreon-auth.ts` rotated the creator token pair on a 401 and
 * wrote the new pair to `.env.local` in the *cwd*. The runner copies the
 * operator's `.env.local` into every throwaway worktree, so a refresh from a
 * worktree consumed the refresh token, saved the new pair only in the copy
 * that is deleted at the end of the run, and left the operator's file holding
 * a dead refresh token — every later run would then 401 with no way back but
 * the portal. Tokens were issued 2026-09-07 with a ~1-month lifetime.
 *
 * Two layers, both pure / source-level — no network, no file writes, no token:
 *   1. `resolveTokenFile()` (pure): where a rotated pair is written, given what
 *      the caller saw on disk. Env override → main checkout → linked worktree's
 *      main checkout → null (refuse).
 *   2. Guards on the two sources: the refresh refuses before it touches the
 *      token endpoint when there is nowhere to persist; a newer pair already on
 *      disk is adopted before a refresh is attempted; `patreonGet` forwards an
 *      AbortSignal; the scoreboard's walk uses one per page, has a wall-clock
 *      budget, and treats a capped walk as unknown.
 *
 * Seen red against the pre-fix tree (e765da5): cases 1–5 (`resolveTokenFile`
 * not exported → TypeError), 6 (warns "NOT persisted" and continues), 7 (no
 * adopt step), 8 (no `init` parameter), 9 (unbounded walk, silent cap).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as auth from '../../scripts/_patreon-auth';

const root = join(__dirname, '..', '..');
const authRaw = readFileSync(join(root, 'scripts', '_patreon-auth.ts'), 'utf8');
const scoreboardRaw = readFileSync(join(root, 'scripts', 'agents', 'funnel-scoreboard.ts'), 'utf8');

/** Comments in this repo quote the patterns they warn about — strip them before asserting on code. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
const authSrc = stripComments(authRaw);
const scoreboardSrc = stripComments(scoreboardRaw);

// Fixture paths only — nothing here exists or is read.
const OPERATOR = '/fixture/operator/MHMFinds';
const WORKTREE = '/fixture/worktrees/funnel-2026-09-28-rio';

describe('resolveTokenFile (E131): a rotated pair is written where the next run will read it, or not at all', () => {
  it('1. PATREON_ENV_FILE wins over everything and is resolved against cwd', () => {
    expect(auth.resolveTokenFile({ cwd: WORKTREE, envFile: '/fixture/elsewhere/.env.local', dotGit: { kind: 'dir' } })).toBe(
      '/fixture/elsewhere/.env.local',
    );
    expect(auth.resolveTokenFile({ cwd: OPERATOR, envFile: 'secrets/.env.local', dotGit: null })).toBe(`${OPERATOR}/secrets/.env.local`);
    // blank is "unset", never a relative path to nowhere
    expect(auth.resolveTokenFile({ cwd: WORKTREE, envFile: '   ', dotGit: null })).toBeNull();
  });

  it('2. cwd is the main checkout (`.git` is a directory) → its own .env.local', () => {
    expect(auth.resolveTokenFile({ cwd: OPERATOR, dotGit: { kind: 'dir' } })).toBe(`${OPERATOR}/.env.local`);
  });

  it('3. cwd is a linked worktree (`.git` is a gitdir file) → the MAIN checkout’s .env.local, never the worktree copy', () => {
    const dotGit = { kind: 'file' as const, content: `gitdir: ${OPERATOR}/.git/worktrees/funnel-2026-09-28-rio\n` };
    const out = auth.resolveTokenFile({ cwd: WORKTREE, dotGit });
    expect(out).toBe(`${OPERATOR}/.env.local`);
    expect(out).not.toContain(WORKTREE);
  });

  it('4. a gitdir file that is not a linked-worktree pointer is not guessed at → null', () => {
    expect(auth.resolveTokenFile({ cwd: WORKTREE, dotGit: { kind: 'file', content: 'gitdir: /fixture/somewhere/.git\n' } })).toBeNull();
    expect(auth.resolveTokenFile({ cwd: WORKTREE, dotGit: { kind: 'file', content: 'not a gitdir line' } })).toBeNull();
    expect(auth.resolveTokenFile({ cwd: WORKTREE, dotGit: { kind: 'file', content: '' } })).toBeNull();
  });

  it('5. not a git checkout at all and no override → null (the caller must refuse to refresh)', () => {
    expect(auth.resolveTokenFile({ cwd: '/fixture/ci', dotGit: null })).toBeNull();
    expect(auth.resolveTokenFile({ cwd: '/fixture/ci', envFile: undefined, dotGit: null })).toBeNull();
  });
});

describe('_patreon-auth.ts source guards (E131)', () => {
  it('6. the refresh refuses BEFORE calling the token endpoint when there is nowhere to persist — no "not persisted" warning path survives', () => {
    const refresh = authSrc.match(/export async function refreshPatreonTokens\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(refresh, 'refreshPatreonTokens body').not.toBe('');
    const refuse = refresh.indexOf('refusing to refresh');
    const call = refresh.indexOf('fetch(TOKEN_URL');
    expect(refuse, 'a refusal branch exists').toBeGreaterThan(-1);
    expect(call, 'the token endpoint is called').toBeGreaterThan(-1);
    expect(refuse).toBeLessThan(call);
    expect(refresh).toMatch(/tokenFilePath\(\)/);
    expect(authSrc).not.toMatch(/NOT persisted/);
  });

  it('7. a 401 first adopts a newer pair already on disk (another worktree rotated it) and only then refreshes', () => {
    const get = authSrc.match(/export async function patreonGet\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(get, 'patreonGet body').not.toBe('');
    const adopt = get.indexOf('adoptRotatedTokens(');
    const refresh = get.indexOf('refreshPatreonTokens(');
    expect(adopt).toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(-1);
    expect(adopt).toBeLessThan(refresh);
  });

  it('8. patreonGet accepts an optional init and forwards its signal to every attempt', () => {
    expect(authSrc).toMatch(/export async function patreonGet\(url: string, init\?: PatreonGetInit\)/);
    expect(authSrc).toMatch(/signal: init\?\.signal/);
  });

  it('never interpolates a token value into a log line or an error', () => {
    expect(authSrc).not.toMatch(/\$\{[^}]*(access_token|refresh_token|accessToken|refreshToken)[^}]*\}/);
    expect(authSrc).not.toMatch(/console\.(log|error)\([^)]*(json\.|tokens\.|process\.env\.PATREON_CREATOR)/);
  });
});

describe('funnel-scoreboard.ts pullPatreonApi is bounded (E131)', () => {
  const fn = scoreboardSrc.match(/async function pullPatreonApi\(\)[\s\S]*?\n\}/)?.[0] ?? '';

  it('9. every page has an AbortSignal.timeout, the walk has a wall-clock budget, and a capped walk is unknown', () => {
    expect(fn, 'pullPatreonApi body').not.toBe('');
    expect(fn).toMatch(/patreonGet\(url, \{ signal: AbortSignal\.timeout\(/);
    const page = fn.match(/PATREON_PAGE_TIMEOUT_MS\s*=\s*([\d_]+)/);
    const walk = fn.match(/PATREON_WALK_BUDGET_MS\s*=\s*([\d_]+)/);
    expect(page, 'PATREON_PAGE_TIMEOUT_MS').toBeTruthy();
    expect(walk, 'PATREON_WALK_BUDGET_MS').toBeTruthy();
    const pageMs = Number(page![1].replace(/_/g, ''));
    const walkMs = Number(walk![1].replace(/_/g, ''));
    expect(pageMs).toBeGreaterThanOrEqual(5_000);
    expect(pageMs).toBeLessThanOrEqual(walkMs);
    // the whole walk finishes inside the runner's patience for one scoreboard section
    expect(walkMs).toBeLessThanOrEqual(300_000);
    expect(fn).toMatch(/exceeded the \$\{PATREON_WALK_BUDGET_MS\} ms budget/);
    expect(fn).toMatch(/if \(url\) throw new Error\([^)]*truncated/);
    expect(fn).not.toMatch(/pages < 50\)/);
  });
});
