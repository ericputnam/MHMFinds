import { describe, expect, it } from 'vitest';
import {
  aggregateSessions,
  destinationKey,
  destinationKeyFromUrl,
  hostOfUrl,
  normalizeHost,
  normalizePath,
  pathFromKey,
  rankDestinations,
  renderMarkdownTable,
  toIdsFilePackage,
  type Ga4LandingRow,
  type StrandedPinRow,
} from '../../scripts/agents/rank-pin-destinations-lib';

describe('normalizeHost', () => {
  it('folds the proxied blog subdomain into the apex', () => {
    expect(normalizeHost('blog.musthavemods.com')).toBe('musthavemods.com');
  });
  it('is case-insensitive and trims', () => {
    expect(normalizeHost(' Blog.MustHaveMods.com ')).toBe('musthavemods.com');
  });
  it('leaves the apex and unrelated hosts alone', () => {
    expect(normalizeHost('musthavemods.com')).toBe('musthavemods.com');
    expect(normalizeHost('www.pinterest.com')).toBe('www.pinterest.com');
  });
  it('handles null/undefined/empty', () => {
    expect(normalizeHost(null)).toBe('');
    expect(normalizeHost(undefined)).toBe('');
    expect(normalizeHost('')).toBe('');
  });
});

describe('normalizePath', () => {
  it('strips query strings and fragments', () => {
    expect(normalizePath('/sims-4-wedges-cc/?utm_source=pinterest')).toBe('/sims-4-wedges-cc/');
    expect(normalizePath('/sims-4-wedges-cc/#section')).toBe('/sims-4-wedges-cc/');
  });
  it('maps GA4 "(not set)" to empty so callers can drop it', () => {
    expect(normalizePath('(not set)')).toBe('');
  });
  it('ensures a leading slash and collapses doubled slashes', () => {
    expect(normalizePath('sims-4-wedges-cc/')).toBe('/sims-4-wedges-cc/');
    expect(normalizePath('//sims-4-wedges-cc//')).toBe('/sims-4-wedges-cc/');
  });
  it('handles null/undefined/empty', () => {
    expect(normalizePath(null)).toBe('');
    expect(normalizePath(undefined)).toBe('');
    expect(normalizePath('')).toBe('');
  });
});

describe('destinationKey / destinationKeyFromUrl', () => {
  it('produces the same key for the apex and the blog-hosted duplicate of the same path', () => {
    const apex = destinationKey('musthavemods.com', '/sims-4-wedges-cc/');
    const blog = destinationKey('blog.musthavemods.com', '/sims-4-wedges-cc/?utm=pinterest');
    expect(apex).not.toBeNull();
    expect(apex).toBe(blog);
  });
  it('is null when host or path is empty', () => {
    expect(destinationKey('', '/sims-4-wedges-cc/')).toBeNull();
    expect(destinationKey('musthavemods.com', '(not set)')).toBeNull();
  });
  it('derives the same key from a full URL as from host+path', () => {
    expect(destinationKeyFromUrl('https://musthavemods.com/sims-4-wedges-cc/')).toBe(
      destinationKey('musthavemods.com', '/sims-4-wedges-cc/'),
    );
    expect(destinationKeyFromUrl('https://blog.musthavemods.com/sims-4-wedges-cc/?x=1')).toBe(
      destinationKey('musthavemods.com', '/sims-4-wedges-cc/'),
    );
  });
  it('returns null for garbage or empty URLs, never throws', () => {
    expect(destinationKeyFromUrl('not a url')).toBeNull();
    expect(destinationKeyFromUrl('')).toBeNull();
    expect(destinationKeyFromUrl(null)).toBeNull();
    expect(destinationKeyFromUrl(undefined)).toBeNull();
  });
});

describe('pathFromKey', () => {
  it('strips the host prefix, keeping the path', () => {
    expect(pathFromKey('musthavemods.com/sims-4-wedges-cc/')).toBe('/sims-4-wedges-cc/');
  });
});

describe('hostOfUrl', () => {
  it('lower-cases and never throws on garbage', () => {
    expect(hostOfUrl('https://Blog.MustHaveMods.com/x/')).toBe('blog.musthavemods.com');
    expect(hostOfUrl('not a url')).toBe('');
    expect(hostOfUrl(null)).toBe('');
  });
});

