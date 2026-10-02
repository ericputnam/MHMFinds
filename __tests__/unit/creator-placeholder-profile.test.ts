/**
 * E158 (Nova, 2026-10-02): a script-minted placeholder CreatorProfile must
 * never "own" a /creator/<slug>/ page. DB 2026-10-02: 20/20 profiles were
 * seed rows on musthavemods.generated, all isVerified=true, 0 OAuth logins;
 * 8 matched a live page, which then showed "Verified creator" and hid the
 * E144 claim card.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PLACEHOLDER_ACCOUNT_DOMAINS,
  isPlaceholderAccountEmail,
  pageProfileFrom,
} from '../../lib/creatorClaim';
import {
  idsStillTargets,
  isUnverifyTarget,
  planUnverify,
  shouldWritePlan,
  type ProfileRow,
} from '../../scripts/agents/creator-placeholder-lib';

// Built from the constant, never restated, so the test follows the list.
const at = (domain: string) => `someone@${domain}`;

describe('isPlaceholderAccountEmail', () => {
  it('covers every listed domain, case-insensitively', () => {
    expect(PLACEHOLDER_ACCOUNT_DOMAINS.length).toBeGreaterThanOrEqual(2);
    for (const d of PLACEHOLDER_ACCOUNT_DOMAINS) {
      expect(isPlaceholderAccountEmail(at(d))).toBe(true);
      expect(isPlaceholderAccountEmail(at(d.toUpperCase()))).toBe(true);
    }
  });

  it('is false for real-looking, suffix-spoofed, empty and null values', () => {
    expect(isPlaceholderAccountEmail('person@gmail.com')).toBe(false);
    expect(isPlaceholderAccountEmail(`x@evil.${PLACEHOLDER_ACCOUNT_DOMAINS[0]}`)).toBe(false);
    expect(isPlaceholderAccountEmail(`x@${PLACEHOLDER_ACCOUNT_DOMAINS[0]}.evil`)).toBe(false);
    expect(isPlaceholderAccountEmail('')).toBe(false);
    expect(isPlaceholderAccountEmail(null)).toBe(false);
    expect(isPlaceholderAccountEmail(undefined)).toBe(false);
  });
});

describe('pageProfileFrom', () => {
  const base = { website: 'https://example.com', bio: 'b' };

  it('a verified placeholder profile does not own the page (badge off, claim card on)', () => {
    for (const d of PLACEHOLDER_ACCOUNT_DOMAINS) {
      expect(pageProfileFrom({ ...base, isVerified: true, user: { email: at(d) } })?.isVerified).toBe(false);
    }
  });

  it('a promoted real account keeps isVerified (E151 promotion still lights the badge)', () => {
    expect(pageProfileFrom({ ...base, isVerified: true, user: { email: 'creator@gmail.com' } })?.isVerified).toBe(true);
  });

  it('an unverified real account stays unverified; null stays null', () => {
    expect(pageProfileFrom({ ...base, isVerified: false, user: { email: 'creator@gmail.com' } })?.isVerified).toBe(false);
    expect(pageProfileFrom(null)).toBeNull();
  });

  it('never carries the owner email (or the user object) into page props', () => {
    const out = pageProfileFrom({ ...base, isVerified: true, user: { email: 'creator@gmail.com' } });
    expect(Object.keys(out ?? {}).sort()).toEqual(['bio', 'isVerified', 'website']);
    expect(JSON.stringify(out)).not.toContain('@');
  });
});

describe('getCreatorPageData routes the joined profile through pageProfileFrom', () => {
  // Strip comments first: comments in this repo quote the patterns they warn about.
  const src = readFileSync(resolve(__dirname, '../../lib/creators.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('selects user.email for the decision and maps through pageProfileFrom', () => {
    expect(src).toMatch(/user:\s*\{\s*select:\s*\{\s*email:\s*true\s*\}\s*\}/);
    expect(src).toMatch(/profile:\s*pageProfileFrom\(profile\)/);
  });

  it('does not pass profile.isVerified to the page directly any more', () => {
    expect(src).not.toMatch(/isVerified:\s*profile\.isVerified/);
  });
});

describe('placeholder un-verify planner', () => {
  const row = (over: Partial<ProfileRow>): ProfileRow => ({
    id: 'id',
    handle: 'h',
    isVerified: true,
    placeholderAccount: true,
    oauthAccounts: 0,
    pageMods: 0,
    ...over,
  });

  it('targets only verified + placeholder + never-signed-in rows', () => {
    expect(isUnverifyTarget(row({}))).toBe(true);
    expect(isUnverifyTarget(row({ isVerified: false }))).toBe(false);
    expect(isUnverifyTarget(row({ placeholderAccount: false }))).toBe(false);
    expect(isUnverifyTarget(row({ oauthAccounts: 1 }))).toBe(false);
  });

  it('plans sorted by handle and records the prior value for rollback', () => {
    const plan = planUnverify([row({ id: 'b', handle: 'zerbu' }), row({ id: 'a', handle: 'adeepindigo', pageMods: 5 }), row({ id: 'c', handle: 'real', placeholderAccount: false })]);
    expect(plan.map((p) => p.handle)).toEqual(['adeepindigo', 'zerbu']);
    expect(plan.every((p) => p.priorIsVerified === true)).toBe(true);
  });

  it('a dry run never overwrites a plan that already holds rows (the rollback artifact)', () => {
    expect(shouldWritePlan(null, false)).toBe(true);
    expect(shouldWritePlan(0, false)).toBe(true);
    expect(shouldWritePlan(20, false)).toBe(false);
    expect(shouldWritePlan(20, true)).toBe(true);
  });

  it('the script consults shouldWritePlan before its writeFileSync', () => {
    const src = readFileSync(resolve(__dirname, '../../scripts/agents/creator-placeholder-unverify.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const guard = src.indexOf('shouldWritePlan(');
    const write = src.indexOf('writeFileSync(');
    expect(guard).toBeGreaterThan(0);
    expect(write).toBeGreaterThan(guard);
  });

  it('apply re-checks the frozen plan: a row that signed in or vanished is skipped', () => {
    const plan = planUnverify([row({ id: 'a', handle: 'a' }), row({ id: 'b', handle: 'b' }), row({ id: 'c', handle: 'c' })]);
    const live = [row({ id: 'a', handle: 'a' }), row({ id: 'b', handle: 'b', oauthAccounts: 1 })];
    expect(idsStillTargets(plan, live)).toEqual({ apply: ['a'], skipped: ['b', 'c'] });
  });
});
