/**
 * Patreon creator-token helper for standalone scripts.
 *
 * The portal at https://www.patreon.com/portal/registration/register-clients
 * issues a Creator's Access Token that expires after ~1 month, plus a refresh
 * token. This module refreshes the pair on demand and persists the rotated
 * tokens back to the operator's `.env.local` (the only place they live —
 * nothing on Vercel reads them, and a refresh invalidates the previous refresh
 * token, so a second copy anywhere else would silently go stale).
 *
 * Where the rotated pair is written (E131, 2026-09-28) — `resolveTokenFile()`:
 *   1. `PATREON_ENV_FILE` (absolute path, or relative to cwd) if set;
 *   2. `<cwd>/.env.local` when cwd is the main checkout (`.git` is a directory);
 *   3. `<main checkout>/.env.local` when cwd is a linked `git worktree`
 *      (`.git` is a file: `gitdir: <main>/.git/worktrees/<name>`). The funnel
 *      runner copies the operator's `.env.local` into every throwaway worktree,
 *      so before this a 401-triggered refresh from a worktree consumed the
 *      single-use refresh token, saved the new pair only in the copy that is
 *      deleted at the end of the run, and left the operator's file holding a
 *      dead refresh token;
 *   4. otherwise the refresh is REFUSED before the token endpoint is called —
 *      a refresh that cannot be persisted burns the refresh token for nothing.
 *
 * Required in .env.local: PATREON_CLIENT_ID, PATREON_CLIENT_SECRET,
 * PATREON_CREATOR_ACCESS_TOKEN, PATREON_CREATOR_REFRESH_TOKEN.
 */
import { existsSync, readFileSync, writeFileSync, chmodSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const TOKEN_URL = 'https://www.patreon.com/api/oauth2/token';
const ENV_FILE = '.env.local';
/** Env var that pins the token file explicitly. Wins over the git-derived default. */
export const PATREON_ENV_FILE_VAR = 'PATREON_ENV_FILE';
const ACCESS_KEY = 'PATREON_CREATOR_ACCESS_TOKEN';
const REFRESH_KEY = 'PATREON_CREATOR_REFRESH_TOKEN';

export interface PatreonTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number | null;
}

/** Per-request options for `patreonGet`. `signal` is forwarded to every fetch attempt. */
export interface PatreonGetInit {
  signal?: AbortSignal | null;
}

/** What the caller saw at `<cwd>/.git`: a directory (main checkout), a gitdir pointer file (linked worktree), or nothing. */
export type DotGit = { kind: 'dir' } | { kind: 'file'; content: string } | null;

/** Per-page bound for any Patreon GET (mirrors the scoreboard walk, #201). */
export const PATREON_PAGE_TIMEOUT_MS = 30_000;
/** Whole-walk budget for a paginated Members API read. */
export const PATREON_WALK_BUDGET_MS = 180_000;

/**
 * Timeout for the next page of a paginated walk: `min(page timeout, budget
 * left)`. Throws once the budget is spent, so a slow-but-answering Patreon
 * cannot stretch a walk past `PATREON_WALK_BUDGET_MS` one page at a time. Use
 * as `patreonGet(url, { signal: AbortSignal.timeout(nextPageTimeoutMs(deadline, pages)) })`
 * — the literal `signal: AbortSignal.timeout(` is what
 * `__tests__/unit/patreon-get-signal.test.ts` scans for (E139).
 */
export function nextPageTimeoutMs(
  walkDeadline: number,
  pagesDone: number,
  pageTimeoutMs: number = PATREON_PAGE_TIMEOUT_MS,
  walkBudgetMs: number = PATREON_WALK_BUDGET_MS
): number {
  const left = walkDeadline - Date.now();
  if (left <= 0) throw new Error(`Patreon Members API walk exceeded the ${walkBudgetMs} ms budget after ${pagesDone} pages`);
  return Math.min(pageTimeoutMs, left);
}

function need(name: string): string {
  const v = process.env[name];
  if (!v || /^your[-_]/i.test(v)) {
    throw new Error(
      `${name} is not set (or is still the placeholder). Copy it from ` +
        'https://www.patreon.com/portal/registration/register-clients into .env.local.'
    );
  }
  return v;
}

export function currentAccessToken(): string {
  return need(ACCESS_KEY);
}

/**
 * Pure: decide where a rotated token pair must be written from what the caller
 * saw on disk. Returns null when there is no defensible answer — the caller
 * must then refuse to refresh rather than write next to a throwaway copy.
 */
export function resolveTokenFile(input: { cwd: string; envFile?: string; dotGit: DotGit }): string | null {
  const override = input.envFile?.trim();
  if (override) return resolve(input.cwd, override);
  const g = input.dotGit;
  if (!g) return null;
  if (g.kind === 'dir') return join(input.cwd, ENV_FILE);
  const m = g.content.match(/^gitdir:\s*(.+?)\s*$/m);
  if (!m) return null;
  // A linked worktree's gitdir is exactly <main>/.git/worktrees/<name>; anything else is not ours to guess at.
  const parts = resolve(input.cwd, m[1]).split(sep);
  const i = parts.lastIndexOf('worktrees');
  if (i < 2 || parts[i - 1] !== '.git' || i !== parts.length - 2) return null;
  const main = parts.slice(0, i - 1).join(sep) || sep;
  return join(main, ENV_FILE);
}

