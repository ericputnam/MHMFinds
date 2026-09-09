/**
 * Patreon creator-token helper for standalone scripts.
 *
 * The portal at https://www.patreon.com/portal/registration/register-clients
 * issues a Creator's Access Token that expires after ~1 month, plus a refresh
 * token. This module refreshes the pair on demand and persists the rotated
 * tokens back to `.env.local` (the only place they live — nothing on Vercel
 * reads them, and a refresh invalidates the previous refresh token, so a second
 * copy anywhere else would silently go stale).
 *
 * Required in .env.local: PATREON_CLIENT_ID, PATREON_CLIENT_SECRET,
 * PATREON_CREATOR_ACCESS_TOKEN, PATREON_CREATOR_REFRESH_TOKEN.
 */
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';

const TOKEN_URL = 'https://www.patreon.com/api/oauth2/token';
const ENV_FILE = '.env.local';

export interface PatreonTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number | null;
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
  return need('PATREON_CREATOR_ACCESS_TOKEN');
}

/** Rewrite (or append) KEY=value lines in .env.local. Values are never logged. */
function persistToEnvFile(updates: Record<string, string>): boolean {
  if (!existsSync(ENV_FILE)) return false;
  const lines = readFileSync(ENV_FILE, 'utf8').split('\n');
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
  writeFileSync(ENV_FILE, out.join('\n'));
  chmodSync(ENV_FILE, 0o600);
  return true;
}

/**
 * Exchange the refresh token for a new access/refresh pair, update process.env
 * and .env.local, and return the new access token.
 */
export async function refreshPatreonTokens(): Promise<PatreonTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: need('PATREON_CREATOR_REFRESH_TOKEN'),
    client_id: need('PATREON_CLIENT_ID'),
    client_secret: need('PATREON_CLIENT_SECRET'),
  });
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
  process.env.PATREON_CREATOR_ACCESS_TOKEN = json.access_token;
  process.env.PATREON_CREATOR_REFRESH_TOKEN = json.refresh_token;
  const persisted = persistToEnvFile({
    PATREON_CREATOR_ACCESS_TOKEN: json.access_token,
    PATREON_CREATOR_REFRESH_TOKEN: json.refresh_token,
  });
  const days = json.expires_in ? Math.round(json.expires_in / 86400) : null;
  console.log(
    `[patreon-auth] tokens refreshed${days ? ` (access token valid ~${days} days)` : ''}` +
      (persisted ? ` and saved to ${ENV_FILE}` : ` — WARNING: ${ENV_FILE} not found, new tokens NOT persisted`)
  );
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSec: json.expires_in ?? null };
}

/**
 * GET a Patreon API v2 URL with the creator token. On 401 the token pair is
 * refreshed once and the request retried, so a monthly expiry never breaks a
 * scheduled run as long as the refresh token is still valid.
 */
export async function patreonGet(url: string): Promise<any> {
  const attempt = async (token: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  let res = await attempt(currentAccessToken());
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
