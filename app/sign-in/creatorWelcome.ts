/**
 * Creator sign-ups land on a "submit your first mod" welcome (Nova, E211,
 * 2026-10-15).
 *
 * Read-only DB 2026-10-15: October sign-ups 236, of which 127 used the form
 * and 53 of those ticked "I'm a creator"; 1 of the 53 has ever submitted
 * (one account, 10-03, 7 mods still pending). GA4 saw 0 page views of
 * /creators/ from 10-01 to 10-14. Before E211 a creator sign-up went back to
 * the page it came from, exactly like everyone else. The dashboard already
 * has a "Submit Your First Mod" button, but nobody who ticked the box was
 * ever shown it.
 *
 * This module decides where a successful sign-up goes and what the
 * dashboard reads back. Nothing here can create an open redirect:
 *   - the destination is either the already-sanitized `returnTo` (from
 *     `resolveSignInReturn`) or the constant CREATOR_WELCOME_PATH;
 *   - `from` is re-checked with `safeReturnPath` on the dashboard, so a
 *     hand-edited `?from=//evil.example` gives no "back" link at all.
 *
 * Client-safe: no server imports. No schema field: the welcome is keyed on
 * the existing `isCreator` flag and the submission count the dashboard
 * already fetches.
 */
import { safeReturnPath } from './returnTo';

/** The creator dashboard. middleware.ts already gates it on `token.isCreator`. */
export const CREATOR_WELCOME_PATH = '/creators/';

/** Query flag that turns the welcome card on. */
export const CREATOR_WELCOME_PARAM = 'welcome';

/** Query param that carries the page the visitor was on before signing up. */
export const CREATOR_WELCOME_FROM_PARAM = 'from';

/** The one GA4 event for E211. `source` (registered dimension) names the button. */
export const CREATOR_SUBMIT_CTA_EVENT = 'creator_submit_cta_click';

/** `source` values on CREATOR_SUBMIT_CTA_EVENT, one per button that leads to /creators/submit/. */
export const CREATOR_SUBMIT_CTA_SOURCES = {
  welcome: 'creator-welcome',
  quickAction: 'dashboard-quick-action',
  emptyState: 'dashboard-empty-state',
} as const;

export type CreatorSubmitCtaSource =
  (typeof CREATOR_SUBMIT_CTA_SOURCES)[keyof typeof CREATOR_SUBMIT_CTA_SOURCES];

/** Where the welcome card's main button goes. */
export const CREATOR_SUBMIT_PATH = '/creators/submit/';

export interface PostSignUpInput {
  /** The visitor ticked "I'm a creator" AND the box was visible. */
  creatorTicked: boolean;
  /** Output of `resolveSignInReturn` — already a safe same-origin path. */
  returnTo: string;
}

/**
 * Where a successful sign-up goes. Non-creators: unchanged (`returnTo`).
 * Creators: the dashboard with the welcome flag, carrying `returnTo` so the
 * visitor can still get back to what they were browsing.
 */
export function resolvePostSignUpPath(input: PostSignUpInput): string {
  if (!input.creatorTicked) return input.returnTo;
  const q = new URLSearchParams({ [CREATOR_WELCOME_PARAM]: '1' });
  if (input.returnTo && input.returnTo !== '/') q.set(CREATOR_WELCOME_FROM_PARAM, input.returnTo);
  return `${CREATOR_WELCOME_PATH}?${q.toString()}`;
}

export interface CreatorWelcomeState {
  /** `?welcome=1` was present. */
  welcome: boolean;
  /** Safe same-origin path to go back to, or null. */
  from: string | null;
}

/** Reads the dashboard's query string. `origin` is `window.location.origin`. */
export function readCreatorWelcome(search: string, origin: string): CreatorWelcomeState {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return { welcome: false, from: null };
  }
  const welcome = params.get(CREATOR_WELCOME_PARAM) === '1';
  const from = welcome ? safeReturnPath(params.get(CREATOR_WELCOME_FROM_PARAM), origin) : null;
  return { welcome, from };
}

/**
 * Show the welcome card only to a creator who arrived from sign-up and has
 * nothing submitted yet. Someone with a submission already has the normal
 * dashboard; the card would be noise.
 */
export function shouldShowCreatorWelcome(state: CreatorWelcomeState, totalSubmissions: number): boolean {
  return state.welcome && totalSubmissions === 0;
}
