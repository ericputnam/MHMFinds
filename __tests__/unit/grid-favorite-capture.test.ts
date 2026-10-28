/**
 * E279 (Cass, 2026-10-28) — the heart on every mod grid is an account offer,
 * not a dead-end alert.
 *
 * Guards:
 *   1. The URL helpers: the sign-up link carries the surface's `ref` and a
 *      same-page redirect with the resume marker; the marker round-trips and
 *      is stripped without touching the page's other params; a non-id value
 *      is never treated as a mod id.
 *   2. Every grid source is a save-intent `ref` on /sign-in/ (so the E191
 *      copy that completes at 23.9% is what the visitor sees), and all are
 *      distinct from each other and from the older surfaces.
 *   3. Class scanner: no client file under app/ or components/ answers a
 *      favorite 401 with `alert(` — walks the tree, with a vacuity guard —
 *      and each of the four grid pages wires the hook with its own source.
 *
 * Comments are stripped before the source assertions: files here quote the
 * pattern they replaced.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  GRID_FAVORITE_EVENTS,
  GRID_FAVORITE_PARAM,
  GRID_FAVORITE_SOURCES,
  gridFavoriteSignInHref,
  gridResumeHref,
  isPlausibleModId,
  readGridResumeMod,
  stripGridResumeMarker,
} from '../../lib/capture/gridFavorite';
import { SAVE_INTENT_REFS, resolveSignupIntent } from '../../app/sign-in/signupIntent';
import { safeReturnPath } from '../../app/sign-in/returnTo';
import {
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_SOURCE,
} from '../../lib/capture/modDetailFavorite';
import { HOME_CAPTURE_SOURCE } from '../../components/HomeCapture';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const MOD = 'cmv5h58ky2631ysf6ac6fwp0t';

describe('grid favorite URL helpers', () => {
  it('sign-up href carries the ref and a same-page resume redirect', () => {
    const href = gridFavoriteSignInHref(GRID_FAVORITE_SOURCES.home, '/', '?game=sims-4&page=2', MOD);
    const url = new URL(href, 'https://musthavemods.com');
    expect(url.pathname).toBe('/sign-in/');
    expect(url.searchParams.get('mode')).toBe('signup');
    expect(url.searchParams.get('ref')).toBe('home-favorite');
    const redirect = url.searchParams.get('redirect')!;
    expect(redirect).toBe(`/?game=sims-4&page=2&${GRID_FAVORITE_PARAM}=${MOD}`);
    // The sign-in page only follows same-origin relative paths — this one passes.
    expect(safeReturnPath(redirect, 'https://musthavemods.com')).toBe(redirect);
  });

  it('replaces an existing marker instead of stacking a second one', () => {
    const href = gridResumeHref('/games/sims-4/hair/', `?${GRID_FAVORITE_PARAM}=old12345678`, MOD);
    expect(href).toBe(`/games/sims-4/hair/?${GRID_FAVORITE_PARAM}=${MOD}`);
  });

  it('reads the marker back and strips only the marker', () => {
    expect(readGridResumeMod(`?page=2&${GRID_FAVORITE_PARAM}=${MOD}`)).toBe(MOD);
    expect(stripGridResumeMarker('/', `?page=2&${GRID_FAVORITE_PARAM}=${MOD}`, '#grid')).toBe('/?page=2#grid');
    expect(stripGridResumeMarker('/', `?${GRID_FAVORITE_PARAM}=${MOD}`, '')).toBe('/');
  });

  it('never treats a non-id marker as a mod id', () => {
    for (const bad of ['', '../admin', 'a b', 'x', `${MOD}/../x`, '<script>']) {
      expect(isPlausibleModId(bad)).toBe(false);
      expect(readGridResumeMod(`?${GRID_FAVORITE_PARAM}=${encodeURIComponent(bad)}`)).toBeNull();
    }
    expect(readGridResumeMod('?page=2')).toBeNull();
  });

  it('event names are distinct from the /mods/[id] pair', () => {
    expect(GRID_FAVORITE_EVENTS.signinRedirect).not.toBe('favorite_signin_redirect');
    expect(GRID_FAVORITE_EVENTS.afterSignin).not.toBe('favorite_after_signin');
  });
});

describe('grid sources are save-intent refs', () => {
  const sources = Object.values(GRID_FAVORITE_SOURCES);

  it('four distinct sources, none shared with an older surface', () => {
    expect(sources.length).toBe(4);
    expect(new Set(sources).size).toBe(4);
    for (const older of [MOD_DETAIL_FAVORITE_SOURCE, MOD_DETAIL_SAVE_SOURCE, HOME_CAPTURE_SOURCE]) {
      expect(sources).not.toContain(older);
    }
  });

  for (const source of Object.values(GRID_FAVORITE_SOURCES)) {
    it(`${source} gets the save copy on /sign-in/ and keeps its source`, () => {
      expect(SAVE_INTENT_REFS).toContain(source);
      const intent = resolveSignupIntent(source);
      expect(intent.kind).toBe('save');
      expect(intent.source).toBe(source);
      expect(intent.hideCreator).toBe(true);
    });
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

describe('class scanner: no favorite 401 ends in an alert', () => {
  const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components'))];
  const favoriteFiles = files.filter((f) => /\/favorite`/.test(readFileSync(f, 'utf8')));

  it('vacuity guard: the scan found the favorite callers', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(favoriteFiles.length).toBeGreaterThanOrEqual(5);
  });

  it('no file that calls the favorite API answers with alert()', () => {
    const offenders = favoriteFiles.filter((f) => /\balert\s*\(/.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });

  const wired: Array<[string, keyof typeof GRID_FAVORITE_SOURCES]> = [
    ['app/HomePageClient.tsx', 'home'],
    ['app/games/[game]/GamePageClient.tsx', 'game'],
    ['app/games/[game]/[topic]/CollectionPageClient.tsx', 'collection'],
    ['app/creator/[slug]/CreatorPageClient.tsx', 'creator'],
  ];
  for (const [file, key] of wired) {
    it(`${file} wires the hook with GRID_FAVORITE_SOURCES.${key} and calls it on 401`, () => {
      const src = stripComments(readFileSync(join(ROOT, file), 'utf8'));
      expect(src).toContain(`useGridFavoriteCapture(GRID_FAVORITE_SOURCES.${key}`);
      expect(src).toMatch(/status === 401\)\s*\{?\s*onUnauthorized\(modId\)/);
    });
  }
});
