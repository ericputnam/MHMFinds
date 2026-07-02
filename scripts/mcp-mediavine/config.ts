/** Shared config loading for the Mediavine MCP server and the daily-report script. */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MediavineClient } from './client.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Minimal KEY=VALUE loader for the gitignored .env.local (avoids a dotenv dep). */
export function loadLocalEnv(): void {
  try {
    const raw = readFileSync(join(HERE, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env.local — fall back to real env vars */
  }
}

export interface LoadedConfig {
  client: MediavineClient;
  siteId: string;
  jwt: string;
}

/** Load config or throw a clear error if the token is missing. */
export function loadConfig(): LoadedConfig {
  loadLocalEnv();
  const jwt = process.env.MEDIAVINE_JWT;
  const siteId = process.env.MEDIAVINE_SITE_ID || '14318';
  if (!jwt) {
    throw new Error(
      'MEDIAVINE_JWT is not set. Add it to scripts/mcp-mediavine/.env.local ' +
        '(see README.md). Without it the Mediavine tools cannot authenticate.',
    );
  }
  return { client: new MediavineClient({ jwt, siteId }), siteId, jwt };
}

/** Decode a JWT's `exp` and report days remaining WITHOUT exposing token material. */
export function tokenDaysRemaining(jwt: string): number | null {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(part, 'base64').toString('utf8')) as { exp?: number };
    if (typeof payload.exp !== 'number') return null;
    return Math.round((payload.exp - Date.now() / 1000) / 86400);
  } catch {
    return null;
  }
}
