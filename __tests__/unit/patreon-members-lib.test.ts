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
  PERK_TIER_CENTS,
  formatPaidByAmount,
  normalizeEmail,
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
        m({ pledge_relationship_start: '2026-09-08T01:00:00Z', currently_entitled_amount_cents: 300 }), // since anchor, but > 7d before NOW? no: 5.5d → in window
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

  it('paid-and-connected intersects linked site emails with active patrons, case- and space-insensitively', () => {
    const s = summarizePatreonMembers(
      [
        m({ email: 'Payer@Example.com' }),
        m({ email: 'other@example.com', patron_status: 'former_patron' }),
        m({ email: 'free@example.com', patron_status: null }),
      ],
      [' payer@example.com ', 'other@example.com', 'free@example.com', null, undefined, ''],
      { now: NOW },
    );
    expect(s.paidAndConnected).toBe(1);
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
    expect(s).toMatchObject({ paid: 0, free: 0, former: 0, grossMonthlyUsd: 0, joins7d: 0, cancels7d: 0, paidAndConnected: 0 });
    expect(formatPaidByAmount(s.paidByAmount)).toBe('');
  });

  it('normalizeEmail returns an empty string for null/blank', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail('  ')).toBe('');
    expect(normalizeEmail(' A@B.co ')).toBe('a@b.co');
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

  it('the scoreboard reports the Patreon API section through the lib and never prints an email', () => {
    expect(scoreboard).toMatch(/summarizePatreonMembers\(/);
    expect(scoreboard).toMatch(/section\('patreonApi', pullPatreonApi\)/);
    expect(scoreboard).toMatch(/paidAndConnected/);
    expect(scoreboard).toMatch(/patreonClickUsersPerDay7d/);
    // The md/json writers must never interpolate a member email or a linked-account email.
    expect(scoreboard).not.toMatch(/\$\{[^}]*email[^}]*\}/i);
  });
});
