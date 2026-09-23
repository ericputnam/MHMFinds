import { describe, it, expect } from 'vitest';
import { DEFAULT_METRIC_OWNERS, resolveMetricOwners } from '@/lib/funnel/metricOwners';

/**
 * Guards the real DEFAULT_METRIC_OWNERS constant (imported, not a copy of its
 * keys) per CLAUDE.md's "guard the constant, not a copy of its value" rule --
 * a hand-restated list of keys here would drift silently from the map the
 * dashboard actually reads.
 */

// Every metric key the /admin/funnel dashboard shows an owner badge for
// (KpiTiles' original three counters plus the long-range health and team
// health tiles added in app/admin/funnel/page.tsx). Vacuity guard below
// asserts this list -- and the map it's checked against -- both clear 15.
const DASHBOARD_METRIC_KEYS = [
  'revenue',
  'sessions',
  'rpm',
  'ownedAdds7d',
  'pinterestSessions7d',
  'nonAdMonthly',
  'returningShare7d',
  'nonPinterestShare7d',
  'pagesPerSession7d',
  'engagementRate7d',
  'favorites7d',
  'downloadClicks7d',
  'newMods7d',
  'captureRatePer1k',
  'creatorsOnboarded',
  'runSuccess14d',
  'opsMergeShare7d',
  'paperOnlyMerges7d',
  'mergesByOwner7d',
];

describe('DEFAULT_METRIC_OWNERS', () => {
  it('clears the vacuity guard of at least 15 owned metrics', () => {
    expect(Object.keys(DEFAULT_METRIC_OWNERS).length).toBeGreaterThanOrEqual(15);
  });

  it('assigns an owner to every metric key the dashboard renders', () => {
    const missing = DASHBOARD_METRIC_KEYS.filter((k) => !(k in DEFAULT_METRIC_OWNERS));
    expect(missing).toEqual([]);
  });

  it('never maps a metric to an empty owner string', () => {
    for (const [key, owner] of Object.entries(DEFAULT_METRIC_OWNERS)) {
      expect(owner, `owner for "${key}"`).not.toBe('');
    }
  });
});

describe('resolveMetricOwners', () => {
  it('falls back to the default map when targets has no owners override', () => {
    expect(resolveMetricOwners(null)).toEqual(DEFAULT_METRIC_OWNERS);
    expect(resolveMetricOwners(undefined)).toEqual(DEFAULT_METRIC_OWNERS);
    expect(resolveMetricOwners({})).toEqual(DEFAULT_METRIC_OWNERS);
  });

  it('merges a targets.json owners override on top of the defaults', () => {
    const merged = resolveMetricOwners({ owners: { revenue: 'Sage' } });
    expect(merged.revenue).toBe('Sage');
    // Everything else keeps its default.
    expect(merged.sessions).toBe(DEFAULT_METRIC_OWNERS.sessions);
  });

  it('tolerates a malformed owners field instead of crashing', () => {
    // @ts-expect-error -- intentionally malformed input to prove degrade-not-crash
    expect(resolveMetricOwners({ owners: 'not-an-object' })).toEqual(DEFAULT_METRIC_OWNERS);
  });
});
