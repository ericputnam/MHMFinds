/**
 * Promoting a claim onto a seed-held handle (Nova, E166, 2026-10-03).
 *
 * All 20 CreatorProfile rows (DB 2026-10-02) are seed rows on a placeholder
 * account with 0 OAuth logins, and 8 of their handles equal a live
 * /creator/<slug>/ page. Before E166, planPromotion() refused any target
 * another profile held, so the real creator claiming one of those 8 pages
 * got a 409 at review. Now the seed row is renamed to seed-<handle> in the
 * same transaction as the promote.
 *
 * Red against pre-E166 origin/main (de969ec): see the PR body for the exact
 * list; the planner cases that expect a displacement got
 * `{ ok: false, status: 409 }`, and isSeedHolder / seedHandleFor /
 * seedHolderWhere / the route's transaction did not exist.
 *
 * Source-level checks strip comments first: comments in this repo quote
 * the patterns they describe.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

import * as creatorClaim from '../../lib/creatorClaim';
import * as review from '../../lib/creatorClaimReview';

const ROOT = path.resolve(__dirname, '../..');
const ACTION_ROUTE = 'app/api/admin/creator-claims/[id]/route.ts';
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const routeSrc = () => stripComments(readFileSync(path.join(ROOT, ACTION_ROUTE), 'utf8'));

// Loose handles so the file loads (and reports per-case) against pre-E166 code.
const r = review as unknown as Record<string, any>;
const pending = creatorClaim.pendingProfileHandle('lumpinou', 'user00000000abcd1234');
const base = { currentHandle: pending, requestedSlug: null, profileId: 'claim1' };

describe('planPromotion on a seed-held handle (E166)', () => {
  it('displaces a seed holder to seed-<handle> instead of refusing', () => {
    expect(
      review.planPromotion({
        ...base,
        conflictingProfileId: 'seed1',
        conflictingIsSeed: true,
        seedHandleTaken: false,
      } as Parameters<typeof review.planPromotion>[0])
    ).toEqual({
      ok: true,
      handle: 'lumpinou',
      displaceSeed: { profileId: 'seed1', toHandle: 'seed-lumpinou' },
    });
  });

  it('displaces on an explicit slug too, and the seed handle derives from the target, not the pending handle', () => {
    const d = review.planPromotion({
      ...base,
      requestedSlug: 'rimings',
      conflictingProfileId: 'seed2',
      conflictingIsSeed: true,
      seedHandleTaken: false,
    } as Parameters<typeof review.planPromotion>[0]) as any;
    expect(d.ok).toBe(true);
    expect(d.displaceSeed).toEqual({ profileId: 'seed2', toHandle: 'seed-rimings' });
  });

  it('a free handle promotes with no displacement', () => {
    expect(review.planPromotion({ ...base, conflictingProfileId: null })).toMatchObject({
      ok: true,
      handle: 'lumpinou',
      displaceSeed: null,
    });
  });

  it('still refuses a real (non-seed) holder with 409', () => {
    for (const conflictingIsSeed of [false, undefined]) {
      expect(
        review.planPromotion({
          ...base,
          conflictingProfileId: 'real1',
          conflictingIsSeed,
          seedHandleTaken: false,
        } as Parameters<typeof review.planPromotion>[0])
      ).toMatchObject({ ok: false, status: 409 });
    }
  });

  it('refuses (fails closed) when seed-<handle> is taken or its availability was not checked', () => {
    for (const seedHandleTaken of [true, undefined]) {
      expect(
        review.planPromotion({
          ...base,
          conflictingProfileId: 'seed1',
          conflictingIsSeed: true,
          seedHandleTaken,
        } as Parameters<typeof review.planPromotion>[0])
      ).toMatchObject({ ok: false, status: 409 });
    }
  });

  it('a non-pending profile is still refused even when the holder is a seed', () => {
    expect(
      review.planPromotion({
        ...base,
        currentHandle: 'lumpinou',
        conflictingProfileId: 'seed1',
        conflictingIsSeed: true,
        seedHandleTaken: false,
      } as Parameters<typeof review.planPromotion>[0])
    ).toMatchObject({ ok: false, status: 409 });
  });
});

describe('seed predicate and handle (E166)', () => {
  it('isSeedHolder needs a placeholder account AND zero OAuth logins', () => {
    expect(r.isSeedHolder({ id: 's', placeholderAccount: true, oauthAccounts: 0 })).toBe(true);
    expect(r.isSeedHolder({ id: 's', placeholderAccount: true, oauthAccounts: 1 })).toBe(false);
    expect(r.isSeedHolder({ id: 's', placeholderAccount: false, oauthAccounts: 0 })).toBe(false);
    expect(r.isSeedHolder(null)).toBe(false);
  });

  it('seedHandleFor yields seed-<handle>, which is never a pending handle', () => {
    expect(r.seedHandleFor('lumpinou')).toBe('seed-lumpinou');
    expect(creatorClaim.isPendingHandle(r.seedHandleFor('lumpinou'))).toBe(false);
  });

  it('seedHolderWhere is derived from every PLACEHOLDER_ACCOUNT_DOMAINS entry and requires no OAuth account', () => {
    const where = r.seedHolderWhere();
    const domains = creatorClaim.PLACEHOLDER_ACCOUNT_DOMAINS;
    expect(domains.length).toBeGreaterThan(0);
    const suffixes = where.user.OR.map((c: any) => c.email.endsWith);
    expect(suffixes).toEqual(domains.map((d) => `@${d}`));
    expect(where.user.accounts).toEqual({ none: {} });
  });
});

describe('action route wiring (E166)', () => {
  it('renames the seed and promotes in one prisma.$transaction, re-asserting the seed predicate on the rename', () => {
    const src = routeSrc();
    expect(src).toMatch(/prisma\.\$transaction\(writes\)/);
    expect(src).toMatch(
      /updateMany\(\{\s*where:\s*\{\s*id:\s*decision\.displaceSeed\.profileId,\s*handle:\s*decision\.handle,\s*\.\.\.seedHolderWhere\(\)\s*\}/
    );
    // Both writes are queued before the single transaction call.
    const renameAt = src.indexOf('updateMany(');
    const promoteAt = src.indexOf('data: promotionData(decision.handle)');
    const txAt = src.indexOf('$transaction(');
    expect(renameAt).toBeGreaterThan(-1);
    expect(promoteAt).toBeGreaterThan(renameAt);
    expect(txAt).toBeGreaterThan(promoteAt);
  });

  it('promotion still verifies (E151) and still never touches User.isCreator (Q23/E137 decision)', () => {
    const src = routeSrc();
    expect(review.promotionData('lumpinou')).toEqual({ handle: 'lumpinou', isVerified: true });
    expect(src).toMatch(/data:\s*promotionData\(decision\.handle\)/);
    expect(src).not.toMatch(/isCreator/);
  });

  it('keeps the admin auth check before any database access', () => {
    const src = routeSrc();
    expect(src).toMatch(/getServerSession\(authOptions\)/);
    expect(src).toMatch(/session\?\.user\?\.isAdmin/);
    expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(src.indexOf('prisma.')).toBeGreaterThan(src.indexOf('isAdmin'));
  });

  it('reduces the holder email to a boolean and never puts an email into a response or audit row', () => {
    const src = routeSrc();
    expect(src).toMatch(/isPlaceholderAccountEmail\(conflict\.user\?\.email/);
    const emailRefs = src.match(/email/gi) ?? [];
    // import of isPlaceholderAccountEmail, select { email: true },
    // the isPlaceholderAccountEmail(...) call, and its conflict.user?.email argument.
    expect(emailRefs.length).toBe(4);
    expect(src).not.toMatch(/NextResponse\.json\([^)]*email/i);
    expect(src).not.toMatch(/audit\([^)]*email/i);
  });
});
