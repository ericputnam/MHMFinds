/**
 * Sign-up form newsletter opt-in (Cass, E86, 2026-09-23) — source-level guards.
 *
 * What this protects:
 *   1. Consent: the checkbox starts unticked (useState(false)), is never
 *      `defaultChecked`, and the waitlist POST only happens when it is ticked.
 *   2. The opt-in can never break account creation: it runs after the
 *      /api/auth/signup response is ok, inside its own try/catch, before the
 *      auto sign-in.
 *   3. Attribution: its own waitlist.source ('signup-optin'), and the GA4
 *      newsletter_signup fires only for a NEW row (not `alreadyExists`).
 *
 * Comments are stripped before any assertion — files in this repo quote the
 * patterns they warn about.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const page = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));

describe('sign-up newsletter opt-in (E86)', () => {
  it('renders the checkbox on the sign-up form (vacuity guard)', () => {
    expect(page).toContain('name="newsletter-optin"');
    expect(page).toContain('checked={wantsNewsletter}');
  });

  it('is unticked by default — never pre-checked', () => {
    expect(page).toMatch(/\[wantsNewsletter, setWantsNewsletter\] = useState\(false\)/);
    expect(page).not.toMatch(/defaultChecked/);
    expect(page).not.toMatch(/useState\(true\)/);
  });

  it('posts to the waitlist only when ticked, with its own source', () => {
    expect(page).toMatch(/const SIGNUP_OPTIN_SOURCE = 'signup-optin'/);
    const gate = page.indexOf('if (wantsNewsletter)');
    const post = page.indexOf("fetch('/api/waitlist'");
    expect(gate).toBeGreaterThan(0);
    expect(post).toBeGreaterThan(gate);
    expect(page.slice(post, post + 300)).toContain('source: SIGNUP_OPTIN_SOURCE');
  });

  it('runs after the account exists and before auto sign-in, inside a try', () => {
    const signupPost = page.indexOf("fetch('/api/auth/signup'");
    const ok = page.indexOf('if (!response.ok)', signupPost);
    const gate = page.indexOf('if (wantsNewsletter)', signupPost);
    const innerTry = page.indexOf('try {', gate);
    const post = page.indexOf("fetch('/api/waitlist'", signupPost);
    const autoSignIn = page.indexOf("signIn('credentials'", signupPost);
    expect(signupPost).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(ok);
    expect(innerTry).toBeGreaterThan(gate);
    expect(innerTry).toBeLessThan(post);
    expect(post).toBeLessThan(autoSignIn);
  });

  it('fires the GA4 conversion only for a new row', () => {
    const post = page.indexOf("fetch('/api/waitlist'");
    const evt = page.indexOf("'newsletter_signup'", post);
    expect(evt).toBeGreaterThan(post);
    expect(page.slice(post, evt)).toMatch(/!optInData\?\.alreadyExists/);
  });
});
