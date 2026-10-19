/**
 * E242 (Rowan, 2026-10-19): the 8 adult-themed titles Sage found in the
 * gameplay-mod / script-mod top 25 (playbooks/sage.md 2026-10-18) are pinned
 * in HAND_AUDITED_NSFW, and every scraper path that rewrites `isNSFW` on an
 * EXISTING row consults the pin, so an automated re-scrape cannot flip a
 * hand-audited row back.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import * as handAudited from '../../scripts/lib/hand-audited-content-types';

// Decided from the title and the known franchise, never the description.
const E242_EXPECTED: Record<string, boolean> = {
  cmijppd0j0162oxc81yf6k5dz: true, // MC WooHoo (MCCC adult module)
  cmim8rrvz002boxy8vcqt0yrg: true, // Wicked Whims
  cmijppj1r0166oxc850u0lir1: true, // Prostitution Mod
  cmim9dnuf000yoxqwqbhi32f4: true, // The Ho* It Up Mod
  cmim9jz39002uoxy7z2tbyidh: true, // Sims 4 Breast Slider Mod
  cmikk9oj9006tox331c1a2g0g: true, // Basemental Drugs & Gangs Mods
  cmim91d7u01l8oxy8mrvijtik: false, // Wonderful Whims — TURBODRIVER's non-explicit counterpart, pinned SFW
  cmim8rs4i002eoxy8enc7gbsp: false, // Cuddle and Bath Together — base-game-level, pinned SFW
};

type Pin = { isNSFW: boolean; why: string };
const pins = (handAudited as unknown as { HAND_AUDITED_NSFW?: Record<string, Pin> }).HAND_AUDITED_NSFW;
const pinnedIsNSFW = (handAudited as unknown as { pinnedIsNSFW?: (id: string) => boolean | undefined }).pinnedIsNSFW;

describe('E242 hand-audited isNSFW pins', () => {
  it('exports a pin table and lookup', () => {
    expect(pins).toBeTypeOf('object');
    expect(pinnedIsNSFW).toBeTypeOf('function');
  });

  for (const [id, want] of Object.entries(E242_EXPECTED)) {
    it(`${id} is pinned isNSFW=${want} with a dated why`, () => {
      expect(pins?.[id]?.isNSFW).toBe(want);
      expect(pins?.[id]?.why).toMatch(/^E242 /);
      expect(pinnedIsNSFW?.(id)).toBe(want);
    });
  }

  it('returns undefined for an id nobody audited', () => {
    expect(pinnedIsNSFW?.('not-a-real-id')).toBeUndefined();
  });
});

// Every scraper `prisma.mod.update` that writes isNSFW must route it through
// pinnedIsNSFW. Comments are stripped first (they quote the bad pattern).
const SCRAPERS = ['lib/services/weWantModsScraper.ts', 'lib/services/privacyAggregator.ts', 'lib/services/mhmScraper.ts'];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function updateBlocks(src: string): string[] {
  const out: string[] = [];
  const re = /prisma\.mod\.update\(\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index + 'prisma.mod.update('.length;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) break;
    }
    out.push(src.slice(start, i + 1));
  }
  return out;
}

describe('E242 scraper update paths honour the isNSFW pin', () => {
  const blocks = SCRAPERS.flatMap((f) =>
    updateBlocks(stripComments(readFileSync(resolve(__dirname, '../..', f), 'utf8'))).map((b) => ({ f, b })),
  );

  it('finds scraper update calls (vacuity guard)', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it('finds at least two updates that write isNSFW (vacuity guard)', () => {
    expect(blocks.filter(({ b }) => /\bisNSFW\s*:/.test(b)).length).toBeGreaterThanOrEqual(2);
  });

  it('every update that writes isNSFW consults pinnedIsNSFW', () => {
    const bad = blocks
      .filter(({ b }) => /\bisNSFW\s*:/.test(b) && !/\bisNSFW\s*:\s*pinnedIsNSFW\(/.test(b))
      .map(({ f }) => f);
    expect(bad).toEqual([]);
  });
});
