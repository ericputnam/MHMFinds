import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizeCreatorSubmissions, HOUSE_ACCOUNT_USER_IDS, type SubmissionRow } from '@/lib/funnel/creatorOnboarding';

const NOW = new Date('2026-10-04T12:00:00Z');
const row = (o: Partial<SubmissionRow>): SubmissionRow => ({
  userId: 'u1', status: 'pending', createdAt: new Date('2026-10-03T10:51:00Z'),
  isCreator: true, isAdmin: false, hasCreatorProfile: false, ...o,
});

describe('summarizeCreatorSubmissions (E172)', () => {
  it('counts a creator account with no CreatorProfile (the dashboard path) as onboarded', () => {
    // The 2026-10-03 population: one isCreator account, 7 pending, no profile.
    const rows = Array.from({ length: 7 }, () => row({}));
    const s = summarizeCreatorSubmissions(rows, NOW);
    expect(s.onboarded).toBe(1);
    expect(s.onboardedApproved).toBe(0);
    expect(s.pendingReview).toBe(7);
    expect(s.oldestPendingDays).toBe(1);
  });

  it('counts an approved creator once, and as approved', () => {
    const rows = [row({ userId: 'a', status: 'approved' }), row({ userId: 'a', status: 'pending' })];
    const s = summarizeCreatorSubmissions(rows, NOW);
    expect(s.onboarded).toBe(1);
    expect(s.onboardedApproved).toBe(1);
  });

  it('still counts a claimant who holds a CreatorProfile but not isCreator (E122 path)', () => {
    const s = summarizeCreatorSubmissions([row({ isCreator: false, hasCreatorProfile: true })], NOW);
    expect(s.onboarded).toBe(1);
  });

  it('never counts anonymous, admin, or non-creator submitters, but queues their pending rows', () => {
    const rows = [
      row({ userId: null, isCreator: false }),
      row({ userId: 'admin', isAdmin: true }),
      row({ userId: 'fan', isCreator: false, hasCreatorProfile: false }),
    ];
    const s = summarizeCreatorSubmissions(rows, NOW);
    expect(s.onboarded).toBe(0);
    expect(s.pendingReview).toBe(3);
  });

  it('reports null age when nothing is pending', () => {
    const s = summarizeCreatorSubmissions([row({ status: 'approved' })], NOW);
    expect(s.pendingReview).toBe(0);
    expect(s.oldestPendingDays).toBeNull();
  });
});

describe('house accounts (E197)', () => {
  const HOUSE = Object.keys(HOUSE_ACCOUNT_USER_IDS);

  it('lists at least one house account, each a cuid with a written reason (vacuity guard)', () => {
    expect(HOUSE.length).toBeGreaterThanOrEqual(1);
    for (const id of HOUSE) {
      expect(id).toMatch(/^c[a-z0-9]{20,30}$/);
      expect(HOUSE_ACCOUNT_USER_IDS[id].length).toBeGreaterThan(10);
    }
  });

  it('the 2026-10-13 population reads 2 onboarded / 1 approved, not 3 / 2', () => {
    // DB 2026-10-13: the operator's non-admin test account (1 approved, 01-06),
    // doree (1 approved, 01-10), atino00 (7 pending, 10-03), 2 anonymous approvals.
    const rows = [
      row({ userId: HOUSE[0], status: 'approved', createdAt: new Date('2026-01-06T00:00:00Z') }),
      row({ userId: 'doree', status: 'approved', createdAt: new Date('2026-01-10T00:00:00Z') }),
      ...Array.from({ length: 7 }, () => row({ userId: 'atino00' })),
      row({ userId: null, isCreator: false, status: 'approved' }),
      row({ userId: null, isCreator: false, status: 'approved' }),
    ];
    const s = summarizeCreatorSubmissions(rows, NOW);
    expect(s.onboarded).toBe(2);
    expect(s.onboardedApproved).toBe(1);
    expect(s.houseExcluded).toBe(1);
    expect(s.pendingReview).toBe(7);
  });

  it('still queues a house account\'s pending row for review', () => {
    const s = summarizeCreatorSubmissions([row({ userId: HOUSE[0] })], NOW);
    expect(s.onboarded).toBe(0);
    expect(s.pendingReview).toBe(1);
  });

  it('house ids live in the library, so the scoreboard inherits them without its own list', () => {
    const sb = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8');
    for (const id of HOUSE) expect(sb).not.toContain(id);
    expect(sb).toMatch(/creatorsHouseExcluded/);
  });
});

describe('funnel-scoreboard uses the shared definition', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('computes creatorsOnboarded via summarizeCreatorSubmissions, not a CreatorProfile-only join', () => {
    expect(src).toMatch(/summarizeCreatorSubmissions\(/);
    expect(src).not.toMatch(/creatorProfile\.count\(\s*\{\s*where:\s*\{\s*userId:\s*\{\s*in:/);
  });

  it('prints the review queue on the scoreboard', () => {
    expect(src).toMatch(/Submissions pending review/);
  });
});
