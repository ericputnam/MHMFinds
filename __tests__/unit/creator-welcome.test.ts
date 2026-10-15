/**
 * Creator sign-ups land on a "submit your first mod" welcome (Nova, E211, 2026-10-15).
 *
 * What this guards:
 *   1. `resolvePostSignUpPath` changes nothing for non-creators, and for a
 *      creator returns only the constant dashboard path (plus a `from` that
 *      the dashboard re-sanitizes). No open redirect via `from`.
 *   2. The sign-up branch of /sign-in/ routes through it with the form's
 *      creator-box state (never rendered for the save cohort, so false there).
 *   3. The dashboard shows the welcome card only for `?welcome=1` with 0
 *      submissions, and every button that leads to /creators/submit/ fires
 *      the one E211 GA4 event with a registered `source`.
 *   4. Neither file names an ad anchor.
 *
 * Against pre-fix origin/main (a78176b) with only creatorWelcome.ts added,
 * the section 2 and 3 source-level cases are red (no resolvePostSignUpPath
 * call, no event on the dashboard); without the module section 1 cannot import.
 * Comments are stripped before any source-level assertion.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  CREATOR_SUBMIT_CTA_EVENT,
  CREATOR_SUBMIT_CTA_SOURCES,
  CREATOR_SUBMIT_PATH,
  CREATOR_WELCOME_PATH,
  readCreatorWelcome,
  resolvePostSignUpPath,
  shouldShowCreatorWelcome,
} from '../../app/sign-in/creatorWelcome';

const ROOT = join(__dirname, '..', '..');
const ORIGIN = 'https://musthavemods.com';
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const signIn = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));
const dashboard = stripComments(readFileSync(join(ROOT, 'app/creators/page.tsx'), 'utf8'));

describe('resolvePostSignUpPath', () => {
  it('leaves non-creator sign-ups exactly where E118 sent them', () => {
    expect(resolvePostSignUpPath({ creatorTicked: false, returnTo: '/mods/abc/?fav=1' })).toBe('/mods/abc/?fav=1');
    expect(resolvePostSignUpPath({ creatorTicked: false, returnTo: '/' })).toBe('/');
  });

  it('sends a creator to the dashboard welcome, carrying where they were', () => {
    const out = resolvePostSignUpPath({ creatorTicked: true, returnTo: '/mods/abc/' });
    expect(out.startsWith(`${CREATOR_WELCOME_PATH}?`)).toBe(true);
    const back = readCreatorWelcome(out.slice(out.indexOf('?')), ORIGIN);
    expect(back).toEqual({ welcome: true, from: '/mods/abc/' });
  });

  it('omits from when the visitor came from the homepage fallback', () => {
    expect(resolvePostSignUpPath({ creatorTicked: true, returnTo: '/' })).toBe('/creators/?welcome=1');
  });

  it('the dashboard path is under the middleware-gated /creators prefix', () => {
    expect(CREATOR_WELCOME_PATH).toBe('/creators/');
    expect(CREATOR_SUBMIT_PATH).toBe('/creators/submit/');
  });
});

describe('readCreatorWelcome — from is never an open redirect', () => {
  const hostile = ['https://evil.example/', '//evil.example/', '/\\evil.example/', 'javascript:alert(1)', '/sign-in/'];
  for (const h of hostile) {
    it(`drops from=${JSON.stringify(h)}`, () => {
      const q = `?welcome=1&from=${encodeURIComponent(h)}`;
      expect(readCreatorWelcome(q, ORIGIN)).toEqual({ welcome: true, from: null });
    });
  }

  it('ignores from without the welcome flag', () => {
    expect(readCreatorWelcome('?from=%2Fmods%2F', ORIGIN)).toEqual({ welcome: false, from: null });
  });
});

describe('shouldShowCreatorWelcome', () => {
  it('shows only for ?welcome=1 with 0 submissions', () => {
    expect(shouldShowCreatorWelcome({ welcome: true, from: null }, 0)).toBe(true);
    expect(shouldShowCreatorWelcome({ welcome: true, from: null }, 1)).toBe(false);
    expect(shouldShowCreatorWelcome({ welcome: false, from: null }, 0)).toBe(false);
  });
});

describe('sign-in page wiring (E211)', () => {
  it('routes the sign-up success through resolvePostSignUpPath with the creator-box state', () => {
    expect(signIn).toContain("from './creatorWelcome'");
    expect(signIn).toMatch(
      /router\.push\(\s*resolvePostSignUpPath\(\{\s*creatorTicked: isCreator,\s*returnTo: returnPath\(\),?\s*\}\)/
    );
  });
});

describe('dashboard wiring (E211)', () => {
  it('pins the event name and sources (registered GA4 dimension `source`)', () => {
    expect(CREATOR_SUBMIT_CTA_EVENT).toBe('creator_submit_cta_click');
    expect(Object.values(CREATOR_SUBMIT_CTA_SOURCES).sort()).toEqual(
      ['creator-welcome', 'dashboard-empty-state', 'dashboard-quick-action']
    );
  });

  it('fires the event from the constant, with { source }', () => {
    expect(dashboard).toMatch(/CREATOR_SUBMIT_CTA_EVENT,\s*\{ source \}/);
    expect(dashboard).not.toContain("'creator_submit_cta_click'");
  });

  it('every link to the submit form is instrumented (vacuity: ≥3 links)', () => {
    const links = dashboard.match(/href=\{CREATOR_SUBMIT_PATH\}\s*onClick=\{\(\) => trackSubmitCta\(CREATOR_SUBMIT_CTA_SOURCES\.\w+\)\}/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const key of Object.keys(CREATOR_SUBMIT_CTA_SOURCES)) {
      expect(dashboard).toContain(`trackSubmitCta(CREATOR_SUBMIT_CTA_SOURCES.${key})`);
    }
    expect(dashboard).not.toMatch(/href="\/creators\/submit\/?"/);
  });

  it('gates the card on shouldShowCreatorWelcome and reads the query via the module', () => {
    expect(dashboard).toMatch(/shouldShowCreatorWelcome\(welcomeState, stats\.totalSubmissions\)/);
    expect(dashboard).toMatch(/readCreatorWelcome\(window\.location\.search, window\.location\.origin\)/);
  });
});

describe('no ad anchors touched', () => {
  it('neither file names an ad anchor', () => {
    for (const src of [signIn, dashboard]) {
      expect(src).not.toMatch(/mv-ads|id="secondary"|mediavine/i);
    }
  });
});
