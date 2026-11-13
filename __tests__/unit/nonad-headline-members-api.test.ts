/**
 * E403 (2026-11-13) — the scoreboard's non-ad headline reads the Patreon Members API, with the
 * public tier counter as a fallback only.
 *
 * E392 (2026-11-11): the public counter read 69 paid / $179 while the Members API read 54 /
 * $138.50, so the headline overstated metric #2 by $40.50 (+29%). These tests pin the source
 * choice (pure lib), the history rebuild's null rule for the new headline shape, and that the
 * scoreboard actually routes the headline through the picker.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pickPatreonPaid } from '../../scripts/agents/patreon-members-lib';
import { deriveScoreboardFields } from '../../scripts/agents/funnel-history';

describe('pickPatreonPaid (E403)', () => {
  const api = { ok: true, paid: 54, grossMonthlyUsd: 138.5 };
  const pub = { ok: true, paidPatrons: 69, grossMonthlyUsd: 179 };

  it('prefers the Members API when both are available (the E392 case)', () => {
    expect(pickPatreonPaid(api, pub)).toEqual({ source: 'members-api', paid: 54, grossMonthlyUsd: 138.5 });
  });

  it('falls back to the public page when the API failed', () => {
    expect(pickPatreonPaid(null, pub)).toEqual({ source: 'public-page', paid: 69, grossMonthlyUsd: 179 });
    expect(pickPatreonPaid({ ok: false }, pub).source).toBe('public-page');
  });

  it('a real API zero is a measurement, not a fallback trigger', () => {
    expect(pickPatreonPaid({ ok: true, paid: 0, grossMonthlyUsd: 0 }, pub)).toEqual({ source: 'members-api', paid: 0, grossMonthlyUsd: 0 });
  });

  it('neither available → null, never 0 (E126)', () => {
    expect(pickPatreonPaid(null, null)).toEqual({ source: null, paid: null, grossMonthlyUsd: null });
    expect(pickPatreonPaid({ ok: false }, { ok: true, paidPatrons: null, grossMonthlyUsd: null })).toEqual({ source: null, paid: null, grossMonthlyUsd: null });
    expect(pickPatreonPaid({ ok: true, paid: 5, grossMonthlyUsd: Number.NaN }, null).source).toBeNull();
  });
});

describe('funnel-history nonAdMonthly with the E403 headline', () => {
  const base = { db: { ok: true }, ga4: { ok: true, data: { byChannel7d: {} } } };

  it('public page failed but the API fed the headline → the number stands', () => {
    const { fields } = deriveScoreboardFields(
      '2026-11-13',
      { ...base, patreon: { ok: false }, patreonApi: { ok: true }, headline: { nonAdRevenueMonthlyGross: 144.5, nonAdSource: 'members-api' } },
      179,
      100,
    );
    expect(fields.nonAdMonthly).toBe(144.5);
  });

  it('both sources failed (nonAdSource null) → null, not carried forward', () => {
    const { fields, lastKnownNonAd } = deriveScoreboardFields(
      '2026-11-13',
      { ...base, patreon: { ok: true }, patreonApi: { ok: false }, headline: { nonAdRevenueMonthlyGross: null, nonAdSource: null } },
      179,
      100,
    );
    expect(fields.nonAdMonthly).toBeNull();
    expect(lastKnownNonAd).toBe(179);
  });

  it('an older scoreboard (no nonAdSource) still uses the public-page section flag', () => {
    const { fields } = deriveScoreboardFields(
      '2026-10-02',
      { ...base, patreon: { ok: false }, headline: { nonAdRevenueMonthlyGross: 0 } },
      159,
      100,
    );
    expect(fields.nonAdMonthly).toBeNull();
  });
});

describe('funnel-scoreboard.ts routes the headline through pickPatreonPaid', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('computes nonAdRevenue from the picker, not from the public counter', () => {
    const decl = src.match(/const nonAdRevenue[^;]*;/);
    expect(decl, 'nonAdRevenue declaration not found').not.toBeNull();
    expect(decl![0]).toContain('patreonPaid.grossMonthlyUsd');
    expect(decl![0]).not.toContain('patreon.data.grossMonthlyUsd');
    expect(src).toMatch(/const patreonPaid = pickPatreonPaid\(/);
    expect(src).toContain('nonAdSource: patreonPaid.source');
  });
});
