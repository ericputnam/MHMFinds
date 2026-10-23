import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_END_LAG_DAYS,
  defaultGradeEnd,
  gradeTopup,
  gradeWindows,
  parseTopupLedger,
  pathKey,
  pathKeyFromUrl,
  renderTopupGradeMd,
  rowsPerDate,
  shiftDays,
  sumTreated,
  TOPUP_GRADE_RULE,
  treatedPaths,
  type Ga4RangeRow,
  type SiteRangeRow,
} from '../../scripts/agents/topup-grade-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Fixture = the E202 top-up ledger (reports/funnel/pin-runway-topup-2026-10-14.json, 21 rows,
 * 7×10-18/19/20, 9 destinations) and the real GA4 rows pulled 2026-10-21 via the MCP for the
 * windows a 10-19 read derives: curr 10-13→10-19, prev 10-06→10-12, post 10-18→10-19 (clipped),
 * postPrev 10-11→10-12. Site totals are Pinterest sessions on both hosts.
 */
function entry(id: number, date: string, slug: string, host = 'musthavemods.com') {
  return { id, old_date: '2025-01-01', new_date: date, post_url: `https://${host}/${slug}/`, board_name: 'b' };
}
const E202 = {
  generated: '2026-10-14',
  script: 'scripts/agents/pin-runway-topup.py',
  experiment: 'SD-22-topup',
  updated: '21',
  entries: [
    entry(2037, '2026-10-18', 'sims-4-urban-tattoos'),
    entry(2043, '2026-10-19', 'sims-4-urban-tattoos'),
    entry(2044, '2026-10-20', 'sims-4-urban-tattoos'),
    entry(7971, '2026-10-18', 'black-sims-4-cc'),
    entry(8019, '2026-10-19', 'black-sims-4-cc'),
    entry(2084, '2026-10-18', 'sims-4-male-urban-hair'),
    entry(2085, '2026-10-19', 'sims-4-male-urban-hair'),
    entry(2086, '2026-10-20', 'sims-4-male-urban-hair'),
    entry(5118, '2026-10-18', 'sims-4-gshade-presets'),
    entry(5119, '2026-10-19', 'sims-4-gshade-presets'),
    entry(5120, '2026-10-20', 'sims-4-gshade-presets'),
    entry(2293, '2026-10-18', 'sims-4-urban-hair-cc'),
    entry(2294, '2026-10-19', 'sims-4-urban-hair-cc'),
    entry(2295, '2026-10-20', 'sims-4-urban-hair-cc'),
    entry(7623, '2026-10-18', 'sims-4-maxis-match-hair'),
    entry(7629, '2026-10-19', 'sims-4-maxis-match-hair'),
    entry(7640, '2026-10-20', 'sims-4-maxis-match-hair'),
    entry(8226, '2026-10-18', 'afro-hair-sims-4'),
    entry(8968, '2026-10-20', 'afro-hair-sims-4'),
    entry(2701, '2026-10-20', 'sims-4-elf-cc'),
    entry(8979, '2026-10-19', 'sims-4-room-ideas'),
  ],
};

// landingPage (no trailing slash, as GA4 prints it) → [curr, prev, post, postPrev]
const DEST: Record<string, [number, number, number, number]> = {
  '/sims-4-urban-tattoos': [544, 593, 166, 179],
  '/black-sims-4-cc': [460, 476, 163, 158],
  '/sims-4-male-urban-hair': [221, 213, 66, 67],
  '/sims-4-gshade-presets': [126, 183, 33, 60],
  '/sims-4-urban-hair-cc': [109, 106, 41, 35],
  '/afro-hair-sims-4': [82, 70, 26, 30],
  '/sims-4-maxis-match-hair': [80, 72, 23, 23],
  '/sims-4-room-ideas': [72, 66, 19, 24],
  '/sims-4-elf-cc': [42, 70, 11, 24],
};
const RANGES = ['curr', 'prev', 'post', 'postPrev'] as const;
function treatedRows(): Ga4RangeRow[] {
  const rows: Ga4RangeRow[] = [];
  for (const [path, vals] of Object.entries(DEST)) {
    RANGES.forEach((range, i) => rows.push({ range, host: 'musthavemods.com', path, sessions: vals[i] }));
  }
  return rows;
}
// Site Pinterest sessions per range, split across the two serving hosts (apex + blog.*).
const SITE: SiteRangeRow[] = [
  { range: 'curr', sessions: 58485 },
  { range: 'curr', sessions: 34 },
  { range: 'prev', sessions: 57143 },
  { range: 'prev', sessions: 55 },
  { range: 'post', sessions: 18270 },
  { range: 'post', sessions: 17 },
  { range: 'postPrev', sessions: 18830 },
  { range: 'postPrev', sessions: 16 },
];

