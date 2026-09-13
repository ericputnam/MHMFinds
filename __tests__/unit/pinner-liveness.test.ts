import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assessLiveness,
  livenessExitCode,
  parsePinterestTimestamp,
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
});
