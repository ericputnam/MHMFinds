import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { creatorSnippet, topCreatorLabels, CREATOR_TYPE_LABELS, NEWEST_MAX_AGE_DAYS, TITLE_SOFT_MAX } from '../../lib/creatorMeta';

const NOW = new Date('2026-10-28T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('topCreatorLabels', () => {
  it('ranks allowlisted labels by count and needs >=2 mods per label', () => {
    expect(topCreatorLabels([
      { contentType: 'tops', count: 3 },
      { contentType: 'full-body', count: 4 },
      { contentType: 'bottoms', count: 1 },
    ])).toEqual(['outfits', 'tops']);
  });

  it('never prints null or backfilled theme values (holidays, workout, gym, royals, princess, easter)', () => {
    for (const bad of ['holidays', 'workout', 'gym', 'royals', 'princess', 'easter', 'cc-finds']) {
      expect(CREATOR_TYPE_LABELS[bad]).toBeUndefined();
    }
    expect(topCreatorLabels([{ contentType: null, count: 9 }, { contentType: 'holidays', count: 9 }])).toEqual([]);
  });

  it('caps at three labels', () => {
    expect(topCreatorLabels([
      { contentType: 'hair', count: 9 }, { contentType: 'tops', count: 8 },
      { contentType: 'shoes', count: 7 }, { contentType: 'hats', count: 6 },
    ])).toEqual(['hair', 'tops', 'shoes']);
  });
});

describe('creatorSnippet', () => {
  it('names what the creator makes and keeps the name first in the title', () => {
    const s = creatorSnippet({ displayName: 'Orchiona', totalMods: 9, typeCounts: [{ contentType: 'hair', count: 9 }], newest: null, now: NOW });
    expect(s.title).toBe('Orchiona Sims 4 CC: Hair (9 mods) | MustHaveMods');
    expect(s.description).toBe('9 Sims 4 CC mods by Orchiona, mostly hair. Ranked by downloads, each with its download link.');
  });

  it('says "including", not "mostly", when the named labels are not a majority', () => {
    const s = creatorSnippet({ displayName: 'Softerhaze', totalMods: 7, typeCounts: [
      { contentType: 'gameplay-mod', count: 2 }, { contentType: 'dresses', count: 1 }, { contentType: 'eyes', count: 1 },
      { contentType: 'full-body', count: 1 }, { contentType: 'tops', count: 1 }, { contentType: null, count: 1 },
    ], newest: null, now: NOW });
    expect(s.description).toContain('including gameplay mods.');
    expect(s.description).not.toContain('mostly');
  });

  it('falls back to the old generic title when no label qualifies, without the false "hair, clothes, furniture" list', () => {
    const s = creatorSnippet({ displayName: 'Rona Sims', totalMods: 6, typeCounts: [{ contentType: 'tops', count: 1 }, { contentType: 'glasses', count: 1 }], newest: null, now: NOW });
    expect(s.title).toBe('Rona Sims Sims 4 CC & Mods (6) | MustHaveMods');
    expect(s.description).not.toMatch(/furniture|gameplay and more/);
  });

  it(`names the newest listing only when it is <= ${NEWEST_MAX_AGE_DAYS} days old`, () => {
    const base = { displayName: 'X', totalMods: 5, typeCounts: [{ contentType: 'hair', count: 5 }], now: NOW };
    expect(creatorSnippet({ ...base, newest: { title: 'Devil Beanie', createdAt: daysAgo(10) } }).description)
      .toContain('Newest: Devil Beanie (added Oct 18, 2026).');
    expect(creatorSnippet({ ...base, newest: { title: 'Old Hair', createdAt: daysAgo(NEWEST_MAX_AGE_DAYS + 1) } }).description)
      .not.toContain('Newest');
    expect(creatorSnippet({ ...base, newest: { title: 'Future', createdAt: daysAgo(-2) } }).description).not.toContain('Newest');
  });

  it('drops the brand suffix before going past the soft title limit', () => {
    const s = creatorSnippet({ displayName: 'Northern Siberia Winds', totalMods: 11, typeCounts: [{ contentType: 'preset', count: 5 }, { contentType: 'skin', count: 3 }], newest: null, now: NOW });
    expect(s.title).toBe('Northern Siberia Winds Sims 4 CC: Presets & skins (11 mods)');
    const short = creatorSnippet({ displayName: 'Ab', totalMods: 5, typeCounts: [{ contentType: 'hair', count: 5 }], newest: null, now: NOW });
    expect(short.title.length).toBeLessThanOrEqual(TITLE_SOFT_MAX);
    expect(short.title.endsWith(' | MustHaveMods')).toBe(true);
  });

  it('clips a long newest title', () => {
    const s = creatorSnippet({ displayName: 'X', totalMods: 5, typeCounts: [], now: NOW, newest: { title: 'A'.repeat(80), createdAt: daysAgo(1) } });
    expect(s.description).toContain(`${'A'.repeat(47)}…`);
  });
});

describe('wiring', () => {
  it('the creator page builds its metadata from creatorSnippet, not the old template', () => {
    const src = readFileSync(join(process.cwd(), 'app/creator/[slug]/page.tsx'), 'utf8');
    expect(src).toContain('creatorSnippet({');
    expect(src).not.toContain('hair, clothes, furniture, gameplay and more');
  });
});
