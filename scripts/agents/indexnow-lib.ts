/**
 * IndexNow — pure helpers for scripts/agents/indexnow-submit.ts (E47, 2026-09-14).
 * No network, no filesystem, no database, no secrets. Everything that touches
 * the world lives in the entrypoint; everything here is unit-testable offline.
 *
 * Why this exists: Bing organic is 17,032 sessions/7d (GA4 2026-09-06→09-12),
 * 8.6x Google and the site's #2 channel overall, slipping −3.9% WoW — and
 * nothing had ever targeted it. IndexNow (https://www.indexnow.org/) is the
 * push protocol Bing, Yandex, Seznam and Naver share: POST a list of URLs and
 * the engines fetch them within minutes instead of whenever the crawler next
 * decides to. The catalog adds ~25 mods/day from the scheduled ingest, and a
 * `/mods/[id]/` page Bing has not crawled earns nothing.
 *
 * The key is public BY DESIGN: the protocol verifies ownership by fetching
 * `https://<host>/<key>.txt` and checking the body equals the key. It is not a
 * secret and must not live in an env var (Tier 2) — it is a committed constant
 * with the matching file in `public/`.
 */

import { getAllCollectionRoutes, collectionHref } from '../../lib/collections';
import { creatorHref } from '../../lib/creatorSlug';

/** Public IndexNow key. Change it and `public/<key>.txt` together (test enforces). */
export const INDEXNOW_KEY = 'ee78fbc844f5b753a61535eed78c41d0';

/** The shared endpoint: one POST here reaches every participating engine. */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export const SITE_HOST = 'musthavemods.com';
export const SITE_ORIGIN = `https://${SITE_HOST}`;

/**
 * Hard ceiling on URLs per run, code-only. The protocol allows 10,000 per
 * POST; we never need more than the last few days of new mods plus the
 * collection pages, and a bug that enumerated the whole 16K-row catalog
 * should be caught by this, not by Bing's rate limiter.
 */
export const HARD_CAP = 500;
/**
 * Ceiling for a `--creators` run (E95, 2026-09-24): the ~541 /creator/[slug]/
 * pages plus the daily collections + new mods do not fit under HARD_CAP, and
 * IndexNow accepts 10,000 URLs per POST. Still far below the 16K catalog, so
 * an enumeration bug is still caught. The daily runner never passes
 * --creators, so its cap is unchanged.
 */
export const CREATORS_HARD_CAP = 1000;
export const DEFAULT_DAYS = 7;

/** IndexNow key grammar: 8–128 chars of [a-zA-Z0-9-]. */
export const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

export function keyFilePath(): string {
  return `/${INDEXNOW_KEY}.txt`;
}

export function keyLocation(): string {
  return `${SITE_ORIGIN}${keyFilePath()}`;
}

/** Canonical mod detail URL — trailing slash (next.config.js `trailingSlash: true`). */
export function modUrl(id: string): string {
  return `${SITE_ORIGIN}/mods/${id}/`;
}

/** Canonical creator page URL — built from the same helper the page canonicalises with. */
export function creatorUrl(slug: string): string {
  return `${SITE_ORIGIN}${creatorHref(slug)}`;
}

/**
 * Homepage, each game hub and every collection page from the registry.
 * Built from `collectionHref()` so a registry change cannot produce a
 * slashless URL here while the page itself canonicalises to the slashed one.
 */
export function collectionUrls(): string[] {
  const out: string[] = [`${SITE_ORIGIN}/`];
  const hubs = new Set<string>();
  for (const r of getAllCollectionRoutes()) {
    hubs.add(`${SITE_ORIGIN}/games/${r.gameSlug}/`);
  }
  out.push(...Array.from(hubs).sort());
  for (const r of getAllCollectionRoutes()) {
    out.push(`${SITE_ORIGIN}${collectionHref({ gameSlug: r.gameSlug, slug: r.topicSlug })}`);
  }
  return out;
}

/**
 * A URL we are willing to hand to a search engine: https, the apex host
 * (never `blog.` — that is the duplicate the whole funnel canonicalises away
 * from), trailing slash unless it is a dotted file, no query, no fragment.
 * A 308 target in a submitted list is the IndexNow equivalent of citing a
 * redirect: the engine fetches the redirect, not the page.
 */
export function isCanonicalUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.host !== SITE_HOST) return false;
  if (u.search || u.hash) return false;
  const path = u.pathname;
  if (!path.startsWith('/')) return false;
  if (path.endsWith('/')) return true;
  // Dotted last segment (e.g. /llms.txt) is a file and is canonical without a slash.
  const last = path.split('/').pop() ?? '';
  return last.includes('.');
}

/**
 * Clamp a requested cap into [1, ceiling]; undefined/NaN → ceiling. The
 * ceiling is HARD_CAP unless the caller is a `--creators` run, which may
 * lift it to CREATORS_HARD_CAP and no further.
 */
export function resolveCap(requested?: number, ceiling: number = HARD_CAP): number {
  const max = Math.min(Math.max(1, Math.floor(ceiling)), CREATORS_HARD_CAP);
  if (requested === undefined || !Number.isFinite(requested)) return max;
  return Math.max(1, Math.min(max, Math.floor(requested)));
}

export interface Selection {
  urls: string[];
  mods: number;
  collections: number;
  creators: number;
  /** URLs rejected by isCanonicalUrl — should always be empty; logged if not. */
  dropped: string[];
  /** True when the cap truncated the list. */
  capped: boolean;
}

