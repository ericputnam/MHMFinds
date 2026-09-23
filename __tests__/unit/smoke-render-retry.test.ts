import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldRetryRender, SECONDARY_KINDS } from '../../scripts/agents/smoke-render-lib';

// The exact 2026-09-22 06:55 case (incident 2026-09-22-0655.md): a single navigation timeout on the
// prerendered sitemap, graded as a structural failure and never retried → vercel rollback.
const SITEMAP_TIMEOUT = {
  failures: ['HTTP no response', '2 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.', 'empty response'],
  pageErrors: ['navigation: page.goto: Timeout 45000ms exceeded. Call log: - navigating to "https://musthavemods.com/sitemap.xml"', 'evaluate: Execution context was destroyed'],
};

describe('shouldRetryRender (smoke-render false-alarm guard, E91)', () => {
  it('retries a navigation timeout on a secondary target (the 09-22 sitemap case)', () => {
    expect(shouldRetryRender('xml', SITEMAP_TIMEOUT.failures, SITEMAP_TIMEOUT.pageErrors)).toBe(true);
    expect(shouldRetryRender('text', SITEMAP_TIMEOUT.failures, SITEMAP_TIMEOUT.pageErrors)).toBe(true);
  });

  it('does NOT retry a navigation timeout on an ad page — that is the failure the smoke exists to catch', () => {
    for (const kind of ['catalog', 'detail', 'interstitial', 'blog', 'game'] as const) {
      expect(SECONDARY_KINDS.has(kind)).toBe(false);
      expect(shouldRetryRender(kind, SITEMAP_TIMEOUT.failures, SITEMAP_TIMEOUT.pageErrors)).toBe(false);
    }
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

  it('smoke-render.ts actually calls shouldRetryRender (the lib is not decoration)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/smoke-render.ts'), 'utf8')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(src).toMatch(/from '\.\/smoke-render-lib'/);
    expect(src).toMatch(/if \(shouldRetryRender\(t\.kind, r\.failures, r\.pageErrors\)\)/);
  });
});
