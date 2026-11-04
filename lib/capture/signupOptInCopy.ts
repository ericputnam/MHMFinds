/**
 * E327 (Cass, 2026-11-04) — copy split-test on the sign-up form's email opt-in
 * checkbox (E86, `/sign-in/` sign-up mode).
 *
 * Why this surface: `signup-optin` is 245 of the 299 subscribers. Of the 100
 * human-shaped form sign-ups 2026-10-21→11-03, 42 ticked the box (42.0%); the
 * 32 scripted-shaped ones (E260 rule) all ticked it and are excluded from every
 * send. Arm a is today's copy, unchanged. Arm b names the cadence and what the
 * email is ("new Sims 4 CC finds, every two weeks") and makes the label a "yes".
 *
 * Attribution: both arms keep `waitlist.source = 'signup-optin'`. That source is
 * what the E270 scripted-sign-up exclusion keys on (`sendExclusions.ts`), so a
 * new source value would leak scripted rows into the sendable list. The arm is
 * measured in GA4 only, on the registered `source` dimension:
 *   - `signup_optin_exposure` fires once the account is created (denominator:
 *     people who submitted the form and so read the checkbox);
 *   - `signup_optin_tick` fires when that sign-up created a NEW waitlist row.
 * The shared `newsletter_signup` event is unchanged (`source: 'signup-optin'`).
 *
 * Consent is unchanged: the box starts unticked in both arms.
 */

export type SignupOptInArm = 'a' | 'b';

export const SIGNUP_OPTIN_ARMS: readonly SignupOptInArm[] = ['a', 'b'];

/** localStorage key that keeps one browser in one arm across visits. */
export const SIGNUP_OPTIN_ARM_STORAGE_KEY = 'mhm_e327_signup_optin_arm';

/** GA4 events for the split (both carry `source` = the arm's label). */
export const SIGNUP_OPTIN_EVENTS = {
  exposure: 'signup_optin_exposure',
  tick: 'signup_optin_tick',
} as const;

/** GA4 `source` value per arm. Never written to `waitlist.source`. */
export const SIGNUP_OPTIN_ARM_LABEL: Record<SignupOptInArm, string> = {
  a: 'signup-optin-a',
  b: 'signup-optin-b',
};

export interface SignupOptInCopy {
  label: string;
  note: string;
}

export const SIGNUP_OPTIN_COPY: Record<SignupOptInArm, SignupOptInCopy> = {
  a: {
    label: 'Email me the best new Sims 4 CC finds.',
    note: 'No spam, unsubscribe anytime.',
  },
  b: {
    label: 'Yes, send me new Sims 4 CC finds every two weeks.',
    note: 'Free. One click to unsubscribe.',
  },
};

export function isSignupOptInArm(v: unknown): v is SignupOptInArm {
  return v === 'a' || v === 'b';
}

/**
 * The arm for this browser: the stored one if valid, otherwise a fresh 50/50
 * draw (`rand` in [0, 1)). Pure, so the split can be tested without a DOM.
 */
export function pickSignupOptInArm(stored: string | null | undefined, rand: number): SignupOptInArm {
  if (isSignupOptInArm(stored)) return stored;
  return rand < 0.5 ? 'a' : 'b';
}

/** Read-or-assign in the browser. Storage failure (private mode) still returns an arm. */
export function resolveSignupOptInArm(): SignupOptInArm {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(SIGNUP_OPTIN_ARM_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const arm = pickSignupOptInArm(stored, Math.random());
  if (arm !== stored) {
    try {
      window.localStorage.setItem(SIGNUP_OPTIN_ARM_STORAGE_KEY, arm);
    } catch {
      // Not persisted; this page view still has a valid arm.
    }
  }
  return arm;
}
