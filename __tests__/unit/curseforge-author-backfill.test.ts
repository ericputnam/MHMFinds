import { describe, expect, it } from 'vitest';

import {
  MAX_BACKFILL_ROWS,
  curseforgeProjectSlug,
  isUnusableAuthor,
  parsePlanName,
  planBackfill,
  planRow,
  preferExistingPage,
  rollbackable,
  settable,
  stillApplicable,
  targetSlug,
  unknownFlags,
  type BackfillRow,
  type SetDecision,
} from '../../scripts/agents/curseforge-author-backfill-lib';

const row = (over: Partial<BackfillRow> = {}): BackfillRow => ({
  id: 'm1',
  title: 'Gyaru Legwarmers',
  author: null,
  downloadUrl: 'https://www.curseforge.com/sims4/create-a-sim/gyaru-legwarmers-v2',
  sourceUrl: 'https://musthavemods.com/sims-4-legwarmers/',
  ...over,
});

describe('curseforgeProjectSlug (E340)', () => {
  it('parses /sims4/<class>/<slug> on the exact hosts, including legacy', () => {
    expect(curseforgeProjectSlug('https://www.curseforge.com/sims4/mods/funeral-service-event')).toBe('funeral-service-event');
    expect(curseforgeProjectSlug('https://legacy.curseforge.com/sims4/build-buy/luxe-laundry-care-set')).toBe('luxe-laundry-care-set');
  });
  it('rejects look-alike hosts, other games and short paths', () => {
    expect(curseforgeProjectSlug('https://www.curseforge.com.evil.example/sims4/mods/x')).toBeNull();
    expect(curseforgeProjectSlug('https://www.curseforge.com/minecraft/mc-mods/jei')).toBeNull();
    expect(curseforgeProjectSlug('https://www.curseforge.com/sims4')).toBeNull();
    expect(curseforgeProjectSlug('not a url')).toBeNull();
    expect(curseforgeProjectSlug(null)).toBeNull();
  });
});

describe('isUnusableAuthor (E340)', () => {
  it('treats NULL, blank, junk fallbacks and platform placeholders as unusable', () => {
    for (const a of [null, '', '   ', 'Iyah Locs Hair 120775816', '53290860', 'CurseForge Creator', 'Co', '2025']) {
      expect(isUnusableAuthor(a)).toBe(true);
    }
  });
  it('keeps real creator names', () => {
    for (const a of ['MeeriGold', 'Simmer Kate', 'darte77']) expect(isUnusableAuthor(a)).toBe(false);
  });
});

describe('planRow (E340)', () => {
  const found = (authors: string[]) => ({ kind: 'found' as const, projectId: 42, authors });

  it('sets the single CurseForge author on an unattributed row and records the prior', () => {
    const d = planRow(row(), found(['MeeriGold']));
    expect(d).toMatchObject({ action: 'set', next: 'MeeriGold', prior: null, projectId: 42, slug: 'gyaru-legwarmers-v2' });
  });
  it('never touches a row that already has a real author, even if CurseForge disagrees', () => {
    expect(planRow(row({ author: 'Somebody Else' }), found(['MeeriGold']))).toMatchObject({ action: 'skip', reason: 'has-author' });
  });
  it('replaces the scraper placeholder "CurseForge Creator"', () => {
    expect(planRow(row({ author: 'CurseForge Creator' }), found(['MeeriGold']))).toMatchObject({ action: 'set', prior: 'CurseForge Creator' });
  });
  it('skips multi-author projects instead of guessing', () => {
    expect(planRow(row(), found(['A-one', 'B-two']))).toMatchObject({ action: 'skip', reason: 'multi-author' });
  });
  it('skips a CurseForge author that would itself be junk', () => {
    expect(planRow(row(), found(['12345678']))).toMatchObject({ action: 'skip', reason: 'author-unusable' });
    expect(planRow(row(), found(['  ']))).toMatchObject({ action: 'skip', reason: 'no-author' });
  });
  it('skips not-found, unreachable and non-CurseForge rows', () => {
    expect(planRow(row(), { kind: 'not-found' })).toMatchObject({ reason: 'not-found' });
    expect(planRow(row(), { kind: 'unreachable', detail: 'HTTP 500' })).toMatchObject({ reason: 'unreachable' });
    expect(planRow(row(), undefined)).toMatchObject({ reason: 'unreachable' });
    expect(planRow(row({ downloadUrl: 'https://www.patreon.com/posts/1', sourceUrl: null }), found(['X-ray']))).toMatchObject({
      reason: 'no-curseforge-slug',
    });
  });
  it('falls back to sourceUrl for the slug', () => {
    expect(targetSlug(row({ downloadUrl: null, sourceUrl: 'https://curseforge.com/sims4/mods/abc' }))).toBe('abc');
  });
});

