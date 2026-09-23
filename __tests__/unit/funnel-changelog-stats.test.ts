import { describe, it, expect } from 'vitest';
import {
  ChangelogRow,
  computeRunSuccessShare,
  computeTeamStats,
  extractOwner,
  isPaperOnlyRow,
  parseChangelogRows,
  rowsInWindow,
  sortByWhen,
} from '@/lib/funnel/changelogStats';

/**
 * Tests for reports/funnel/changelog.md parsing/aggregation. The file is
 * pipe-delimited markdown and NOT chronologically ordered (see CLAUDE.md's
 * compound learnings), so these tests exercise out-of-order rows explicitly.
 */

const HEADER = '| when | mode | who / what | commit | deployment | result | notes |\n' + '| --- | --- | --- | --- | --- | --- | --- |\n';

describe('parseChangelogRows', () => {
  it('parses rows and skips header/separator lines', () => {
    const raw =
      HEADER +
      '| 2026-09-20T08:00:00Z | after-merge | Quinn: PR #150 | abc123 | deploy-1 | PASS | shipped |\n';
    const rows = parseChangelogRows(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0].who).toBe('Quinn: PR #150');
    expect(rows[0].owner).toBe('Quinn');
    expect(rows[0].commit).toBe('abc123');
    expect(rows[0].result).toBe('PASS');
  });

  it('handles out-of-order rows (file order is not chronological)', () => {
    const raw =
      HEADER +
      '| 2026-09-19T08:12:00Z | after-merge | Quinn: PR #123 | c1 | d1 | PASS | |\n' +
      '| 2026-09-16T08:00:00Z | after-merge | Pip: PR #100 | c0 | d0 | PASS | |\n' +
      '| 2026-09-20T09:00:00Z | after-merge | Rio: PR #151 | c2 | d2 | PASS | |\n';
    const rows = parseChangelogRows(raw);
    expect(rows.map((r) => r.who)).toEqual(['Quinn: PR #123', 'Pip: PR #100', 'Rio: PR #151']);
    const sorted = sortByWhen(rows);
    expect(sorted.map((r) => r.who)).toEqual(['Pip: PR #100', 'Quinn: PR #123', 'Rio: PR #151']);
  });

  it('sorts unparseable timestamps to the end rather than guessing', () => {
    const raw =
      HEADER +
      '| not-a-date | after-merge | Ghost: ? | | | | |\n' +
      '| 2026-09-16T08:00:00Z | after-merge | Pip: PR #100 | c0 | d0 | PASS | |\n';
    const rows = parseChangelogRows(raw);
    const sorted = sortByWhen(rows);
    expect(sorted[0].who).toBe('Pip: PR #100');
    expect(sorted[1].who).toBe('Ghost: ?');
  });
});

describe('extractOwner', () => {
  it('takes the token before the first colon', () => {
    expect(extractOwner('Quinn: PR #152 merge')).toBe('Quinn');
  });

  it('credits the actor in "X for Y" phrasing', () => {
    expect(extractOwner('Rio for Cass: shipped a capture fix')).toBe('Rio');
  });

  it('falls back to "unknown" for an empty cell', () => {
    expect(extractOwner('')).toBe('unknown');
  });
});

describe('isPaperOnlyRow', () => {
  it('flags a ledger/digest row with no commit or deployment as paper-only', () => {
    const row: Pick<ChangelogRow, 'mode' | 'commit' | 'deployment' | 'notes' | 'who'> = {
      mode: 'ledger',
      commit: '-',
      deployment: '-',
      notes: 'backfilled ledger row',
      who: 'Quinn',
    };
    expect(isPaperOnlyRow(row)).toBe(true);
  });

  it('does not flag a real merge with a commit and deployment', () => {
    const row: Pick<ChangelogRow, 'mode' | 'commit' | 'deployment' | 'notes' | 'who'> = {
      mode: 'after-merge',
      commit: 'abc123',
      deployment: 'https://mhm.vercel.app',
      notes: 'shipped a fix',
      who: 'Quinn',
    };
    expect(isPaperOnlyRow(row)).toBe(false);
  });

  it('does not flag a blank-commit row that never mentions paper trail language', () => {
    const row: Pick<ChangelogRow, 'mode' | 'commit' | 'deployment' | 'notes' | 'who'> = {
      mode: 'after-merge',
      commit: '',
      deployment: '',
      notes: 'deploy still building',
      who: 'Quinn',
    };
    expect(isPaperOnlyRow(row)).toBe(false);
  });
});

describe('rowsInWindow', () => {
  it('excludes unparseable timestamps rather than guessing them into the window', () => {
    const rows = parseChangelogRows(
      HEADER +
        '| not-a-date | after-merge | Ghost: ? | | | | |\n' +
        '| 2026-09-20T08:00:00Z | after-merge | Quinn: PR #1 | c | d | PASS | |\n',
    );
    const now = new Date('2026-09-21T00:00:00Z').getTime();
    const inWindow = rowsInWindow(rows, now, 7);
    expect(inWindow).toHaveLength(1);
    expect(inWindow[0].who).toBe('Quinn: PR #1');
  });
});

describe('computeTeamStats', () => {
  const now = new Date('2026-09-21T00:00:00Z').getTime();

  it('counts merges by owner and computes the Ops share, excluding paper-only rows', () => {
    const raw =
      HEADER +
      '| 2026-09-20T08:00:00Z | after-merge | Quinn: PR #1 | c1 | d1 | PASS | |\n' +
      '| 2026-09-20T09:00:00Z | after-merge | Ops: PR #2 | c2 | d2 | PASS | |\n' +
      '| 2026-09-20T10:00:00Z | after-merge | Pip: PR #3 | c3 | d3 | PASS | |\n' +
      '| 2026-09-20T11:00:00Z | after-merge (recheck) | Quinn: ledger backfill | - | - | PASS | digest row |\n';
    const rows = parseChangelogRows(raw);
    const stats = computeTeamStats(rows, now, 7);
    expect(stats.mergesByOwner).toEqual({ Quinn: 1, Ops: 1, Pip: 1 });
    expect(stats.totalMerges).toBe(3);
    // Exact fraction, not rounded: 1/3.
    expect(stats.opsMergeShare).toBeCloseTo(1 / 3, 10);
    expect(stats.paperOnlyMerges).toBe(1);
  });

  it('returns a null Ops share when there are no merges in the window (never divide by zero)', () => {
    const stats = computeTeamStats([], now, 7);
    expect(stats.opsMergeShare).toBeNull();
    expect(stats.totalMerges).toBe(0);
  });

  it('ignores rows outside the window', () => {
    const raw = HEADER + '| 2026-08-01T08:00:00Z | after-merge | Quinn: PR #1 | c1 | d1 | PASS | |\n';
    const rows = parseChangelogRows(raw);
    const stats = computeTeamStats(rows, now, 7);
    expect(stats.totalMerges).toBe(0);
  });
});

describe('computeRunSuccessShare', () => {
  it('returns the exact fraction of the last N days with a run, unrounded', () => {
    const dates = new Set(['2026-09-20', '2026-09-19', '2026-09-18']);
    // 3 of the 14 days before 2026-09-21 have a run.
    const share = computeRunSuccessShare(dates, '2026-09-21', 14);
    expect(share).toBeCloseTo(3 / 14, 10);
  });

  it('returns 0 for an empty set without throwing', () => {
    expect(computeRunSuccessShare(new Set(), '2026-09-21', 14)).toBe(0);
  });
});