describe('aggregateSessions', () => {
  it('sums sessions across hosts under the normalised destination key', () => {
    const rows: Ga4LandingRow[] = [
      { host: 'musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 700 },
      { host: 'blog.musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 73 },
    ];
    const out = aggregateSessions(rows);
    expect(out.get('musthavemods.com/sims-4-wedges-cc/')).toBe(773);
  });
  it('drops "(not set)" and unparseable rows instead of counting them toward a destination', () => {
    const rows: Ga4LandingRow[] = [
      { host: 'musthavemods.com', path: '(not set)', sessions: 1685 },
      { host: '', path: '/x/', sessions: 5 },
    ];
    const out = aggregateSessions(rows);
    expect(out.size).toBe(0);
  });
  it('treats a query-string variant and the bare path as the same destination', () => {
    const rows: Ga4LandingRow[] = [
      { host: 'musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 10 },
      { host: 'musthavemods.com', path: '/sims-4-wedges-cc/?utm_source=pinterest', sessions: 5 },
    ];
    const out = aggregateSessions(rows);
    expect(out.get('musthavemods.com/sims-4-wedges-cc/')).toBe(15);
  });
});

// Fixture modelled on reports/funnel/pinterest-read-2026-09-19.md §3: the
// allocator's default (newest-first) gave the most pins to the destinations
// that earned the fewest sessions. rankDestinations must invert that.
function fixture() {
  const stranded: StrandedPinRow[] = [
    // the two best earners, one stranded row each — the "starved by the
    // biggest groups" case §3 called out
    { id: 1, postUrl: 'https://musthavemods.com/sims-4-wedges-cc/', postDate: '2025-01-01' },
    { id: 2, postUrl: 'https://musthavemods.com/sims-4-urban-tattoos/', postDate: '2025-01-02' },
    // a big group of rows pointing at a destination that earns nothing
    { id: 3, postUrl: 'https://musthavemods.com/sims-4-story-ideas/', postDate: '2025-02-01' },
    { id: 4, postUrl: 'https://musthavemods.com/sims-4-story-ideas/', postDate: '2025-02-02' },
    { id: 5, postUrl: 'https://musthavemods.com/sims-4-story-ideas/', postDate: '2025-02-03' },
    // a destination just under the default threshold
    { id: 6, postUrl: 'https://musthavemods.com/sims-4-cas-challenges/', postDate: '2025-02-10' },
    // a destination on the blog host, same path as one already counted on apex
    { id: 7, postUrl: 'https://blog.musthavemods.com/sims-4-wedges-cc/', postDate: '2025-01-05' },
    // a row whose URL will not parse
    { id: 8, postUrl: 'not a url', postDate: '2025-03-01' },
  ];
  const sessions7dRows: Ga4LandingRow[] = [
    { host: 'musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 733 },
    { host: 'musthavemods.com', path: '/sims-4-urban-tattoos/', sessions: 586 },
    { host: 'musthavemods.com', path: '/sims-4-story-ideas/', sessions: 0 },
    { host: 'musthavemods.com', path: '/sims-4-cas-challenges/', sessions: 3 },
  ];
  const sessions28dRows: Ga4LandingRow[] = [
    { host: 'musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 2800 },
    { host: 'musthavemods.com', path: '/sims-4-urban-tattoos/', sessions: 2300 },
  ];
  return { stranded, sessions7dRows, sessions28dRows };
}

describe('rankDestinations', () => {
  it('ranks by 7d sessions descending — high-value single-row destinations beat low-value groups', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
      skipHosts: ['blog.musthavemods.com'],
    });
    const paths = result.destinations.map((d) => d.path);
    expect(paths[0]).toBe('/sims-4-wedges-cc/');
    expect(paths[1]).toBe('/sims-4-urban-tattoos/');
    // story-ideas (0 sessions) and cas-challenges (3 sessions, < 50) are both
    // below the default threshold and must not appear at all.
    expect(paths).not.toContain('/sims-4-story-ideas/');
    expect(paths).not.toContain('/sims-4-cas-challenges/');
  });

  it('folds the blog-hosted stranded row into the apex destination and includes it once sessions are combined via GA4', () => {
    const { stranded, sessions28dRows } = fixture();
    // Only the apex row (700) plus the blog subdomain's own sessions (73) sum to >=50;
    // the apex-only GA4 number alone already clears the bar, so this checks the id
    // from the blog-hosted stranded row is available in the same destination when
    // its host is not skipped.
    const sessions7dRows: Ga4LandingRow[] = [{ host: 'musthavemods.com', path: '/sims-4-wedges-cc/', sessions: 733 }];
    const result = rankDestinations({
      strandedRows: stranded.filter((r) => r.id === 1 || r.id === 7),
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
      skipHosts: [], // include-all-hosts
    });
    expect(result.destinations).toHaveLength(1);
    expect(result.destinations[0].path).toBe('/sims-4-wedges-cc/');
    expect(result.destinations[0].ids.sort()).toEqual([1, 7]);
  });

  it('drops rows whose host is in skipHosts and counts them', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
      skipHosts: ['blog.musthavemods.com'],
    });
    expect(result.droppedSkippedHost).toBe(1);
    const wedges = result.destinations.find((d) => d.path === '/sims-4-wedges-cc/');
    expect(wedges?.ids).toEqual([1]); // the blog-hosted row (id 7) must not sneak in
  });

  it('drops unparseable Post URLs and counts them', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
    });
    expect(result.droppedUnparseableUrl).toBe(1);
  });

  it('counts destinations dropped below the session threshold', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
      skipHosts: ['blog.musthavemods.com'],
    });
    // story-ideas (0 sessions/7d) and cas-challenges (3 sessions/7d) both fail the >=50 bar.
    expect(result.droppedBelowThreshold).toBe(2);
  });

  it('caps ids per destination at maxPerUrl, oldest post-date first', () => {
    const stranded: StrandedPinRow[] = [
      { id: 30, postUrl: 'https://musthavemods.com/sims-4-plants-cc/', postDate: '2025-05-03' },
      { id: 31, postUrl: 'https://musthavemods.com/sims-4-plants-cc/', postDate: '2025-05-01' },
      { id: 32, postUrl: 'https://musthavemods.com/sims-4-plants-cc/', postDate: '2025-05-02' },
    ];
    const sessions7dRows: Ga4LandingRow[] = [{ host: 'musthavemods.com', path: '/sims-4-plants-cc/', sessions: 116 }];
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows: [],
      minSessions7d: 50,
      maxPerUrl: 2,
    });
    expect(result.destinations).toHaveLength(1);
    const d = result.destinations[0];
    expect(d.strandedRows).toBe(3); // all 3 rows found, only 2 offered
    expect(d.ids).toEqual([31, 32]); // oldest Post Date first
  });

  it('maxPerUrl <= 0 means no cap', () => {
    const stranded: StrandedPinRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: 100 + i,
      postUrl: 'https://musthavemods.com/sims-4-plants-cc/',
      postDate: `2025-05-0${i + 1}`,
    }));
    const sessions7dRows: Ga4LandingRow[] = [{ host: 'musthavemods.com', path: '/sims-4-plants-cc/', sessions: 116 }];
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows: [],
      minSessions7d: 50,
      maxPerUrl: 0,
    });
    expect(result.destinations[0].ids).toHaveLength(5);
  });

  it('pool size is reported regardless of drops', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
    });
    expect(result.poolRows).toBe(stranded.length);
  });
});

