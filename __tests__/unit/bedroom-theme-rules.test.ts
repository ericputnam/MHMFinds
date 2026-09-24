import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BEDROOM_THEME, applyBedroomTheme, isBedroomTitle } from '@/lib/bedroomThemeRules';
import { detectRoomThemes } from '@/lib/services/contentTypeDetector';

// Fixtures are real production titles from the 2026-09-24 audit of the
// `bedroom` theme (523 rows, 37.3% title-supported before the repair).

describe('isBedroomTitle — rows the old description/keyword pass got wrong', () => {
  // Tagged bedroom before 09-24 by a shared blog-post description or the
  // 'sleeping' keyword; none of them says bedroom in the title.
  it.each([
    'Teen Space', // was card #1 (7,998 downloads) — stripped on purpose
    'Victoria’s Secret Sleepwear Collection', // was card #3
    'Set Shaggy',
    'Wake Up Animation',
    'Sleeping Animation Pack', // the old 'sleeping' keyword
    'Acha Sweet Dreams Poses',
    'Concinnous Rug',
    'MM Modern House 155', // whole-house lots were 133 of 523 rows
    'Better Autonomy',
    'Closet Walls Base Game',
    'Just A Kidsroom', // kids-room is its own theme
  ])('rejects %s', (title) => {
    expect(isBedroomTitle(title)).toBe(false);
  });

  // A bare "bed" is weak evidence: vetoed by pets and in-bed activities.
  it.each([
    'Cat Window Hanging Bed', // pet bed; the word is not adjacent
    'Natural Horse Beds – No Border',
    'Bed Cuddle', // a woohoo/cozy gameplay mod
    'Read in Bed',
    'Nap with Baby in Bed',
    'Make the Bed Mod',
    'Sims 4 Couple Bed Poses',
    'Bed Conversations – Single Pose Pack',
    'Sims Bed Smoking (Model) Poses 2',
    'Romantic Breakfast In Bed Set',
    'Sims 4 Bed & Breakfast Build', // a lot
  ])('rejects %s', (title) => {
    expect(isBedroomTitle(title)).toBe(false);
  });

  // Rejected-candidate words (see the header of lib/bedroomThemeRules.ts).
  it.each(['Vanity Locs', 'Hello Kitty Vanity', 'Fairy Canopy'])('rejects %s', (title) => {
    expect(isBedroomTitle(title)).toBe(false);
  });

  it('does not match inside another word', () => {
    expect(isBedroomTitle('Bedazzled Heels')).toBe(false);
    expect(isBedroomTitle('Embedded Wall Lights')).toBe(false);
  });
});

describe('isBedroomTitle — title evidence it must accept', () => {
  it.each([
    '1 Robin Bedroom Set',
    'Stylish Bunk Bed',
    'Luxe TV Bed Set',
    'Erin Bedframe',
    'Alfazema Bed frame',
    'NUA Functional Mattress & Bed',
    'Kökvam Night Stand Table',
    'Open Dresser',
    'Animal Print Bedding Set 1',
    'Bedside Oil Lamp & Nightlight',
    '5 SP16 Murphy Beds',
    'Laurel Infant Bedroom', // age-group rooms stay: they are bedrooms
    'Pet Bed & Bedroom Set', // a veto word never beats strong evidence
  ])('accepts %s', (title) => {
    expect(isBedroomTitle(title)).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isBedroomTitle(null)).toBe(false);
    expect(isBedroomTitle('')).toBe(false);
  });
});

describe('applyBedroomTheme', () => {
  it('strips bedroom but preserves every other theme in order', () => {
    expect(applyBedroomTheme(['goth', 'bedroom', 'y2k'], 'Set Shaggy')).toEqual(['goth', 'y2k']);
  });
  it('adds bedroom once when the title supports it', () => {
    expect(applyBedroomTheme(['goth'], 'Very Goth Bedroom Set')).toEqual(['goth', BEDROOM_THEME]);
    expect(applyBedroomTheme(['bedroom'], 'Zara Bed')).toEqual([BEDROOM_THEME]);
  });
});

describe('detectRoomThemes — the ingest path uses the same title-only rule', () => {
  it('tags bedroom from the title and never from the description', () => {
    expect(detectRoomThemes('Erin Bedframe', 'a frame in eight swatches')).toContain(BEDROOM_THEME);
    expect(
      detectRoomThemes('Vince T-shirt', 'Perfect for lounging in your bedroom or sleeping in.'),
    ).not.toContain(BEDROOM_THEME);
    expect(detectRoomThemes('Sleeping Animation Pack', 'sleeping animations')).not.toContain(BEDROOM_THEME);
  });
});

describe('source guard — the detector cannot regain a bedroom keyword rule', () => {
  // Comments in this repo quote the bad patterns they warn about, so strip
  // them before asserting anything about the code.
  const src = readFileSync(join(process.cwd(), 'lib/services/contentTypeDetector.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('has no keyword rule for the bedroom theme', () => {
    expect(src).not.toMatch(/theme:\s*['"]bedroom['"]/);
    expect(src).not.toMatch(/['"]sleeping['"]/);
    expect(src).not.toMatch(/['"]bed room['"]/);
  });

  it('derives bedroom through the shared title-only rule', () => {
    expect(src).toContain('isBedroomTitle(title)');
    expect(src).toMatch(/from\s+['"]\.\.\/bedroomThemeRules['"]/);
  });
});