describe('topup-grade-lib — ledger parsing and keys', () => {
  it('parses the top-up tool ledger shape: 21 rows, 7 per date, 9 destinations', () => {
    const ledger = parseTopupLedger(E202);
    expect(ledger.generated).toBe('2026-10-14');
    expect(ledger.experiment).toBe('SD-22-topup');
    expect(ledger.entries).toHaveLength(21);
    expect(rowsPerDate(ledger)).toEqual({ '2026-10-18': 7, '2026-10-19': 7, '2026-10-20': 7 });
    expect(treatedPaths(ledger)).toHaveLength(9);
    expect(treatedPaths(ledger)).toContain('/sims-4-urban-tattoos');
  });

  it('refuses a ledger it cannot grade (no entries, bad date, missing url)', () => {
    expect(() => parseTopupLedger({ generated: '2026-10-14', entries: [] })).toThrow(/entries/);
    expect(() => parseTopupLedger({ generated: '2026-10-14', entries: [{ id: 1, new_date: 'soon', post_url: 'https://x/y/' }] })).toThrow(/new_date/);
    expect(() => parseTopupLedger({ generated: '2026-10-14', entries: [{ id: 1, new_date: '2026-10-18', post_url: '' }] })).toThrow(/post_url/);
    expect(() => parseTopupLedger({ generated: 'nope', entries: [{ id: 1, new_date: '2026-10-18', post_url: 'https://x/y/' }] })).toThrow(/generated/);
  });

  it('folds hosts and trailing slashes so a queue Post URL and a GA4 landingPage meet on one key', () => {
    expect(pathKeyFromUrl('https://blog.musthavemods.com/sims-4-urban-tattoos/')).toBe('/sims-4-urban-tattoos');
    expect(pathKeyFromUrl('https://musthavemods.com/sims-4-urban-tattoos/?utm_source=pinterest')).toBe('/sims-4-urban-tattoos');
    expect(pathKey('/sims-4-urban-tattoos')).toBe('/sims-4-urban-tattoos');
    expect(pathKey('/sims-4-urban-tattoos/')).toBe('/sims-4-urban-tattoos');
    expect(pathKey('/')).toBe('/');
    expect(pathKey('(not set)')).toBe('');
    expect(pathKeyFromUrl('not a url')).toBe('');
  });
});

describe('topup-grade-lib — windows', () => {
  it('derives curr/prev as the latest 7 d vs the prior 7 d and the post window vs the same weekdays −7 d, clipped at end', () => {
    const ledger = parseTopupLedger(E202);
    const w = gradeWindows('2026-10-19', ledger);
    expect(w).toEqual([
      { name: 'curr', start: '2026-10-13', end: '2026-10-19' },
      { name: 'prev', start: '2026-10-06', end: '2026-10-12' },
      { name: 'post', start: '2026-10-18', end: '2026-10-19' },
      { name: 'postPrev', start: '2026-10-11', end: '2026-10-12' },
    ]);
    expect(shiftDays('2026-11-01', -7)).toBe('2026-10-25');
  });

  it('omits the post window when no posting date is on or before end', () => {
    const ledger = parseTopupLedger(E202);
    const w = gradeWindows('2026-10-17', ledger);
    expect(w.map((x) => x.name)).toEqual(['curr', 'prev']);
    expect(() => gradeWindows('17-10-2026', ledger)).toThrow(/end/);
  });
});

