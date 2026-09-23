import { describe, it, expect } from 'vitest';
import { captureRatePer1kSessions, nonPinterestShare } from '@/lib/funnel/captureMath';

describe('captureRatePer1kSessions', () => {
  it('computes owned adds per 1,000 sessions', () => {
    expect(captureRatePer1kSessions(50, 20000)).toBeCloseTo(2.5, 10);
  });

  it('returns null rather than dividing by zero sessions', () => {
    expect(captureRatePer1kSessions(50, 0)).toBeNull();
  });

  it('returns null when either input is missing', () => {
    expect(captureRatePer1kSessions(null, 20000)).toBeNull();
    expect(captureRatePer1kSessions(50, null)).toBeNull();
  });
});

describe('nonPinterestShare', () => {
  it('computes the raw share with no exclusions', () => {
    const result = nonPinterestShare({
      channels: { pinterest: 300, direct: 700 },
      notSetSessions: 0,
    });
    // 1 - 300/1000 = 0.7, exact.
    expect(result.raw).toBeCloseTo(0.7, 10);
  });

  it('excludes Bing organic and (not set) sessions from BOTH numerator and denominator', () => {
    const result = nonPinterestShare({
      channels: { pinterest: 200, bing_organic: 300, direct: 500 },
      notSetSessions: 100,
    });
    // total = 1000; adjustedTotal = 1000 - 300 - 100 = 600
    // adjusted = 1 - 200/600 = 2/3, exact.
    expect(result.adjusted).toBeCloseTo(2 / 3, 10);
    // raw is unaffected by the exclusion: 1 - 200/1000 = 0.8
    expect(result.raw).toBeCloseTo(0.8, 10);
  });

  it('returns null adjusted share when the adjusted denominator collapses to zero or below', () => {
    const result = nonPinterestShare({
      channels: { pinterest: 100, bing_organic: 900 },
      notSetSessions: 200,
    });
    // total = 1000; adjustedTotal = 1000 - 900 - 200 = -100 -> null
    expect(result.adjusted).toBeNull();
    expect(result.raw).toBeCloseTo(0.9, 10);
  });

  it('returns null raw share for an empty channel map', () => {
    const result = nonPinterestShare({ channels: {}, notSetSessions: 0 });
    expect(result.raw).toBeNull();
    expect(result.adjusted).toBeNull();
  });

  it('treats a missing pinterest key as zero sessions', () => {
    const result = nonPinterestShare({ channels: { direct: 500 }, notSetSessions: 0 });
    expect(result.raw).toBe(1);
  });
});
