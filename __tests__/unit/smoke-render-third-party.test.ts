import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isThirdPartyPageError } from '../../scripts/agents/smoke-render-lib';

/**
 * E273 (row 2026-10-24 08:33, incident 2026-10-24-083301.md): /games/sims-4/furniture-cc/ threw three cross-origin
 * SecurityErrors from an ad safeframe. Chromium raises these with an EMPTY stack, so smoke-render's third-party rule
 * (keyed on an ` @ <frame url>` suffix) could not see them; they were graded "3 uncaught page error(s)", reproduced
 * on the retry (ads load on every render), and rolled production back from a merge that changed only
 * reports/funnel/changelog.md. Third false-alarm rollback since 09-22 (09-22 06:55, 09-26 06:46, 10-24 08:33).
 *
 * Fails against pre-fix origin/main: every case in the first describe (the export does not exist), and the
 * source assertion that smoke-render.ts delegates to it.
 */
const OUR = 'musthavemods.com';
// Verbatim from logs/funnel-daily.log 2026-10-24 08:35:08 — the failure line cuts the origin after 'da4b576905d8f6e1f'
// (the row is truncated to 120 chars); the rest of that host is unknown and is NOT reconstructed here.
const SAFEFRAME_10_24_LOGGED = 'Failed to read a named property \'addEventListener\' from \'Window\': Blocked a frame with origin "https://da4b576905d8f6e1f';
// The same error in Chromium's full shape (reproduced with Playwright 2026-10-25 against a local cross-origin iframe; the
// host below is a SYNTHETIC stand-in of the same length class, so the 200-char truncation can be exercised).
const SAFEFRAME_FULL = 'Failed to read a named property \'addEventListener\' from \'Window\': Blocked a frame with origin "https://da4b576905d8f6e1f0000000000000000000000000000000000000000000000.example-safeframe.test" from accessing a cross-origin frame.';
// What the pageerror handler actually stores: first line, 200 chars — the closing quote and the tail are cut.
const SAFEFRAME_TRUNCATED = SAFEFRAME_FULL.split('\n')[0].slice(0, 200);
// 2026-09-07 09:14: Mediavine's prebid bundle, surfaced through the stack-frame rule.
const PREBID_09_07 = 'Converting circular structure to JSON @ at track (https://scripts.mediavine.com/tags/must-have-mods.js:2:12345)';

describe('isThirdPartyPageError (E273): a cross-origin SecurityError from a foreign frame is third-party, not uncaught', () => {
  it('the exact 2026-10-24 message as logged (origin cut mid-host) is third-party', () => {
    expect(isThirdPartyPageError(SAFEFRAME_10_24_LOGGED, OUR)).toBe(true);
  });
  it('the full Chromium shape, and the 200-char cut the pageerror handler stores', () => {
    expect(SAFEFRAME_TRUNCATED.length).toBe(200);
    expect(SAFEFRAME_TRUNCATED.endsWith('"')).toBe(false); // the truncation really cuts inside/after the origin
    expect(isThirdPartyPageError(SAFEFRAME_FULL, OUR)).toBe(true);
    expect(isThirdPartyPageError(SAFEFRAME_TRUNCATED, OUR)).toBe(true);
  });
  it('an opaque ("null") origin — a sandboxed ad frame — is third-party', () => {
    expect(isThirdPartyPageError('Blocked a frame with origin "null" from accessing a cross-origin frame.', OUR)).toBe(true);
  });
  it('the same SecurityError thrown by OUR origin stays a hard failure (our code reaching into a foreign frame)', () => {
    expect(isThirdPartyPageError('Failed to read a named property \'addEventListener\' from \'Window\': Blocked a frame with origin "https://musthavemods.com" from accessing a cross-origin frame.', OUR)).toBe(false);
    expect(isThirdPartyPageError('Blocked a frame with origin "https://musthavemods.com" from accessing a frame with origin "https://x.example".', OUR)).toBe(false);
  });
  it('the 2026-09-07 prebid case still classifies through the stack-frame rule', () => {
    expect(isThirdPartyPageError(PREBID_09_07, OUR)).toBe(true);
  });
  it('a frame on our own host, or an error with neither signal, is NOT third-party', () => {
    expect(isThirdPartyPageError('TypeError: x is not a function @ at f (https://musthavemods.com/_next/static/chunks/app.js:1:1)', OUR)).toBe(false);
    expect(isThirdPartyPageError('TypeError: Cannot read properties of undefined (reading \'map\')', OUR)).toBe(false);
    expect(isThirdPartyPageError('ReferenceError: mediavine is not defined', OUR)).toBe(false);
    expect(isThirdPartyPageError('Blocked a frame with origin "not a url" from accessing a cross-origin frame.', OUR)).toBe(false);
  });
});

describe('smoke-render.ts delegates its third-party rule to the tested function', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/smoke-render.ts'), 'utf8');
  it('imports isThirdPartyPageError from the lib and uses it with OUR_HOST', () => {
    expect(src).toMatch(/isThirdPartyPageError[\s\S]*from '\.\/smoke-render-lib'/);
    expect(src).toMatch(/const isThirdParty = \(e: string\) => isThirdPartyPageError\(e, OUR_HOST\);/);
  });
  it('third-party errors are still counted separately and excluded from the hard list', () => {
    expect(src).toMatch(/thirdPartyErrors = pageErrors\.filter\(\(e\) => !isHydration\(e\) && isThirdParty\(e\)\)/);
    expect(src).toMatch(/!isHydration\(e\) && !isThirdParty\(e\) && !isNavError\(e\)/);
  });
});
