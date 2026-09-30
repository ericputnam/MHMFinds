/**
 * E147 (Rowan, 2026-09-30): a ROOM is a theme, not a content type, and a
 * room-titled build set is not a lot.
 *
 *  1. `bathroom` / `kitchen` / `bedroom` / `living-room` can never be written
 *     to `contentType` at ingest. The only writer was the blog post's URL
 *     category (`detectContentTypeFromUrl`: /sims-4-bathroom-cc/ -> 'bathroom'),
 *     which `mhmScraper.saveModsToDatabase` passes through
 *     `guardRoomTitledContentType` — so the guard is where the rule lives.
 *  2. `lot` / `residential` never land on a room-titled row (title-only
 *     bedroom/kitchen/bathroom rule) unless the title names a whole building.
 *     Writers: the detector's `lot` rule reading "cottage"/"farmhouse" in a
 *     title, and "house"/"home" in a shared blog-post description.
 *  3. `holidays` is deliberately NOT guarded: it is a real 926-row facet with
 *     its own collection page, 3 of the 6 room-titled holidays rows name the
 *     holiday in their title, and no current writer emits it.
 *
 * Replay 2026-09-30 over the 78 audited rows (pre-fix ingest path): 10 rows
 * re-written `bathroom`, 6 `kitchen`, 13 room-titled non-lots `lot`.
 *
 * Red on pre-fix origin/main (db89802): `ROOM_VALUE_CONTENT_TYPES` does not
 * exist, so every case below that imports it fails; of the rest, the guard
 * returned 'bathroom', 'kitchen', 'lot' ×2 and 'residential', and the detector
 * returned 'lot' for "Country Cottage Refrigerator", "Duck Egg Blue Farmhouse
 * Kitchen" and "Kitchen Time Set" + a house-y description.
 */
import { describe, it, expect } from 'vitest';
import {
  CAS_CONTENT_TYPES,
  CONTENT_TYPE_RULES,
  ROOM_VALUE_CONTENT_TYPES,
  detectContentType,
  guardRoomTitledContentType,
  isRoomTitle,
} from '../../lib/services/contentTypeDetector';
import { detectContentTypeFromUrl } from '../../lib/services/mhmScraperUtils';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const E147 = /^E147 room-typed "(.+?)" — was ([a-z-]+); /;
const pins = Object.entries(HAND_AUDITED_CONTENT_TYPES)
  .map(([id, entry]) => ({ id, entry, m: E147.exec(entry.why) }))
  .filter((p) => p.m !== null)
  .map((p) => ({ id: p.id, title: p.m![1], was: p.m![2], pin: p.entry.contentType }));

/** The ingest composition in mhmScraper.saveModsToDatabase. */
const ingest = (title: string, url: string, description?: string) =>
  guardRoomTitledContentType(title, detectContentTypeFromUrl(url) || detectContentType(title, description));

describe('room values are never a content type (E147)', () => {
  it('the set is the four room words the URL mapping can emit', () => {
    expect(Array.from(ROOM_VALUE_CONTENT_TYPES).sort()).toEqual(['bathroom', 'bedroom', 'kitchen', 'living-room']);
  });

  it('the URL mapping still emits them (non-vacuous) — and the ingest guard strips every one', () => {
    const cases: Array<[string, string]> = [
      ['https://musthavemods.com/sims-4-bathroom-cc/', 'bathroom'],
      ['https://musthavemods.com/sims-4-kitchen-cc/', 'kitchen'],
      ['https://musthavemods.com/sims-4-bedroom-cc/', 'bedroom'],
    ];
    for (const [url, value] of cases) {
      expect(detectContentTypeFromUrl(url), url).toBe(value);
      for (const title of ['Zone Bathroom', 'Cottonwood Kitchen', 'Agnes Bedroom CC', 'Blue Ceramic Mug', 'Mix It Bathroom Set']) {
        const out = ingest(title, url);
        expect(out === undefined || !ROOM_VALUE_CONTENT_TYPES.has(out), `${title} via ${url} -> ${out}`).toBe(true);
      }
    }
  });

  it('a stripped room value falls back to the title-only answer, or NULL', () => {
    expect(guardRoomTitledContentType('Mix It Bathroom Set', 'bathroom')).toBe('furniture');
    expect(guardRoomTitledContentType('Zone Bathroom', 'bathroom')).toBeUndefined();
    expect(guardRoomTitledContentType('Cottonwood Kitchen', 'kitchen')).toBeUndefined();
    expect(guardRoomTitledContentType('Stacked Bracelets', 'kitchen')).toBe('jewelry'); // not a room title: normal title answer
    for (const v of Array.from(ROOM_VALUE_CONTENT_TYPES)) {
      const out = guardRoomTitledContentType('Rioja Refrigerator', v);
      expect(out === undefined || !ROOM_VALUE_CONTENT_TYPES.has(out)).toBe(true);
    }
  });
});

