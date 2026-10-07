import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BUCKETS,
  bucketFor,
  catalogMatchMods,
  isCreatorAuthorSlug,
  summarize,
  type FlaggedAccount,
} from '../../scripts/agents/creator-flag-audit-lib';
import { NON_CREATOR_SLUGS } from '../../lib/creatorSlug';

const NOW = new Date('2026-10-07T12:00:00Z');
const base: FlaggedAccount = {
  createdAt: new Date('2026-09-01T00:00:00Z'),
  isAdmin: false,
  placeholder: false,
  providers: ['credentials'],
  hasCreatorProfile: false,
  submissions: 0,
  favorites: 0,
  downloadClicks: 0,
  usernameSlug: 'jane',
  displayNameSlug: 'jane',
  usernameSlugMods: 0,
  displayNameSlugMods: 0,
};
const acct = (o: Partial<FlaggedAccount>): FlaggedAccount => ({ ...base, ...o });

describe('creator-flag audit buckets (E178)', () => {
  it('placeholder wins over everything, including submissions', () => {
    expect(bucketFor(acct({ placeholder: true, submissions: 3, isAdmin: true }))).toBe('seed-placeholder');
  });

  it('admin before submitted, so an operator test submission is not a creator', () => {
    expect(bucketFor(acct({ isAdmin: true, submissions: 1 }))).toBe('admin');
  });

  it('submitted before profile, profile before catalog match', () => {
    expect(bucketFor(acct({ submissions: 1, hasCreatorProfile: true }))).toBe('submitted');
    expect(bucketFor(acct({ hasCreatorProfile: true, usernameSlugMods: 5 }))).toBe('holds-creator-profile');
  });

  it('a catalog match on either handle counts; junk and platform slugs never do', () => {
    expect(bucketFor(acct({ displayNameSlug: 'simcredible', displayNameSlugMods: 138 }))).toBe('catalog-author-match');
    const platform = Array.from(NON_CREATOR_SLUGS)[0];
    expect(isCreatorAuthorSlug(platform)).toBe(false);
    expect(catalogMatchMods(acct({ usernameSlug: platform, usernameSlugMods: 81 }))).toBe(0);
    expect(catalogMatchMods(acct({ usernameSlug: '75940181', usernameSlugMods: 9 }))).toBe(0);
    expect(catalogMatchMods(acct({ usernameSlug: '', usernameSlugMods: 9 }))).toBe(0);
  });

  it('player activity only after the creator signals are exhausted', () => {
    expect(bucketFor(acct({ usernameSlug: 'pixelcc', favorites: 4 }))).toBe('creatorish-handle');
    expect(bucketFor(acct({ favorites: 1 }))).toBe('player-active');
    expect(bucketFor(acct({ downloadClicks: 1 }))).toBe('player-active');
    expect(bucketFor(acct({}))).toBe('dormant');
  });

  it('buckets partition the population (every account counted exactly once)', () => {
    const rows = [
      acct({ placeholder: true, providers: [] }),
      acct({ isAdmin: true }),
      acct({ submissions: 2 }),
      acct({ hasCreatorProfile: true }),
      acct({ usernameSlug: 'madlen', usernameSlugMods: 12 }),
      acct({ usernameSlug: 'buildqueen' }),
      acct({ favorites: 3 }),
      acct({ createdAt: new Date('2025-12-01T00:00:00Z') }),
    ];
    const s = summarize(rows, NOW);
    const sum = BUCKETS.reduce((t, b) => t + s.byBucket[b], 0);
    expect(sum).toBe(rows.length);
    for (const b of BUCKETS) expect(s.byBucket[b]).toBe(1);
    // humans exclude placeholder + admin; age bands cover humans only
    expect(s.humans).toBe(6);
    expect(Object.values(s.byAge).reduce((t, n) => t + n, 0)).toBe(6);
    expect(s.byAge['>180d']).toBe(1); // 2025-12-01 is 310 days before NOW
    expect(s.byAge['31-90d']).toBe(5); // the 09-01 default is 36 days
    expect(s.bySource['script/aggregator']).toBe(1);
  });
});

describe('creator-flag audit script stays read-only and PII-free (source guard)', () => {
  const src = readFileSync(resolve(__dirname, '../../scripts/agents/creator-flag-audit.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('opens a READ ONLY transaction before any query', () => {
    const ro = src.indexOf("SET TRANSACTION READ ONLY");
    expect(ro).toBeGreaterThan(-1);
    expect(src.indexOf('$queryRawUnsafe')).toBeGreaterThan(ro);
  });

  it('never calls a Prisma write method', () => {
    expect(src).not.toMatch(/\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/);
    expect(src).not.toMatch(/\b(INSERT|UPDATE|DELETE)\s/);
  });

  it('never selects email, username or id into the output rows', () => {
    expect(src).not.toMatch(/u\.email\s+AS/i);
    expect(src).not.toMatch(/u\.username\s+AS/i);
    expect(src).not.toMatch(/u\.id\s+AS/i);
  });
});
