import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizeCreatorSubmissions, type SubmissionRow } from '@/lib/funnel/creatorOnboarding';

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
