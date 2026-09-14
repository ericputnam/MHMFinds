/**
 * Pure-lib tests for scripts/agents/patreon-members-lib.ts — the arithmetic
 * behind the scoreboard's "Patreon (API)" section, the E40 read (2026-09-19)
 * and the Q4 gate (2026-09-22). No network, no DB, no token.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  E40_ANCHOR,
  E40_CLICK_BASELINE,
  PERK_TIER_CENTS,
  dateKeysInclusive,
  formatPaidByAmount,
  ga4DateKey,
  meanDailyUsers,
  normalizeEmail,
  normalizeId,
  summarizePatreonMembers,
  type PatreonMemberAttrs,
} from '../../scripts/agents/patreon-members-lib';

const NOW = new Date('2026-09-13T12:00:00Z');

function m(over: Partial<PatreonMemberAttrs>): PatreonMemberAttrs {
  return {
    patron_status: 'active_patron',
    pledge_relationship_start: '2026-05-01T00:00:00Z',
    last_charge_date: '2026-09-01T00:00:00Z',
    currently_entitled_amount_cents: 300,
    email: null,
    patreonUserId: null,
    ...over,
  };
}

describe('summarizePatreonMembers', () => {
  it('counts paid / free / former and gross from entitled cents', () => {
    const s = summarizePatreonMembers(
      [
        m({ currently_entitled_amount_cents: 100 }),
        m({ currently_entitled_amount_cents: 300 }),
        m({ currently_entitled_amount_cents: 300 }),
        m({ currently_entitled_amount_cents: 800 }),
        m({ patron_status: 'former_patron', currently_entitled_amount_cents: 0 }),
        m({ patron_status: null, currently_entitled_amount_cents: 0 }),
        m({ patron_status: 'declined_patron', currently_entitled_amount_cents: 0 }),
      ],
      [],
      { now: NOW },
    );
    expect(s.paid).toBe(4);
    expect(s.former).toBe(1);
    expect(s.free).toBe(2);
    expect(s.grossMonthlyUsd).toBe(15);
    expect(s.paidByAmount).toEqual({ $1: 1, $3: 2, $8: 1 });
    expect(formatPaidByAmount(s.paidByAmount)).toBe('1×$1, 2×$3, 1×$8');
  });

  it('separates joins inside the 7d window from joins since the fixed anchor, by perk tier', () => {
    const s = summarizePatreonMembers(
      [
        m({ pledge_relationship_start: '2026-09-12T10:00:00Z', currently_entitled_amount_cents: 300 }), // in window, since anchor, perk
        m({ pledge_relationship_start: '2026-09-09T10:00:00Z', currently_entitled_amount_cents: 100 }), // in window, since anchor, not perk
        m({ pledge_relationship_start: '2026-09-08T01:00:00Z', currently_entitled_amount_cents: 300 }), // since anchor, 5.5d → in window
        m({ pledge_relationship_start: '2026-09-05T00:00:00Z', currently_entitled_amount_cents: 300 }), // before anchor, outside window (8d)
        m({ pledge_relationship_start: null, currently_entitled_amount_cents: 300 }),
      ],
      [],
      { now: NOW },
    );
    expect(E40_ANCHOR).toBe('2026-09-08T00:00:00Z');
    expect(PERK_TIER_CENTS).toBe(300);
    expect(s.joins7d).toBe(3);
    expect(s.joinsSinceAnchor).toBe(3);
    expect(s.joinsSinceAnchorAtPerkTier).toBe(2);
    expect(s.perkTierJoins7d).toBe(2);
    expect(s.perkTierJoinsPerDay7d).toBeCloseTo(0.29, 2);
  });

  it('counts a cancel only when a former patron last charged inside the window', () => {
    const s = summarizePatreonMembers(
      [
        m({ patron_status: 'former_patron', last_charge_date: '2026-09-10T00:00:00Z' }),
        m({ patron_status: 'former_patron', last_charge_date: '2026-08-01T00:00:00Z' }),
        m({ patron_status: 'former_patron', last_charge_date: null }),
        m({ patron_status: 'active_patron', last_charge_date: '2026-09-10T00:00:00Z' }),
      ],
      [],
      { now: NOW },
    );
    expect(s.cancels7d).toBe(1);
  });

  it('a missing or unparseable date never counts as a join or cancel (fail closed on the perk metric)', () => {
    const s = summarizePatreonMembers(
      [
        m({ pledge_relationship_start: 'not-a-date' }),
        m({ patron_status: 'former_patron', last_charge_date: 'garbage' }),
      ],
      [],
      { now: NOW },
    );
    expect(s.joins7d).toBe(0);
    expect(s.joinsSinceAnchor).toBe(0);
    expect(s.cancels7d).toBe(0);
  });

  it('empty input is a valid, all-zero summary', () => {
    const s = summarizePatreonMembers([], [], { now: NOW });
    expect(s).toMatchObject({
      paid: 0, free: 0, former: 0, grossMonthlyUsd: 0, joins7d: 0, cancels7d: 0,
      paidAndConnected: 0, paidAndConnectedById: 0, paidAndConnectedByEmail: 0, linkedWithPatreonId: 0, paidWithUserId: 0,
    });
    expect(formatPaidByAmount(s.paidByAmount)).toBe('');
  });

  it('normalizeEmail / normalizeId return an empty string for null/blank', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail('  ')).toBe('');
    expect(normalizeEmail(' A@B.co ')).toBe('a@b.co');
    expect(normalizeId(null)).toBe('');
    expect(normalizeId('  ')).toBe('');
    expect(normalizeId(' 12345 ')).toBe('12345');
    expect(normalizeId(12345)).toBe('12345');
  });
});

describe('paid-and-connected (E50): Patreon user id is the key, email is the fallback', () => {
  it('joins on providerAccountId ↔ member user id even when the two emails differ', () => {
    const s = summarizePatreonMembers(
      [m({ patreonUserId: '111', email: 'billing@example.com' })],
      [{ providerAccountId: '111', email: 'oauth-profile@example.com' }],
      { now: NOW },
    );
    expect(s.paidAndConnectedById).toBe(1);
    expect(s.paidAndConnectedByEmail).toBe(0);
    expect(s.paidAndConnected).toBe(1);
    expect(s.linkedWithPatreonId).toBe(1);
    expect(s.paidWithUserId).toBe(1);
  });

  it('falls back to email when either side lacks an id, and counts an account at most once when both match', () => {
    const s = summarizePatreonMembers(
      [
        m({ patreonUserId: null, email: 'Payer@Example.com' }), // API row without a user id
        m({ patreonUserId: '222', email: 'both@example.com' }), // matches by id AND email
        m({ patreonUserId: '333', email: 'idonly@example.com' }),
      ],
      [
        { providerAccountId: null, email: ' payer@example.com ' }, // email fallback
        { providerAccountId: '222', email: 'both@example.com' }, // both — once
        { providerAccountId: '333', email: 'different@example.com' }, // id only
        { providerAccountId: '999', email: 'nobody@example.com' }, // linked, not paying
      ],
      { now: NOW },
    );
    expect(s.paidAndConnectedById).toBe(2);
    expect(s.paidAndConnectedByEmail).toBe(2);
    expect(s.paidAndConnected).toBe(3);
    expect(s.linkedWithPatreonId).toBe(3);
    expect(s.paidWithUserId).toBe(2);
  });

  it('a former or free member never counts, by id or by email', () => {
    const s = summarizePatreonMembers(
      [
        m({ patron_status: 'former_patron', patreonUserId: '444', email: 'former@example.com' }),
        m({ patron_status: null, patreonUserId: '555', email: 'free@example.com' }),
      ],
      [
        { providerAccountId: '444', email: 'former@example.com' },
        { providerAccountId: '555', email: 'free@example.com' },
      ],
      { now: NOW },
    );
    expect(s.paidAndConnected).toBe(0);
    expect(s.paidAndConnectedById).toBe(0);
    expect(s.paidAndConnectedByEmail).toBe(0);
    expect(s.paidWithUserId).toBe(0);
  });

  it('ids compare as trimmed strings and never as substrings; blank ids do not match blank ids', () => {
    const s = summarizePatreonMembers(
      [m({ patreonUserId: ' 1234 ' }), m({ patreonUserId: '' }), m({ patreonUserId: '12' })],
      [{ providerAccountId: '1234' }, { providerAccountId: '' }, { providerAccountId: '  ' }, { providerAccountId: '123' }],
      { now: NOW },
    );
    expect(s.paidAndConnectedById).toBe(1);
    expect(s.paidAndConnected).toBe(1);
    expect(s.linkedWithPatreonId).toBe(2);
    expect(s.paidWithUserId).toBe(2);
  });

  it('still accepts the legacy string-array shape (emails only) so older callers keep working', () => {
    const s = summarizePatreonMembers(
      [m({ email: 'Payer@Example.com' }), m({ email: 'other@example.com', patron_status: 'former_patron' })],
      [' payer@example.com ', 'other@example.com', null, undefined, ''],
      { now: NOW },
    );
    expect(s.paidAndConnected).toBe(1);
    expect(s.paidAndConnectedByEmail).toBe(1);
    expect(s.paidAndConnectedById).toBe(0);
    expect(s.linkedWithPatreonId).toBe(0);
  });

  it('paidWithUserId is 0 when include=user was not honoured — the signal the scoreboard flags', () => {
    const s = summarizePatreonMembers([m({}), m({})], [{ providerAccountId: '1' }], { now: NOW });
    expect(s.paid).toBe(2);
    expect(s.paidWithUserId).toBe(0);
  });
});

describe('E40 traffic leg: mean of daily distinct users over an explicit window', () => {
  it('the frozen baseline is 35 users / 4 days = 8.75 over 2026-09-08→2026-09-11, revert below 4.375', () => {
    expect(E40_CLICK_BASELINE).toMatchObject({ start: '2026-09-08', end: '2026-09-11', users: 35, days: 4, usersPerDay: 8.75, revertBelowPerDay: 4.375 });
    expect(E40_CLICK_BASELINE.users / E40_CLICK_BASELINE.days).toBe(E40_CLICK_BASELINE.usersPerDay);
    expect(E40_CLICK_BASELINE.usersPerDay / 2).toBe(E40_CLICK_BASELINE.revertBelowPerDay);
  });

  it('reproduces the baseline from the 09-12 daily readings (13, 13, 3, 6) and ignores days outside the window', () => {
    const byDay = { '2026-09-07': 99, '2026-09-08': 13, '2026-09-09': 13, '2026-09-10': 3, '2026-09-11': 6, '2026-09-12': 9 };
    const r = meanDailyUsers(byDay, E40_CLICK_BASELINE.start, E40_CLICK_BASELINE.end);
    expect(r).toEqual({ days: 4, users: 35, perDay: 8.75, window: '2026-09-08→2026-09-11' });
  });

  it('a day with no row counts as zero users, so a quiet week lowers the mean instead of being dropped', () => {
    const r = meanDailyUsers({ '2026-09-06': 7 }, '2026-09-06', '2026-09-12');
    expect(r.days).toBe(7);
    expect(r.users).toBe(7);
    expect(r.perDay).toBe(1);
  });

  it('an empty or inverted window is a zero, never a division by zero', () => {
    expect(meanDailyUsers({}, '2026-09-12', '2026-09-06')).toEqual({ days: 0, users: 0, perDay: 0, window: '2026-09-12→2026-09-06' });
    expect(meanDailyUsers({}, 'garbage', '2026-09-06').days).toBe(0);
    expect(dateKeysInclusive('2026-09-30', '2026-10-02')).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('ga4DateKey turns YYYYMMDD into YYYY-MM-DD and leaves anything else alone', () => {
    expect(ga4DateKey('20260908')).toBe('2026-09-08');
    expect(ga4DateKey('2026-09-08')).toBe('2026-09-08');
    expect(ga4DateKey('')).toBe('');
  });
});

describe('the lib and the scoreboard wiring', () => {
  const root = join(__dirname, '..', '..');
  const lib = readFileSync(join(root, 'scripts', 'agents', 'patreon-members-lib.ts'), 'utf8');
  const scoreboard = readFileSync(join(root, 'scripts', 'agents', 'funnel-scoreboard.ts'), 'utf8');

  it('the lib is pure: no fetch, no prisma, no console', () => {
    expect(lib).not.toMatch(/\bfetch\(/);
    expect(lib).not.toMatch(/prisma/i);
    expect(lib).not.toMatch(/console\./);
    expect(lib).not.toMatch(/process\.env/);
  });

  it('the scoreboard reports the Patreon API section through the lib and never prints an email or an id', () => {
    expect(scoreboard).toMatch(/summarizePatreonMembers\(/);
    expect(scoreboard).toMatch(/section\('patreonApi', pullPatreonApi\)/);
    expect(scoreboard).toMatch(/paidAndConnected/);
    expect(scoreboard).toMatch(/patreonClickUsersPerDay7d/);
    // The md/json writers must never interpolate a member email, a linked-account
    // email, or a Patreon user id. Aggregate *counts* named "...ByEmail" are fine.
    expect(scoreboard).not.toMatch(/\$\{[^}]*\bemail\b[^}]*\}/i);
    expect(scoreboard).not.toMatch(/\$\{[^}]*providerAccountId[^}]*\}/);
    expect(scoreboard).not.toMatch(/\$\{[^}]*patreonUserId[^}]*\}/);
  });

  it('the scoreboard joins on the Patreon user id (E50): include=user on the Members call, providerAccountId selected', () => {
    expect(scoreboard).toMatch(/members\?[^`]*include=user/);
    expect(scoreboard).toMatch(/relationships\?\.user\?\.data\?\.id/);
    expect(scoreboard).toMatch(/provider: 'patreon' \}, select: \{ providerAccountId: true/);
    // and prints both counts so the delta from the email-only join stays visible
    expect(scoreboard).toMatch(/paidAndConnectedById/);
    expect(scoreboard).toMatch(/paidAndConnectedByEmail/);
  });

  it('the E40 traffic leg uses the same statistic on both sides: mean of daily users over printed windows', () => {
    expect(scoreboard).toMatch(/dimensions: \[\{ name: 'date' \}\]/);
    expect(scoreboard).toMatch(/meanDailyUsers\(patreonClickUsersByDay, start, end\)/);
    expect(scoreboard).toMatch(/meanDailyUsers\(patreonClickUsersByDay, E40_CLICK_BASELINE\.start, E40_CLICK_BASELINE\.end\)/);
    expect(scoreboard).not.toMatch(/captureUsers7d\.patreon_click \?\? 0\) \/ 7/);
    // the rendered gate names both windows and the threshold from the constant, not a literal
    expect(scoreboard).toMatch(/\$\{B\.revertBelowPerDay\}/);
    expect(scoreboard).toMatch(/\$\{B\.start\}→\$\{B\.end\}/);
  });

  it('a Patreon Members API outage is a 🟡 in Flags, not only an "unavailable" note in the body', () => {
    expect(scoreboard).toMatch(/if \(!patreonApi\.ok\) flags\.push\(`🟡 Patreon Members API unavailable/);
    expect(scoreboard).toMatch(/paidWithUserId === 0/);
  });

  it('section() scrubs exception text before it can reach a committed report', () => {
    expect(scoreboard).toMatch(/import \{ redactError \} from '\.\/operator-did-probe-lib'/);
    expect(scoreboard).toMatch(/redactError\(\(err as Error\)\.message/);
  });
});
