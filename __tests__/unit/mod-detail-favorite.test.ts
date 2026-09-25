/**
 * /mods/[id] favorite → account capture (Cass, E107, 2026-09-25).
 *
 * What this protects:
 *   1. The favorite button on the mod detail page is wired to the real API
 *      (it was a `// TODO` that toggled local state from 2025 until E107).
 *   2. A signed-out click becomes an account-capture path: GA4
 *      `favorite_signin_redirect`, then the sign-in page with
 *      `ref=mod-detail-favorite` and a `redirect` back to the mod carrying
 *      the resume marker — and the resume path can never redirect again
 *      (no loop for a signed-out visitor who lands on `?fav=1`).
 *   3. The scoreboard counts both new events under "Capture events 7d".
 *   4. No first-paint blocker was introduced, and the ad wrapper on the
 *      right column still has exactly the two content children Mediavine
 *      injects between (the button lives inside the first one; E107 changed
 *      its handler, never the DOM around it).
 *
 * Constants are imported from the real module — a test that restates the
 * literal passes happily while the two drift. Comments are stripped before
 * any source assertion because files in this repo quote the patterns they
 * warn about.
 *
 * Red against pre-E107 `origin/main` (cc1f102): 1, 2 and 3 fail (the
 * handler is a TODO, no sign-in href, scoreboard list lacks the events).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  MOD_DETAIL_FAVORITE_EVENTS,
  MOD_DETAIL_FAVORITE_SOURCE,
  RESUME_FAVORITE_PARAM,
  favoriteSignInHref,
  hasResumeFavoriteMarker,
  modDetailPath,
  resumeFavoriteHref,
} from '../../lib/capture/modDetailFavorite';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const CLIENT = 'app/mods/[id]/ModDetailClient.tsx';
const SCOREBOARD = 'scripts/agents/funnel-scoreboard.ts';

describe('modDetailFavorite helpers', () => {
  it('builds a trailing-slash mod path and a resume href carrying the marker', () => {
    expect(modDetailPath('abc123')).toBe('/mods/abc123/');
    expect(resumeFavoriteHref('abc123')).toBe(`/mods/abc123/?${RESUME_FAVORITE_PARAM}=1`);
  });

  it('sign-in href uses mode=signup, the surface ref, and an encoded redirect back to the mod', () => {
    const href = favoriteSignInHref('abc123');
    expect(href.startsWith('/sign-in/?')).toBe(true);
    const qs = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(qs.get('mode')).toBe('signup');
    expect(qs.get('ref')).toBe(MOD_DETAIL_FAVORITE_SOURCE);
    expect(qs.get('redirect')).toBe(resumeFavoriteHref('abc123'));
  });

  it('detects the resume marker only when it is exactly fav=1', () => {
    expect(hasResumeFavoriteMarker('?fav=1')).toBe(true);
    expect(hasResumeFavoriteMarker('?x=2&fav=1')).toBe(true);
    expect(hasResumeFavoriteMarker('?fav=0')).toBe(false);
    expect(hasResumeFavoriteMarker('')).toBe(false);
  });

  it('event names are distinct from every other capture event', () => {
    const names = Object.values(MOD_DETAIL_FAVORITE_EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n).not.toBe('favorite');
      expect(n).not.toBe('sign_up');
      expect(n).not.toBe('newsletter_signup');
    }
  });
});

describe('ModDetailClient — favorite button is wired to the API', () => {
  const src = stripComments(read(CLIENT));

  it('imports the shared constants (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/lib\/capture\/modDetailFavorite['"]/);
    expect(src).toContain('favoriteSignInHref');
    expect(src).toContain('hasResumeFavoriteMarker');
  });

  it('no longer carries the TODO stub handler', () => {
    expect(src).not.toMatch(/setIsFavorited\(!isFavorited\)/);
  });

  it('POSTs and DELETEs /api/mods/[id]/favorite', () => {
    expect(src).toMatch(/fetch\(`\/api\/mods\/\$\{mod\.id\}\/favorite`/);
    expect(src).toMatch(/method:\s*['"]POST['"]/);
    expect(src).toMatch(/method:\s*['"]DELETE['"]/);
  });

  it('a 401 fires the redirect event and routes to the sign-in href, exactly once', () => {
    expect(src).toMatch(/status\s*===\s*401/);
    expect(src).toContain('MOD_DETAIL_FAVORITE_EVENTS.signinRedirect');
    const pushes = src.match(/router\.push\(favoriteSignInHref\(mod\.id\)\)/g) ?? [];
    expect(pushes.length).toBe(1);
  });

  it('the resume path completes the save and fires afterSignin, and never redirects', () => {
    expect(src).toContain('hasResumeFavoriteMarker(window.location.search)');
    expect(src).toContain('MOD_DETAIL_FAVORITE_EVENTS.afterSignin');
    // The only sign-in navigation in the file is the click handler's (asserted
    // above to be exactly one); the resume effect must strip the marker.
    expect(src).toMatch(/history\.replaceState\(/);
  });

  it('introduces no first-paint blocker', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\bfixed\b/);
  });

  it('keeps the right-column .mv-ads wrapper at two content children around the button', () => {
    // The wrapper opens with `mv-ads space-y-6`; its two direct children are
    // the download card (holds the button) and Additional Information.
    const open = src.indexOf('className="mv-ads space-y-6');
    expect(open).toBeGreaterThan(0);
    const button = src.indexOf('onClick={handleFavorite}');
    const additional = src.indexOf('Additional Information');
    expect(button).toBeGreaterThan(open);
    expect(additional).toBeGreaterThan(button);
  });
});

describe('scoreboard counts the new capture events', () => {
  const src = stripComments(read(SCOREBOARD));

  it('lists both E107 event names in the capture-events filter', () => {
    const m = src.match(/inListFilter:\s*\{\s*values:\s*\[([^\]]*)\]/);
    expect(m).not.toBeNull();
    const list = m![1];
    expect(list).toContain(`'${MOD_DETAIL_FAVORITE_EVENTS.signinRedirect}'`);
    expect(list).toContain(`'${MOD_DETAIL_FAVORITE_EVENTS.afterSignin}'`);
    // still counts the plain favorite event the surface fires on a signed-in save
    expect(list).toContain("'favorite'");
  });
});