function readDotGit(cwd: string): DotGit {
  const p = join(cwd, '.git');
  if (!existsSync(p)) return null;
  if (statSync(p).isDirectory()) return { kind: 'dir' };
  return { kind: 'file', content: readFileSync(p, 'utf8') };
}

/** The file a rotated pair is persisted to for this process, or null (refuse). Path only — never a value. */
export function tokenFilePath(cwd: string = process.cwd()): string | null {
  return resolveTokenFile({ cwd, envFile: process.env[PATREON_ENV_FILE_VAR], dotGit: readDotGit(cwd) });
}

/** Parse KEY=value lines (optionally quoted). Values are never logged. */
function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[line.slice(0, eq).trim()] = val;
  }
  return out;
}

/** Rewrite (or append) KEY=value lines in the token file. Values are never logged. */
function persistToEnvFile(file: string, updates: Record<string, string>): void {
  const lines = readFileSync(file, 'utf8').split('\n');
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const key = line.split('=', 1)[0];
    if (key in updates && !line.startsWith('#')) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) if (!seen.has(k)) out.push(`${k}=${v}`);
  writeFileSync(file, out.join('\n'));
  chmodSync(file, 0o600);
}

/**
 * If the token file already holds a different access token than this process
 * (another worktree rotated the pair minutes ago), adopt that pair instead of
 * spending a refresh on an already-consumed refresh token. Returns true when a
 * newer pair was adopted. Never logs a value.
 */
export function adoptRotatedTokens(): boolean {
  const file = tokenFilePath();
  if (!file || !existsSync(file)) return false;
  const onDisk = parseEnvFile(file);
  const access = onDisk[ACCESS_KEY];
  const refresh = onDisk[REFRESH_KEY];
  if (!access || !refresh || /^your[-_]/i.test(access)) return false;
  if (access === process.env[ACCESS_KEY]) return false;
  process.env[ACCESS_KEY] = access;
  process.env[REFRESH_KEY] = refresh;
  console.log(`[patreon-auth] adopted a newer token pair from ${file}`);
  return true;
}

/**
 * Exchange the refresh token for a new access/refresh pair, update process.env
 * and the token file, and return the new access token. Refuses — before the
 * endpoint is called — when there is no token file to persist to.
 */
export async function refreshPatreonTokens(): Promise<PatreonTokens> {
  const file = tokenFilePath();
  if (!file || !existsSync(file)) {
    throw new Error(
      `[patreon-auth] refusing to refresh: nowhere to persist the rotated pair (` +
        (file ? `${file} does not exist` : 'cwd is neither a git checkout nor a linked worktree') +
        `). A refresh that is not persisted strands the single-use refresh token. ` +
        `Set ${PATREON_ENV_FILE_VAR}=<absolute path to the operator's ${ENV_FILE}>.`
    );
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: need(REFRESH_KEY),
    client_id: need('PATREON_CLIENT_ID'),
    client_secret: need('PATREON_CLIENT_SECRET'),
  });
  // Deliberately not bound by a caller's AbortSignal: aborting after Patreon has
  // rotated the pair but before the response is read would strand it. undici's
  // own header/body timeouts (300 s) still bound a truly hung socket.
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    // Patreon error bodies do not echo tokens, but keep it short regardless.
    throw new Error(`Patreon token refresh failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!json.access_token || !json.refresh_token) {
    throw new Error('Patreon token refresh returned no access_token/refresh_token');
  }
  process.env[ACCESS_KEY] = json.access_token;
  process.env[REFRESH_KEY] = json.refresh_token;
  persistToEnvFile(file, { [ACCESS_KEY]: json.access_token, [REFRESH_KEY]: json.refresh_token });
  const days = json.expires_in ? Math.round(json.expires_in / 86400) : null;
  console.log(`[patreon-auth] tokens refreshed${days ? ` (access token valid ~${days} days)` : ''} and saved to ${file}`);
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSec: json.expires_in ?? null };
}

/**
 * GET a Patreon API v2 URL with the creator token. On 401: first adopt a newer
 * pair another process may already have written to the token file, then (still
 * 401) refresh once and retry — so a monthly expiry never breaks a scheduled
 * run as long as the refresh token is still valid. `init.signal` (e.g.
 * `AbortSignal.timeout(ms)`) bounds each GET; a timeout surfaces as the fetch
 * rejection, never as a partial body.
 */
export async function patreonGet(url: string, init?: PatreonGetInit): Promise<any> {
  const attempt = async (token: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: init?.signal ?? undefined });
  let res = await attempt(currentAccessToken());
  if (res.status === 401 && adoptRotatedTokens()) {
    res = await attempt(currentAccessToken());
  }
  if (res.status === 401) {
    console.log('[patreon-auth] access token rejected (401) — refreshing');
    const { accessToken } = await refreshPatreonTokens();
    res = await attempt(accessToken);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Patreon API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}
