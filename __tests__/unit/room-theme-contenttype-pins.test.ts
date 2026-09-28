/**
 * E120 (Rowan, 2026-09-27): build/buy rows that carry a bedroom / kitchen /
 * bathroom room theme but were typed as Create-a-Sim content (fridges typed
 * `glasses`, beds typed `tops`, a bathroom set typed `blush`) are pinned by id
 * in scripts/lib/hand-audited-content-types.ts.
 *
 * Every E120 pin quotes its exact catalog title. This test re-runs the
 * title-only room rules over those titles, so a pin can only exist for a row
 * the room rules themselves call a room item — and asserts that no such pin
 * maps back to a CAS content type.
 */
import { describe, it, expect } from 'vitest';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';
import { isBedroomTitle } from '../../lib/bedroomThemeRules';
import { isKitchenTitle } from '../../lib/kitchenThemeRules';
import { isBathroomTitle } from '../../lib/bathroomThemeRules';
// E132: the real set the detector guards with, not a restated copy.
import { CAS_CONTENT_TYPES as CAS_TYPES } from '../../lib/services/contentTypeDetector';

const BUILD_TYPES = new Set(['furniture', 'clutter', 'decor']);

const E120 = /^E120 room-titled "(.+?)" — was ([a-z-]+); /;

const pins = Object.entries(HAND_AUDITED_CONTENT_TYPES)
  .map(([id, entry]) => ({ id, entry, m: E120.exec(entry.why) }))
  .filter((p) => p.m !== null)
  .map((p) => ({ id: p.id, to: p.entry.contentType, title: p.m![1], was: p.m![2] }));

describe('E120 room-titled contentType pins', () => {
  it('finds the whole audited batch (vacuity guard)', () => {
    expect(pins.length).toBeGreaterThanOrEqual(76);
  });

  it('every pinned title passes a title-only room rule', () => {
    const failing = pins.filter(
      (p) => !isBedroomTitle(p.title) && !isKitchenTitle(p.title) && !isBathroomTitle(p.title),
    );
    expect(failing.map((p) => p.title)).toEqual([]);
  });

  it('every pin moves a row out of a CAS type into a build/buy type', () => {
    for (const p of pins) {
      expect(CAS_TYPES.has(p.was), `${p.title} was ${p.was}`).toBe(true);
      expect(BUILD_TYPES.has(String(p.to)), `${p.title} -> ${p.to}`).toBe(true);
    }
  });
});
