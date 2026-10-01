/**
 * E154 (Rowan, 2026-10-01): the `holidays` content type is kept only where the
 * TITLE names a holiday. On 2026-10-01, 432 of 923 `holidays` rows named none
 * ("Mary Dress", "Sony Wall Mounted TV", "Nike Air Force 1s").
 *
 * Against the pre-fix tree (bea25bb): `lib/holidaysContentTypeRules.ts` and
 * `guardHolidaysContentType` do not exist, so the file fails at import; the
 * one case that reaches only pre-existing code — the ingest guard re-deciding
 * "Mary Dress" typed `holidays` — also fails there (the old guard returned
 * `holidays` unchanged for any title).
 */
import { describe, it, expect } from 'vitest';
import {
  HOLIDAYS_CONTENT_TYPE,
  HOLIDAYS_TITLE_PATTERN,
  isHolidaysTitle,
} from '../../lib/holidaysContentTypeRules';
import {
  CONTENT_TYPE_RULES,
  ROOM_VALUE_CONTENT_TYPES,
  guardHolidaysContentType,
  guardRoomTitledContentType,
} from '../../lib/services/contentTypeDetector';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const pinsFor = (tag: string) =>
  Object.entries(HAND_AUDITED_CONTENT_TYPES)
    .filter(([, v]) => v.why.startsWith(`${tag} `))
    .map(([id, v]) => ({ id, pin: v.contentType, title: (v.why.match(/"(.+?)"/) || [])[1] ?? '', why: v.why }));

describe('isHolidaysTitle (title-only, whole word)', () => {
  it('accepts titles that name a holiday', () => {
    for (const t of [
      'Cute Christmas Set', 'Peach Xmas Outfit', 'Be My Valentine’s CC', 'Thanksgiving Plate',
      'New Year Eve Dinner', 'Pajama Set Top For Female NewYear', 'NYE 2026 Set', 'Merry Christmas!!',
      'Winterfest Loading Screens', 'Festive Appetizers', 'Gamer Gifts for Father’s Day',
      'Halloween Set 1', 'Trick or Treat Poses', 'Santa Outfit', 'Jingle Bells Set',
    ]) expect(isHolidaysTitle(t), t).toBe(true);
  });

  it('a season is not a holiday', () => {
    for (const t of ['Winter Nails Set', 'Autumn Decor 2024', 'Summer Dress', 'Pumpkin Patch', 'Snowy Set', 'Cozy Fall'])
      expect(isHolidaysTitle(t), t).toBe(false);
  });

  it('rejected candidates stay rejected (counts in the rule comment)', () => {
    for (const t of ['Lace Stockings', 'Forest Elf Collection', 'Noel Dress', 'Sexy Nun Costume', 'My Birthday Present', 'Ornament Tattoo', 'Bunny Bun Hair'])
      expect(isHolidaysTitle(t), t).toBe(false);
  });

  it('whole words only', () => {
    expect(HOLIDAYS_TITLE_PATTERN.test('Merryweather Dress')).toBe(false);
    expect(HOLIDAYS_TITLE_PATTERN.test('Santana Top')).toBe(false);
    expect(isHolidaysTitle(null)).toBe(false);
  });
});

describe('guardHolidaysContentType / ingest guard', () => {
  it('keeps holidays when the title names one', () => {
    expect(guardHolidaysContentType('Thanksgiving Kitchen Rugs', 'holidays')).toBe('holidays');
    expect(guardRoomTitledContentType('Country Hearth Christmas Bedroom', 'holidays')).toBe('holidays');
  });

  it('re-decides holidays from the title alone, or NULL', () => {
    expect(guardRoomTitledContentType('Mary Dress', 'holidays')).toBe('dresses');
    expect(guardHolidaysContentType('Winter Nails Set', 'holidays')).toBe('nails');
    expect(guardHolidaysContentType('Sony Wall Mounted TV', 'holidays')).toBeUndefined();
  });

  it('leaves every other candidate alone', () => {
    expect(guardHolidaysContentType('Mary Dress', 'dresses')).toBe('dresses');
    expect(guardHolidaysContentType('Christmas Sweater', 'tops')).toBe('tops');
    expect(guardHolidaysContentType('x', undefined)).toBeUndefined();
  });

  it('no detector rule emits holidays (so the re-decision cannot loop back)', () => {
    expect(CONTENT_TYPE_RULES.length).toBeGreaterThan(20); // vacuity guard
    expect(CONTENT_TYPE_RULES.filter((r) => r.contentType === HOLIDAYS_CONTENT_TYPE)).toEqual([]);
  });
});

describe('hand-audited pins', () => {
  const e154 = pinsFor('E154');

  it('finds the whole E154 batch (vacuity guard)', () => {
    expect(e154.length).toBeGreaterThanOrEqual(29);
  });

  it('every E154 pin overrides the guard, or is an explicit KEEP (no silent redundant pins)', () => {
    for (const p of e154) {
      expect(p.title, p.id).not.toBe('');
      const guard = guardHolidaysContentType(p.title, 'holidays') ?? null;
      if (guard === p.pin) expect(p.why, p.title).toMatch(/KEEP/);
    }
    // The two 'holiday' false friends the rule accepts are overridden by pin.
    const roman = e154.find((p) => p.title.startsWith('Roman Holiday'));
    expect(roman && isHolidaysTitle(roman.title)).toBe(true);
    expect(roman?.pin).toBeNull();
  });

  it('no pin writes a room value', () => {
    for (const p of e154) if (p.pin) expect(ROOM_VALUE_CONTENT_TYPES.has(p.pin), p.title).toBe(false);
  });

  it('every earlier pin that keeps holidays names a holiday in its title', () => {
    const keep = pinsFor('E147').filter((p) => p.pin === HOLIDAYS_CONTENT_TYPE);
    expect(keep.length).toBeGreaterThanOrEqual(3);
    for (const p of keep) expect(isHolidaysTitle(p.title), p.title).toBe(true);
  });
});
