import { describe, expect, it } from 'vitest';

import {
  MAX_PATREON_BACKFILL_ROWS,
  cleanCampaignName,
  parseLimit,
  parsePlanName,
  patreonPostId,
  planBackfill,
  planRow,
  resolveSpelling,
  rollbackable,
  settable,
  shouldAbort,
  slugLosesLetters,
  stillApplicable,
  targetPostId,
  unknownFlags,
  type BackfillRow,
  type PostLookup,
  type SetDecision,
} from '../../scripts/agents/patreon-author-backfill-lib';
import { MOVED_CREATOR_KEYS, creatorKey } from '../../lib/creatorSlug';

const row = (over: Partial<BackfillRow> = {}): BackfillRow => ({
  id: 'm1',
  title: 'Iyah Locs Hair',
  author: 'Iyah Locs Hair 120775816',
  downloadUrl: 'https://www.patreon.com/posts/iyah-locs-hair-120775816?utm_medium=clipboard_copy&utm_source=copyLink',
  sourceUrl: 'https://musthavemods.com/sims-4-urban-hair-cc/',
  ...over,
});

const found = (over: Partial<Extract<PostLookup, { kind: 'found' }>> = {}): PostLookup => ({
  kind: 'found',
  campaignId: '4481142',
  name: 'EH Sims',
  vanity: 'EHsims',
  isNsfw: false,
  ...over,
});

describe('patreonPostId (E370)', () => {
  it('parses /posts/<slug>-<id>, /posts/<id> and /<vanity>/posts/<slug>-<id>, ignoring utm query', () => {
    expect(patreonPostId('https://www.patreon.com/posts/iyah-locs-hair-120775816?utm_medium=x')).toBe('120775816');
    expect(patreonPostId('https://www.patreon.com/posts/53290860')).toBe('53290860');
    expect(patreonPostId('https://patreon.com/EHsims/posts/iyah-locs-hair-120775816')).toBe('120775816');
  });
  it('rejects look-alike hosts, profiles, collections and non-numeric tails', () => {
    expect(patreonPostId('https://www.patreon.com.evil.example/posts/x-120775816')).toBeNull();
    expect(patreonPostId('https://evilpatreon.com/posts/x-120775816')).toBeNull();
    expect(patreonPostId('https://www.patreon.com/EHsims')).toBeNull();
    expect(patreonPostId('https://www.patreon.com/collection/123456')).toBeNull();
    expect(patreonPostId('https://www.patreon.com/posts/no-id-here')).toBeNull();
    expect(patreonPostId('https://www.patreon.com/a/b/posts/x-120775816')).toBeNull();
    expect(patreonPostId('ftp://www.patreon.com/posts/120775816')).toBeNull();
    expect(patreonPostId('not a url')).toBeNull();
    expect(patreonPostId(null)).toBeNull();
  });
});

describe('targetPostId (E370)', () => {
  it('targets unusable authors only; a real author is never a target', () => {
    expect(targetPostId(row())).toBe('120775816');
    expect(targetPostId(row({ author: null }))).toBe('120775816');
    expect(targetPostId(row({ author: 'MeeriGold' }))).toBeNull();
  });
  it('falls back to sourceUrl and ignores non-Patreon rows', () => {
    expect(targetPostId(row({ downloadUrl: 'https://simfileshare.net/x', sourceUrl: 'https://www.patreon.com/posts/53290860' }))).toBe('53290860');
    expect(targetPostId(row({ downloadUrl: 'https://simfileshare.net/x' }))).toBeNull();
  });
});

describe('cleanCampaignName / slugLosesLetters (E370 probe cases)', () => {
  it('cuts a tagline at the first " | "', () => {
    expect(cleanCampaignName('SNOOTYSIMS | SIMS 4 CC | Cute Decor, Furniture, Clutter, ...')).toBe('SNOOTYSIMS');
    expect(cleanCampaignName('EH Sims')).toBe('EH Sims');
    expect(cleanCampaignName('   ')).toBeNull();
    expect(cleanCampaignName(null)).toBeNull();
  });
  it('flags names whose slug drops letters', () => {
    expect(slugLosesLetters('✨ qmbıbı ✨')).toBe(true);
    expect(slugLosesLetters('치왈왈')).toBe(true);
    expect(slugLosesLetters("KK's creation")).toBe(false);
    expect(slugLosesLetters('EH Sims')).toBe(false);
  });
});

describe('planRow (E370)', () => {
  it('sets the campaign name and records the prior', () => {
    expect(planRow(row(), found())).toMatchObject({ action: 'set', next: 'EH Sims', prior: 'Iyah Locs Hair 120775816', postId: '120775816', vanity: 'EHsims' });
  });
  it('never touches a usable author', () => {
    expect(planRow(row({ author: 'Madlen' }), found())).toMatchObject({ action: 'skip', reason: 'has-author' });
  });
  it('skips a campaign Patreon flags is_nsfw', () => {
    expect(planRow(row(), found({ isNsfw: true }))).toMatchObject({ action: 'skip', reason: 'nsfw-campaign' });
  });
  it('maps lookup failures to distinct skip reasons', () => {
    expect(planRow(row(), { kind: 'not-found' })).toMatchObject({ reason: 'not-found' });
    expect(planRow(row(), { kind: 'forbidden' })).toMatchObject({ reason: 'forbidden' });
    expect(planRow(row(), { kind: 'unreachable', detail: 'x' })).toMatchObject({ reason: 'unreachable' });
    expect(planRow(row(), undefined)).toMatchObject({ reason: 'unreachable' });
    expect(planRow(row(), found({ name: null, vanity: null }))).toMatchObject({ reason: 'no-campaign' });
    expect(planRow(row({ downloadUrl: null, sourceUrl: null }), found())).toMatchObject({ reason: 'no-patreon-post' });
  });
  it('falls back to the vanity when the name is unusable or slug-lossy, else skips', () => {
    expect(planRow(row(), found({ name: '✨ qmbıbı ✨', vanity: 'qmbibi' }))).toMatchObject({ action: 'set', next: 'qmbibi' });
    expect(planRow(row(), found({ name: 'Patreon', vanity: 'realcreator' }))).toMatchObject({ action: 'set', next: 'realcreator' });
    expect(planRow(row(), found({ name: '치왈왈', vanity: null }))).toMatchObject({ action: 'skip', reason: 'author-unusable' });
  });
});

