import { describe, expect, it } from 'vitest';
import {
  cleanCreator,
  displayTitle,
  groupTypes,
  labelCase,
  TYPE_CLOUD_MIN,
} from '../../components/launcher/display';

describe('cleanCreator', () => {
  it('drops placeholders scraped in place of a name', () => {
    expect(cleanCreator('75940181')).toBeNull();
    expect(cleanCreator('U91904865')).toBeNull();
    expect(cleanCreator('January 2024 Set 96368659')).toBeNull();
    expect(cleanCreator('250112 Female')).toBeNull();
    expect(cleanCreator('')).toBeNull();
    expect(cleanCreator(null)).toBeNull();
  });

  it('strips a long id glued to a real phrase', () => {
    expect(cleanCreator('Random Urban 66056001')).toBe('Random Urban');
  });

  it('keeps real handles that contain digits', () => {
    for (const h of ['cassie1900', 'MommaBear0705', 'Gauntlet101010', 'L3000', 'Stephanie_Mey1991']) {
      expect(cleanCreator(h)).toBe(h);
    }
  });
});

describe('displayTitle', () => {
  it('replaces wordless titles with the type', () => {
    expect(displayTitle('2025 81', 'Full Body')).toBe('Full Body CC');
    expect(displayTitle('#12', null)).toBe('Untitled find');
  });

  it('keeps real titles, including ones that start with a number', () => {
    expect(displayTitle('2000s Aeropostale Tees', 'Tops')).toBe('2000s Aeropostale Tees');
    expect(displayTitle('Y2K Flip Phone', null)).toBe('Y2K Flip Phone');
  });
});

describe('labelCase', () => {
  it('capitalises lower-case labels and leaves cased ones alone', () => {
    expect(labelCase('builds')).toBe('Builds');
    expect(labelCase('UI / Preset')).toBe('UI / Preset');
    expect(labelCase('CAS Background')).toBe('CAS Background');
  });
});

describe('groupTypes', () => {
  const t = (value: string, count: number, displayName = value) => ({ value, displayName, count });

  it('drops tiny and placeholder types, keeps small other-game types', () => {
    const groups = groupTypes([
      t('hair', 2099, 'Hair'),
      t('portraits', 1, 'Portraits'),
      t('cc-finds', 500, 'CC Finds'),
      t('food', 3, 'Food & Recipes'),
      t('texture-pack', 9, 'Texture Packs'),
      t('mystery-new-type', 40, 'Mystery'),
    ]);
    const all = groups.flatMap((g) => g.types.map((x) => x.value));
    expect(all).toContain('hair');
    expect(all).toContain('texture-pack');
    expect(all).not.toContain('portraits');
    expect(all).not.toContain('food');
    expect(all).not.toContain('cc-finds');
    // Unmapped types still render, under "More".
    expect(groups.find((g) => g.key === 'more')?.types.map((x) => x.value)).toEqual(['mystery-new-type']);
  });

  it('never shows a regular type below the floor', () => {
    const groups = groupTypes([t('rugs', TYPE_CLOUD_MIN - 1), t('decor', TYPE_CLOUD_MIN)]);
    expect(groups.flatMap((g) => g.types.map((x) => x.value))).toEqual(['decor']);
  });

  it('omits empty groups', () => {
    expect(groupTypes([t('hair', 50)]).map((g) => g.key)).toEqual(['looks']);
  });
});