describe('toIdsFilePackage', () => {
  it('produces the destinations[].ids shape revive-stranded-pins.py parse_ids_file reads', () => {
    const { stranded, sessions7dRows, sessions28dRows } = fixture();
    const result = rankDestinations({
      strandedRows: stranded,
      sessions7dRows,
      sessions28dRows,
      minSessions7d: 50,
      maxPerUrl: 10,
      skipHosts: ['blog.musthavemods.com'],
    });
    const pkg = toIdsFilePackage(result, { generated: '2026-09-22' }) as {
      generated: string;
      destinations: Array<{ path: string; ids: number[] }>;
    };
    expect(pkg.generated).toBe('2026-09-22');
    expect(Array.isArray(pkg.destinations)).toBe(true);
    expect(pkg.destinations[0]).toHaveProperty('ids');
    expect(pkg.destinations[0]).toHaveProperty('path');
    // every id present in the package must be a plain integer (parse_ids_file rejects non-integers)
    for (const d of pkg.destinations) {
      for (const id of d.ids) {
        expect(Number.isInteger(id)).toBe(true);
      }
    }
  });
});

describe('renderMarkdownTable', () => {
  it('renders one row per destination plus a meta block, with no destinations still valid', () => {
    const result = rankDestinations({
      strandedRows: [],
      sessions7dRows: [],
      sessions28dRows: [],
      minSessions7d: 50,
      maxPerUrl: 10,
    });
    const md = renderMarkdownTable(result, { window: '2026-09-14..2026-09-20' });
    expect(md).toContain('| Destination |');
    expect(md).toContain('window');
    expect(md).toContain('Dropped: 0 destination(s)');
  });
});
