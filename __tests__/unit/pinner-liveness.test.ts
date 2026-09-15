import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assessLiveness,
  assessRunway,
  DEFAULT_LOW_RUNWAY_DAYS,
  DEFAULT_RUNWAY_HORIZON_DAYS,
  livenessExitCode,
  parsePinterestTimestamp,
  runwayExitCode,
  summarizePins,
} from '../../scripts/agents/pinner-liveness-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

// The exact 2026-09-13 morning: Quinn's check ran at 10:46Z; the newest pin on
// Pinterest was created 10:40:04Z; every posted row carried Post Date 09-11.
const NOW = new Date('2026-09-13T10:46:36Z');

describe('parsePinterestTimestamp', () => {
  it('reads a zone-less Pinterest created_at as UTC, not local time', () => {
    const d = parsePinterestTimestamp('2026-09-13T10:40:04');
    expect(d?.toISOString()).toBe('2026-09-13T10:40:04.000Z');
  });
  it('leaves an explicit zone alone', () => {
    expect(parsePinterestTimestamp('2026-09-13T05:40:04-05:00')?.toISOString()).toBe('2026-09-13T10:40:04.000Z');
    expect(parsePinterestTimestamp('2026-09-13T10:40:04Z')?.toISOString()).toBe('2026-09-13T10:40:04.000Z');
  });
  it('returns null for garbage, empty and missing values', () => {
    expect(parsePinterestTimestamp('')).toBeNull();
    expect(parsePinterestTimestamp(null)).toBeNull();
    expect(parsePinterestTimestamp(undefined)).toBeNull();
    expect(parsePinterestTimestamp('not a date')).toBeNull();
  });
});

describe('summarizePins', () => {
  it('counts 24h / 7d windows and picks the newest pin regardless of order', () => {
    const pins = [
      { id: 'b', created_at: '2026-09-13T08:00:07' },
      { id: 'a', created_at: '2026-09-13T10:40:04' },
      { id: 'c', created_at: '2026-09-12T09:00:00' }, // 25.8 h ago → 7d only
      { id: 'd', created_at: '2026-09-05T10:00:00' }, // 8 d ago → neither
      { id: 'e', created_at: null },
    ];
    const s = summarizePins(pins, NOW);
    expect(s.lastCreatedAt).toBe('2026-09-13T10:40:04.000Z');
    expect(s.created24h).toBe(2);
    expect(s.created7d).toBe(3);
    expect(s.sampled).toBe(5);
  });
  it('never counts a future-dated pin as recent (clock skew)', () => {
    const s = summarizePins([{ created_at: '2026-09-14T00:00:00' }], NOW);
    expect(s.created24h).toBe(0);
    expect(s.created7d).toBe(0);
  });
  it('is empty-safe', () => {
    expect(summarizePins([], NOW)).toEqual({ lastCreatedAt: null, created24h: 0, created7d: 0, sampled: 0 });
  });
});

describe('assessLiveness', () => {
  it('2026-09-13: Pinterest says 6 min ago while the Post Date proxy says 2 days → ok, not red', () => {
    const a = assessLiveness({ lastCreatedAt: '2026-09-13T10:40:04', lastPostDateProxy: '2026-09-11', now: NOW });
    expect(a.level).toBe('ok');
    expect(a.source).toBe('pinterest');
    expect(a.hoursSince).toBeCloseTo(0.1, 1);
    expect(a.message).toContain('Pinterest API');
    expect(livenessExitCode(a.level)).toBe(0);
  });
  it('2026-09-10 → 09-12 shape: nothing created for 48 h → red from the Pinterest signal', () => {
    const a = assessLiveness({ lastCreatedAt: '2026-09-10T11:40:00', lastPostDateProxy: '2026-09-12', now: new Date('2026-09-12T11:39:00Z') });
    expect(a.level).toBe('red');
    expect(a.hoursSince).toBe(48);
    expect(a.message).toContain('stalled');
    expect(livenessExitCode(a.level)).toBe(1);
  });
  it('respects the 36 h default boundary', () => {
    const edgeOk = assessLiveness({ lastCreatedAt: '2026-09-11T22:47:00', lastPostDateProxy: null, now: NOW }); // 35.99 h
    const edgeRed = assessLiveness({ lastCreatedAt: '2026-09-11T22:45:00', lastPostDateProxy: null, now: NOW }); // 36.03 h
    expect(edgeOk.level).toBe('ok');
    expect(edgeRed.level).toBe('red');
    expect(assessLiveness({ lastCreatedAt: '2026-09-11T22:45:00', lastPostDateProxy: null, now: NOW, redAfterHours: 48 }).level).toBe('ok');
  });
  it('proxy-only can only be unverified, never red — that proxy produced the false positive', () => {
    const a = assessLiveness({ lastCreatedAt: null, lastPostDateProxy: '2026-09-11', now: NOW });
    expect(a.level).toBe('unverified');
    expect(a.source).toBe('post-date-proxy');
    expect(a.message).toContain('scheduled date, not a posting timestamp');
    expect(a.hoursSince).toBeGreaterThan(48);
    expect(livenessExitCode(a.level)).toBe(2);
  });
  it('nothing available is unverified with source none', () => {
    const a = assessLiveness({ lastCreatedAt: null, lastPostDateProxy: null, now: NOW });
    expect(a).toMatchObject({ level: 'unverified', source: 'none', hoursSince: null });
  });
});