describe('planBackfill / guards (E340)', () => {
  it('looks rows up by their own slug and returns only settable rows from settable()', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b', author: 'Real Name' }), row({ id: 'c', downloadUrl: 'https://www.curseforge.com/sims4/mods/zzz' })];
    const lookups = new Map([
      ['gyaru-legwarmers-v2', { kind: 'found' as const, projectId: 1, authors: ['MeeriGold'] }],
      ['zzz', { kind: 'not-found' as const }],
    ]);
    const decisions = planBackfill(rows, lookups);
    expect(settable(decisions).map((d) => d.id)).toEqual(['a']);
  });

  const frozen: SetDecision[] = [
    { id: 'a', action: 'set', slug: 's', projectId: 1, prior: null, next: 'MeeriGold', title: 't' },
    { id: 'b', action: 'set', slug: 's2', projectId: 2, prior: 'CurseForge Creator', next: 'Simmer Kate', title: 't' },
    { id: 'c', action: 'set', slug: 's3', projectId: 3, prior: null, next: 'Other', title: 't' },
  ];

  it('stillApplicable writes only rows whose live author equals the frozen prior', () => {
    const live = new Map<string, string | null>([
      ['a', null],
      ['b', 'Hand Fixed'],
    ]);
    const { apply, drifted } = stillApplicable(frozen, live);
    expect(apply.map((d) => d.id)).toEqual(['a']);
    expect(drifted.sort()).toEqual(['b', 'c']);
  });

  it('rollbackable restores only rows that still hold what the apply wrote', () => {
    const live = new Map<string, string | null>([
      ['a', 'MeeriGold'],
      ['b', 'Hand Fixed'],
    ]);
    expect(rollbackable(frozen, live).map((d) => d.id)).toEqual(['a']);
  });

  it('keeps the per-run cap inside the Tier 0 catalog limit', () => {
    expect(MAX_BACKFILL_ROWS).toBeLessThanOrEqual(5000);
  });
});

describe('preferExistingPage (E340)', () => {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const counts = new Map([
    ['boschiana', 2],
    ['boschianacc', 15],
    ['sixam', 13],
    ['sixamcc', 27],
    ['caio', 16],
  ]);
  const spelling = new Map([
    ['boschianacc', 'BoschianaCC'],
    ['sixam', 'Sixam'],
    ['caio', 'Caio'],
  ]);
  it('folds a page-less spelling onto the suffix variant that has a page (Boschiana → BoschianaCC)', () => {
    expect(preferExistingPage('Boschiana', counts, spelling, 5, key)).toBe('BoschianaCC');
    expect(preferExistingPage('Caiocc', counts, spelling, 5, key)).toBe('Caio');
  });
  it('leaves a spelling that already has its own page alone (pre-existing split, sixamcc 27 / sixam 13)', () => {
    expect(preferExistingPage('sixamcc', counts, spelling, 5, key)).toBe('sixamcc');
  });
  it('leaves a name with no variant alone', () => {
    expect(preferExistingPage('MeeriGold', counts, spelling, 5, key)).toBe('MeeriGold');
  });
});

describe('CLI parsing (E340)', () => {
  it('accepts only a dated basename for --plan', () => {
    expect(parsePlanName(['--plan=curseforge-authors-2026-11-05.json'])).toBe('curseforge-authors-2026-11-05.json');
    expect(parsePlanName(['--plan=../../etc/passwd'])).toBe('');
    expect(parsePlanName([])).toBeNull();
  });
  it('flags unknown options', () => {
    expect(unknownFlags(['--apply', '--plan=x', '--force'])).toEqual(['--force']);
  });
});