describe('resolveSpelling (E370)', () => {
  const counts = new Map<string, number>([
    ['snootysims', 12],
    ['happylifesims', 9],
    ['daisysims', 7],
    ['backtrackcc', 20],
    ['madlen', 30],
  ]);
  const spelling = new Map<string, string>([
    ['snootysims', 'Snootysims'],
    ['happylifesims', 'Happylifesims'],
    ['daisysims', 'Daisy-Sims'],
    ['backtrackcc', 'backtrackcc'],
    ['madlen', 'Madlen'],
  ]);
  it('keeps a name that already has a page', () => {
    expect(resolveSpelling({ next: 'Madlen', vanity: 'madlensims' }, counts, spelling, 5)).toBe('Madlen');
  });
  it('follows an E356 fold (MOVED_CREATOR_KEYS) to the target spelling', () => {
    expect(MOVED_CREATOR_KEYS[creatorKey('BackTrack')]).toBe('backtrackcc');
    expect(resolveSpelling({ next: 'BackTrack', vanity: null }, counts, spelling, 5)).toBe('backtrackcc');
  });
  it('joins a vanity page when one key is a prefix of the other', () => {
    expect(resolveSpelling({ next: 'HappyLifeSims (Koonam)', vanity: 'happylifesims' }, counts, spelling, 5)).toBe('Happylifesims');
  });
  it('skips (null) when the vanity owns an unrelated page — never guess the current identity', () => {
    expect(resolveSpelling({ next: 'BeckySims', vanity: 'DaisySims' }, counts, spelling, 5)).toBeNull();
  });
  it('writes the name when nothing matches (a new or growing small creator)', () => {
    expect(resolveSpelling({ next: 'AggressiveKitty', vanity: 'aggressivekitty' }, counts, spelling, 5)).toBe('AggressiveKitty');
  });
});

describe('plan plumbing (E370)', () => {
  const d = (over: Partial<SetDecision> = {}): SetDecision => ({
    id: 'm1', action: 'set', postId: '1', campaignId: 'c', vanity: 'v', prior: null, next: 'EH Sims', title: 't', ...over,
  });
  it('planBackfill + settable keep only sets', () => {
    const lookups = new Map<string, PostLookup>([['120775816', found()], ['53290860', { kind: 'not-found' }]]);
    const out = planBackfill([row(), row({ id: 'm2', downloadUrl: 'https://www.patreon.com/posts/53290860', author: '53290860' })], lookups);
    expect(settable(out).map((x) => x.id)).toEqual(['m1']);
  });
  it('apply writes only rows whose live author still equals the prior', () => {
    const live = new Map<string, string | null>([['m1', null], ['m2', 'Fixed By Hand']]);
    const r = stillApplicable([d(), d({ id: 'm2' }), d({ id: 'm3' })], live);
    expect(r.apply.map((x) => x.id)).toEqual(['m1']);
    expect(r.drifted).toEqual(['m2', 'm3']);
  });
  it('rollback restores only rows still holding what we wrote', () => {
    const live = new Map<string, string | null>([['m1', 'EH Sims'], ['m2', 'Someone Else']]);
    expect(rollbackable([d(), d({ id: 'm2' })], live).map((x) => x.id)).toEqual(['m1']);
  });
  it('aborts on any 429, a blanket refusal, or >10% unreachable', () => {
    expect(shouldAbort({ done: 10, unreachable: 0, forbidden: 0, rateLimited: 1 })).toMatch(/rate-limited/);
    expect(shouldAbort({ done: 100, unreachable: 0, forbidden: 51, rateLimited: 0 })).toMatch(/refused/);
    expect(shouldAbort({ done: 100, unreachable: 11, forbidden: 0, rateLimited: 0 })).toMatch(/unreachable/);
    expect(shouldAbort({ done: 100, unreachable: 10, forbidden: 2, rateLimited: 0 })).toBeNull();
  });
  it('validates flags, plan names and --limit; the cap stays under autonomy.md 5,000', () => {
    expect(parsePlanName(['--plan=patreon-authors-2026-11-07.json'])).toBe('patreon-authors-2026-11-07.json');
    expect(parsePlanName(['--plan=../x.json'])).toBe('');
    expect(parsePlanName([])).toBeNull();
    expect(unknownFlags(['--apply', '--limit=5', '--plan=x', '--force'])).toEqual(['--force']);
    expect(parseLimit(['--limit=200'])).toBe(200);
    expect(parseLimit(['--limit=0'])).toBeNaN();
    expect(parseLimit([])).toBeNull();
    expect(MAX_PATREON_BACKFILL_ROWS).toBeLessThanOrEqual(5000);
  });
});