describe('assessRunway (E51)', () => {
  // The exact 2026-09-15 morning: 6 rows still schedulable, 254 unposted rows
  // dated 09-15..09-27 (24/day through 09-23, then 14/day), Pinterest reports
  // 162 pins in 7 d and 39 in 24 h. The E20 rule flagged "< 20 schedulable".
  const SEP15 = { inventoryRows: 254, schedulableToday: 6, pinsCreated7d: 162, pinsCreated24h: 39 };

  it('2026-09-15: 6 schedulable with 254 rows ahead at 23/day is ok, not a flag', () => {
    const r = assessRunway(SEP15);
    expect(r.level).toBe('ok');
    expect(r.dailyRate).toBeCloseTo(23.14, 1);
    expect(r.runwayDays).toBe(11);
    expect(r.message).toContain('≈ 11 days');
    expect(r.message).toContain('6 still schedulable today');
    expect(runwayExitCode(r.level)).toBe(0);
  });
  it('the schedulable-today count never decides the level', () => {
    expect(assessRunway({ ...SEP15, schedulableToday: 0 }).level).toBe('ok');
    expect(assessRunway({ ...SEP15, schedulableToday: 500 }).level).toBe('ok');
  });
  it('~2026-09-25 shape: 42 rows left at 23/day is under the 3-day floor → low', () => {
    const r = assessRunway({ inventoryRows: 42, schedulableToday: 14, pinsCreated7d: 162, pinsCreated24h: 24 });
    expect(r.level).toBe('low');
    expect(r.runwayDays).toBeCloseTo(1.8, 1);
    expect(r.message).toContain('below the 3-day floor');
    expect(runwayExitCode(r.level)).toBe(2);
  });
  it('respects the 3-day default boundary and an override', () => {
    // 161 pins / 7 d = 23.0/day. 70 rows → 3.0 d (not below the floor); 66 rows → 2.9 d (below).
    expect(assessRunway({ inventoryRows: 70, schedulableToday: 0, pinsCreated7d: 161, pinsCreated24h: 23 }).level).toBe('ok');
    expect(assessRunway({ inventoryRows: 66, schedulableToday: 0, pinsCreated7d: 161, pinsCreated24h: 23 }).level).toBe('low');
    expect(assessRunway({ inventoryRows: 66, schedulableToday: 0, pinsCreated7d: 161, pinsCreated24h: 23, lowRunwayDays: 2 }).level).toBe('ok');
    expect(DEFAULT_LOW_RUNWAY_DAYS).toBe(3);
    expect(DEFAULT_RUNWAY_HORIZON_DAYS).toBe(14);
  });
  it('2026-09-08 shape: 0 rows the poster can reach → empty, even with 1,879 stranded elsewhere', () => {
    const r = assessRunway({ inventoryRows: 0, schedulableToday: 0, pinsCreated7d: 136, pinsCreated24h: 19 });
    expect(r.level).toBe('empty');
    expect(r.runwayDays).toBe(0);
    expect(r.message).toContain('queue empty');
    expect(runwayExitCode(r.level)).toBe(2);
  });
  it('Pinterest unreachable → unknown, never low/empty on its own (liveness owns that outage)', () => {
    const r = assessRunway({ inventoryRows: 254, schedulableToday: 6, pinsCreated7d: null, pinsCreated24h: null });
    expect(r.level).toBe('unknown');
    expect(r.runwayDays).toBeNull();
    expect(r.dailyRate).toBeNull();
    expect(r.message).toContain('rate unknown');
    expect(runwayExitCode(r.level)).toBe(0);
  });
  it('0 pins in 7 d is a stall (liveness 🔴), not a runway of infinity or zero', () => {
    const r = assessRunway({ inventoryRows: 254, schedulableToday: 24, pinsCreated7d: 0, pinsCreated24h: 0 });
    expect(r.level).toBe('unknown');
  });
  it('falls back to the 24 h count when the 7 d count is missing', () => {
    const r = assessRunway({ inventoryRows: 48, schedulableToday: 6, pinsCreated7d: null, pinsCreated24h: 24 });
    expect(r.dailyRate).toBe(24);
    expect(r.runwayDays).toBe(2);
    expect(r.level).toBe('low');
  });
  it('reports "> horizon" rather than a runway the horizon cannot see', () => {
    const r = assessRunway({ inventoryRows: 700, schedulableToday: 24, pinsCreated7d: 168, pinsCreated24h: 24 });
    expect(r.level).toBe('ok');
    expect(r.message).toContain('> 14 days');
  });
});

