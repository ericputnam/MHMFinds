/**
 * E256 (Rowan, 2026-10-21): a nose or eye preset is not a body preset.
 *
 * The one-off backfill's CAS hint regex matched face|nose|eye|lip presets and
 * typed 57 of the 150 `body-preset` rows as body presets; two sat in the
 * /games/sims-4/body-presets/ top 24. The rule now lives in
 * lib/bodyPresetRules.ts and every face preset is pinned `preset`.
 *
 * Against the pre-fix rule (body title OR the old CAS hint), the first case
 * fails on every face title listed below.
 */
import { describe, expect, it } from 'vitest';

import {
  BODY_PRESET_TITLE_RE,
  FACE_PRESET_TITLE_RE,
  isBodyPresetTitle,
} from '@/lib/bodyPresetRules';
import { HAND_AUDITED_CONTENT_TYPES } from '@/scripts/lib/hand-audited-content-types';

// Real catalog titles typed `body-preset` on 2026-10-21 (all now pinned preset).
const FACE_TITLES = [
  'Female Eye Presets for Sims 4',
  'Babydoll Nose Preset Mod',
  'Visions Sims 4 Eye Presets',
  'Nose Preset N6',
  'Sims 4 Male Nose Preset',
  'Sims 4 Cyclops Eye Preset',
  'Cavill Nose Preset + Nose Mask',
  'Lookbook + Nose Preset',
  'N5 Sims 4 CAS Eye Preset',
  'Sims 4 Nose Presets for Females',
  '3 Male Noses Presets',
  'Female Lips Preset And Makeup',
];

// Real `body-preset` titles that must stay body presets.
const BODY_TITLES = [
  'Solana Body Preset',
  'Boy Toy Body Preset Pack',
  'Sims 4 Female & Male Body Preset Pack',
  '100+ Sims 4 CAS Presets',
  'Body Preset “Soft Curve Silhouette”',
];

describe('isBodyPresetTitle (E256)', () => {
  it('never types a face preset as a body preset', () => {
    expect(FACE_TITLES.filter((t) => isBodyPresetTitle(t))).toEqual([]);
  });

  it('still types real body presets', () => {
    expect(BODY_TITLES.filter((t) => !isBodyPresetTitle(t))).toEqual([]);
  });

  it('lets "body preset" win over a face word, and never takes a GShade preset', () => {
    expect(isBodyPresetTitle('Body Preset + Nose Preset Bundle')).toBe(true);
    expect(isBodyPresetTitle('Soft Body Preset GShade')).toBe(false);
  });
});

describe('hand-audited pins: no face preset is pinned body-preset (E256)', () => {
  // A pin's `why` opens with `E### "<title>"` for every audited pass since E180.
  const titled = Object.entries(HAND_AUDITED_CONTENT_TYPES)
    .map(([id, v]) => ({ id, to: v.contentType, title: /^E\d+ "(.+?)"/.exec(v.why)?.[1] }))
    .filter((r): r is { id: string; to: string | null; title: string } => Boolean(r.title));

  const face = titled.filter((r) => FACE_PRESET_TITLE_RE.test(r.title) && !BODY_PRESET_TITLE_RE.test(r.title));

  it('finds the E256 face presets (vacuity guard)', () => {
    expect(face.length).toBeGreaterThanOrEqual(60);
  });

  it('pins every face-preset title to preset (or NULL), never body-preset', () => {
    expect(face.filter((r) => r.to === 'body-preset').map((r) => `${r.id} ${r.title}`)).toEqual([]);
  });
});
