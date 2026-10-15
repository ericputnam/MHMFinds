/**
 * The /go/[modId] capture slot below the `.mv-ads` wrapper (Cass).
 *
 * History of the slot:
 *   E4   email box, source `go-interstitial`  — KILLED 09-30 at 1.45/1K.
 *   E152 "Save this mod" account offer       — KILLED 10-15 at 2 / 2,986 = 0.67/1K
 *        (bar ≥2.62/1K). components/GoSaveOffer.tsx deleted; the helper module
 *        app/go/[modId]/goSaveOffer.ts stays because /sign-in (E191) still
 *        recognises `ref=go-save`.
 *   2026-10-15 free-tier Patreon follow ask (lib/capture/goPatreonFollow.ts,
 *        components/GoPatreonFollowOffer.tsx).
 *
 * What this protects:
 *   1. The retained go-save helpers still behave (signupIntent depends on them).
 *   2. The E152 kill is encoded: GoClient renders no GoSaveOffer, runs no
 *      resume effect, and the deleted component stays deleted.
 *   3. The follow ask uses the FREE tier link — never the $3 checkout (E40 kill)
 *      — with its own event name and source, distinct from every other Patreon
 *      and capture event.
 *   4. GoClient renders the follow ask exactly once, after the `.mv-ads` wrapper
 *      closes and before the aside; the wrapper still has exactly two child
 *      blocks; hidden for members and in the post-connect state.
 *   5. No first-paint blocker, no email input, no `.mv-ads` token in the
 *      component; the link opens a new tab with rel="noopener noreferrer".
 *
 * Comments are stripped before source assertions — files here quote the
 * patterns they warn about.
 *
 * Red against pre-kill GoClient (origin/main 3da6de1): every case in the
 * "E152 is gone" and "follow ask" blocks fails (GoSaveOffer still imported and
 * rendered; no follow component, no event constant).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  GO_SAVE_RESUME_PARAM,
  GO_SAVE_SOURCE,
  goSaveResumeHref,
  goSaveSignInHref,
  hasGoSaveMarker,
  stripGoSaveMarker,
} from '../../app/go/[modId]/goSaveOffer';
import { GO_FOLLOW_SLOT_EVENT, GO_FOLLOW_SLOT_SOURCE } from '../../lib/capture/goPatreonFollow';
import { PATREON_CONNECT_OPTIN_EVENTS, PATREON_CONNECT_OPTIN_SOURCE } from '../../lib/capture/patreonConnectOptIn';
import { MOD_DETAIL_FAVORITE_SOURCE, MOD_DETAIL_SAVE_SOURCE } from '../../lib/capture/modDetailFavorite';
import { SAVE_INTENT_REFS } from '../../app/sign-in/signupIntent';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const CLIENT = 'app/go/[modId]/GoClient.tsx';
const OFFER = 'components/GoPatreonFollowOffer.tsx';

describe('go-save helpers (retained after the E152 kill)', () => {
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

  it('marker detection and stripping are exact', () => {
    expect(hasGoSaveMarker('?save=1')).toBe(true);
    expect(hasGoSaveMarker('?patreon=connected&save=1')).toBe(true);
    expect(hasGoSaveMarker('?save=0')).toBe(false);
    expect(stripGoSaveMarker('?patreon=connected&save=1')).toBe('?patreon=connected');
    expect(stripGoSaveMarker('')).toBe('');
  });

  it('/sign-in still recognises the go-save ref (why the module is kept)', () => {
    expect(SAVE_INTENT_REFS).toContain(GO_SAVE_SOURCE);
    const helperSrc = stripComments(read('app/go/[modId]/goSaveOffer.ts'));
    expect(helperSrc).not.toMatch(/prisma/i);
  });
});

describe('E152 is gone from /go', () => {
  const src = stripComments(read(CLIENT));

  it('the account-offer component is deleted and not imported', () => {
    expect(existsSync(join(ROOT, 'components/GoSaveOffer.tsx'))).toBe(false);
    expect(src).not.toMatch(/GoSaveOffer/);
    expect(src).not.toContain('GO_SAVE_EVENTS');
    expect(src).not.toContain('goSaveSignInHref');
  });

  it('no resume effect, no favorite POST, and the E4 email box stays gone', () => {
    expect(src).not.toContain('hasGoSaveMarker');
    expect(src).not.toMatch(/\/favorite\/`/);
    expect(src).not.toContain('NewsletterSignup');
    expect(src).not.toContain('go-interstitial');
  });
});

describe('follow-slot constants', () => {
  it('event and source are distinct from every other Patreon and capture name', () => {
    const otherEvents = [
      'patreon_click',
      'patreon_click_after_wait',
      'patreon_follow_click',
      'patreon_reconnect_click',
      'patreon_post_connect_view',
      'favorite',
      'sign_up',
      'newsletter_signup',
      ...Object.values(PATREON_CONNECT_OPTIN_EVENTS),
    ];
    expect(otherEvents).not.toContain(GO_FOLLOW_SLOT_EVENT);
    expect(GO_FOLLOW_SLOT_EVENT).toMatch(/^[a-z_]+$/);
    const sources = [GO_FOLLOW_SLOT_SOURCE, GO_SAVE_SOURCE, MOD_DETAIL_SAVE_SOURCE, MOD_DETAIL_FAVORITE_SOURCE, PATREON_CONNECT_OPTIN_SOURCE, 'go-interstitial'];
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('GoPatreonFollowOffer component', () => {
  const src = stripComments(read(OFFER));

  it('is a client component with one external link that calls onClick', () => {
    expect(src.startsWith("'use client'")).toBe(true);
    expect((src.match(/<a\b/g) ?? []).length).toBe(1);
    expect(src).toMatch(/<a[\s\S]*?href=\{href\}[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"[\s\S]*?onClick=\{onClick\}/);
    expect(src).not.toMatch(/<button\b/);
  });

  it('asks for a free follow, not an email or a paid tier', () => {
    expect(src).toMatch(/Follow free on Patreon/);
    expect(src).not.toMatch(/type=["']email["']/);
    expect(src).not.toContain('/api/waitlist');
    expect(src).not.toMatch(/\$\d/);
    expect(src).not.toMatch(/checkout/i);
  });

  it('is inline in normal flow: no dialog, fixed or sticky, and no ad-anchor token', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\b(fixed|sticky)\b/);
    expect(src).not.toMatch(/\bmv-ads\b/);
    expect(src).not.toContain('id="secondary"');
  });
});

describe('GoClient — follow ask placement and wiring', () => {
  const src = stripComments(read(CLIENT));

  it('imports the component and the shared constants (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/components\/GoPatreonFollowOffer['"]/);
    expect(src).toContain('GO_FOLLOW_SLOT_EVENT');
    expect(src).toContain('GO_FOLLOW_SLOT_SOURCE');
  });

  it('links the FREE tier, never the member checkout', () => {
    expect(src).toMatch(/<GoPatreonFollowOffer[\s\S]*?href=\{PATREON_FREE_TIER_CHECKOUT_URL\}/);
    expect(src).not.toContain('PATREON_MEMBER_TIER_CHECKOUT_URL');
  });

  it('fires its own event with its own source on click', () => {
    expect(src).toMatch(/gtag\('event', GO_FOLLOW_SLOT_EVENT, \{ source: GO_FOLLOW_SLOT_SOURCE/);
  });

  it('is hidden for members and in the post-connect state', () => {
    expect(src).toMatch(/\{!isMember && !showPostConnect && \(\s*<GoPatreonFollowOffer/);
  });

  it('renders the ask exactly once, after the mv-ads wrapper closes and before the aside', () => {
    expect((src.match(/<GoPatreonFollowOffer\b/g) ?? []).length).toBe(1);
    const wrapperOpen = src.indexOf('className="mv-ads');
    const offer = src.indexOf('<GoPatreonFollowOffer');
    const aside = src.indexOf('<aside');
    expect(wrapperOpen).toBeGreaterThan(0);
    expect(offer).toBeGreaterThan(wrapperOpen);
    expect(offer).toBeLessThan(aside);

    // Walk the wrapper's <div> nesting to find where it closes; the ask
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

  it('introduces no first-paint blocker', () => {
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\bfixed\b/);
  });
});
