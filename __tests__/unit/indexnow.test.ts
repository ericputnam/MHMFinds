import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

import {
  DEFAULT_DAYS,
  HARD_CAP,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  KEY_RE,
  SITE_HOST,
  buildPayload,
  collectionUrls,
  exitCodeFor,
  interpretResponse,
  isCanonicalUrl,
  keyFilePath,
  keyLocation,
  modUrl,
  parseArgs,
  resolveCap,
  selectUrls,
  summaryLine,
} from '../../scripts/agents/indexnow-lib';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
/** Source-level guards must not pass or fail on their own documentation. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * IndexNow (E47) — the first thing ever shipped for Bing, the site's #2
 * channel (17,032 sessions/7d on 2026-09-12, 8.6x Google). Three invariants:
 * the public key file is served from the app root and bypasses the
 * WordPress proxy; every URL we submit is the trailing-slash canonical on the
 * apex host; and the script cannot send anything without --apply.
 */

describe('the key and its public file', () => {
  it('is a valid IndexNow key (8–128 chars of [a-zA-Z0-9-])', () => {
    expect(INDEXNOW_KEY).toMatch(KEY_RE);
  });

  it('is served from public/<key>.txt with a body equal to the key', () => {
    const file = join(ROOT, 'public', `${INDEXNOW_KEY}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8').trim()).toBe(INDEXNOW_KEY);
  });

  it('keyLocation is the apex host root, not the blog subdomain', () => {
    expect(keyFilePath()).toBe(`/${INDEXNOW_KEY}.txt`);
    expect(keyLocation()).toBe(`https://musthavemods.com/${INDEXNOW_KEY}.txt`);
  });

  it('is not read from an env var (the key is public by design; env vars are Tier 2)', () => {
    const lib = stripComments(read('scripts/agents/indexnow-lib.ts'));
    const script = stripComments(read('scripts/agents/indexnow-submit.ts'));
    expect(lib).not.toMatch(/process\.env\.\w*INDEXNOW/);
    expect(script).not.toMatch(/process\.env\.\w*INDEXNOW/);
    expect(lib).toMatch(new RegExp(`INDEXNOW_KEY = '${INDEXNOW_KEY}'`));
  });
});

describe('the key file bypasses the WordPress catch-all proxy', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('<html><head></head><body>wp</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('middleware passes /<key>.txt through to Next.js without proxying', async () => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest(`https://musthavemods.com/${INDEXNOW_KEY}.txt`));
    expect(fetchMock).not.toHaveBeenCalled();
    // NextResponse.next() carries the x-middleware-next marker; a proxy or redirect would not.
    expect(res?.headers.get('x-middleware-next')).toBe('1');
    expect(res?.status).toBe(200);
  });

  it('the same segment without a dot WOULD be proxied — the dot is the load-bearing part', async () => {
    const { middleware } = await import('@/middleware');
    await middleware(new NextRequest(`https://musthavemods.com/${INDEXNOW_KEY}txt`));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('blog.musthavemods.com');
  });

  it('the catch-all still skips dotted first segments at the source level', () => {
    const mw = stripComments(read('middleware.ts'));
    expect(mw).toMatch(/!firstSegment\.includes\('\.'\)/);
  });
});

describe('isCanonicalUrl', () => {
  it('accepts trailing-slash apex URLs and dotted root files', () => {
    expect(isCanonicalUrl('https://musthavemods.com/')).toBe(true);
    expect(isCanonicalUrl('https://musthavemods.com/mods/abc123/')).toBe(true);
    expect(isCanonicalUrl('https://musthavemods.com/games/sims-4/hair-cc/')).toBe(true);
    expect(isCanonicalUrl('https://musthavemods.com/llms.txt')).toBe(true);
  });

  it('rejects slashless paths (308 targets), the blog host, http, queries and fragments', () => {
    expect(isCanonicalUrl('https://musthavemods.com/mods/abc123')).toBe(false);
    expect(isCanonicalUrl('https://blog.musthavemods.com/sims-4-hair-cc/')).toBe(false);
    expect(isCanonicalUrl('http://musthavemods.com/mods/abc123/')).toBe(false);
    expect(isCanonicalUrl('https://musthavemods.com/?category=hair')).toBe(false);
    expect(isCanonicalUrl('https://musthavemods.com/mods/abc123/#top')).toBe(false);
    expect(isCanonicalUrl('not a url')).toBe(false);
  });
});