describe('the shipped consumers use the Pinterest signal', () => {
  it('funnel-scoreboard.ts imports the lib and no longer flags red on the Post Date proxy', () => {
    const src = read('scripts/agents/funnel-scoreboard.ts');
    expect(src).toMatch(/from '\.\/pinner-liveness-lib'/);
    expect(src).toMatch(/assessLiveness\(/);
    expect(src).toMatch(/api\.pinterest\.com\/v5\/pins/);
    // The old rule: red whenever max(Post Date) was > 1 day old.
    expect(src).not.toMatch(/staleDays > 1\) flags\.push\(`🔴/);
  });
  it('check-pinner.sh step 1 reads Pinterest created_at and treats proxy-only as WARN', () => {
    const src = read('scripts/agents/check-pinner.sh');
    expect(src).toMatch(/api\.pinterest\.com\/v5\/pins\?page_size=/);
    expect(src).toMatch(/created_at/);
    expect(src).toMatch(/PINNER_RED_AFTER_HOURS/);
    // Proxy-only must land in WARN (exit 2), never FAIL.
    expect(src).toMatch(/warn "Pinner liveness unverified/);
    expect(src).not.toMatch(/fail "Pinner stale: last post \$LAST_DATE/);
  });
  it('funnel-scoreboard.ts flags queue depth on inventory runway, not on schedulable-today (E51)', () => {
    const src = read('scripts/agents/funnel-scoreboard.ts');
    expect(src).toMatch(/assessRunway\(/);
    expect(src).toMatch(/PINNER_LOW_RUNWAY_DAYS = 3/);
    expect(src).toMatch(/PINNER_RUNWAY_HORIZON_DAYS = DEFAULT_RUNWAY_HORIZON_DAYS/);
    // Inventory is queried through the horizon, not subtracted from other counts.
    expect(src).toMatch(/lte\.\$\{daysAhead\(PINNER_RUNWAY_HORIZON_DAYS\)\}/);
    // The E20 rules that fired on every drip-dated morning are gone.
    expect(src).not.toMatch(/drainableBacklog < 20/);
    expect(src).not.toMatch(/drainableBacklog === 0\) \{/);
    // Liveness stays the only 🔴 path; runway can only 🟡.
    expect(src).toMatch(/if \(live\.level === 'red'\) flags\.push\(`🔴 Pinner/);
    expect(src).not.toMatch(/🔴 Pinner: \$\{rw\./);
  });
  it('check-pinner.sh step 2 mirrors the runway rule with the same constants', () => {
    const src = read('scripts/agents/check-pinner.sh');
    expect(src).toMatch(/RUNWAY_HORIZON_DAYS="\$\{PINNER_RUNWAY_HORIZON_DAYS:-14\}"/);
    expect(src).toMatch(/LOW_RUNWAY_DAYS="\$\{PINNER_LOW_RUNWAY_DAYS:-3\}"/);
    expect(src).not.toMatch(/PINNER_LOW_BACKLOG/);
    expect(src).not.toMatch(/Schedulable backlog low/);
    // Inventory query reaches through the horizon; rate comes from step 1's Pinterest counts.
    expect(src).toMatch(/lte\.\$\{HORIZON_STR\}/);
    expect(src).toMatch(/PINS_7D=/);
    // Runway can WARN (empty/low) but never FAIL.
    expect(src).toMatch(/EMPTY\|LOW\)\s*\n\s*warn/);
    expect(src).not.toMatch(/fail "\$RUNWAY_MSG"/);
  });
  it('the three consumers agree on the runway constants', () => {
    const sh = read('scripts/agents/check-pinner.sh');
    const ts = read('scripts/agents/funnel-scoreboard.ts');
    const horizonSh = Number(sh.match(/PINNER_RUNWAY_HORIZON_DAYS:-(\d+)/)?.[1]);
    const lowSh = Number(sh.match(/PINNER_LOW_RUNWAY_DAYS:-(\d+)/)?.[1]);
    const lowTs = Number(ts.match(/PINNER_LOW_RUNWAY_DAYS = (\d+)/)?.[1]);
    expect(horizonSh).toBe(DEFAULT_RUNWAY_HORIZON_DAYS);
    expect(lowSh).toBe(DEFAULT_LOW_RUNWAY_DAYS);
    expect(lowTs).toBe(DEFAULT_LOW_RUNWAY_DAYS);
    // The rate feeding the runway must be sampled the same way in both: one
    // page of 100 saturates inside 7 d at ~23 pins/day and understates the rate.
    const pagesSh = Number(sh.match(/PINS_MAX_PAGES="\$\{PINNER_PINS_MAX_PAGES:-(\d+)\}"/)?.[1]);
    const pagesTs = Number(ts.match(/PINNER_PINS_MAX_PAGES = (\d+)/)?.[1]);
    expect(pagesSh).toBeGreaterThan(1);
    expect(pagesSh).toBe(pagesTs);
    expect(sh).toMatch(/bookmark=/);
  });
});
