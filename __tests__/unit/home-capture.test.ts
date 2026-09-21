/**
 * Homepage capture strip (Cass, E73, 2026-09-21) — source-level guards.
 *
 * What this protects:
 *   1. The strip is rendered on the homepage ABOVE the grid/sidebar row and
 *      is never a child of a `.mv-ads` container or of `aside#secondary`
 *      (Mediavine: elements inside `.mv-ads` change ad geometry; siblings are
 *      free). A later refactor that drags it into the grid row must fail here.
 *   2. Every owned-audience add it produces is attributable: the email form
 *      carries the `home-hero` source and the account link carries
 *      `ref=home-hero`, and the sign-up success branch fires GA4 `sign_up`.
 *   3. No first-paint blocker: no modal / fixed / dialog markup.
 *
 * Comments are stripped before any assertion — files in this repo quote the
 * patterns they warn about, so a naive indexOf matches the documentation.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HOME = 'app/HomePageClient.tsx';
const STRIP = 'components/HomeCapture.tsx';
const SIGN_IN = 'app/sign-in/page.tsx';

describe('HomeCapture — placement relative to ad anchors', () => {
  const home = stripComments(read(HOME));

  it('is rendered on the homepage (vacuity guard)', () => {
    expect(home).toContain('<HomeCapture');
    expect(home).toMatch(/import \{ HomeCapture \} from ['"]\.\.\/components\/HomeCapture['"]/);
  });

  it('sits above the grid row, the ModGrid and aside#secondary', () => {
    const strip = home.indexOf('<HomeCapture');
    const grid = home.indexOf('<ModGrid');
    const aside = home.indexOf('id="secondary"');
    const gridRow = home.indexOf('<FacetedSidebar');
    expect(grid).toBeGreaterThan(0);
    expect(aside).toBeGreaterThan(0);
    expect(gridRow).toBeGreaterThan(0);
    expect(strip).toBeLessThan(gridRow);
    expect(strip).toBeLessThan(grid);
    expect(strip).toBeLessThan(aside);
  });

  it('the component itself never names an ad anchor', () => {
    const src = stripComments(read(STRIP));
    expect(src).not.toMatch(/mv-ads/);
    expect(src).not.toMatch(/id=["']secondary["']/);
    expect(src).not.toMatch(/mediavine/i);
  });

  it('is not a first-paint blocker (no modal, dialog, fixed or hidden markup)', () => {
    const src = stripComments(read(STRIP));
    expect(src).not.toMatch(/role=["']dialog["']/);
    expect(src).not.toMatch(/\bfixed\b/);
    expect(src).not.toMatch(/\bhidden\b/);
    expect(src).not.toMatch(/\bmodal\b/i);
  });
});

describe('HomeCapture — attribution', () => {
  const src = stripComments(read(STRIP));

  it('the email form carries the home-hero source', () => {
    expect(src).toMatch(/HOME_CAPTURE_SOURCE = ['"]home-hero['"]/);
    expect(src).toMatch(/<NewsletterSignup source=\{HOME_CAPTURE_SOURCE\}/);
  });

  it('the account link goes to sign-up with ref=home-hero and a trailing slash before the query', () => {
    expect(src).toMatch(/href=\{`\/sign-in\/\?mode=signup&ref=\$\{HOME_CAPTURE_SOURCE\}`\}/);
    expect(src).toMatch(/['"]account_cta_click['"]/);
  });

  it('the sign-up success branch fires GA4 sign_up with the ref', () => {
    const signIn = stripComments(read(SIGN_IN));
    // The signup handler is the one that POSTs /api/auth/signup; the sign-in
    // handler earlier in the file also calls signIn('credentials'), so every
    // index is taken from the signup POST forward.
    const signupPost = signIn.indexOf("fetch('/api/auth/signup'");
    expect(signupPost).toBeGreaterThan(0);
    const ok = signIn.indexOf('if (!response.ok)', signupPost);
    const evt = signIn.indexOf("'sign_up'", signupPost);
    const autoSignIn = signIn.indexOf("signIn('credentials'", signupPost);
    expect(ok).toBeGreaterThan(0);
    expect(evt).toBeGreaterThan(ok);
    expect(evt).toBeLessThan(autoSignIn);
    expect(signIn).toMatch(/ref: searchParams\?\.get\('ref'\)/);
  });
});
