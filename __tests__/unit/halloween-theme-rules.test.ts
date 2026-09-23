import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  HALLOWEEN_THEME,
  applyHalloweenTheme,
  isHalloweenTitle,
} from '@/lib/halloweenThemeRules';

// Fixtures are real production titles from the 2026-09-23 audit of the
// `halloween` theme (547 rows, 34.7% title-supported before the repair).

describe('isHalloweenTitle — rows the old description/keyword pass got wrong', () => {
  // Tagged halloween before 09-23; none of them says so in the title.
  it.each([
    'Infatuated Pose Pack', // was card #1 (172 downloads)
    'Cannibalism', // was card #2
    'Nike Air Force 1s',
    'Summer Denim Shorts Jamie',
    'Vince T-shirt',
    'Modern Witch Mod', // witches have their own page
    'Autonomous Vampire Turning', // vampires have their own page
    'Costumes Night', // 'costume' alone is rejected
    'Hallow Glow GShade Preset',
  ])('rejects %s', (title) => {
    expect(isHalloweenTitle(title)).toBe(false);
  });

  // Rejected-candidate words, each with the real title that justified it.
  it.each([
    'Iced Pumpkin Latte', // 'pumpkin' alone = autumn food
    'Pumpkin Patch Lot',
    'Pumpkin Spice Set',
    'COD Ghost’s Mask', // 'ghost' = Call of Duty / ghost occult
    'Mr Ghost Face Christmas Set',
    'Creepy Yeha Ulyana Belt',
    'Mummy and Me Poses',
  ])('rejects %s', (title) => {
    expect(isHalloweenTitle(title)).toBe(false);
  });

  it('does not match inside another word (switch, ghostwriter-style substrings)', () => {
    expect(isHalloweenTitle('Nintendo Switch Console')).toBe(false);
    expect(isHalloweenTitle('Frightfully Cute Bows')).toBe(false);
  });
});

describe('isHalloweenTitle — title evidence it must accept', () => {
  it.each([
    'Halloween Set 1',
    'Friday 13: Fright Night',
    '[MY_KWY] SIMBLREEN GIFT #4',
    'Spooky Sims 4 CC Makeup',
    'Disney’s Haunted Mansion',
    'Zombie Flesh Face Paint',
    'Jack-O-Lantern Porch Set',
    '7 Trick or Treat CC Pack',
    'Candy Corn Fudge',
    'Regency Infant & Toddler Skeleton Suit',
    'Pumpkin Spice Halloween Set', // negative vetoes only when it is the sole evidence
  ])('accepts %s', (title) => {
    expect(isHalloweenTitle(title)).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isHalloweenTitle(null)).toBe(false);
    expect(isHalloweenTitle('')).toBe(false);
  });
});

describe('applyHalloweenTheme', () => {
  it('strips halloween but preserves every other theme in order', () => {
    expect(applyHalloweenTheme(['goth', 'halloween', 'fall'], 'Vince T-shirt')).toEqual(['goth', 'fall']);
  });
  it('adds halloween once when the title supports it', () => {
    expect(applyHalloweenTheme(['goth'], 'Haunted Manor')).toEqual(['goth', HALLOWEEN_THEME]);
    expect(applyHalloweenTheme(['halloween'], 'Halloween Set')).toEqual([HALLOWEEN_THEME]);
  });
});

describe('aiFacetExtractor source guard', () => {
  const src = readFileSync(join(process.cwd(), 'lib/services/aiFacetExtractor.ts'), 'utf8')
    // strip comments: they quote the removed keywords on purpose
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('maps no keyword to the halloween theme (title rules are authoritative)', () => {
    expect(src).not.toMatch(/:\s*'halloween'/);
  });
  it('uses the shared title rule and filters AI-only halloween tags', () => {
    expect(src).toMatch(/isHalloweenTitle\(title\)/);
    expect(src).toMatch(/t !== HALLOWEEN_THEME \|\| keywordFacets\.themes\.includes\(HALLOWEEN_THEME\)/);
  });
});