describe('topup-grade-lib — the E202 grade (real numbers, 2026-10-21 pull)', () => {
  const ledger = parseTopupLedger(E202);
  const grade = gradeTopup({ ledger, end: '2026-10-19', treatedRows: treatedRows(), siteRows: SITE });

  it('sums the treated set across both hosts and matches the hand arithmetic', () => {
    expect(grade.treated).toEqual({ curr: 1736, prev: 1849, pct: (1736 - 1849) / 1849 });
    expect(grade.site.curr).toBe(58519);
    expect(grade.site.prev).toBe(57198);
    expect(sumTreated(treatedRows(), grade.treatedPaths, 'post').total).toBe(548);
  });

  it('grades KILL (lift): treated −6.1% < site +2.3%; cap leg MET at 7/7/7; 5/9 destinations up; post window clipped at end', () => {
    expect(grade.verdict).toBe('KILL (lift)');
    expect(grade.liftMet).toBe(false);
    expect(grade.perDateCapMet).toBe(true);
    expect(grade.destinationsUp).toBe(5);
    expect(grade.postingDatesInLiftWindow).toBe(2);
    expect(grade.postingDates).toBe(3);
    expect(grade.postWindow).toEqual({
      treated: { curr: 548, prev: 600, pct: (548 - 600) / 600 },
      site: { curr: 18287, prev: 18846, pct: (18287 - 18846) / 18846 },
      partial: true,
    });
  });

  it('a blog.* landing row counts toward the same destination (host fold), and a non-treated path does not', () => {
    const extra: Ga4RangeRow[] = [
      ...treatedRows(),
      { range: 'curr', host: 'blog.musthavemods.com', path: '/sims-4-elf-cc/', sessions: 100 },
      { range: 'curr', host: 'musthavemods.com', path: '/sims-4-wedges-cc', sessions: 1000 },
      { range: 'curr', host: 'evil.example', path: '/sims-4-elf-cc', sessions: 0 },
    ];
    const g = gradeTopup({ ledger, end: '2026-10-19', treatedRows: extra, siteRows: SITE });
    expect(g.treated.curr).toBe(1836);
  });

  it('flips to KEEP when the treated set outgrows the site, and is INCONCLUSIVE with an empty base', () => {
    const up = treatedRows().map((r) => (r.range === 'curr' ? { ...r, sessions: r.sessions * 2 } : r));
    expect(gradeTopup({ ledger, end: '2026-10-19', treatedRows: up, siteRows: SITE }).verdict).toBe('KEEP');
    const noBase = treatedRows().filter((r) => r.range !== 'prev');
    expect(gradeTopup({ ledger, end: '2026-10-19', treatedRows: noBase, siteRows: SITE }).verdict).toBe('INCONCLUSIVE');
  });

  it('fails the cap leg when a posting date carries more than 7 rows', () => {
    const over = parseTopupLedger({ ...E202, entries: [...E202.entries, entry(9999, '2026-10-18', 'sims-4-room-ideas')] });
    expect(gradeTopup({ ledger: over, end: '2026-10-19', treatedRows: treatedRows(), siteRows: SITE }).perDateCapMet).toBe(false);
  });

  it('prints the rule before the reading and never calls the floor itself kept or killed', () => {
    const md = renderTopupGradeMd(grade);
    expect(md.indexOf('## Decision rule')).toBeGreaterThan(-1);
    expect(md.indexOf('## Decision rule')).toBeLessThan(md.indexOf('## Reading'));
    expect(md).toContain(TOPUP_GRADE_RULE.liftKeepIf);
    expect(md).toContain('**Verdict: KILL (lift)**');
    expect(md).toContain('1736 vs 1849 (-6.1%)');
    expect(md).toContain('58519 vs 57198 (+2.3%)');
    expect(md).toContain('| /sims-4-urban-tattoos/ | 3 | 544 | 593 | -8.3% |');
    expect(md).toContain('governed by SD-10, not by this verdict');
  });
});

describe('topup-grade — source guards', () => {
  it('the lib does no I/O and the entrypoint refuses to run outside a project dir', () => {
    const lib = stripComments(read('scripts/agents/topup-grade-lib.ts'));
    expect(lib).not.toMatch(/node:fs|node:os|fetch\(|@google-analytics|process\.env/);
    const entry = stripComments(read('scripts/agents/topup-grade.ts'));
    expect(entry).toContain("requireProjectDir('topup-grade.ts')");
    expect(entry).toContain('redactError(');
    expect(entry).not.toMatch(/--apply|n8n_pinterest_posts|SUPABASE/);
  });
});

describe('topup-grade — default end anchors at the last finalized day (E258)', () => {
  it('defaults --end to T−2, never yesterday (10-23: E209 read −4.1% at T−1, −1.5% at T−2)', () => {
    expect(DEFAULT_END_LAG_DAYS).toBe(2);
    expect(defaultGradeEnd('2026-10-23')).toBe('2026-10-21');
    expect(defaultGradeEnd('2026-11-01')).toBe('2026-10-30');
    expect(() => defaultGradeEnd('10/23/2026')).toThrow();
  });
  it('the entrypoint takes the default from the lib and no longer hardcodes yesterday', () => {
    const src = stripComments(read('scripts/agents/topup-grade.ts'));
    expect(src).toContain('defaultGradeEnd(');
    expect(src).not.toMatch(/daysAgo\(\s*1\s*\)/);
    expect(src).toContain("arg('end')");
  });
});
