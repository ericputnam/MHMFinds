import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E126 (2026-09-27) — "not measured" must be null, never 0.
 *
 * On 2026-09-26 the scoreboard's Patreon and DB sections both reported `ok: false`, and
 * funnel-scoreboard.ts still wrote `headline.nonAdRevenueMonthlyGross: 0`. Quinn hand-nulled the
 * 09-26 row of history.json on main; the next morning's runner rebuilt history.json from that
 * scoreboard JSON and wrote `nonAdMonthly: 0` again. This test runs the REAL script as a subprocess
 * against a fixture project dir (Mediavine forced to "could not fetch" by an empty MEDIAVINE_JWT,
 * so no network is touched and the existing history.json is kept), then asserts the failed-source
 * day comes out null and does not poison the carry-forward for later days.
 *
 * Seen red against the pre-fix tree (origin/main e401d27): 09-26 nonAdMonthly === 0,
 * ownedAdds7d / favorites7d fields read from a db-failed section survive.
 */

const REPO = process.cwd();
const SCRIPT = join(REPO, 'scripts/agents/funnel-history.ts');

let dir: string;
let out: { days: Array<Record<string, unknown>> };
let exitCode: number | null;

function day(date: string, extra: Record<string, unknown> = {}) {
  return {
    date,
    revenue: 200,
    sessions: 20000,
    rpm: 10,
    expectedRevenue: null,
    expectedSessions: null,
    nonAdMonthly: null,
    ownedAdds7d: null,
    pinterestSessions7d: null,
    ...extra,
  };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'funnel-history-e126-'));
  const reports = join(dir, 'reports', 'funnel');
  mkdirSync(reports, { recursive: true });
  mkdirSync(join(dir, '.claude', 'agents', 'mhm-funnel'), { recursive: true });
  copyFileSync(join(REPO, '.claude/agents/mhm-funnel/targets.json'), join(dir, '.claude/agents/mhm-funnel/targets.json'));

  // Existing history.json as it is on main after Quinn's hand-fix: 09-26 nonAdMonthly null.
  writeFileSync(
    join(reports, 'history.json'),
    JSON.stringify({ generatedAt: 'x', expectation: {}, days: [day('2026-09-25', { nonAdMonthly: 145 }), day('2026-09-26')], events: [] }),
  );
  // A healthy day.
  writeFileSync(
    join(reports, '2026-09-25.json'),
    JSON.stringify({
      date: '2026-09-25',
      headline: { ownedAdds7d: 78, nonAdRevenueMonthlyGross: 145 },
      ga4: { ok: true, data: { byChannel7d: { pinterest: 1000 } } },
      db: { ok: true },
      patreon: { ok: true },
      engagement: { favorites7d: 12, pagesPerSession7d: 1.5 },
      catalog: { total: 9000 },
    }),
  );
  // The 09-26 shape: patreon + db failed, headline still says 0; one db-derived field left non-null
  // on purpose to prove the section flag (not the scoreboard's own gating) decides.
  writeFileSync(
    join(reports, '2026-09-26.json'),
    JSON.stringify({
      date: '2026-09-26',
      headline: { ownedAdds7d: 0, nonAdRevenueMonthlyGross: 0 },
      ga4: { ok: true, data: { byChannel7d: { pinterest: 1100 } } },
      db: { ok: false, error: 'terminated' },
      patreon: { ok: false, error: 'terminated' },
      engagement: { favorites7d: 0, pagesPerSession7d: 1.6 },
      catalog: { total: 0 },
    }),
  );

  const res = spawnSync('npx', ['tsx', SCRIPT], {
    cwd: REPO,
    env: { ...process.env, MHM_PROJECT_DIR: dir, MEDIAVINE_JWT: '' },
    encoding: 'utf8',
    timeout: 90_000,
  });
  exitCode = res.status;
  out = JSON.parse(readFileSync(join(reports, 'history.json'), 'utf8'));
}, 120_000);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const get = (date: string) => out.days.find((d) => d.date === date)!;

describe('funnel-history.ts: a failed source section is null, never 0 (E126)', () => {
  it('ran in could-not-fetch-Mediavine mode (exit 3) and still wrote the file', () => {
    expect(exitCode).toBe(3);
    expect(get('2026-09-25')).toBeTruthy();
    expect(get('2026-09-26')).toBeTruthy();
  });

  it('keeps a healthy day as measured', () => {
    const d = get('2026-09-25');
    expect(d.nonAdMonthly).toBe(145);
    expect(d.ownedAdds7d).toBe(78);
    expect(d.favorites7d).toBe(12);
    expect(d.catalogTotal).toBe(9000);
  });

  it('writes nonAdMonthly null (not 0) when patreon/db reported ok:false — does not undo a hand-null', () => {
    expect(get('2026-09-26').nonAdMonthly).toBeNull();
  });

  it('nulls every db-derived field when db reported ok:false', () => {
    const d = get('2026-09-26');
    expect(d.ownedAdds7d).toBeNull();
    expect(d.favorites7d).toBeNull();
    expect(d.catalogTotal).toBeNull();
  });

  it('keeps fields from a section that was ok (ga4) on the same day', () => {
    const d = get('2026-09-26');
    expect(d.pinterestSessions7d).toBe(1100);
    expect(d.pagesPerSession7d).toBe(1.6);
  });

  it('a failed day does not become "last known": later days without a scoreboard carry 145, not 0', () => {
    const later = out.days.filter((d) => (d.date as string) > '2026-09-26');
    expect(later.length).toBeGreaterThan(0); // vacuity guard: the range is filled through today
    for (const d of later) expect(d.nonAdMonthly).toBe(145);
  });
});