describe('URL builders', () => {
  it('modUrl is the trailing-slash canonical', () => {
    expect(modUrl('cmr5jdnta0ahn2cf8kaj5gfcu')).toBe('https://musthavemods.com/mods/cmr5jdnta0ahn2cf8kaj5gfcu/');
  });

  it('collectionUrls covers the homepage, every game hub and every registry collection, all canonical', () => {
    const urls = collectionUrls();
    expect(urls[0]).toBe('https://musthavemods.com/');
    expect(urls).toContain('https://musthavemods.com/games/sims-4/');
    for (const c of SIMS4_COLLECTIONS) {
      expect(urls).toContain(`https://musthavemods.com/games/${c.gameSlug}/${c.slug}/`);
    }
    expect(urls.length).toBe(2 + SIMS4_COLLECTIONS.length);
    for (const u of urls) expect(isCanonicalUrl(u)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('selectUrls', () => {
  it('puts collections first, then mods, deduplicated', () => {
    const sel = selectUrls({ modIds: ['a', 'b', 'a', ' ', 'c'], includeCollections: true, cap: HARD_CAP });
    expect(sel.collections).toBe(2 + SIMS4_COLLECTIONS.length);
    expect(sel.mods).toBe(3);
    expect(sel.urls.slice(-3)).toEqual([modUrl('a'), modUrl('b'), modUrl('c')]);
    expect(sel.dropped).toEqual([]);
    expect(sel.capped).toBe(false);
  });

  it('honours --no-collections', () => {
    const sel = selectUrls({ modIds: ['a'], includeCollections: false, cap: HARD_CAP });
    expect(sel.collections).toBe(0);
    expect(sel.urls).toEqual([modUrl('a')]);
  });

  it('never exceeds the cap and flags truncation', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `id${i}`);
    const sel = selectUrls({ modIds: ids, includeCollections: false, cap: 10 });
    expect(sel.urls.length).toBe(10);
    expect(sel.capped).toBe(true);
  });

  it('the hard cap wins over any requested cap', () => {
    const ids = Array.from({ length: HARD_CAP + 50 }, (_, i) => `id${i}`);
    const sel = selectUrls({ modIds: ids, includeCollections: false, cap: 999_999 });
    expect(sel.urls.length).toBe(HARD_CAP);
    expect(sel.capped).toBe(true);
    expect(resolveCap(999_999)).toBe(HARD_CAP);
    expect(resolveCap(0)).toBe(1);
    expect(resolveCap(NaN)).toBe(HARD_CAP);
    expect(resolveCap(undefined)).toBe(HARD_CAP);
  });

  it('every selected URL is canonical (trailing slash, apex host)', () => {
    const sel = selectUrls({ modIds: ['x', 'y'], includeCollections: true, cap: HARD_CAP });
    for (const u of sel.urls) {
      expect(u.startsWith('https://musthavemods.com/')).toBe(true);
      expect(u.endsWith('/')).toBe(true);
    }
  });

  it('is empty-safe', () => {
    const sel = selectUrls({ modIds: [], includeCollections: false, cap: HARD_CAP });
    expect(sel).toEqual({ urls: [], mods: 0, collections: 0, dropped: [], capped: false });
  });
});

describe('buildPayload', () => {
  it('matches the IndexNow batch schema with host, key, keyLocation and urlList', () => {
    const p = buildPayload([modUrl('a'), modUrl('b')]);
    expect(p).toEqual({
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://musthavemods.com/${INDEXNOW_KEY}.txt`,
      urlList: [modUrl('a'), modUrl('b')],
    });
    expect(INDEXNOW_ENDPOINT).toBe('https://api.indexnow.org/indexnow');
  });
});

describe('interpretResponse / exit codes', () => {
  it('200 and 202 are success; 4xx are named failures', () => {
    expect(interpretResponse(200).ok).toBe(true);
    expect(interpretResponse(202).ok).toBe(true);
    expect(interpretResponse(403)).toEqual({ ok: false, reason: 'key-not-valid' });
    expect(interpretResponse(422).ok).toBe(false);
    expect(interpretResponse(429).reason).toBe('too-many-requests');
    expect(interpretResponse(500).reason).toBe('http-500');
  });

  it('keeps the house 0 / 2 / 1 discipline', () => {
    expect(exitCodeFor('OK')).toBe(0);
    expect(exitCodeFor('DRY-RUN')).toBe(0);
    expect(exitCodeFor('COULD-NOT-RUN')).toBe(2);
    expect(exitCodeFor('FAIL')).toBe(1);
  });
});

describe('summaryLine', () => {
  it('is one line with every field in fixed order', () => {
    const line = summaryLine({
      when: new Date('2026-09-14T11:00:00.123Z'),
      mode: 'live',
      status: 'OK',
      urls: 42,
      mods: 22,
      collections: 20,
      dropped: 0,
      cap: 500,
      days: 7,
      http: 200,
      reason: 'ok',
    });
    expect(line).toBe('2026-09-14T11:00:00Z indexnow mode=live status=OK urls=42 mods=22 collections=20 dropped=0 cap=500 days=7 http=200 reason=ok');
    expect(line.includes('\n')).toBe(false);
  });

  it('prints "-" for unknown http and reason', () => {
    const line = summaryLine({ when: new Date(0), mode: 'dry-run', status: 'DRY-RUN', urls: 0, mods: 0, collections: 0, dropped: 0, cap: 500, days: 7 });
    expect(line).toContain('http=- reason=-');
  });
});

describe('parseArgs', () => {
  it('defaults to a dry run with collections, 7 days and the hard cap', () => {
    expect(parseArgs([])).toEqual({ apply: false, days: DEFAULT_DAYS, cap: HARD_CAP, collections: true, help: false });
  });

  it('only --apply turns on live mode; --dry-run after it turns it back off', () => {
    expect(parseArgs(['--apply']).apply).toBe(true);
    expect(parseArgs(['--apply', '--dry-run']).apply).toBe(false);
  });

  it('parses --days / --cap in both forms and clamps the cap', () => {
    expect(parseArgs(['--days', '3']).days).toBe(3);
    expect(parseArgs(['--days=14']).days).toBe(14);
    expect(parseArgs(['--days', 'nope']).days).toBe(DEFAULT_DAYS);
    expect(parseArgs(['--cap', '50']).cap).toBe(50);
    expect(parseArgs(['--cap=99999']).cap).toBe(HARD_CAP);
    expect(parseArgs(['--no-collections']).collections).toBe(false);
  });
});

describe('the shipped script', () => {
  const src = stripComments(read('scripts/agents/indexnow-submit.ts'));

  it('cannot send without --apply and checks the key file is live before it POSTs', () => {
    expect(src).toMatch(/if \(!args\.apply\)/);
    expect(src).toMatch(/keyFileIsLive\(\)/);
    expect(src).toMatch(/key-file-not-live/);
    // The live check must precede the POST in source order.
    expect(src.indexOf('keyFileIsLive()')).toBeLessThan(src.indexOf("method: 'POST'"));
  });

  it("mirrors the mod sitemap's selection (isNSFW false, isVerified true) and the endpoint constant", () => {
    expect(src).toMatch(/isNSFW: false, isVerified: true/);
    const sitemap = read('app/sitemap-mods.xml/route.ts');
    expect(sitemap).toMatch(/isNSFW: false, isVerified: true/);
    expect(src).toMatch(/INDEXNOW_ENDPOINT/);
  });

  it('writes one summary line to logs/indexnow.log and never reads a secret it does not need', () => {
    expect(src).toMatch(/'logs', 'indexnow\.log'/);
    expect(src).toMatch(/summaryLine\(/);
    expect(src).toMatch(/fileEnv\.DATABASE_URL/);
    expect(src).not.toMatch(/console\.(log|error)\([^)]*DATABASE_URL/);
  });
});
