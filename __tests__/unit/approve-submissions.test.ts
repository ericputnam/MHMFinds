/**
 * E304 (Nova, 2026-10-31): scripted approval of pending creator submissions
 * behind a proof-of-ownership gate — CurseForge project exists, its author
 * names the submission's author, the author names the submitting account.
 * Only `source-verified` rows are writable; everything else is a recorded skip.
 */
import { describe, expect, it } from 'vitest';

import { isPendingHandle, pendingProfileHandle } from '../../lib/creatorClaim';
import { resolveIngestContentType } from '../../lib/services/contentTypeDetector';
import { newModDataFromSubmission } from '../../lib/submissionApprovalProfile';
import {
  CURSEFORGE_SIMS4_GAME_ID,
  MAX_APPROVE_ROWS,
  curseforgeSlug,
  emailVerifiedVia,
  nameMatches,
  ownershipVerdict,
  parseIds,
  planApprovalRow,
  planApprovals,
  shouldWritePlan,
  stillApplicable,
  unknownFlags,
  writable,
  type SourceLookup,
  type SubmissionRow,
} from '../../scripts/agents/approve-submissions-lib';

const USER_ID = 'cmus9patifca33nf4u56dphnz';

function row(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    submissionId: 's1',
    status: 'pending',
    isEdit: false,
    userId: USER_ID,
    submitterIsAdmin: false,
    existingProfileId: null,
    author: 'Atino00',
    displayName: 'atino00',
    username: 'atino00',
    modName: 'Vintage decor set',
    description: 'A vintage decor set.',
    modUrl: 'https://www.curseforge.com/sims4/build-buy/vintage-decor-set',
    downloadUrl: 'https://www.curseforge.com/sims4/build-buy/vintage-decor-set',
    createdAt: '2026-10-03T10:51:00.000Z',
    emailVerifiedVia: 'credentials-auto',
    ...overrides,
  };
}

const found: SourceLookup = { kind: 'found', projectId: 1712665, authors: ['Atino00'], downloads: 819, created: '2026-09-27' };

describe('curseforgeSlug', () => {
  it('reads /sims4/<class>/<slug> on the exact CurseForge hosts only', () => {
    expect(curseforgeSlug('https://www.curseforge.com/sims4/build-buy/vintage-decor-set')).toBe('vintage-decor-set');
    expect(curseforgeSlug('https://curseforge.com/sims4/create-a-sim/Some-Hair/files')).toBe('some-hair');
    expect(curseforgeSlug('https://www.curseforge.com/sims4/build-buy/elegant-boho-floor?page=2')).toBe('elegant-boho-floor');
  });

  it('is null for look-alike hosts, other games, short paths and non-URLs', () => {
    expect(curseforgeSlug('https://www.curseforge.com.evil.example/sims4/build-buy/x')).toBeNull();
    expect(curseforgeSlug('https://evil.example/www.curseforge.com/sims4/build-buy/x')).toBeNull();
    expect(curseforgeSlug('https://www.curseforge.com/minecraft/mc-mods/jei')).toBeNull();
    expect(curseforgeSlug('https://www.curseforge.com/sims4/build-buy')).toBeNull();
    expect(curseforgeSlug('https://www.tumblr.com/atino-life/123/vintage-decor-set')).toBeNull();
    expect(curseforgeSlug('not a url')).toBeNull();
    expect(curseforgeSlug(null)).toBeNull();
  });

  it('pins the Sims 4 game id the lookup queries', () => {
    expect(CURSEFORGE_SIMS4_GAME_ID).toBe(78062);
  });
});

describe('nameMatches', () => {
  it('is separator- and case-blind on the E293 creator key, never on empty', () => {
    expect(nameMatches('Atino00', 'atino00')).toBe(true);
    expect(nameMatches('Sixam CC', 'SixamCC')).toBe(true);
    expect(nameMatches('', '')).toBe(false);
    expect(nameMatches('---', '')).toBe(false);
    expect(nameMatches(null, 'x')).toBe(false);
    expect(nameMatches('Atino00', 'Atino01')).toBe(false);
  });
});

