/**
 * E327 (Cass, 2026-11-04) — copy split-test on the sign-up form's email opt-in.
 *
 * What this protects:
 *   1. The split is real: a fresh browser lands in either arm close to 50/50,
 *      and a stored arm is kept (a browser never flips arms between visits).
 *   2. Attribution: both arms keep `waitlist.source = 'signup-optin'` (the E270
 *      scripted-sign-up exclusion keys on it), the arm lives only in GA4 on the
 *      registered `source` dimension, and the two arm labels are new values.
 *   3. Arm a is the pre-test copy, word for word (the control is the series).
 *   4. Truth: neither arm promises a weekly email (E184 → biweekly).
 *   5. Wiring: the page renders the arm's copy, fires the exposure only after
 *      the account exists, and fires the tick only on a NEW waitlist row.
 *   6. Consent: the box still starts unticked.
 *
 * Red against origin/main c5d9b344: lib/capture/signupOptInCopy.ts does not
 * exist, so the import fails the whole file.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  SIGNUP_OPTIN_ARM_LABEL,
  SIGNUP_OPTIN_COPY,
  SIGNUP_OPTIN_EVENTS,
  pickSignupOptInArm,
} from '../../lib/capture/signupOptInCopy';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const page = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));

describe('pickSignupOptInArm', () => {
  it('keeps a stored arm and ignores garbage', () => {
    expect(pickSignupOptInArm('a', 0.99)).toBe('a');
    expect(pickSignupOptInArm('b', 0.01)).toBe('b');
    expect(pickSignupOptInArm('c', 0.01)).toBe('a');
    expect(pickSignupOptInArm(null, 0.99)).toBe('b');
  });

  it('splits 2,000 even draws 50/50 and uses both arms', () => {
    let b = 0;
    for (let i = 0; i < 2000; i++) if (pickSignupOptInArm(null, i / 2000) === 'b') b++;
    expect(b).toBe(1000);
  });
});

describe('arm attribution and copy', () => {
  it('arm labels are distinct, new GA4 values; the waitlist source is untouched', () => {
    expect(SIGNUP_OPTIN_ARM_LABEL.a).not.toBe(SIGNUP_OPTIN_ARM_LABEL.b);
    for (const label of Object.values(SIGNUP_OPTIN_ARM_LABEL)) {
      expect(label).not.toBe('signup-optin');
      expect(label).toMatch(/^[a-z-]+$/);
    }
    expect(page).toMatch(/const SIGNUP_OPTIN_SOURCE = 'signup-optin'/);
    // The arm label must never reach the waitlist POST body.
    const post = page.indexOf("fetch('/api/waitlist'");
    expect(page.slice(post, post + 300)).toContain('source: SIGNUP_OPTIN_SOURCE');
    expect(page.slice(post, post + 300)).not.toContain('armLabel');
  });

  it('arm a is the pre-test copy, word for word', () => {
    expect(SIGNUP_OPTIN_COPY.a).toEqual({
      label: 'Email me the best new Sims 4 CC finds.',
      note: 'No spam, unsubscribe anytime.',
    });
  });

  it('the arms differ, and neither promises a weekly email', () => {
    expect(SIGNUP_OPTIN_COPY.b.label).not.toBe(SIGNUP_OPTIN_COPY.a.label);
    for (const arm of ['a', 'b'] as const) {
      const text = Object.values(SIGNUP_OPTIN_COPY[arm]).join(' ');
      expect(text).not.toMatch(/once a week|every week|weekly/i);
    }
  });
});

describe('sign-up page wiring (E327)', () => {
  it('renders the arm copy, not a hardcoded label', () => {
    expect(page).toContain('{optInCopy.label}');
    expect(page).toContain('{optInCopy.note}');
    expect(page).not.toContain('Email me the best new Sims 4 CC finds.');
  });

  it('fires the exposure after the account exists and before the opt-in gate', () => {
    const ok = page.indexOf('if (!response.ok)');
    const exposure = page.indexOf('SIGNUP_OPTIN_EVENTS.exposure');
    const gate = page.indexOf('if (wantsNewsletter)');
    expect(ok).toBeGreaterThan(0);
    expect(exposure).toBeGreaterThan(ok);
    expect(exposure).toBeLessThan(gate);
  });

  it('fires the tick only inside the new-row branch', () => {
    const newRow = page.indexOf('!optInData?.alreadyExists');
    const tick = page.indexOf('SIGNUP_OPTIN_EVENTS.tick');
    const autoSignIn = page.indexOf("signIn('credentials'", tick);
    expect(newRow).toBeGreaterThan(0);
    expect(tick).toBeGreaterThan(newRow);
    expect(autoSignIn).toBeGreaterThan(tick);
    expect(SIGNUP_OPTIN_EVENTS.tick).not.toBe('newsletter_signup');
  });

  it('consent unchanged: the box starts unticked', () => {
    expect(page).toMatch(/\[wantsNewsletter, setWantsNewsletter\] = useState\(false\)/);
    expect(page).not.toMatch(/defaultChecked/);
  });
});
