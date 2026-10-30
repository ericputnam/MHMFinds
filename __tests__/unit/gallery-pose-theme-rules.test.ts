import { describe, it, expect } from 'vitest';
import { GALLERY_POSE_THEME, applyGalleryPoseTheme, isGalleryPoseTitle } from '@/lib/galleryPoseThemeRules';
import { detectRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-10-30 audit (E296) of
// every whole-word gallery / CAS pose candidate across 17,132 rows.

describe('isGalleryPoseTitle — accepted phrases', () => {
  it.each([
    'Cute Female Gallery Poses', // 62 dl, card #1
    'New Baby Sims 4 Gallery Poses',
    'Family Portrait Gallery Pose',
    'Holiday Sims 4 Family Gallery Pose', // typed `holidays`, still a gallery pose
    'Sims 4 Hand Poses for CAS',
    'Expressive Pose Pack for CAS',
    'Sims 4 CAS Poses for Child Sims',
    'Sims 4 CAS Smiling Pose',
    'CAS Horse Poses',
    'CAS Poses #11',
    'CAS Pose',
    'Female Create-A-Sim Poses',
    'Pose Pack for CAS “Tabacum”',
  ])('accepts %s', (title) => {
    expect(isGalleryPoseTitle(title)).toBe(true);
  });
});

describe('isGalleryPoseTitle — rejected phrases (counts in lib/galleryPoseThemeRules.ts)', () => {
  it.each([
    'Autumn Famhouse Gallery', // bare 'gallery' — a lot
    'CAS Background Sims 4 Forest', // bare 'cas' — a CAS background
    'More Columns in CAS',
    'More Traits in CAS',
    'CAS Handclose Mod', // a hand tweak, not a pose set
    'No CAS Pillow, Default Stand Still Pose For Infants In CAS', // default replacement
    'In-Game Poses #2', // the opposite of a gallery pose
    'I Do Wedding Pose Pack', // a Pose Player pack — parent `poses` page
    'Pose Player', // the tool
    'Picasso Gallery Wall Art', // 'gallery' + no pose
    '',
  ])('rejects %s', (title) => {
    expect(isGalleryPoseTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isGalleryPoseTitle(null)).toBe(false);
    expect(isGalleryPoseTitle(undefined)).toBe(false);
  });
});

describe('applyGalleryPoseTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyGalleryPoseTheme(['family', 'cute'], 'Family Portrait Gallery Pose')).toEqual(['family', 'cute', GALLERY_POSE_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyGalleryPoseTheme(['family', GALLERY_POSE_THEME], 'In-Game Poses #2')).toEqual(['family']);
    expect(applyGalleryPoseTheme([GALLERY_POSE_THEME], 'CAS Poses #1')).toEqual([GALLERY_POSE_THEME]);
  });
});

describe('gallery-pose is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Male Gallery Poses for Sims 4')).toContain(GALLERY_POSE_THEME);
    expect(detectRoomThemes('Toddler Model Poses for CAS')).toContain(GALLERY_POSE_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 gallery poses and CAS poses so your sims look great on their gallery card.';
    expect(detectRoomThemes('Floret Grove', desc)).not.toContain(GALLERY_POSE_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(GALLERY_POSE_THEME)).toBe(false);
  });
  it('/games/sims-4/gallery-poses/ filters on exactly this theme', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'gallery-poses');
    expect(c?.filter).toEqual({ themesAny: [GALLERY_POSE_THEME] });
  });
});
