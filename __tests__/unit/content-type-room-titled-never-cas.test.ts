/**
 * E132 (Rowan, 2026-09-28): a row whose TITLE passes a title-only room rule
 * (isBedroomTitle / isKitchenTitle / isBathroomTitle) must never receive a
 * Create-a-Sim content type — not from the detector, and not from the blog
 * post's URL category at ingest.
 *
 * The class fix behind E120, which hand-pinned 76 such rows (fridges typed
 * `glasses`, beds typed `tops`, a bathroom set typed `blush`).
 *
 * Red on pre-fix origin/main: `guardRoomTitledContentType`, `isRoomTitle` and
 * `CAS_CONTENT_TYPES` do not exist there, and the three detector cases below
 * returned `accessories`, `accessories` and `lipstick`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAS_CONTENT_TYPES,
  detectContentType,
  guardRoomTitledContentType,
  isRoomTitle,
} from '../../lib/services/contentTypeDetector';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const E120 = /^E120 room-titled "(.+?)" — was ([a-z-]+); /;
const e120 = Object.entries(HAND_AUDITED_CONTENT_TYPES)
  .map(([id, entry]) => ({ id, entry, m: E120.exec(entry.why) }))
  .filter((p) => p.m !== null)
  .map((p) => ({ id: p.id, title: p.m![1], was: p.m![2], pin: p.entry.contentType }));

describe('room-titled rows are never CAS (E132)', () => {
  it('replays every E120 row: its old CAS type can no longer survive the guard', () => {
    expect(e120.length).toBeGreaterThanOrEqual(76); // vacuity guard
    const leaked = e120
      .map((p) => ({ ...p, now: guardRoomTitledContentType(p.title, p.was) }))
      .filter((p) => p.now !== undefined && CAS_CONTENT_TYPES.has(p.now));
    expect(leaked.map((p) => `${p.title} -> ${p.now}`)).toEqual([]);
  });

  it('the guard never overrides a pin with another CAS type, and agrees with the pin or says NULL for ≥ 95%', () => {
    let agreeOrNull = 0;
    for (const p of e120) {
      const now = guardRoomTitledContentType(p.title, p.was);
      if (now === undefined || now === p.pin) agreeOrNull++;
    }
    // 2026-09-28: 26 agree, 47 NULL, 3 pick furniture where the hand audit
    // said decor/clutter (73/76). The pins still win in every retag script.
    expect(agreeOrNull / e120.length).toBeGreaterThanOrEqual(0.95);
  });

  it('detector: CAS answers on room titles are suppressed (title word or description)', () => {
    expect(detectContentType('Eevie Kitchen Accessories')).toBeUndefined();
    expect(detectContentType('Sims 4 Bathroom Accessories')).toBeUndefined();
    expect(detectContentType('Bathroom Mess', 'lipstick, perfume and a hairbrush for your sink')).toBeUndefined();
  });

  it('guard: a URL-category CAS type on a room title falls back to the title-only build/buy type', () => {
    // Real E120 rows; the answers match their hand-audited pins.
    expect(guardRoomTitledContentType('Roseblush Bathroom Set', 'blush')).toBe('furniture');
    expect(guardRoomTitledContentType('MilkyWay Bunk Bed', 'tops')).toBe('furniture');
  });

  it('keeps a CAS type the title itself names (a pose pack staged in a room is still a pose pack)', () => {
    expect(detectContentType('Bathroom Selfie Poses')).toBe('poses');
    expect(detectContentType('Kitchen Poses')).toBe('poses');
    expect(guardRoomTitledContentType('Bathroom Selfie Poses', 'poses')).toBe('poses');
    // ...but not 'accessories', which build sets use in their own titles.
    expect(guardRoomTitledContentType('Eevie Kitchen Accessories', 'accessories')).toBeUndefined();
  });

  it('does not touch non-room titles, vetoed room words, or non-CAS types', () => {
    expect(detectContentType('Stacked Bracelets')).toBe('jewelry');
    expect(detectContentType('Bed Talk Pose Compilation')).toBe('poses'); // bedroom veto: pose
    expect(detectContentType('Kitchen Apron Top')).toBe('tops'); // kitchen veto: apron
    expect(guardRoomTitledContentType('Coquette Bedroom – CAS Background', 'cas-background')).toBe('cas-background');
    expect(guardRoomTitledContentType('Stacked Bracelets', 'jewelry')).toBe('jewelry');
    expect(guardRoomTitledContentType('Cutie Bathroom', 'furniture')).toBe('furniture');
    expect(guardRoomTitledContentType('Cutie Bathroom', undefined)).toBeUndefined();
    expect(guardRoomTitledContentType('Cutie Bathroom', 'glasses')).not.toBe('glasses');
  });

  it('isRoomTitle is the union of the three title-only room rules', () => {
    expect(isRoomTitle('Hello Kitty Fridge')).toBe(true);
    expect(isRoomTitle('Yuna Double Bed')).toBe(true);
    expect(isRoomTitle('Coastal Bathroom Collection')).toBe(true);
    expect(isRoomTitle('Shower Talk Poses')).toBe(false);
    expect(isRoomTitle(null)).toBe(false);
  });

  it('CAS_CONTENT_TYPES excludes build/buy and cas-background', () => {
    for (const t of ['furniture', 'clutter', 'decor', 'lighting', 'cas-background', 'lot']) {
      expect(CAS_CONTENT_TYPES.has(t), t).toBe(false);
    }
  });

  it('ingest (mhmScraper.saveModsToDatabase) decides the type through resolveIngestContentType, which ends in the guard (E168)', () => {
    const src = readFileSync(join(__dirname, '../../lib/services/mhmScraper.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(src).toMatch(
      /const detectedContentType = resolveIngestContentType\(\s*mod\.title,\s*mod\.description,\s*urlContentType\s*\)/,
    );
    // No second, un-guarded composition may creep back in beside it.
    expect(src).not.toMatch(/urlContentType \|\| titleContentType/);
    const detector = readFileSync(join(__dirname, '../../lib/services/contentTypeDetector.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const fn = detector.slice(detector.indexOf('export function resolveIngestContentType('));
    const body = fn.slice(0, fn.indexOf('\n}\n') + 3);
    expect(body).toMatch(/return guardRoomTitledContentType\(title, candidate\);/);
  });
});
