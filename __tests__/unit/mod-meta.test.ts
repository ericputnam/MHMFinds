/**
 * E83 (2026-09-23): /mods/[id] title qualifier by content class + meta
 * description cut on a word boundary.
 *
 * Run red first against pre-fix origin/main: the import guard (section 3)
 * and the "mid-word" case fail there; the CC and not-found cases pass on
 * both trees, which is the point — the CC surface is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  GAMEPLAY_CATEGORIES,
  GAMEPLAY_CONTENT_TYPES,
  META_DESCRIPTION_MAX,
  isGameplayMod,
  modMetaDescription,
  modPageTitle,
  truncateAtWord,
} from '@/lib/seo/modMeta';

describe('modPageTitle', () => {
  it('keeps the CC qualifier for custom content', () => {
    expect(modPageTitle({ title: 'Nekoswirl Gshade Preset', contentType: 'preset', category: 'Build/Buy' }))
      .toBe('Nekoswirl Gshade Preset - Sims 4 CC | MustHaveMods');
    expect(modPageTitle({ title: 'Test CC Title' })).toBe('Test CC Title - Sims 4 CC | MustHaveMods');
    // A CC title that says "Mod" reads better with "for Sims 4" than "- Sims 4 CC".
    expect(modPageTitle({ title: 'Test Mod Title' })).toBe('Test Mod Title for Sims 4 | MustHaveMods');
  });

  it('uses "for Sims 4" for gameplay mods by contentType, category, or title', () => {
    // The five pos 4–15 pages with ≥100 impressions and ≤2% CTR (GSC 28d to 09-20).
    expect(modPageTitle({ title: 'Teen Stories and Activities Mod', contentType: 'gameplay-mod', category: 'Scripts' }))
      .toBe('Teen Stories and Activities Mod for Sims 4 | MustHaveMods');
    expect(modPageTitle({ title: 'Teen Lifestyle Gamepack Mod', contentType: 'gameplay-mod', category: 'Gameplay' }))
      .toBe('Teen Lifestyle Gamepack Mod for Sims 4 | MustHaveMods');
    // Mis-tagged as accessories; the title says "Mod".
    expect(modPageTitle({ title: 'Love Language v2 Mod', contentType: 'accessories', category: 'CAS - Accessories' }))
      .toBe('Love Language v2 Mod for Sims 4 | MustHaveMods');
    // No "mod" in the title, but the detector says gameplay.
    expect(modPageTitle({ title: 'Go for a Jog Together', contentType: 'script-mod', category: 'Other' }))
      .toBe('Go for a Jog Together for Sims 4 | MustHaveMods');
    expect(modPageTitle({ title: 'Better Loading Screen', contentType: null, category: 'UI/UX' }))
      .toBe('Better Loading Screen for Sims 4 | MustHaveMods');
  });

  it('adds no qualifier when the title already names the game', () => {
    expect(modPageTitle({ title: 'Messy Relationships Mod for Sims 4', contentType: 'gameplay-mod' }))
      .toBe('Messy Relationships Mod for Sims 4 | MustHaveMods');
    expect(modPageTitle({ title: 'Love Triangle Mod for Sims 4', contentType: 'accessories' }))
      .toBe('Love Triangle Mod for Sims 4 | MustHaveMods');
  });

  it('does not treat "modern" or "model" as "mod"', () => {
    expect(isGameplayMod({ title: 'Modern Kitchen Set' })).toBe(false);
    expect(isGameplayMod({ title: 'Model Poses Pack' })).toBe(false);
    expect(isGameplayMod({ title: 'Career Mods Bundle' })).toBe(true);
  });

  it('handles other games the old way', () => {
    expect(modPageTitle({ title: 'Shaders Pack', gameVersion: 'Minecraft' }))
      .toBe('Shaders Pack - Minecraft Mod | MustHaveMods');
  });

  it('gameplay sets are non-empty and match the catalog vocabulary', () => {
    expect(GAMEPLAY_CONTENT_TYPES.has('gameplay-mod')).toBe(true);
    expect(GAMEPLAY_CATEGORIES.has('Gameplay')).toBe(true);
    expect(GAMEPLAY_CATEGORIES.has('Scripts')).toBe(true);
  });
});

describe('modMetaDescription', () => {
  // The scraper stores shortDescription as description.slice(0, 200); build
  // the fixture the same way so the cut lands mid-word by construction.
  const full =
    'The Teen Stories and Activities Mod adds 15 rabbit hole activities for teen Sims to engage in. ' +
    'However, your teen Sim must ask for permission before going out to avoid getting grounded by their parents every time.';
  const twoHundred = full.slice(0, 200);

  it('never ends mid-word on the 200-char shortDescription cut', () => {
    expect(full.length).toBeGreaterThan(200);
    expect(twoHundred.length).toBe(200);
    expect(twoHundred).toMatch(/\S$/);
    expect(full[200]).not.toBe(' '); // the raw cut really is mid-word
    const out = modMetaDescription({ title: 'x', shortDescription: twoHundred });
    expect(out.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/ ge…$/);
    // Every character before the ellipsis is a whole word from the source.
    const body = out.slice(0, -1);
    expect(twoHundred.startsWith(body)).toBe(true);
    expect(twoHundred[body.length]).toBe(' ');
  });

  it('returns short text untouched and without an ellipsis', () => {
    expect(modMetaDescription({ title: 'x', shortDescription: 'A cool mod' })).toBe('A cool mod');
  });

  it('falls back to description, then to a titled sentence', () => {
    expect(modMetaDescription({ title: 'x', shortDescription: null, description: '  Two  spaces  ' })).toBe('Two spaces');
    expect(modMetaDescription({ title: 'Fallback Mod', shortDescription: '', description: null }))
      .toBe('Fallback Mod - Sims 4 custom content mod on MustHaveMods.');
  });

  it('truncateAtWord drops dangling punctuation and respects max', () => {
    expect(truncateAtWord('alpha beta, gamma delta', 12)).toBe('alpha beta…');
    expect(truncateAtWord('alpha beta - gamma', 13)).toBe('alpha beta…');
    for (const max of [20, 60, 155]) {
      expect(truncateAtWord(twoHundred, max).length).toBeLessThanOrEqual(max);
    }
  });
});

describe('app/mods/[id]/page.tsx uses the shared rule (source guard)', () => {
  const src = readFileSync(join(process.cwd(), 'app/mods/[id]/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('imports modPageTitle and modMetaDescription and calls both', () => {
    expect(src).toMatch(/from '@\/lib\/seo\/modMeta'/);
    expect(src).toMatch(/title:\s*modPageTitle\(mod\)/);
    expect(src).toMatch(/modMetaDescription\(mod\)/);
  });

  it('no longer slices the description at a fixed offset or hardcodes the qualifier', () => {
    expect(src).not.toMatch(/description\?\.slice\(0,\s*160\)/);
    expect(src).not.toMatch(/' - Sims 4 CC'/);
  });

  it('selects contentType and category so the rule has its inputs', () => {
    const select = src.slice(src.indexOf('generateMetadata'), src.indexOf('if (!mod)'));
    expect(select).toMatch(/contentType:\s*true/);
    expect(select).toMatch(/category:\s*true/);
  });
});
