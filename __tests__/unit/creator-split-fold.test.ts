/**
 * E356 (Nova, 2026-11-06): suffix-split creator spellings fold into one page.
 *
 * "Sixam" (13 mods) and "SIXAM CC" (31) were two indexable /creator/ pages
 * — E293's separator-dropping key cannot see a dropped "cc". Red on
 * pre-E356 main: MOVED_CREATOR_KEYS / movedCreatorSlug and the fold lib did
 * not exist, and the page 404'd an emptied slug instead of 308ing it.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { MOVED_CREATOR_KEYS, authorSlug, creatorKey, movedCreatorSlug } from '../../lib/creatorSlug';
import {
  MAX_FOLD_ROWS,
  foldTargets,
  parsePlanName,
  planFold,
  rollbackable,
  stillApplicable,
  unknownFlags,
} from '../../scripts/agents/creator-split-fold-lib';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('MOVED_CREATOR_KEYS', () => {
  const entries = Object.entries(MOVED_CREATOR_KEYS);

  it('is non-empty (vacuity guard)', () => {
    expect(entries.length).toBeGreaterThanOrEqual(6);
  });

  it('keys are creator keys and values are dash-slugs', () => {
    for (const [k, slug] of entries) {
      expect(creatorKey(k)).toBe(k);
      expect(authorSlug(slug)).toBe(slug);
    }
  });

  it('never chains or self-maps (a target is never itself moved)', () => {
    for (const [k, slug] of entries) {
      expect(creatorKey(slug)).not.toBe(k);
      expect(MOVED_CREATOR_KEYS[creatorKey(slug)]).toBeUndefined();
    }
  });

  it('does not carry the held pairs (no shared source identity on 2026-11-06)', () => {
    for (const k of ['camuflaje', 'camuflajesims', 'ebonix', 'ebonixsims', 'harrie', 'harriecc', 'jius', 'jiussims', 'jomsims', 'jomsimscreations', 'katverse', 'katversecc', 'miro', 'mirosims', 'serenity', 'serenitycc']) {
      expect(MOVED_CREATOR_KEYS[k]).toBeUndefined();
    }
  });
});

describe('movedCreatorSlug', () => {
  it.each([
    ['sixam', 'sixam-cc'],
    ['miikocc', 'miiko'],
    ['miiko-cc', 'miiko'],
    ['guemara', 'guemarasims'],
    ['backtrack', 'backtrackcc'],
    ['caiocc', 'caio'],
    ['caio-cc', 'caio'],
    ['madlensims', 'madlen'],
  ])('%s → %s', (slug, target) => {
    expect(movedCreatorSlug(slug)).toBe(target);
  });

  it.each(['sixam-cc', 'miiko', 'caio', 'madlen', 'someone-else', 'sixamcc'])('%s → null (not moved, or is the target key)', (slug) => {
    expect(movedCreatorSlug(slug)).toBeNull();
  });
});

describe('creator page 308s an emptied moved slug instead of 404ing', () => {
  const src = stripComments(read('app/creator/[slug]/page.tsx'));
  it('calls movedCreatorSlug in the no-data branch, before notFound()', () => {
    const page = src.slice(src.indexOf('export default async function CreatorPage'));
    const branch = page.slice(page.indexOf('if (!data)'), page.indexOf('data.redirectTo'));
    expect(branch).toContain('movedCreatorSlug(slug)');
    expect(branch).toContain('permanentRedirect(');
    expect(branch.indexOf('movedCreatorSlug')).toBeLessThan(branch.indexOf('notFound()'));
  });
});

describe('fold lib', () => {
  const counts = [
    { author: 'Sixam', n: 11 },
    { author: 'SIXAM', n: 2 },
    { author: 'SIXAM CC', n: 13 },
    { author: 'Sixam CC', n: 3 },
    { author: 'sixamcc', n: 15 },
  ];

  it('picks the most-used spelling of the canonical slug', () => {
    const [t] = foldTargets({ sixam: 'sixam-cc' }, counts);
    expect(t).toMatchObject({ fromKey: 'sixam', toSlug: 'sixam-cc', spelling: 'SIXAM CC', fromKeyMods: 13, toKeyMods: 31 });
  });

  it('refuses a move from the larger key into the smaller', () => {
    const [t] = foldTargets({ sixamcc: 'sixam' }, counts);
    expect(t.spelling).toBeNull();
  });

  it('refuses a target slug no live author carries', () => {
    const [t] = foldTargets({ sixam: 'sixam-creations' }, counts);
    expect(t.spelling).toBeNull();
  });

  it('plans only rows of a moved key, and never rows of the target key', () => {
    const targets = foldTargets({ sixam: 'sixam-cc' }, counts);
    const plan = planFold(
      [
        { id: 'a', author: 'Sixam' },
        { id: 'b', author: 'SIXAM' },
        { id: 'c', author: 'SIXAM CC' },
        { id: 'd', author: 'sixamcc' },
        { id: 'e', author: 'Other' },
      ],
      targets,
    );
    expect(plan.map((d) => d.id)).toEqual(['a', 'b']);
    expect(plan.every((d) => d.next === 'SIXAM CC')).toBe(true);
  });

  it('applies only unchanged rows and rolls back only what it wrote', () => {
    const plan = [
      { id: 'a', fromKey: 'sixam', prior: 'Sixam', next: 'SIXAM CC' },
      { id: 'b', fromKey: 'sixam', prior: 'SIXAM', next: 'SIXAM CC' },
    ];
    const live = new Map<string, string | null>([['a', 'Sixam'], ['b', 'Hand Fixed']]);
    expect(stillApplicable(plan, live)).toEqual({ apply: [plan[0]], drifted: ['b'] });
    const after = new Map<string, string | null>([['a', 'SIXAM CC'], ['b', 'Hand Fixed']]);
    expect(rollbackable(plan, after).map((d) => d.id)).toEqual(['a']);
  });

  it('validates the plan basename and flags', () => {
    expect(parsePlanName(['--plan=creator-split-fold-2026-11-06.json'])).toBe('creator-split-fold-2026-11-06.json');
    expect(parsePlanName(['--plan=../x.json'])).toBe('');
    expect(parsePlanName([])).toBeNull();
    expect(unknownFlags(['--apply', '--yes'])).toEqual(['--yes']);
  });
});

describe('frozen plan 2026-11-06 matches the constant', () => {
  const p = 'reports/funnel/triage/creator-split-fold-2026-11-06.json';
  it.runIf(existsSync(join(__dirname, '..', '..', p)))('every row folds a moved key into its target spelling, under the cap', () => {
    const plan = JSON.parse(read(p)) as { rows: Array<{ fromKey: string; prior: string; next: string }>; targets: Array<{ fromKey: string; toSlug: string; spelling: string }> };
    expect(plan.rows.length).toBeGreaterThan(0);
    expect(plan.rows.length).toBeLessThanOrEqual(MAX_FOLD_ROWS);
    const spelling = new Map(plan.targets.map((t) => [t.fromKey, t.spelling]));
    for (const r of plan.rows) {
      expect(MOVED_CREATOR_KEYS[r.fromKey]).toBeDefined();
      expect(creatorKey(r.prior)).toBe(r.fromKey);
      expect(r.next).toBe(spelling.get(r.fromKey));
      expect(authorSlug(r.next)).toBe(MOVED_CREATOR_KEYS[r.fromKey]);
    }
  });
});
