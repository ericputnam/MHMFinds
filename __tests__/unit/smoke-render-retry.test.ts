import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldRetryRender, SECONDARY_KINDS, SLOW_LOAD_MS } from '../../scripts/agents/smoke-render-lib';

// The exact 2026-09-22 06:55 case (incident 2026-09-22-0655.md): a single navigation timeout on the
// prerendered sitemap, graded as a structural failure and never retried → vercel rollback.
const SITEMAP_TIMEOUT = {
  failures: ['HTTP no response', '2 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.', 'empty response'],
  pageErrors: ['navigation: page.goto: Timeout 45000ms exceeded. Call log: - navigating to "https://musthavemods.com/sitemap.xml"', 'evaluate: Execution context was destroyed'],
};
// The 2026-09-26 07:05 case (incident 2026-09-26-064626.md): /go/<id> never answered Chromium (259 s) during a
// host-wide network stall; four such ad-page timeouts plus the homepage below rolled production back (E111).
const GO_TIMEOUT = {
  failures: ['HTTP no response (navigation: page.goto: Timeout 45000ms exceeded.)', 'Mediavine loader (scripts.mediavine.com) missing', 'aside#secondary (Mediavine sidebar anchor) missing', '.mv-ads in-content anchors missing', 'page text only 0 chars (blank render?)'],
  pageErrors: ['navigation: page.goto: Timeout 45000ms exceeded. Call log: - navigating to "https://musthavemods.com/go/cmkyol30z019zo"', 'evaluate: Execution context was destroyed'],
};
// The 2026-09-26 06:47 homepage: 200 in 27,779 ms, 1,788 chars (≈9,600 settled), .mv-ads = 0 — the client-fetched grid
// had not rendered inside the window.
const HOME_UNSETTLED = { failures: ['.mv-ads in-content anchors missing'], pageErrors: [] as string[], facts: { status: 200, ms: 27779, textLength: 1788, appError: false, settledText: 6000 } };

describe('shouldRetryRender (smoke-render false-alarm guard, E91 + E111)', () => {
  it('retries a navigation timeout on a secondary target (the 09-22 sitemap case)', () => {
    expect(shouldRetryRender('xml', SITEMAP_TIMEOUT.failures, SITEMAP_TIMEOUT.pageErrors)).toBe(true);
    expect(shouldRetryRender('text', SITEMAP_TIMEOUT.failures, SITEMAP_TIMEOUT.pageErrors)).toBe(true);
  });

  it('E111: retries a navigation timeout on an ad page too — one timeout is a reading about the network until it reproduces', () => {
    for (const kind of ['catalog', 'detail', 'interstitial', 'blog', 'game'] as const) {
      expect(SECONDARY_KINDS.has(kind)).toBe(false);
      expect(shouldRetryRender(kind, GO_TIMEOUT.failures, GO_TIMEOUT.pageErrors)).toBe(true);
    }
  });

  it('E111: retries an unsettled render — a slow 200 whose text is below the settled floor with only anchor failures', () => {
    expect(HOME_UNSETTLED.facts.ms).toBeGreaterThanOrEqual(SLOW_LOAD_MS);
    expect(shouldRetryRender('catalog', HOME_UNSETTLED.failures, HOME_UNSETTLED.pageErrors, HOME_UNSETTLED.facts)).toBe(true);
  });

  it('does NOT retry anchors missing on a settled page, a fast blank render, or an HTTP error — those are deterministic', () => {
    expect(shouldRetryRender('catalog', ['.mv-ads in-content anchors missing'], [], { status: 200, ms: 9000, textLength: 10344, appError: false, settledText: 6000 })).toBe(false);
    expect(shouldRetryRender('catalog', ['.mv-ads in-content anchors missing', 'page text only 120 chars (blank render?)'], [], { status: 200, ms: 3000, textLength: 120, appError: false, settledText: 6000 })).toBe(false);
    expect(shouldRetryRender('catalog', ['HTTP 500'], [], { status: 500, ms: 900, textLength: 0, appError: false })).toBe(false);
    expect(shouldRetryRender('catalog', ['Next.js "Application error" boundary rendered'], [], { status: 200, ms: 30000, textLength: 100, appError: true, settledText: 6000 })).toBe(false);
  });

  it('does NOT retry a secondary target that answered but with the wrong content', () => {
    expect(shouldRetryRender('xml', ['empty response'], [])).toBe(false);
    expect(shouldRetryRender('text', ['body does not contain the expected text (0 chars served)'], [])).toBe(false);
    expect(shouldRetryRender('xml', ['HTTP 500'], [])).toBe(false);
  });

  it('keeps the 2026-09-05 rule: page-error-only failures retry on every kind', () => {
    expect(shouldRetryRender('catalog', ['1 uncaught page error(s): Converting circular structure to JSON'], ['Converting circular structure to JSON @ at track (https://scripts.mediavine.com/x.js)'])).toBe(true);
  });

  it('never retries a passing render', () => {
    expect(shouldRetryRender('xml', [], [])).toBe(false);
  });

  it('smoke-render.ts actually calls shouldRetryRender with the render facts, only when the pre-run control passed', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/smoke-render.ts'), 'utf8')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(src).toMatch(/from '\.\/smoke-render-lib'/);
    expect(src).toMatch(/if \(netBefore\.ok && shouldRetryRender\(t\.kind, r\.failures, r\.pageErrors, facts\(r\)\)\)/);
    expect(src).toMatch(/await render\(t, RETRY_RENDER\)/);
  });
});
