/**
 * Post-sign-in return path (Cass, E118, 2026-09-26).
 *
 * What this protects:
 *   1. No open redirect: /sign-in/ never pushes a query value it has not
 *      proven is a same-origin relative path. Pre-fix, both success branches
 *      did `router.push(searchParams?.get('redirect') || '/')`, so
 *      `?redirect=https://evil.example/` left the site from our own form.
 *   2. Return to the page the visitor came from: `redirect`, then NextAuth's
 *      `callbackUrl`, then a same-origin `document.referrer`, then `/`.
 *   3. The E107 resume path (`/mods/<id>/?fav=1`) survives verbatim.
 *
 * Comments are stripped before any source-level assertion — files in this
 * repo quote the patterns they warn about.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  NON_RETURN_PATHS,
  SIGNIN_RETURN_FALLBACK,
  resolveSignInReturn,
  safeReferrerPath,
  safeReturnPath,
} from '../../app/sign-in/returnTo';
import { resumeFavoriteHref } from '../../lib/capture/modDetailFavorite';

const ROOT = join(__dirname, '..', '..');
const ORIGIN = 'https://musthavemods.com';
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const page = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));

describe('sign-in page never pushes a raw query value (E118)', () => {
  it('routes every success branch through resolveSignInReturn', () => {
    // Vacuity guard: the page still has two success branches that navigate.
    const pushes = page.match(/router\.push\(/g) ?? [];
    expect(pushes.length).toBeGreaterThanOrEqual(2);
    expect(page).toContain("from './returnTo'");
    expect(page).toMatch(/resolveSignInReturn\(/);
    expect(page.match(/router\.push\(returnPath\(\)\)/g)?.length).toBe(2);
  });

  it('does not feed a searchParams value straight into navigation', () => {
    // The pre-fix pattern: `const redirect = searchParams?.get('redirect') || '/'`.
    expect(page).not.toMatch(/searchParams\??\.get\(['"](redirect|callbackUrl)['"]\)\s*\|\|/);
    expect(page).not.toMatch(/router\.push\(\s*searchParams/);
    expect(page).not.toMatch(/window\.location(\.href)?\s*=\s*searchParams/);
  });
});

describe('safeReturnPath — open-redirect guard', () => {
  const hostile = [
    'https://evil.example/',
    'http://evil.example/mods/1/',
    '//evil.example/',
    '//evil.example',
    '/\\evil.example/',
    '\\\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    'javascript:alert(1)',
    'data:text/html,hi',
    ' /mods/1/',
    'mods/1/',
    'https://musthavemods.com.evil.example/',
    `${ORIGIN}/mods/1/`, // absolute, even same-origin: query values must be relative
    '',
  ];
  for (const raw of hostile) {
    it(`rejects ${JSON.stringify(raw)}`, () => {
      expect(safeReturnPath(raw, ORIGIN)).toBeNull();
      expect(resolveSignInReturn({ redirect: raw, origin: ORIGIN })).toBe(SIGNIN_RETURN_FALLBACK);
    });
  }

  it('rejects null/undefined and over-long values', () => {
    expect(safeReturnPath(null, ORIGIN)).toBeNull();
    expect(safeReturnPath(undefined, ORIGIN)).toBeNull();
    expect(safeReturnPath(`/${'a'.repeat(3000)}`, ORIGIN)).toBeNull();
  });

  it('never returns to an auth page (no bounce back into the form)', () => {
    expect(NON_RETURN_PATHS.length).toBeGreaterThan(0);
    for (const p of NON_RETURN_PATHS) {
      expect(safeReturnPath(p, ORIGIN)).toBeNull();
      expect(safeReturnPath(`${p}/`, ORIGIN)).toBeNull();
      expect(safeReturnPath(`${p}/?mode=signin`, ORIGIN)).toBeNull();
    }
    expect(safeReturnPath('/SIGN-IN/', ORIGIN)).toBeNull();
    // Segment match, not prefix match.
    expect(safeReturnPath('/sign-in-tips/', ORIGIN)).toBe('/sign-in-tips/');
  });

  it('keeps same-origin relative paths verbatim, including query and hash', () => {
    expect(safeReturnPath('/', ORIGIN)).toBe('/');
    expect(safeReturnPath('/games/sims-4/hair-cc/', ORIGIN)).toBe('/games/sims-4/hair-cc/');
    expect(safeReturnPath('/?search=poses&gameVersion=Sims+4', ORIGIN)).toBe(
      '/?search=poses&gameVersion=Sims+4'
    );
    expect(safeReturnPath('/mods/abc/#reviews', ORIGIN)).toBe('/mods/abc/#reviews');
  });

  it('preserves the E107 favorite resume path exactly', () => {
    const href = resumeFavoriteHref('clx123abc');
    expect(safeReturnPath(href, ORIGIN)).toBe(href);
    // As the page reads it: URLSearchParams decodes the encoded redirect.
    const qs = new URLSearchParams(`redirect=${encodeURIComponent(href)}`);
    expect(resolveSignInReturn({ redirect: qs.get('redirect'), origin: ORIGIN })).toBe(href);
  });
});

describe('safeReferrerPath — only same-origin referrers', () => {
  it('uses a same-origin referrer', () => {
    expect(safeReferrerPath(`${ORIGIN}/games/sims-4/poses/`, ORIGIN)).toBe('/games/sims-4/poses/');
    expect(safeReferrerPath(`${ORIGIN}/?search=skin`, ORIGIN)).toBe('/?search=skin');
  });

  it('ignores cross-site, sibling-host and auth-page referrers', () => {
    expect(safeReferrerPath('https://www.google.com/', ORIGIN)).toBeNull();
    expect(safeReferrerPath('https://www.pinterest.com/pin/1/', ORIGIN)).toBeNull();
    expect(safeReferrerPath('https://blog.musthavemods.com/sims-4-cc/', ORIGIN)).toBeNull();
    expect(safeReferrerPath('https://musthavemods.com.evil.example/', ORIGIN)).toBeNull();
    expect(safeReferrerPath(`${ORIGIN}/sign-in/?mode=signin`, ORIGIN)).toBeNull();
    expect(safeReferrerPath('', ORIGIN)).toBeNull();
    expect(safeReferrerPath('not a url', ORIGIN)).toBeNull();
  });
});

describe('resolveSignInReturn — precedence', () => {
  const ref = `${ORIGIN}/games/sims-4/hair-cc/`;
  it('redirect beats callbackUrl beats referrer beats /', () => {
    expect(
      resolveSignInReturn({ redirect: '/mods/a/', callbackUrl: '/mods/b/', referrer: ref, origin: ORIGIN })
    ).toBe('/mods/a/');
    expect(resolveSignInReturn({ callbackUrl: '/mods/b/', referrer: ref, origin: ORIGIN })).toBe('/mods/b/');
    expect(resolveSignInReturn({ referrer: ref, origin: ORIGIN })).toBe('/games/sims-4/hair-cc/');
    expect(resolveSignInReturn({ origin: ORIGIN })).toBe('/');
  });

  it('a hostile redirect falls through to the next safe source, never to itself', () => {
    expect(
      resolveSignInReturn({ redirect: 'https://evil.example/', referrer: ref, origin: ORIGIN })
    ).toBe('/games/sims-4/hair-cc/');
    expect(
      resolveSignInReturn({ redirect: '//evil.example', callbackUrl: 'https://evil.example', origin: ORIGIN })
    ).toBe('/');
  });
});