describe('a room-titled row is not a lot unless its title names a building (E147)', () => {
  it('guard: lot / residential on a room-titled set is suppressed', () => {
    expect(guardRoomTitledContentType('Kitchen Time Set', 'lot')).toBeUndefined();
    expect(guardRoomTitledContentType('Pink Bathroom Set', 'lot')).toBe('furniture');
    expect(guardRoomTitledContentType('Kitchen Enya Part 1', 'residential')).toBeUndefined();
    const out = guardRoomTitledContentType('Duck Egg Blue Farmhouse Kitchen', 'residential');
    expect(out === undefined || (out !== 'lot' && out !== 'residential')).toBe(true);
  });

  it('guard: a title that names a whole building keeps lot', () => {
    expect(guardRoomTitledContentType('Ranch 5-Bedroom with In-Law Suite House', 'lot')).toBe('lot');
    expect(guardRoomTitledContentType('Modern Kitchen Townhouse', 'lot')).toBe('lot');
  });

  it('guard: non-room titles are untouched', () => {
    expect(guardRoomTitledContentType('Tiny Starter Lot', 'lot')).toBe('lot');
    expect(guardRoomTitledContentType('Willow Creek Residential', 'residential')).toBe('residential');
    expect(detectContentType('Cottage Living Starter Home')).toBe('lot');
  });

  it('detector: style words and shared descriptions no longer make a room set a lot', () => {
    expect(detectContentType('Country Cottage Refrigerator')).not.toBe('lot');
    expect(detectContentType('Duck Egg Blue Farmhouse Kitchen')).not.toBe('lot');
    expect(detectContentType('Kitchen Time Set', 'Everything your house needs for a cozy home kitchen')).not.toBe('lot');
    expect(detectContentType('Ranch 5-Bedroom with In-Law Suite House')).not.toBe(undefined);
  });

  it('holidays is not guarded (a real facet with its own page)', () => {
    expect(guardRoomTitledContentType('Country Hearth Christmas Bedroom', 'holidays')).toBe('holidays');
  });
});

describe('E147 hand-audited pins', () => {
  it('finds the whole audited batch (vacuity guard)', () => {
    expect(pins.length).toBeGreaterThanOrEqual(78);
  });

  it('every pin moves a row out of a room value, keeps a lot that names a building, or keeps holidays', () => {
    for (const p of pins) {
      expect(['bathroom', 'kitchen', 'residential', 'lot', 'holidays'], p.title).toContain(p.was);
      if (p.pin === null) continue;
      expect(ROOM_VALUE_CONTENT_TYPES.has(p.pin), `${p.title} -> ${p.pin}`).toBe(false);
      expect(CAS_CONTENT_TYPES.has(p.pin), `${p.title} -> ${p.pin}`).toBe(false);
      if (p.pin === 'lot' || p.pin === 'residential') {
        expect(guardRoomTitledContentType(p.title, p.pin), p.title).toBe(p.pin);
      }
    }
  });

  it('all but the one non-room row pass a title-only room rule', () => {
    const notRoom = pins.filter((p) => !isRoomTitle(p.title)).map((p) => p.title);
    expect(notRoom).toEqual(['Shower Tweaks']);
  });

  it('the guard never contradicts a pin with a different non-null value on ≥ 95% of non-holidays pins', () => {
    // holidays is unguarded by design: its 6 rows are heterogeneous (3 keep,
    // 3 hand-fixed), so they are excluded here. 2026-09-30 on the other 72:
    // 36 agree, 34 NULL, 2 differ — "Shower Tweaks" (guard: furniture, a
    // non-room title where 'shower' outranks 'tweak') and "Gourmet Pottery
    // Kitchen Set" (guard: furniture, pin: clutter). The pins win in every
    // retag script.
    const guarded = pins.filter((p) => p.was !== 'holidays');
    expect(guarded.length).toBeGreaterThanOrEqual(72);
    const agreeOrNull = guarded.filter((p) => {
      const now = guardRoomTitledContentType(p.title, p.was);
      return now === undefined || now === p.pin;
    }).length;
    expect(agreeOrNull / guarded.length).toBeGreaterThanOrEqual(0.95);
  });

  it('no detector rule emits a room value (so the guard re-decision cannot loop back to one)', () => {
    const emitting = CONTENT_TYPE_RULES.filter((r) => ROOM_VALUE_CONTENT_TYPES.has(r.contentType));
    expect(CONTENT_TYPE_RULES.length).toBeGreaterThan(20); // vacuity guard
    expect(emitting.map((r) => r.contentType)).toEqual([]);
  });
});
