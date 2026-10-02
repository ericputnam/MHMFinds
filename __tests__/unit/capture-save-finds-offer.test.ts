/**
 * "Save this find" account offer on /mods/[id] (Cass, E130, 2026-09-28).
 *
 * E10 (email box at the bottom of the mod page, source `mod-detail`) produced
 * 0 waitlist rows in its whole life and was killed on 09-21 pending a new
 * placement. E130 is that placement: an account offer directly under the hero
 * image, sharing the favorite button's 401 → sign-up → return-and-save flow
 * but with its own ref, its own resume-marker value and its own two GA4 event
 * names, so it can be read on its own without a custom dimension.
 *
 * What this protects:
 *   1. The helpers build the right sign-up URL and the two markers can never
 *      be confused (`fav=1` is the button, `fav=save` is the offer).
 *   2. The event names are distinct from every other capture event.
 *   3. The client renders the offer exactly once, under the image and above
 *      the first in-content ad, i.e. a sibling of every `.mv-ads` element and
 *      outside the right-column wrapper that holds the favorite button.
 *   4. The dead E10 email box is gone from the page.
 *   5. The 401 path fires the redirect event and routes to the offer's own
 *      sign-up href exactly once; the resume path handles the offer's marker
 *      and fires afterSignin.
 *   6. No first-paint blocker, no email input, no `.mv-ads` token in the
 *      component.
 *   7. (E159, 2026-10-02) Copy is split by session status — a signed-in
 *      visitor is never told to "create a free account" — and the saved
 *      state links to the real favorites page (FAVORITES_PATH, #223), wired
 *      from the real `useSession()` status, via the client-safe module and
 *      never the Prisma-backed `lib/favorites`.
 *
 * Constants are imported from the real module. Comments are stripped before
 * any source assertion — files in this repo quote the patterns they warn
 * about.
 *
 * Red against pre-E130 `origin/main` (e765da5): the ModDetailClient and E10
 * blocks fail (no offer rendered, email box still present, no save events).
 * Red against pre-E159 `origin/main` (2adcfe3): the 4 "E159" cases fail
 * (no ternary, no Link, no signedIn / favoritesHref props).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  MOD_DETAIL_FAVORITE_EVENTS,
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_EVENTS,
  MOD_DETAIL_SAVE_SOURCE,
  RESUME_FAVORITE_PARAM,
  RESUME_SAVE_VALUE,
  hasResumeFavoriteMarker,
  hasResumeSaveMarker,
  resumeSaveHref,
  saveFindsSignInHref,
} from '../../lib/capture/modDetailFavorite';
import { FAVORITES_PATH } from '../../lib/favoritesPath';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const CLIENT = 'app/mods/[id]/ModDetailClient.tsx';
const OFFER = 'components/SaveFindsOffer.tsx';

describe('save-finds helpers', () => {
  it('resume href carries the offer marker on a trailing-slash mod path', () => {
    expect(resumeSaveHref('abc123')).toBe(`/mods/abc123/?${RESUME_FAVORITE_PARAM}=${RESUME_SAVE_VALUE}`);
  });

  it('sign-in href uses mode=signup, the offer ref, and an encoded redirect back to the mod', () => {
    const href = saveFindsSignInHref('abc123');
    expect(href.startsWith('/sign-in/?')).toBe(true);
    const qs = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(qs.get('mode')).toBe('signup');
    expect(qs.get('ref')).toBe(MOD_DETAIL_SAVE_SOURCE);
    expect(qs.get('redirect')).toBe(resumeSaveHref('abc123'));
  });

  it('the offer marker and the button marker never match each other', () => {
    expect(hasResumeSaveMarker(`?${RESUME_FAVORITE_PARAM}=save`)).toBe(true);
    expect(hasResumeSaveMarker(`?x=2&${RESUME_FAVORITE_PARAM}=save`)).toBe(true);
    expect(hasResumeSaveMarker(`?${RESUME_FAVORITE_PARAM}=1`)).toBe(false);
    expect(hasResumeFavoriteMarker(`?${RESUME_FAVORITE_PARAM}=save`)).toBe(false);
    expect(hasResumeSaveMarker('')).toBe(false);
  });

  it('source and event names are distinct from E107 and every other capture event', () => {
    expect(MOD_DETAIL_SAVE_SOURCE).not.toBe(MOD_DETAIL_FAVORITE_SOURCE);
    const mine = Object.values(MOD_DETAIL_SAVE_EVENTS);
    const theirs = Object.values(MOD_DETAIL_FAVORITE_EVENTS);
    expect(new Set([...mine, ...theirs]).size).toBe(mine.length + theirs.length);
    for (const n of mine) {
      expect(n).not.toBe('favorite');
      expect(n).not.toBe('sign_up');
      expect(n).not.toBe('newsletter_signup');
      expect(n).toMatch(/^[a-z_]+$/);
    }
  });
});

describe('SaveFindsOffer component', () => {
  const src = stripComments(read(OFFER));

  it('is a client component with a single button that calls onSave', () => {
    expect(src.startsWith("'use client'")).toBe(true);
    expect(src).toContain('onClick={onSave}');
    expect((src.match(/<button\b/g) ?? []).length).toBe(1);
  });

  it('captures an account, not an email — no email input, no waitlist call', () => {
    expect(src).not.toMatch(/type=["']email["']/);
    expect(src).not.toContain('/api/waitlist');
  });

  it('is inline in normal flow: no dialog, fixed or sticky, and no .mv-ads token', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\b(fixed|sticky)\b/);
    expect(src).not.toMatch(/\bmv-ads\b/);
    expect(src).not.toContain('id="secondary"');
  });

  it('promises only what exists: a favorite on the account and the favorites page (no alerts)', () => {
    expect(src).toMatch(/saved to your favorites/i);
    expect(src).not.toMatch(/alert|notify|update you|one list/i);
  });

  it('E159: splits copy by session status — "create a free account" only when signed out', () => {
    const ternary = src.match(/\{signedIn\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/);
    expect(ternary).not.toBeNull();
    const [, signedInCopy, signedOutCopy] = ternary!;
    expect(signedInCopy).not.toMatch(/create|account|sign/i);
    expect(signedOutCopy).toMatch(/create a free account/i);
    // Exactly one occurrence, inside the signed-out branch.
    expect((src.match(/create a free account/gi) ?? []).length).toBe(1);
  });

  it('E159: saved state links to the favorites page through the owner-supplied href', () => {
    expect(src).toMatch(/<Link[\s\S]*?href=\{favoritesHref\}/);
    expect(src).toMatch(/View your favorites/);
    // The component never hard-codes the path; the owner passes the constant.
    expect(src).not.toContain('/account/favorites');
  });
});

describe('ModDetailClient — offer placement and wiring', () => {
  const src = stripComments(read(CLIENT));

  it('imports the offer and the shared constants (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/components\/SaveFindsOffer['"]/);
    expect(src).toContain('MOD_DETAIL_SAVE_EVENTS');
    expect(src).toContain('saveFindsSignInHref');
    expect(src).toContain('hasResumeSaveMarker');
  });

  it('renders the offer exactly once, under the hero image and above the first in-content ad', () => {
    const tags = src.match(/<SaveFindsOffer\b/g) ?? [];
    expect(tags.length).toBe(1);
    const offer = src.indexOf('<SaveFindsOffer');
    const heroImage = src.indexOf('priority'); // the hero <Image priority>
    const about = src.indexOf('About This Mod');
    const firstAd = src.indexOf('<InContentAd />');
    const rightWrapper = src.indexOf('className="mv-ads space-y-6');
    expect(heroImage).toBeGreaterThan(0);
    expect(offer).toBeGreaterThan(heroImage);
    expect(offer).toBeLessThan(about);
    expect(offer).toBeLessThan(firstAd);
    expect(offer).toBeLessThan(rightWrapper);
  });

  it('shares the favorite state with the button (one truth for "saved")', () => {
    expect(src).toMatch(/<SaveFindsOffer[\s\S]*?saved=\{isFavorited\}/);
    expect(src).toMatch(/<SaveFindsOffer[\s\S]*?pending=\{favoritePending\}/);
  });

  it('E159: copy split is driven by the real session status', () => {
    expect(src).toMatch(/from ['"]next-auth\/react['"]/);
    expect(src).toMatch(/<SaveFindsOffer[\s\S]*?signedIn=\{sessionStatus === 'authenticated'\}/);
  });

  it('E159: the favorites link is the real FAVORITES_PATH from the client-safe module', () => {
    expect(FAVORITES_PATH.endsWith('/')).toBe(true);
    expect(src).toMatch(/from ['"]@\/lib\/favoritesPath['"]/);
    expect(src).toMatch(/<SaveFindsOffer[\s\S]*?favoritesHref=\{FAVORITES_PATH\}/);
    // Never the Prisma-backed barrel — that would pull Prisma into the client bundle.
    expect(src).not.toMatch(/from ['"]@\/lib\/favorites['"]/);
  });

  it('the E10 email box is gone from the mod page', () => {
    expect(src).not.toContain('NewsletterSignup');
    expect(src).not.toContain('source="mod-detail"');
  });

  it('a 401 fires the offer redirect event and routes to the offer sign-up href, exactly once', () => {
    expect(src).toContain('MOD_DETAIL_SAVE_EVENTS.signinRedirect');
    const pushes = src.match(/router\.push\(saveFindsSignInHref\(mod\.id\)\)/g) ?? [];
    expect(pushes.length).toBe(1);
  });

  it('the resume path recognises the offer marker and fires afterSignin', () => {
    expect(src).toContain('hasResumeSaveMarker(window.location.search)');
    expect(src).toContain('MOD_DETAIL_SAVE_EVENTS.afterSignin');
    // E107's marker handling must survive alongside it.
    expect(src).toContain('hasResumeFavoriteMarker(window.location.search)');
    expect(src).toContain('MOD_DETAIL_FAVORITE_EVENTS.afterSignin');
  });

  it('introduces no first-paint blocker', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\bfixed\b/);
  });
});