describe('ownershipVerdict', () => {
  it('source-verified only when source author = submission author = account', () => {
    expect(ownershipVerdict(row(), found)).toBe('source-verified');
    expect(ownershipVerdict(row({ displayName: 'Atino 00', username: 'someone-else' }), found)).toBe('source-verified');
  });

  it('names each failure, in order of what was checked', () => {
    expect(ownershipVerdict(row(), { kind: 'unchecked' })).toBe('source-unchecked');
    expect(ownershipVerdict(row(), { kind: 'unreachable', detail: 'HTTP 403' })).toBe('source-unreachable');
    expect(ownershipVerdict(row(), { kind: 'not-found' })).toBe('source-not-found');
    expect(ownershipVerdict(row(), { ...found, authors: ['SomebodyElse'] })).toBe('author-not-source');
    expect(ownershipVerdict(row({ username: 'impostor', displayName: 'Impostor' }), found)).toBe('author-not-account');
    // A missing author can never match anything.
    expect(ownershipVerdict(row({ author: null }), found)).toBe('author-not-source');
  });
});

describe('planApprovalRow', () => {
  it('approves a verified pending row with the E183 pending handle, never the public slug', () => {
    const d = planApprovalRow(row(), found);
    expect(d.action).toBe('approve');
    if (d.action !== 'approve') return;
    expect(d.userId).toBe(USER_ID);
    expect(d.profile).toEqual({ kind: 'create', handle: pendingProfileHandle('atino00', USER_ID) });
    expect(isPendingHandle((d.profile as { handle: string }).handle)).toBe(true);
    expect(d.evidence.verdict).toBe('source-verified');
    expect(d.evidence.sourceProjectId).toBe(1712665);
    expect(d.evidence.authorKey).toBe('atino00');
    expect(d.evidence.accountKeys).toEqual(['atino00', 'atino00']);
  });

  it('links an existing profile instead of creating one', () => {
    const d = planApprovalRow(row({ existingProfileId: 'p-old' }), found);
    expect(d.action).toBe('approve');
    if (d.action !== 'approve') return;
    expect(d.profile).toEqual({ kind: 'link', profileId: 'p-old' });
  });

  it('skips rows the gate cannot judge, with the reason recorded', () => {
    expect(planApprovalRow(row({ status: 'approved' }), found)).toMatchObject({ action: 'skip', reason: 'not-pending' });
    expect(planApprovalRow(row({ isEdit: true }), found)).toMatchObject({ action: 'skip', reason: 'edit' });
    expect(planApprovalRow(row({ userId: null }), found)).toMatchObject({ action: 'skip', reason: 'anonymous' });
    expect(planApprovalRow(row({ submitterIsAdmin: true }), found)).toMatchObject({ action: 'skip', reason: 'admin' });
    expect(planApprovalRow(row(), { kind: 'not-found' })).toMatchObject({ action: 'skip', reason: 'source-not-found' });
    expect(planApprovalRow(row({ username: 'x', displayName: 'y' }), found)).toMatchObject({ action: 'skip', reason: 'author-not-account' });
    const tumblr = planApprovalRow(row({ downloadUrl: 'https://www.tumblr.com/atino-life/1/x', modUrl: 'https://www.tumblr.com/atino-life/1/x' }), { kind: 'unchecked' });
    expect(tumblr).toMatchObject({ action: 'skip', reason: 'source-unchecked' });
    if (tumblr.action === 'skip') expect(tumblr.evidence?.curseforgeSlug).toBeNull();
  });

  it('a row with no lookup defaults to unchecked, never to verified', () => {
    const [d] = planApprovals([row()], new Map());
    expect(d).toMatchObject({ action: 'skip', reason: 'source-unchecked' });
    expect(writable([d])).toEqual([]);
  });
});