/**
 * Collections first (they are the pages that rank), then the newest mods,
 * then creator pages (E95) — last so a `--creators` run can never displace
 * the daily payload when the cap bites. Deduplicated, every URL canonical,
 * order preserved.
 */
export function selectUrls(opts: {
  modIds: readonly string[];
  creatorSlugs?: readonly string[];
  includeCollections: boolean;
  cap: number;
  ceiling?: number;
}): Selection {
  const cap = resolveCap(opts.cap, opts.ceiling);
  const seen = new Set<string>();
  const urls: string[] = [];
  const dropped: string[] = [];
  let mods = 0;
  let collections = 0;
  let creators = 0;
  let capped = false;

  const push = (u: string, kind: 'mod' | 'collection' | 'creator'): boolean => {
    if (seen.has(u)) return true;
    if (!isCanonicalUrl(u)) {
      dropped.push(u);
      return true;
    }
    if (urls.length >= cap) {
      capped = true;
      return false;
    }
    seen.add(u);
    urls.push(u);
    if (kind === 'mod') mods += 1;
    else if (kind === 'creator') creators += 1;
    else collections += 1;
    return true;
  };

  if (opts.includeCollections) {
    for (const u of collectionUrls()) if (!push(u, 'collection')) break;
  }
  for (const id of opts.modIds) {
    const trimmed = String(id ?? '').trim();
    if (!trimmed) continue;
    if (!push(modUrl(trimmed), 'mod')) break;
  }
  for (const slug of opts.creatorSlugs ?? []) {
    const trimmed = String(slug ?? '').trim();
    if (!trimmed) continue;
    if (!push(creatorUrl(trimmed), 'creator')) break;
  }

  return { urls, mods, collections, creators, dropped, capped };
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export function buildPayload(urls: readonly string[]): IndexNowPayload {
  return { host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: keyLocation(), urlList: Array.from(urls) };
}

/** IndexNow response codes (https://www.indexnow.org/documentation). */
export function interpretResponse(http: number): { ok: boolean; reason: string } {
  switch (http) {
    case 200:
      return { ok: true, reason: 'ok' };
    case 202:
      return { ok: true, reason: 'accepted-key-pending-validation' };
    case 400:
      return { ok: false, reason: 'bad-request' };
    case 403:
      return { ok: false, reason: 'key-not-valid' };
    case 422:
      return { ok: false, reason: 'urls-do-not-belong-to-host-or-key-mismatch' };
    case 429:
      return { ok: false, reason: 'too-many-requests' };
    default:
      return { ok: false, reason: `http-${http}` };
  }
}

export type SubmitStatus = 'OK' | 'DRY-RUN' | 'FAIL' | 'COULD-NOT-RUN';

export interface RunSummary {
  when: Date;
  mode: 'dry-run' | 'live';
  status: SubmitStatus;
  urls: number;
  mods: number;
  collections: number;
  /** Creator pages submitted (E95). Optional so pre-E95 callers and log readers keep working; printed as 0. */
  creators?: number;
  dropped: number;
  cap: number;
  days: number;
  http?: number | null;
  reason?: string | null;
}

/**
 * One falsifiable line for logs/indexnow.log. Fixed key=value order so a
 * grep for `status=OK` or `reason=key-file-not-live` is unambiguous.
 */
export function summaryLine(r: RunSummary): string {
  return [
    r.when.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    'indexnow',
    `mode=${r.mode}`,
    `status=${r.status}`,
    `urls=${r.urls}`,
    `mods=${r.mods}`,
    `collections=${r.collections}`,
    `creators=${r.creators ?? 0}`,
    `dropped=${r.dropped}`,
    `cap=${r.cap}`,
    `days=${r.days}`,
    `http=${r.http ?? '-'}`,
    `reason=${r.reason ?? '-'}`,
  ].join(' ');
}

/** House discipline: 0 = ran, 2 = could not run (never a pipeline failure), 1 = the submit failed. */
export function exitCodeFor(status: SubmitStatus): 0 | 1 | 2 {
  if (status === 'OK' || status === 'DRY-RUN') return 0;
  if (status === 'COULD-NOT-RUN') return 2;
  return 1;
}

export interface CliArgs {
  apply: boolean;
  days: number;
  cap: number;
  collections: boolean;
  /** `--creators`: also submit every /creator/[slug]/ page (E95); lifts the cap ceiling to CREATORS_HARD_CAP. */
  creators: boolean;
  help: boolean;
}

/** The cap ceiling a parsed argument set is allowed: HARD_CAP, or CREATORS_HARD_CAP for a `--creators` run. */
export function capCeiling(args: Pick<CliArgs, 'creators'>): number {
  return args.creators ? CREATORS_HARD_CAP : HARD_CAP;
}

/** `--apply` is the only way to send anything; everything else defaults safe. */
export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { apply: false, days: DEFAULT_DAYS, cap: HARD_CAP, collections: true, creators: false, help: false };
  let requestedCap: number | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.apply = false;
    else if (a === '--no-collections') args.collections = false;
    else if (a === '--creators') args.creators = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--days' || a.startsWith('--days=')) {
      const v = a.includes('=') ? a.split('=')[1] : argv[++i];
      const n = Number(v);
      args.days = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAYS;
    } else if (a === '--cap' || a.startsWith('--cap=')) {
      const v = a.includes('=') ? a.split('=')[1] : argv[++i];
      requestedCap = Number(v);
    }
  }
  // Resolve last so `--cap 800 --creators` and `--creators --cap 800` agree.
  args.cap = resolveCap(requestedCap, capCeiling(args));
  return args;
}
