import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 4 — In-content ads on /mods/[id]
 *
 * Source-level regression test (mirrors sidebar-sticky-health.test.ts pattern).
 * We assert on the component source text, not runtime behavior, because
 * Mediavine scripts don't load on localhost.
 */

const MOD_DETAIL_CLIENT = join(
  process.cwd(),
  'app/mods/[id]/ModDetailClient.tsx',
);

function read(): string {
  return readFileSync(MOD_DETAIL_CLIENT, 'utf8');
}

describe('Mod detail ad anchors', () => {
  it('has at least 4 in-content ad insertion points', () => {
    const src = read();
    const matches = src.match(/<InContentAd/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('InContentAd helper uses the mv-ads class Mediavine targets', () => {
    const src = read();
    expect(src).toMatch(/function InContentAd[\s\S]*?className=["']mv-ads/);
  });

  it('preserves the Mediavine sidebar anchor', () => {
    const src = read();
    expect(src).toMatch(/id=["']secondary["']/);
  });

  it('does NOT reserve a 400px empty video player container', () => {
    const src = read();
    // The removed reservation — floating Universal Player is site-wide,
    // no local anchor needed, and the empty 400px box hurt UX.
    expect(src).not.toMatch(/id=["']mediavine-video-player["']/);
    expect(src).not.toMatch(/minHeight:\s*['"]400px['"]/);
  });

  it('does not use forbidden CSS patterns on ad anchors', () => {
    const src = read();
    // Per CLAUDE.md: position: sticky/fixed + overflow: hidden kill Mediavine.
    const adLines = src
      .split('\n')
      .filter((line) => /mv-ads|id=["']secondary["']/.test(line));
    for (const line of adLines) {
      expect(line).not.toMatch(/position:\s*['"]?(sticky|fixed)/);
      expect(line).not.toMatch(/overflow-hidden|overflow:\s*['"]?hidden/);
    }
  });
});
