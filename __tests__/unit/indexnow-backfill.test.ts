import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BACKFILL_CUTOFF,
  E411_SALT,
  INDEXNOW_MAX_URLS_PER_POST,
  aggregateArmLandings,
  backfillArm,
  gradeE411,
  modIdFromLandingPage,
  splitBackfill,
  type ArmLandings,
} from '../../scripts/agents/indexnow-backfill-lib';

const old = new Date(BACKFILL_CUTOFF.getTime() - 86_400_000);
const ids = (n: number, p = 'cm') => Array.from({ length: n }, (_, i) => `${p}${i.toString(36).padStart(6, '0')}`);

describe('E411 arm assignment', () => {
  it('is deterministic and close to 50/50 on 20,000 ids', () => {
    const all = ids(20_000);
    const t = all.filter((id) => backfillArm(id) === 'treatment').length;
    expect(t / all.length).toBeGreaterThan(0.48);
    expect(t / all.length).toBeLessThan(0.52);
    for (const id of all.slice(0, 50)) expect(backfillArm(id)).toBe(backfillArm(id, E411_SALT));
  });

  it('the salt matters (a different salt re-randomizes)', () => {
    const all = ids(2_000);
    const same = all.filter((id) => backfillArm(id, 'E411') === backfillArm(id, 'other')).length;
    expect(same).toBeLessThan(all.length * 0.6);
  });
});

describe('splitBackfill', () => {
  it('excludes rows on/after the cutoff and invalid dates from both arms', () => {
    const s = splitBackfill([
      { id: 'a1', createdAt: old },
      { id: 'a2', createdAt: BACKFILL_CUTOFF },
      { id: 'a3', createdAt: new Date('2026-11-01') },
      { id: 'a4', createdAt: new Date('nope') },
    ]);
    expect([...s.treatment, ...s.control]).toEqual(['a1']);
    expect(s.excludedRecent).toBe(3);
  });

  it('dedupes ids, sorts both arms and caps treatment at 10,000', () => {
    const rows = ids(25_000).map((id) => ({ id, createdAt: old }));
    const s = splitBackfill([...rows, ...rows.slice(0, 100)]);
    expect(s.treatment.length).toBe(INDEXNOW_MAX_URLS_PER_POST);
    expect(s.capped).toBe(true);
    expect(s.treatment).toEqual([...s.treatment].sort());
    expect(s.control).toEqual([...s.control].sort());
    expect(new Set(s.control).size).toBe(s.control.length);
    // No id is in both arms, and every control id really hashes to control.
    const t = new Set(s.treatment);
    expect(s.control.some((id) => t.has(id))).toBe(false);
    expect(s.control.every((id) => backfillArm(id) === 'control')).toBe(true);
  });

  it('a caller-supplied max can never exceed the protocol limit', () => {
    const rows = ids(25_000).map((id) => ({ id, createdAt: old }));
    expect(splitBackfill(rows, { max: 50_000 }).treatment.length).toBe(INDEXNOW_MAX_URLS_PER_POST);
  });
});

describe('modIdFromLandingPage', () => {
  it('reads /mods/<id>/ only', () => {
    expect(modIdFromLandingPage('/mods/cmabc123/')).toBe('cmabc123');
    expect(modIdFromLandingPage('/mods/cmabc123')).toBe('cmabc123');
    expect(modIdFromLandingPage('/mods/cmabc123/?utm=x')).toBe('cmabc123');
    expect(modIdFromLandingPage('/mods/')).toBeNull();
    expect(modIdFromLandingPage('/mods/a/b/')).toBeNull();
    expect(modIdFromLandingPage('/go/cmabc123/')).toBeNull();
    expect(modIdFromLandingPage('(not set)')).toBeNull();
  });
});

describe('aggregateArmLandings', () => {
  it('counts organic bing (sessions + pages) and google per arm, ignores everything else', () => {
    const arms = { treatment: ['t1', 't2'], control: ['c1'] };
    const a = aggregateArmLandings(
      [
        { landingPage: '/mods/t1/', source: 'bing', medium: 'organic', sessions: 3 },
        { landingPage: '/mods/t1', source: 'bing', medium: 'organic', sessions: 1 },
        { landingPage: '/mods/t2/', source: 'google', medium: 'organic', sessions: 5 },
        { landingPage: '/mods/t2/', source: 'bing', medium: 'referral', sessions: 9 },
        { landingPage: '/mods/c1/', source: 'Bing', medium: 'organic', sessions: 2 },
        { landingPage: '/mods/zz/', source: 'bing', medium: 'organic', sessions: 99 },
        { landingPage: '/sims-4-cc/', source: 'bing', medium: 'organic', sessions: 99 },
      ],
      arms,
    );
    expect(a.treatment).toEqual({ mods: 2, bingSessions: 4, bingPages: 1, googleSessions: 5 });
    expect(a.control).toEqual({ mods: 1, bingSessions: 2, bingPages: 1, googleSessions: 0 });
  });
});

describe('gradeE411 (pre-registered rule)', () => {
  const arm = (mods: number, bing: number): ArmLandings => ({ mods, bingSessions: bing, bingPages: 0, googleSessions: 0 });
  const pre = { treatment: arm(8000, 1000), control: arm(8000, 1000) };

  it('KEEP when treatment beats control by ≥10% relative and ≥0.02 sessions/mod', () => {
    expect(gradeE411(pre, { treatment: arm(8000, 1400), control: arm(8000, 1000) }).verdict).toBe('KEEP');
  });

  it('KILL when relative lift clears but the absolute DiD does not', () => {
    // +12% relative, +0.015/mod absolute.
    expect(gradeE411(pre, { treatment: arm(8000, 1120), control: arm(8000, 1000) }).verdict).toBe('KILL');
  });

  it('KILL when both arms move together (seasonality, not the push)', () => {
    expect(gradeE411(pre, { treatment: arm(8000, 1500), control: arm(8000, 1450) }).verdict).toBe('KILL');
  });

  it('a pre-period imbalance cannot pass the gate by itself', () => {
    // Treatment already ahead pre; same gap post → DiD 0 → KILL.
    const skew = { treatment: arm(8000, 1400), control: arm(8000, 1000) };
    expect(gradeE411(skew, skew).verdict).toBe('KILL');
  });

  it('INCONCLUSIVE on an empty arm or zero baseline', () => {
    expect(gradeE411({ treatment: arm(0, 0), control: arm(8000, 1000) }, pre).verdict).toBe('INCONCLUSIVE');
    expect(gradeE411({ treatment: arm(8000, 0), control: arm(8000, 1000) }, pre).verdict).toBe('INCONCLUSIVE');
  });
});

describe('the CLI', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/indexnow-mod-backfill.ts'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it("mirrors the mod sitemap's selection", () => {
    expect(code).toMatch(/isNSFW: false, isVerified: true/);
  });

  it('is a dry run unless --apply, and checks the key file before posting', () => {
    expect(code).toMatch(/if \(!apply\) done\('DRY-RUN'/);
    expect(code.indexOf('checkKeyFile(')).toBeGreaterThan(code.indexOf("if (!apply) done('DRY-RUN'"));
    expect(code.indexOf('checkKeyFile(')).toBeLessThan(code.indexOf('postIndexNow('));
  });

  it('never prints DATABASE_URL and is not wired into the daily runner', () => {
    expect(code).not.toMatch(/console\.(log|error)\([^)]*DATABASE_URL/);
    const runner = readFileSync(join(process.cwd(), 'scripts/agents/run-funnel-daily.sh'), 'utf8');
    expect(runner).not.toMatch(/indexnow-mod-backfill/);
  });
});