describe('frozen plan', () => {
  it('applies only rows whose live re-plan agrees on account, profile, verdict and source authors', () => {
    const frozen = writable([planApprovalRow(row(), found)]);
    expect(frozen).toHaveLength(1);
    const same = stillApplicable(frozen, [planApprovalRow(row(), found)]);
    expect(same.apply).toHaveLength(1);
    expect(same.drifted).toEqual([]);
    const driftedAuthor = stillApplicable(frozen, [planApprovalRow(row(), { ...found, authors: ['Other'] })]);
    expect(driftedAuthor.apply).toEqual([]);
    expect(driftedAuthor.drifted).toEqual(['s1']);
    const driftedProfile = stillApplicable(frozen, [planApprovalRow(row({ existingProfileId: 'p-new' }), found)]);
    expect(driftedProfile.drifted).toEqual(['s1']);
    const gone = stillApplicable(frozen, []);
    expect(gone.drifted).toEqual(['s1']);
  });

  it('never overwrites a non-empty plan without --replace-plan; caps the apply', () => {
    expect(shouldWritePlan(null, false)).toBe(true);
    expect(shouldWritePlan(0, false)).toBe(true);
    expect(shouldWritePlan(7, false)).toBe(false);
    expect(shouldWritePlan(7, true)).toBe(true);
    expect(MAX_APPROVE_ROWS).toBeLessThanOrEqual(5000);
  });
});

describe('argv', () => {
  it('parses --ids and refuses unknown flags', () => {
    expect(parseIds(['--ids=a, b,,c'])).toEqual(['a', 'b', 'c']);
    expect(parseIds(['--apply'])).toBeNull();
    expect(parseIds(['--ids='])).toEqual([]);
    expect(unknownFlags(['--ids=a', '--apply', '--rollback', '--replace-plan'])).toEqual([]);
    expect(unknownFlags(['--aply'])).toEqual(['--aply']);
  });

  it('records how an email counts as verified; a credentials auto-stamp is not OAuth', () => {
    expect(emailVerifiedVia({ emailVerified: new Date(), providers: ['credentials'] })).toBe('credentials-auto');
    expect(emailVerifiedVia({ emailVerified: null, providers: ['credentials'] })).toBe('none');
    expect(emailVerifiedVia({ emailVerified: null, providers: ['google'] })).toBe('oauth');
  });
});

describe('newModDataFromSubmission (shared with the approve route)', () => {
  const sub = {
    modName: 'Cute & kawaii doll wallpaper',
    description: 'A wallpaper set.',
    shortDescription: null,
    version: null,
    gameVersion: 'Sims 4',
    category: 'Build/Buy',
    tags: [] as string[],
    thumbnail: 'https://64.media.tumblr.com/x.jpg' as string | null,
    images: [] as string[],
    modUrl: 'https://www.curseforge.com/sims4/build-buy/cute-kawaii-doll-wallpaper',
    downloadUrl: null as string | null,
    sourceUrl: null as string | null,
    source: null as string | null,
    author: 'Atino00' as string | null,
    isFree: true,
    price: null,
    currency: 'USD' as string | null,
    isNSFW: false,
  };

  it('falls back to modUrl, the category tag and the default source exactly as the route did', () => {
    const data = newModDataFromSubmission(sub, { thumbnail: sub.thumbnail, images: sub.images });
    expect(data.downloadUrl).toBe(sub.modUrl);
    expect(data.sourceUrl).toBe(sub.modUrl);
    expect(data.tags).toEqual(['Build/Buy']);
    expect(data.source).toBe('User Submission');
    expect(data.title).toBe(sub.modName);
    expect(data.author).toBe('Atino00');
  });

  it('sets contentType through the E168 ingest resolver and NULL when nothing is confident', () => {
    const ct = newModDataFromSubmission(sub, { thumbnail: null, images: [] }).contentType;
    // Delegates to the detector rather than restating its answer ("doll" outranks "wallpaper" today).
    expect(ct).toBe(resolveIngestContentType(sub.modName, sub.description, null));
    expect(typeof ct).toBe('string');
    const vague = newModDataFromSubmission({ ...sub, modName: 'Set 3', description: 'nice' }, { thumbnail: null, images: [] });
    expect(vague.contentType).toBeNull();
  });
});
