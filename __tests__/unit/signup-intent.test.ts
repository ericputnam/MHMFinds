/**
 * Sign-up page honours the save intent (Cass, E191, 2026-10-12).
 *
 * What this guards:
 *   1. `resolveSignupIntent` recognises every account-offer `ref` by the
 *      REAL constants (E107 heart, E130 offer, E152 /go offer) and nothing
 *      else — a renamed source fails here, not silently in production.
 *   2. The page reads the intent from `ref`, swaps the header copy, hides
 *      only the creator block (never the newsletter opt-in), fires one
 *      `signup_intent_view` per load, and stamps `source` on `sign_up` on
 *      the registered GA4 dimension — while keeping every string the E73 and
 *      E118 guards assert on (`ref: searchParams?.get('ref')`, exactly two
 *      `router.push(returnPath())`).
 *   3. Nothing on the page names an ad anchor.
 *
 * Against pre-fix `origin/main` (d5170eb) with only this module added, 4 of
 * the 6 source-level cases in section 2 are red (intent import, creator gate,
 * header/submit copy, view event + source on sign_up); without the module,
 * section 1 fails to import at all.
 * Comments are stripped before any source-level assertion — files in this
 * repo quote the patterns they warn about.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  DIRECT_SOURCE,
  SAVE_INTENT_REFS,
  SIGNUP_INTENT_VIEW_EVENT,
  normalizeRef,
  resolveSignupIntent,
} from '../../app/sign-in/signupIntent';
import {
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_SOURCE,
} from '../../lib/capture/modDetailFavorite';
import { GO_SAVE_SOURCE } from '../../app/go/[modId]/goSaveOffer';
import { HOME_CAPTURE_SOURCE } from '../../components/HomeCapture';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const page = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));

describe('resolveSignupIntent — which refs carry a save intent', () => {
  it('SAVE_INTENT_REFS is built from the real surface constants, all distinct', () => {
    expect(SAVE_INTENT_REFS).toContain(MOD_DETAIL_SAVE_SOURCE);
    expect(SAVE_INTENT_REFS).toContain(MOD_DETAIL_FAVORITE_SOURCE);
    expect(SAVE_INTENT_REFS).toContain(GO_SAVE_SOURCE);
    expect(new Set(SAVE_INTENT_REFS).size).toBe(SAVE_INTENT_REFS.length);
    expect(SAVE_INTENT_REFS.length).toBe(3);
  });

  for (const ref of SAVE_INTENT_REFS) {
    it(`"${ref}" reads as a save intent, hides the creator block, keeps its source`, () => {
      const intent = resolveSignupIntent(ref);
      expect(intent.kind).toBe('save');
      expect(intent.hideCreator).toBe(true);
      expect(intent.source).toBe(ref);
      expect(intent.heading.toLowerCase()).toContain('save');
      expect(intent.submitLabel.toLowerCase()).toContain('save');
      expect(intent.signupBody.toLowerCase()).toContain('favorites');
    });
  }

  it('every other ref — and no ref — is generic with the creator block shown', () => {
    for (const ref of [null, undefined, '', '   ', HOME_CAPTURE_SOURCE, 'direct', 'nav', 'MOD-DETAIL-SAVE']) {
      const intent = resolveSignupIntent(ref);
      expect(intent.kind).toBe('generic');
      expect(intent.hideCreator).toBe(false);
      expect(intent.heading).toBe('Discover Amazing Sims Mods');
      expect(intent.submitLabel).toBe('Create Free Account');
    }
    expect(resolveSignupIntent(HOME_CAPTURE_SOURCE).source).toBe(HOME_CAPTURE_SOURCE);
  });

  it('an empty ref is attributed as direct, never as an empty string', () => {
    expect(normalizeRef(null)).toBe(DIRECT_SOURCE);
    expect(normalizeRef('')).toBe(DIRECT_SOURCE);
    expect(normalizeRef('  ')).toBe(DIRECT_SOURCE);
    expect(resolveSignupIntent(undefined).source).toBe(DIRECT_SOURCE);
    expect(resolveSignupIntent(' go-save ').source).toBe(GO_SAVE_SOURCE);
  });

  it('never fakes urgency in the save copy', () => {
    const intent = resolveSignupIntent(MOD_DETAIL_SAVE_SOURCE);
    const copy = `${intent.pill} ${intent.heading} ${intent.signupBody} ${intent.signinBody} ${intent.submitLabel}`;
    expect(copy).not.toMatch(/hurry|limited|expires|only \d+ left|last chance/i);
  });
});

describe('app/sign-in/page.tsx wires the intent (source-level, comments stripped)', () => {
  it('reads the intent from ref through the shared module', () => {
    expect(page).toContain("from './signupIntent'");
    expect(page).toMatch(/resolveSignupIntent\(searchParams\?\.get\('ref'\)\)/);
  });

  it('hides exactly the creator block for the save cohort, never the newsletter opt-in', () => {
    expect(page.match(/intent\.hideCreator/g)?.length).toBe(1);
    expect(page).toMatch(/mode === 'signup' && !intent\.hideCreator && \(/);
    // The opt-in checkbox is gated on mode only.
    const optIn = page.indexOf('name="newsletter-optin"');
    expect(optIn).toBeGreaterThan(0);
    const gate = page.lastIndexOf("{mode === 'signup' && (", optIn);
    const creatorGate = page.lastIndexOf('!intent.hideCreator', optIn);
    expect(gate).toBeGreaterThan(creatorGate);
  });

  it('swaps the header and submit copy from the intent', () => {
    expect(page).toContain('intent.pill');
    expect(page).toContain("intent.kind === 'save'");
    expect(page).toContain('intent.signupBody');
    expect(page).toContain('intent.signinBody');
    expect(page).toContain('intent.submitLabel');
    expect(page).toMatch(/data-signup-intent=/);
  });

  it('fires one signup_intent_view per load and stamps source on sign_up, keeping the E73 ref', () => {
    expect(page).toMatch(/useEffect\(\(\) => \{[\s\S]*?SIGNUP_INTENT_VIEW_EVENT[\s\S]*?\}, \[intent\.source, intent\.kind\]\)/);
    expect(SIGNUP_INTENT_VIEW_EVENT).toBe('signup_intent_view');
    const evt = page.indexOf("'sign_up'");
    expect(evt).toBeGreaterThan(0);
    const block = page.slice(evt, evt + 400);
    expect(block).toMatch(/ref: searchParams\?\.get\('ref'\) \|\| 'direct'/);
    expect(block).toMatch(/source: intent\.source/);
  });

  it('keeps the E118 return-path shape: every success branch goes through returnPath()', () => {
    // Sign-in pushes returnPath() directly; sign-up wraps it in E211's
    // resolvePostSignUpPath (creator sign-ups -> dashboard welcome).
    expect(page.match(/router\.push\(returnPath\(\)\)/g)?.length).toBe(1);
    expect(page).toMatch(/router\.push\(\s*resolvePostSignUpPath\(\{[\s\S]{0,120}returnTo: returnPath\(\)/);
    expect(page).not.toMatch(/router\.push\(\s*searchParams/);
  });

  it('names no ad anchor', () => {
    expect(page).not.toMatch(/mv-ads|id="secondary"|mediavine/i);
  });
});
