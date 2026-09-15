/**
 * E55 — affiliate placement kill switch (Rio, 2026-09-15).
 *
 * Two halves:
 *   1. Parser/decision unit tests for lib/affiliatePlacements.ts.
 *   2. Source-level guards, in the style of sidebar-sticky-health.test.ts and
 *      membership.test.ts: the flag is read as a literal `process.env.NEXT_PUBLIC_…`
 *      expression (DefinePlugin inlining — the E24 regression), every mount
 *      site calls the helper, and the change never touched the `.mv-ads`
 *      wrappers, `aside#secondary`, or the ModGrid `.mv-ads` class.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ALL_AFFILIATE_PLACEMENTS,
  DEFAULT_PLACEMENTS,
  isAffiliatePlacementEnabled,
  parseAffiliatePlacements,
} from '@/lib/affiliatePlacements';

const ROOT = process.cwd();
const readSource = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('E55 defaults', () => {
  it('keeps the grid placement on and switches the two sibling blocks off', () => {
    expect(DEFAULT_PLACEMENTS).toEqual({
      grid: true,
      mod_page: false,
      interstitial: false,
      sidebar: false,
    });
  });

  it('enumerates every sourceType the click schema knows', () => {
    expect([...ALL_AFFILIATE_PLACEMENTS].sort()).toEqual(['grid', 'interstitial', 'mod_page', 'sidebar']);
  });
});

describe('parseAffiliatePlacements', () => {
  it('returns the defaults when the variable is unset', () => {
    expect(parseAffiliatePlacements(undefined)).toEqual(DEFAULT_PLACEMENTS);
  });

  it('treats a set value as an exact allow-list', () => {
    expect(parseAffiliatePlacements('grid,mod_page,interstitial')).toEqual({
      grid: true,
      mod_page: true,
      interstitial: true,
      sidebar: false,
    });
    expect(parseAffiliatePlacements('mod_page')).toEqual({
      grid: false,
      mod_page: true,
      interstitial: false,
      sidebar: false,
    });
  });

  it('turns everything off for "none" and for the empty string', () => {
    const allOff = { grid: false, mod_page: false, interstitial: false, sidebar: false };
    expect(parseAffiliatePlacements('none')).toEqual(allOff);
    expect(parseAffiliatePlacements('')).toEqual(allOff);
    expect(parseAffiliatePlacements('  ')).toEqual(allOff);
  });

  it('tolerates whitespace and case, and ignores unknown tokens', () => {
    expect(parseAffiliatePlacements(' Grid , INTERSTITIAL ,bogus,')).toEqual({
      grid: true,
      mod_page: false,
      interstitial: true,
      sidebar: false,
    });
  });
});

describe('isAffiliatePlacementEnabled', () => {
  it('uses the injected value when one is passed (tests only)', () => {
    expect(isAffiliatePlacementEnabled('mod_page', 'grid,mod_page')).toBe(true);
    expect(isAffiliatePlacementEnabled('mod_page', 'grid')).toBe(false);
    expect(isAffiliatePlacementEnabled('grid', 'none')).toBe(false);
  });

  it('falls back to the code defaults when the injected value is undefined', () => {
    expect(isAffiliatePlacementEnabled('grid', undefined)).toBe(true);
    expect(isAffiliatePlacementEnabled('mod_page', undefined)).toBe(false);
    expect(isAffiliatePlacementEnabled('interstitial', undefined)).toBe(false);
  });

  it('with no argument, agrees with the defaults in this (unset) test environment', () => {
    // vitest does not load .env.local; the var is unset here unless a CI job sets it.
    if (process.env.NEXT_PUBLIC_AFFILIATE_PLACEMENTS === undefined) {
      expect(isAffiliatePlacementEnabled('grid')).toBe(true);
      expect(isAffiliatePlacementEnabled('mod_page')).toBe(false);
      expect(isAffiliatePlacementEnabled('interstitial')).toBe(false);
    }
  });
});

describe('the flag is read in a way Next.js can inline into the client bundle', () => {
  const src = readSource('lib/affiliatePlacements.ts');

  it('reads the literal process.env.NEXT_PUBLIC_AFFILIATE_PLACEMENTS expression', () => {
    expect(src).toMatch(/:\s*process\.env\.NEXT_PUBLIC_AFFILIATE_PLACEMENTS\b/);
  });

  it('never reads the flag through a computed key or a process.env default parameter', () => {
    expect(src).not.toMatch(/process\.env\[/);
    expect(src).not.toMatch(/=\s*process\.env\s*[,)]/);
  });

  it('stays a pure module (safe to import from client components)', () => {
    expect(src).not.toMatch(/@\/lib\/prisma/);
    expect(src).not.toMatch(/\bfetch\(/);
  });
});

describe('every mount site goes through the switch with no injected value', () => {
  it('AffiliateRecommendations gates its fetch and its render on the placement', () => {
    const src = stripComments(readSource('components/AffiliateRecommendations.tsx'));
    expect(src).toContain("from '@/lib/affiliatePlacements'");
    expect(src).toContain('isAffiliatePlacementEnabled(sourceType)');
    // No fetch when off …
    expect(src).toMatch(/if \(!enabled \|\| !themes/);
    // … and nothing rendered when off.
    expect(src).toMatch(/if \(!enabled \|\| !themes \|\| themes\.length === 0\) \{\s*return null;/);
  });

  it('ModDetailClient gates the mod_page block so no empty wrapper is left behind', () => {
    const src = stripComments(readSource('app/mods/[id]/ModDetailClient.tsx'));
    expect(src).toContain("isAffiliatePlacementEnabled('mod_page') && mod.themes && mod.themes.length > 0 && (");
  });

  it('GoClient gates the interstitial block so no empty wrapper is left behind', () => {
    const src = stripComments(readSource('app/go/[modId]/GoClient.tsx'));
    expect(src).toContain("isAffiliatePlacementEnabled('interstitial') && mod?.themes && mod.themes.length > 0 && (");
  });

  it('ModGrid and useAffiliateOffers honour the grid placement', () => {
    const grid = stripComments(readSource('components/ModGrid.tsx'));
    expect(grid).toContain("isAffiliatePlacementEnabled('grid')");
    expect(grid).toMatch(/gridPlacementEnabled &&\s*affiliateOffers\.length > 0 &&/);

    const hook = stripComments(readSource('lib/hooks/useAffiliateOffers.ts'));
    expect(hook).toContain('isAffiliatePlacementEnabled(source)');
    expect(hook).toMatch(/if \(!enabled\) \{\s*setOffers\(\[\]\);\s*setLoading\(false\);\s*return;/);
  });
});

describe('E55 never touched the Mediavine anchors (Tier 1 condition)', () => {
  it('ModGrid still renders its grid with the mv-ads class, unchanged', () => {
    const src = readSource('components/ModGrid.tsx');
    expect(src).toContain('<div className={`grid ${getGridClasses(gridColumns)} gap-x-6 gap-y-10 mv-ads`}>');
    // Exactly one .mv-ads container in the grid component, as before.
    expect(src.match(/mv-ads`\}/g)?.length).toBe(1);
  });

  it('ModDetailClient keeps its .mv-ads sidebar wrapper and an empty aside#secondary', () => {
    const src = readSource('app/mods/[id]/ModDetailClient.tsx');
    expect(src).toContain('{/* end .mv-ads sidebar wrapper */}');
    expect(src).toContain('id="secondary"');
    expect(src).toContain('className="widget-area primary-sidebar hidden lg:block mt-6 overflow-visible"');
    // The affiliate block sits between the wrapper end and the aside — still a sibling of both.
    const wrapperEnd = src.indexOf('{/* end .mv-ads sidebar wrapper */}');
    const gate = src.indexOf("isAffiliatePlacementEnabled('mod_page')");
    const aside = src.indexOf('id="secondary"');
    expect(wrapperEnd).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(wrapperEnd);
    expect(aside).toBeGreaterThan(gate);
  });

  it('GoClient keeps the affiliate block a sibling of the mv-ads wrapper and of aside#secondary', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx');
    expect(src).toContain('id="secondary"');
    const stripped = stripComments(src);
    // Every mv-ads wrapper closes before the interstitial gate appears.
    const gate = stripped.indexOf("isAffiliatePlacementEnabled('interstitial')");
    const lastMvAds = stripped.lastIndexOf('mv-ads');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(lastMvAds);
    expect(stripped.indexOf('id="secondary"')).toBeGreaterThan(gate);
  });
});

describe('env.example documents the switch beside the membership flag', () => {
  it('names the variable and the "empty string means none" failure mode', () => {
    const src = readSource('env.example');
    expect(src).toContain('NEXT_PUBLIC_AFFILIATE_PLACEMENTS');
    expect(src).toMatch(/string is read as "none"/);
    expect(src.indexOf('NEXT_PUBLIC_AFFILIATE_PLACEMENTS')).toBeGreaterThan(src.indexOf('NEXT_PUBLIC_MEMBERSHIP_ENABLED'));
  });
});
