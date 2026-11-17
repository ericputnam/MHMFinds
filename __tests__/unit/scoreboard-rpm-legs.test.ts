/**
 * E424 (Rio, 2026-11-17) — the scoreboard prints the session-RPM identity
 * (revenue = sessions × imp/session × CPM) for 7d vs prev 7d and the state of the E416
 * ad-side falsifier (monetizable-pv share < 85% with CPM flat → Mediavine-side).
 *
 * The fixture is the real Mediavine `earnings` response for 2026-11-02→2026-11-16 as read
 * on 2026-11-17 (`mv_metrics_daily`); the expected legs are the hand read in
 * `reports/funnel/rio-verdict-2026-11-17.md`, computed before this lib existed.
 *
 * Against pre-E424 `origin/main`: the lib describes fail on module load (no file) and the
 * "wired" describe fails on every assertion (no import, no line) — the red is the absence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  E416_FALSIFIER,
  formatRpmLegsLine,
  isCompleteRow,
  rpmLegs,
  splitWindows,
  summarizeWindow,
  type RpmLegsRow,
} from '../../scripts/agents/scoreboard-rpm-legs-lib';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// date, revenue, pageviews, monetizable_pageviews, sessions, paid_impressions — Mediavine site 14318.
const RAW: Array<[string, number, number, number, number, number]> = [
  ['2026/11/02', 187.44, 20214, 16279, 11907, 188627],
  ['2026/11/03', 211.53, 20758, 17746, 11580, 196153],
  ['2026/11/04', 183.06, 19824, 16940, 11112, 186363],
  ['2026/11/05', 195.73, 19637, 17215, 10707, 189824],
  ['2026/11/06', 225.96, 21169, 19302, 11556, 212572],
  ['2026/11/07', 299.05, 26322, 24096, 14775, 287060],
  ['2026/11/08', 304.7, 26677, 24431, 15282, 289510],
  ['2026/11/09', 215.37, 20831, 18779, 11588, 204291],
  ['2026/11/10', 229.9, 20009, 18524, 11095, 209553],
  ['2026/11/11', 235.63, 23848, 21901, 12580, 223944],
  ['2026/11/12', 202.19, 21203, 18822, 11767, 182264],
  ['2026/11/13', 236.02, 22417, 20805, 12226, 206665],
  ['2026/11/14', 315.01, 26472, 24595, 14477, 276122],
  ['2026/11/15', 293.92, 27744, 26084, 14869, 270295],
  // Mediavine's lag state: revenue posted, sessions/pageviews not yet (E342 saw the same on 11-05).
  ['2026/11/16', 200.92, 0, 18574, 0, 189855],
];
const ROWS: RpmLegsRow[] = RAW.map(([date, revenue, pageviews, monetizable_pageviews, sessions, paid_impressions]) => ({
  date, revenue, pageviews, monetizable_pageviews, sessions, paid_impressions,
}));

describe('E424 — splitWindows matches by date against the anchored end', () => {
  it('cur = 11-09→11-15, prev = 11-02→11-08, the lag row is outside both', () => {
    const { cur, prev } = splitWindows(ROWS, '2026-11-15');
    expect(cur.map((r) => r.date)).toEqual(RAW.slice(7, 14).map((r) => r[0]));
    expect(prev.map((r) => r.date)).toEqual(RAW.slice(0, 7).map((r) => r[0]));
  });
  it('a missing day shortens the window rather than shifting it', () => {
    const { cur } = splitWindows(ROWS.filter((r) => r.date !== '2026/11/12'), '2026-11-15');
    expect(cur).toHaveLength(6);
    expect(cur.map((r) => r.date)).not.toContain('2026/11/08');
  });
  it('accepts the dashed form the scoreboard anchors with', () => {
    const { cur } = splitWindows(ROWS, '2026/11/15');
    expect(cur).toHaveLength(7);
  });
});

describe('E424 — the legs reproduce the 11-17 hand read', () => {
  const { cur, prev } = splitWindows(ROWS, '2026-11-15');
  const legs = rpmLegs(cur, prev);

  it('revenue and sessions are the scoreboard totals', () => {
    expect(legs.cur.revenue).toBeCloseTo(1728.04, 2);
    expect(legs.cur.sessions).toBe(88602);
    expect(legs.prev.revenue).toBeCloseTo(1607.47, 2);
    expect(legs.prev.sessions).toBe(86919);
  });
  it('session RPM $19.50 vs $18.49 (+5.5%)', () => {
    expect(legs.cur.sessionRpm).toBeCloseTo(19.503, 2);
    expect(legs.prev.sessionRpm).toBeCloseTo(18.494, 2);
    expect(legs.delta.sessionRpm).toBeCloseTo(0.0546, 3);
  });
  it('imp/session 17.76 vs 17.83 (−0.4%) and CPM $1.098 vs $1.037 (+5.9%) multiply back to the RPM delta', () => {
    expect(legs.cur.impPerSession).toBeCloseTo(17.755, 2);
    expect(legs.prev.impPerSession).toBeCloseTo(17.834, 2);
    expect(legs.cur.cpm).toBeCloseTo(1.0985, 3);
    expect(legs.prev.cpm).toBeCloseTo(1.037, 3);
    expect((1 + legs.delta.impPerSession) * (1 + legs.delta.cpm)).toBeCloseTo(1 + legs.delta.sessionRpm, 6);
  });
  it('imp/session = mon-pv/session (+7.8%) × imp/mon-pv (−7.7%)', () => {
    expect(legs.cur.monPvPerSession).toBeCloseTo(1.6875, 3);
    expect(legs.cur.impPerMonPv).toBeCloseTo(10.522, 2);
    expect((1 + legs.delta.monPvPerSession) * (1 + legs.delta.impPerMonPv)).toBeCloseTo(1 + legs.delta.impPerSession, 6);
  });
  it('monetizable-pv share 92.0% (prev 88.0%), daily min 88.8% on 11-12', () => {
    expect(legs.cur.monPvShare).toBeCloseTo(0.9199, 3);
    expect(legs.prev.monPvShare).toBeCloseTo(0.8797, 3);
    expect(legs.cur.minDailyMonPvShare).toBeCloseTo(18822 / 21203, 4);
  });
  it('pv/session 1.83 vs 1.78 (+3.1%)', () => {
    expect(legs.cur.pvPerSession).toBeCloseTo(1.8343, 3);
    expect(legs.delta.pvPerSession).toBeCloseTo(0.0313, 3);
  });
  it('the E416 falsifier reads ok — share ≥ 85%', () => {
    expect(legs.falsifier.status).toBe('ok');
    expect(legs.falsifier.reason).toMatch(/92\.0% ≥ 85%/);
  });
  it('the line names every leg, the share and the falsifier state', () => {
    const line = formatRpmLegsLine(legs);
    // CPM is $1.09847 → prints $1.098 at 3 dp (the hand read rounded to $1.099 at 4 dp).
    expect(line.startsWith('- RPM legs 7d vs prev 7d (E424): session RPM $19.50 (+5.5%) = imp/session 17.76 (-0.4%) × CPM $1.098 (+5.9%)')).toBe(true);
    expect(line).toContain('monetizable-pv share 92.0% (prev 88.0%, daily min 88.8%)');
    expect(line).toContain('🟢 E416 falsifier ok');
  });
});

describe('E424 — the falsifier is three-state', () => {
  const { cur, prev } = splitWindows(ROWS, '2026-11-15');
  const scaleShare = (rows: RpmLegsRow[], share: number) => rows.map((r) => ({ ...r, monetizable_pageviews: Math.round(r.pageviews * share) }));
  const scaleRevenue = (rows: RpmLegsRow[], k: number) => rows.map((r) => ({ ...r, revenue: r.revenue * k }));

  it('fires when share < minShare and CPM is within the flat band', () => {
    // prev CPM $1.037; cur revenue scaled so cur CPM lands at prev × 1.00.
    const curFlat = scaleRevenue(scaleShare(cur, 0.80), 1.037 / 1.0985);
    const legs = rpmLegs(curFlat, prev);
    expect(Math.abs(legs.delta.cpm)).toBeLessThanOrEqual(E416_FALSIFIER.cpmFlatBand);
    expect(legs.cur.monPvShare).toBeLessThan(E416_FALSIFIER.minShare);
    expect(legs.falsifier.status).toBe('fired');
    expect(formatRpmLegsLine(legs)).toContain('🔴 E416 falsifier fired');
  });
  it('does not fire on a low share when CPM moved — that is a rate read, not the share step', () => {
    const legs = rpmLegs(scaleShare(cur, 0.80), prev); // CPM +5.9% as read
    expect(legs.falsifier.status).toBe('ok');
    expect(legs.falsifier.reason).toMatch(/not flat/);
  });
  it('is unknown, never ok, when a window carries a zero-session day', () => {
    const withLag = [...cur.slice(1), ROWS[14]]; // 11-10→11-16: the 11-16 lag row inside the window
    const legs = rpmLegs(withLag, prev);
    expect(isCompleteRow(ROWS[14])).toBe(false);
    expect(legs.cur.incompleteDays).toBe(1);
    expect(legs.falsifier.status).toBe('unknown');
    expect(formatRpmLegsLine(legs)).toContain('🟡 E416 falsifier unknown');
  });
  it('is unknown when the window is shorter than 7 days', () => {
    const legs = rpmLegs(cur.slice(1), prev);
    expect(legs.falsifier.status).toBe('unknown');
  });
  it('summarizeWindow excludes lag rows from every ratio', () => {
    const w = summarizeWindow([...cur, ROWS[14]]);
    expect(w.days).toBe(8);
    expect(w.incompleteDays).toBe(1);
    expect(w.revenue).toBeCloseTo(1728.04, 2); // 11-16's $200.92 is not blended into an RPM with 0 sessions
  });
  it('the thresholds are frozen constants', () => {
    expect(E416_FALSIFIER).toEqual({ minShare: 0.85, cpmFlatBand: 0.03, expectedDays: 7 });
    expect(Object.isFrozen(E416_FALSIFIER)).toBe(true);
  });
});

describe('E424 — wired into the scoreboard', () => {
  const src = stripComments(readFileSync(join(ROOT, 'scripts/agents/funnel-scoreboard.ts'), 'utf8'));
  it('imports the lib and does not restate its thresholds', () => {
    expect(src).toContain("from './scoreboard-rpm-legs-lib'");
    expect(src).not.toMatch(/0\.85\b/);
  });
  it('splits the windows by the anchored end and prints the line in the Ad revenue section', () => {
    expect(src).toContain('splitWindows(daily14.earnings ?? [], daysAgo(end))');
    expect(src).toContain('rpmLegs: rpmLegs(windows.cur, windows.prev)');
    const adSection = src.slice(src.indexOf('## Ad revenue (Mediavine'), src.indexOf('## Owned audience'));
    expect(adSection).toContain('formatRpmLegsLine(m.rpmLegs)');
  });
});
