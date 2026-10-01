/**
 * "Save this mod" account offer on /go/[modId] (Cass, E152, 2026-10-01).
 *
 * E4 (the "Get new mods weekly" email box on /go, source `go-interstitial`)
 * was killed on 09-30 at 1.45/1K sessions over 28 days (bar ≥2/1K). E152 puts
 * an account offer in the same slot: below the `.mv-ads` wrapper, a sibling of
 * it, never a child, never inside `<aside id="secondary">`.
 *
 * What this protects:
 *   1. Helpers: sign-up URL, resume marker, marker stripping that keeps other
 *      markers (E74's `?patreon=connected`).
 *   2. Event names / source are distinct from every other capture surface.
 *   3. The favorites link is the real FAVORITES_PATH (imported, not restated).
 *   4. GoClient renders the offer exactly once, after the `.mv-ads` wrapper
 *      closes and before the aside; the wrapper still has exactly two child
 *      blocks; the E4 email box is gone.
 *   5. Copy is split by session status — no "create a free account" for a
 *      signed-in visitor.
 *   6. No first-paint blocker, no email input, no `.mv-ads` token in the
 *      component.
 *
 * Comments are stripped before source assertions — files here quote the
 * patterns they warn about.
 *
 * Red against pre-E152 GoClient (origin/main 2157097): 7 of the 8 GoClient
 * cases fail (no offer, email box still present); "no first-paint blocker"
 * passes on both trees, as it should.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  GO_SAVE_EVENTS,
  GO_SAVE_FAVORITES_PATH,
  GO_SAVE_RESUME_PARAM,
  GO_SAVE_SOURCE,
  goSaveResumeHref,
  goSaveSignInHref,
  hasGoSaveMarker,
  stripGoSaveMarker,
} from '../../app/go/[modId]/goSaveOffer';
import {
  MOD_DETAIL_FAVORITE_EVENTS,
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_EVENTS,
  MOD_DETAIL_SAVE_SOURCE,
} from '../../lib/capture/modDetailFavorite';
import { FAVORITES_PATH } from '../../lib/favoritesPath';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const CLIENT = 'app/go/[modId]/GoClient.tsx';
const OFFER = 'components/GoSaveOffer.tsx';

describe('go-save helpers', () => {
  it('resume href is the trailing-slash /go path with the marker', () => {
    expect(goSaveResumeHref('abc123')).toBe(`/go/abc123/?${GO_SAVE_RESUME_PARAM}=1`);
  });

  it('sign-in href uses mode=signup, the offer ref, and an encoded redirect back to /go', () => {
    const href = goSaveSignInHref('abc123');
    expect(href.startsWith('/sign-in/?')).toBe(true);
    const qs = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(qs.get('mode')).toBe('signup');
    expect(qs.get('ref')).toBe(GO_SAVE_SOURCE);
    expect(qs.get('redirect')).toBe(goSaveResumeHref('abc123'));
  });

  it('marker detection is exact', () => {
    expect(hasGoSaveMarker('?save=1')).toBe(true);
    expect(hasGoSaveMarker('?patreon=connected&save=1')).toBe(true);
    expect(hasGoSaveMarker('?save=0')).toBe(false);
    expect(hasGoSaveMarker('?fav=1')).toBe(false);
    expect(hasGoSaveMarker('')).toBe(false);
  });

  it('stripping removes only the save marker', () => {
    expect(stripGoSaveMarker('?save=1')).toBe('');
    expect(stripGoSaveMarker('?patreon=connected&save=1')).toBe('?patreon=connected');
    expect(stripGoSaveMarker('')).toBe('');
  });

  it('source and event names are distinct from E107/E130 and generic capture events', () => {
    expect(new Set([GO_SAVE_SOURCE, MOD_DETAIL_SAVE_SOURCE, MOD_DETAIL_FAVORITE_SOURCE]).size).toBe(3);
    expect(GO_SAVE_SOURCE).not.toBe('go-interstitial');
    const mine = Object.values(GO_SAVE_EVENTS);
    const theirs = [...Object.values(MOD_DETAIL_SAVE_EVENTS), ...Object.values(MOD_DETAIL_FAVORITE_EVENTS)];
    expect(new Set([...mine, ...theirs]).size).toBe(mine.length + theirs.length);
    for (const n of mine) {
      expect(['favorite', 'sign_up', 'newsletter_signup']).not.toContain(n);
      expect(n).toMatch(/^[a-z_]+$/);
    }
  });

  it('the favorites link is the real favorites page path', () => {
    expect(GO_SAVE_FAVORITES_PATH).toBe(FAVORITES_PATH);
    expect(GO_SAVE_FAVORITES_PATH.endsWith('/')).toBe(true);
    // The helper module must stay client-safe: never the Prisma-backed lib.
    const helperSrc = stripComments(read('app/go/[modId]/goSaveOffer.ts'));
    expect(helperSrc).not.toMatch(/from ['"][^'"]*lib\/favorites['"]/);
    expect(helperSrc).not.toMatch(/prisma/i);
  });
});

describe('GoSaveOffer component', () => {
  const src = stripComments(read(OFFER));

  it('is a client component with a single button that calls onSave', () => {
    expect(src.startsWith("'use client'")).toBe(true);
    expect(src).toContain('onClick={onSave}');
    expect((src.match(/<button\b/g) ?? []).length).toBe(1);
  });

  it('captures an account, not an email', () => {
    expect(src).not.toMatch(/type=["']email["']/);
    expect(src).not.toContain('/api/waitlist');
    expect(src).not.toContain('NewsletterSignup');
  });

  it('splits copy by session status: "create a free account" only when signed out', () => {
    const ternary = src.match(/\{signedIn\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/);
    expect(ternary).not.toBeNull();
    const [, signedInCopy, signedOutCopy] = ternary!;
    expect(signedInCopy).not.toMatch(/create|account|sign/i);
    expect(signedOutCopy).toMatch(/create a free account/i);
    // Exactly one occurrence, inside the signed-out branch.
    expect((src.match(/create a free account/gi) ?? []).length).toBe(1);
  });

  it('saved state links to the favorites page', () => {
    expect(src).toMatch(/<Link[\s\S]*?href=\{favoritesHref\}/);
    expect(src).toMatch(/View your favorites/);
  });

  it('is inline in normal flow: no dialog, fixed or sticky, and no ad-anchor token', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\b(fixed|sticky)\b/);
    expect(src).not.toMatch(/\bmv-ads\b/);
    expect(src).not.toContain('id="secondary"');
  });
});

describe('GoClient — offer placement and wiring', () => {
  const src = stripComments(read(CLIENT));

  it('imports the offer and the shared helpers (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/components\/GoSaveOffer['"]/);
    expect(src).toContain('GO_SAVE_EVENTS');
    expect(src).toContain('goSaveSignInHref');
    expect(src).toContain('hasGoSaveMarker(window.location.search)');
  });

  it('renders the offer exactly once, after the mv-ads wrapper and before the aside', () => {
    expect((src.match(/<GoSaveOffer\b/g) ?? []).length).toBe(1);
    const wrapperOpen = src.indexOf('className="mv-ads');
    const offer = src.indexOf('<GoSaveOffer');
    const aside = src.indexOf('<aside');
    expect(wrapperOpen).toBeGreaterThan(0);
    expect(offer).toBeGreaterThan(wrapperOpen);
    expect(offer).toBeLessThan(aside);

    // Walk the wrapper's <div> nesting to find where it closes; the offer
    // must come after that point (sibling, not child).
    const openTagStart = src.lastIndexOf('<div', wrapperOpen);
    const re = /<div\b|<\/div>/g;
    re.lastIndex = openTagStart;
    let depth = 0;
    let wrapperClose = -1;
    let directChildren = 0;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      if (m[0] === '</div>') {
        depth -= 1;
        if (depth === 0) {
          wrapperClose = m.index;
          break;
        }
      } else {
        // A self-closing <div ... /> does not change depth.
        const tagEnd = src.indexOf('>', m.index);
        const selfClosing = src[tagEnd - 1] === '/';
        if (depth === 1) directChildren += 1;
        if (!selfClosing) depth += 1;
      }
    }
    expect(wrapperClose).toBeGreaterThan(wrapperOpen);
    expect(offer).toBeGreaterThan(wrapperClose);
    // The wrapper keeps exactly its two content blocks (install guide +
    // Pinterest CTA) — one Mediavine injection gap, unchanged.
    expect(directChildren).toBe(2);
  });

  it('the E4 email box is gone from /go', () => {
    expect(src).not.toContain('NewsletterSignup');
    expect(src).not.toContain('go-interstitial');
  });

  it('copy split is driven by the real session status', () => {
    expect(src).toMatch(/<GoSaveOffer[\s\S]*?signedIn=\{sessionStatus === 'authenticated'\}/);
  });

  it('a 401 fires the redirect event and routes to the offer sign-up href exactly once', () => {
    expect(src).toContain('GO_SAVE_EVENTS.signinRedirect');
    expect((src.match(/router\.push\(goSaveSignInHref\(/g) ?? []).length).toBe(1);
  });

  it('the resume path fires afterSignin and strips only its own marker', () => {
    expect(src).toContain('GO_SAVE_EVENTS.afterSignin');
    expect(src).toContain('stripGoSaveMarker(window.location.search)');
  });

  it('the favorite POST uses a trailing-slash API URL', () => {
    expect(src).toMatch(/\/api\/mods\/\$\{[^}]+\}\/favorite\/`/);
  });

  it('introduces no first-paint blocker', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\bfixed\b/);
  });
});
