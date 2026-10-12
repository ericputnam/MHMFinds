/**
 * E190 (Nova, 2026-10-12): backfill the E183 pending profile + Mod.creatorId
 * for submissions approved before #274. Pure planner only.
 */
import { describe, expect, it } from 'vitest';
import {
  authorNamesAccount,
  nameKey,
  planBackfill,
  planBackfillRow,
  shouldWritePlan,
  stillApplicable,
  writable,
  type BackfillInputRow,
} from '../../scripts/agents/approval-profile-backfill-lib';
import { planApprovalProfile } from '../../lib/submissionApprovalProfile';
import { isPendingHandle } from '../../lib/creatorClaim';

const base: BackfillInputRow = {
  submissionId: 'sub',
  status: 'approved',
  isEdit: false,
  userId: 'user00000000abcdefgh',
  submitterIsAdmin: false,
  existingProfileId: null,
  author: 'Some Creator',
  displayName: 'somecreator',
  username: 'somecreator',
  approvedModId: 'mod1',
  modExists: true,
  modCreatorId: null,
};
const row = (o: Partial<BackfillInputRow>): BackfillInputRow => ({ ...base, ...o });

// The real pre-#274 population, DB 2026-10-12 (ids and names shaped like the rows, no PII).
const POPULATION: BackfillInputRow[] = [
  row({ submissionId: 'anon-no-mod', userId: null, author: null, displayName: null, username: null, approvedModId: null, modExists: false }),
  row({ submissionId: 'other-author', author: 'SimwithShan', displayName: 'acctname', username: 'acctname' }),
  row({ submissionId: 'doree', userId: 'cmuserxxxxxxxxdoree123', author: 'dorée', displayName: 'doree', username: 'doree', approvedModId: 'mod-doree' }),
  row({ submissionId: 'anon-with-mod', userId: null, author: null, displayName: null, username: null, approvedModId: 'mod-anon' }),
];

describe('nameKey / authorNamesAccount', () => {
  it('folds accents, case and punctuation', () => {
    expect(nameKey('Dorée')).toBe('doree');
    expect(nameKey('Simwith-Shan!')).toBe('simwithshan');
    expect(nameKey(null)).toBe('');
  });
  it('matches author against display name or username, never empty', () => {
    expect(authorNamesAccount({ author: 'dorée', displayName: 'x', username: 'doree' })).toBe(true);
    expect(authorNamesAccount({ author: 'SimwithShan', displayName: 'acct', username: 'acct' })).toBe(false);
    expect(authorNamesAccount({ author: '', displayName: '', username: '' })).toBe(false);
    expect(authorNamesAccount({ author: '!!', displayName: '', username: null })).toBe(false);
  });
});

describe('planBackfill on the real population', () => {
  const decisions = planBackfill(POPULATION);
  it('writes exactly one row: doree', () => {
    const w = writable(decisions);
    expect(w).toHaveLength(1);
    expect(w[0].submissionId).toBe('doree');
    expect(w[0].action).toBe('create');
  });
  it('skips the others for the stated reason', () => {
    const reasons = Object.fromEntries(decisions.filter((d) => d.action === 'skip').map((d) => [d.submissionId, (d as { reason: string }).reason]));
    expect(reasons).toEqual({ 'anon-no-mod': 'no-mod', 'other-author': 'author-not-account', 'anon-with-mod': 'anonymous' });
  });
  it('gives doree the same pending handle a live E183 approval would', () => {
    const d = writable(decisions)[0];
    const live = planApprovalProfile({ isEdit: false, userId: 'cmuserxxxxxxxxdoree123', submitterIsAdmin: false, existingProfileId: null, author: 'dorée', displayName: 'doree', username: 'doree' });
    expect(live.kind).toBe('create');
    if (d.action !== 'create' || live.kind !== 'create') throw new Error('unreachable');
    expect(d.handle).toBe(live.data.handle);
    expect(isPendingHandle(d.handle)).toBe(true);
  });
});

describe('planBackfillRow guards', () => {
  it('never re-links a mod that already has a creator', () => {
    expect(planBackfillRow(row({ modCreatorId: 'p1' }))).toMatchObject({ action: 'skip', reason: 'already-linked' });
  });
  it('skips non-approved, edits and admins', () => {
    expect(planBackfillRow(row({ status: 'pending' }))).toMatchObject({ reason: 'not-approved' });
    expect(planBackfillRow(row({ isEdit: true }))).toMatchObject({ reason: 'edit' });
    expect(planBackfillRow(row({ submitterIsAdmin: true }))).toMatchObject({ reason: 'admin' });
  });
  it('links to an existing profile only when the author names the account', () => {
    expect(planBackfillRow(row({ existingProfileId: 'p9' }))).toMatchObject({ action: 'link', profileId: 'p9' });
    expect(planBackfillRow(row({ existingProfileId: 'p9', author: 'Someone Else' }))).toMatchObject({ action: 'skip', reason: 'author-not-account' });
  });
  it('a deleted mod is no-mod, not a write', () => {
    expect(planBackfillRow(row({ modExists: false }))).toMatchObject({ reason: 'no-mod' });
  });
});

describe('frozen plan', () => {
  const frozen = writable(planBackfill(POPULATION));
  it('applies when live still agrees', () => {
    expect(stillApplicable(frozen, planBackfill(POPULATION)).apply).toHaveLength(1);
  });
  it('skips a row whose mod was linked meanwhile (e.g. by a later approval)', () => {
    const live = planBackfill(POPULATION.map((r) => (r.submissionId === 'doree' ? { ...r, modCreatorId: 'p1' } : r)));
    expect(stillApplicable(frozen, live)).toEqual({ apply: [], drifted: ['doree'] });
  });
  it('a dry run never overwrites a non-empty plan', () => {
    expect(shouldWritePlan(1, false)).toBe(false);
    expect(shouldWritePlan(null, false)).toBe(true);
    expect(shouldWritePlan(0, false)).toBe(true);
    expect(shouldWritePlan(1, true)).toBe(true);
  });
});
