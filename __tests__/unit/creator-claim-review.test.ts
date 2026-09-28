/**
 * Admin review of creator claims (Nova, E129, 2026-09-28).
 *
 * E122 (#195) creates a CreatorProfile under a `pending-<slug>-<id8>` handle
 * when a signed-in visitor claims /creator/<slug>/. Before E129 nothing in
 * the admin could list those rows or promote one to the public handle, so
 * every claim sat invisible and no claimant could reach a live page.
 *
 * Red against pre-E129 origin/main (e765da5): every case — the module
 * lib/creatorClaimReview.ts, both app/api/admin/creator-claims/ routes, the
 * admin page and its nav link did not exist.
 *
 * Offline: source-level checks strip comments first, because comments in
 * this repo quote the patterns they describe.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { PENDING_HANDLE_PREFIX, pendingProfileHandle } from '../../lib/creatorClaim';
import {
  CLAIM_AUDIT_RESOURCE,
  MAX_REJECT_REASON,
  parseReviewAction,
  planPromotion,
  planRejection,
  slugFromPendingHandle,
} from '../../lib/creatorClaimReview';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const LIST_ROUTE = 'app/api/admin/creator-claims/route.ts';
const ACTION_ROUTE = 'app/api/admin/creator-claims/[id]/route.ts';
const PAGE = 'app/admin/creator-claims/page.tsx';

describe('slugFromPendingHandle', () => {
  it('round-trips every handle pendingProfileHandle emits, hyphenated slugs included', () => {
    const userId = 'clx9abc0000Qwerty12345678';
    for (const slug of ['brandysims', 'seoulsoul-sims', 'x-bluepill-x', 'a1-b2-c3']) {
      expect(slugFromPendingHandle(pendingProfileHandle(slug, userId))).toBe(slug);
    }
  });

  it('returns null for non-pending, truncated or invalid handles', () => {
    expect(slugFromPendingHandle('brandysims')).toBeNull();
    expect(slugFromPendingHandle(PENDING_HANDLE_PREFIX)).toBeNull();
    expect(slugFromPendingHandle(`${PENDING_HANDLE_PREFIX}abcdefgh`)).toBeNull();
    expect(slugFromPendingHandle(`${PENDING_HANDLE_PREFIX}Brandy Sims-abcdefgh`)).toBeNull();
    // A claim can never be promoted onto another pending handle.
    expect(slugFromPendingHandle(`${PENDING_HANDLE_PREFIX}pending-foo-abcdefgh`)).toBeNull();
  });
});

describe('parseReviewAction', () => {
  it('accepts promote with and without an explicit slug, and reject with a bounded reason', () => {
    expect(parseReviewAction({ action: 'promote' })).toEqual({ action: 'promote', slug: null });
    expect(parseReviewAction({ action: 'promote', slug: 'brandysims' })).toEqual({
      action: 'promote',
      slug: 'brandysims',
    });
    expect(parseReviewAction({ action: 'reject' })).toEqual({ action: 'reject', reason: '' });
    const long = parseReviewAction({ action: 'reject', reason: 'x'.repeat(MAX_REJECT_REASON + 50) });
    expect(long && long.action === 'reject' && long.reason.length).toBe(MAX_REJECT_REASON);
  });

  it('never coerces a malformed body into an action', () => {
    expect(parseReviewAction(null)).toBeNull();
    expect(parseReviewAction('promote')).toBeNull();
    expect(parseReviewAction({ action: 'approve' })).toBeNull();
    expect(parseReviewAction({ action: 'promote', slug: 'Not A Slug' })).toBeNull();
    expect(parseReviewAction({ action: 'promote', slug: 42 })).toBeNull();
  });
});

describe('planPromotion', () => {
  const pending = pendingProfileHandle('brandysims', 'user00000000abcd1234');

  it('promotes a pending handle to its own slug by default', () => {
    expect(
      planPromotion({ currentHandle: pending, requestedSlug: null, conflictingProfileId: null, profileId: 'p1' })
    ).toEqual({ ok: true, handle: 'brandysims' });
  });

  it('refuses a non-pending profile, a squatted handle, and an invalid target', () => {
    expect(
      planPromotion({ currentHandle: 'brandysims', requestedSlug: null, conflictingProfileId: null, profileId: 'p1' })
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      planPromotion({ currentHandle: pending, requestedSlug: null, conflictingProfileId: 'p2', profileId: 'p1' })
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      planPromotion({
        currentHandle: `${PENDING_HANDLE_PREFIX}garbage`,
        requestedSlug: null,
        conflictingProfileId: null,
        profileId: 'p1',
      })
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      planPromotion({ currentHandle: pending, requestedSlug: 'pending-x', conflictingProfileId: null, profileId: 'p1' })
    ).toMatchObject({ ok: false, status: 400 });
  });
});

describe('planRejection', () => {
  const pending = pendingProfileHandle('brandysims', 'user00000000abcd1234');
  it('rejects an unlinked pending claim, but never one with mods or a public handle', () => {
    expect(planRejection({ currentHandle: pending, linkedModCount: 0 })).toEqual({ ok: true });
    expect(planRejection({ currentHandle: pending, linkedModCount: 2 })).toMatchObject({ ok: false, status: 409 });
    expect(planRejection({ currentHandle: 'brandysims', linkedModCount: 0 })).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});

describe('admin wiring', () => {
  it('both creator-claims routes exist with session + isAdmin + force-dynamic (CLAUDE.md admin rule)', () => {
    for (const file of [LIST_ROUTE, ACTION_ROUTE]) {
      expect(existsSync(path.join(ROOT, file))).toBe(true);
      const src = stripComments(read(file));
      expect(src).toMatch(/getServerSession\(authOptions\)/);
      expect(src).toMatch(/session\?\.user\?\.isAdmin/);
      expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
      // Auth check precedes any database access in every handler.
      const authAt = src.indexOf('isAdmin');
      const dbAt = src.indexOf('prisma.');
      expect(authAt).toBeGreaterThan(-1);
      expect(dbAt).toBeGreaterThan(authAt);
    }
  });

  it('the list route selects pending handles and never returns an email address', () => {
    const src = stripComments(read(LIST_ROUTE));
    expect(src).toMatch(/startsWith:\s*PENDING_HANDLE_PREFIX/);
    expect(src).toMatch(/CLAIM_SOURCE/);
    expect(src).not.toMatch(/email/i);
  });

  it('the action route goes through the pure planners, re-asserts the handle on delete, and audits', () => {
    const src = stripComments(read(ACTION_ROUTE));
    expect(src).toMatch(/planPromotion\(/);
    expect(src).toMatch(/planRejection\(/);
    expect(src).toMatch(/deleteMany\(\{\s*where:\s*\{\s*id:\s*profile\.id,\s*handle:\s*profile\.handle/);
    expect(src).toMatch(/CLAIM_AUDIT_RESOURCE/);
    expect(src).not.toMatch(/isCreator/);
    expect(CLAIM_AUDIT_RESOURCE).toBe('creator-claim');
  });

  it('the admin page exists and the admin nav links to it', () => {
    expect(existsSync(path.join(ROOT, PAGE))).toBe(true);
    expect(stripComments(read(PAGE))).toMatch(/\/api\/admin\/creator-claims\//);
    expect(stripComments(read('app/admin/layout.tsx'))).toMatch(/href:\s*'\/admin\/creator-claims'/);
  });
});
