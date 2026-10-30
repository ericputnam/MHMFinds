/**
 * Sign-up page intent (Cass, E191, 2026-10-12).
 *
 * Three account offers send a signed-out visitor here with a `ref` and a
 * `redirect` that resumes the save on return: the "Save this find" offer
 * (E130, `mod-detail-save`), the heart button (E107, `mod-detail-favorite`)
 * and the /go offer (E152, `go-save`). Over 2026-09-28→10-11 those offers
 * redirected 72 users and GA4 saw at most 4 `sign_up` events from sessions
 * that landed on /mods/* — the click rate is healthy (3.7/1K), the form is
 * the leak. Until E191 every visitor saw the same generic "Discover Amazing
 * Sims Mods" header, a creator checkbox, and a form that never said what
 * would happen to the mod they had just tried to save.
 *
 * This module decides, from `ref` alone, whether the page should speak to
 * the save intent. It imports the real constants (never a copy of their
 * value) so a renamed source fails CI here rather than silently falling back
 * to generic copy. Client-safe: no server imports.
 */
import {
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_SOURCE,
} from '../../lib/capture/modDetailFavorite';
import { GO_SAVE_SOURCE } from '../go/[modId]/goSaveOffer';
import { GRID_FAVORITE_SOURCES } from '../../lib/capture/gridFavorite';

/** `ref` values whose visitor arrived by trying to save a mod. */
export const SAVE_INTENT_REFS: readonly string[] = [
  MOD_DETAIL_SAVE_SOURCE,
  MOD_DETAIL_FAVORITE_SOURCE,
  GO_SAVE_SOURCE,
  // E279 (2026-10-28): the heart on every mod grid — homepage, game hub,
  // collection and creator pages — used to end in an alert().
  ...Object.values(GRID_FAVORITE_SOURCES),
];

/** GA4 event fired once per page load so the cohort has a denominator on the page itself. */
export const SIGNUP_INTENT_VIEW_EVENT = 'signup_intent_view';

/** `source` value on `sign_up` / the view event when no surface sent the visitor. */
export const DIRECT_SOURCE = 'direct';

export type SignupIntentKind = 'save' | 'generic';

export interface SignupIntent {
  kind: SignupIntentKind;
  /** The `ref` as received, or `direct` — the `source` on every event the page fires. */
  source: string;
  /** Pill above the heading. */
  pill: string;
  /** H1 copy. */
  heading: string;
  /** Sub-heading in sign-up mode. */
  signupBody: string;
  /** Sub-heading in sign-in mode. */
  signinBody: string;
  /** Submit button label in sign-up mode. */
  submitLabel: string;
  /** Hide the "I'm a creator" block — a save-intent visitor is not here to submit mods. */
  hideCreator: boolean;
}

const GENERIC: Omit<SignupIntent, 'source'> = {
  kind: 'generic',
  pill: 'Join MustHaveMods',
  heading: 'Discover Amazing Sims Mods',
  signupBody: 'Create a free account to start discovering amazing Sims mods',
  signinBody: 'Welcome back! Sign in to continue discovering amazing mods',
  submitLabel: 'Create Free Account',
  hideCreator: false,
};

const SAVE: Omit<SignupIntent, 'source'> = {
  kind: 'save',
  pill: 'Save your finds',
  heading: 'Save this find to your favorites',
  signupBody:
    "Create a free account and we'll add it to your favorites the moment you're back on the mod. Free, no spam, and every find you save lives in one place.",
  signinBody: "Welcome back! Sign in and we'll save this find to your favorites.",
  submitLabel: 'Create account & save',
  hideCreator: true,
};

/** Normalizes a raw `ref` query value; empty/whitespace reads as direct. */
export function normalizeRef(ref: string | null | undefined): string {
  const trimmed = (ref ?? '').trim();
  return trimmed || DIRECT_SOURCE;
}

/** Picks the page's copy from the surface that sent the visitor. Exact match, case-sensitive. */
export function resolveSignupIntent(ref: string | null | undefined): SignupIntent {
  const source = normalizeRef(ref);
  if (SAVE_INTENT_REFS.includes(source)) return { ...SAVE, source };
  return { ...GENERIC, source };
}
