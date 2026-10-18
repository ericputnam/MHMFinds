import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizeCatalogInflow, formatCatalogInflow, type InflowRow } from '@/lib/funnel/catalogInflow';

// The population behind the 2026-10-18 scoreboard row "New mods 7d (prior 7d): 80 (130)"
// (DB read 2026-10-18 10:43Z, Mod.sourceUrl × createdAt; E232). Ingest timestamps are the
// morning runs of catalog-ingest-daily.sh.
const NOW = new Date('2026-10-18T10:43:56Z');
const POST = 'https://musthavemods.com/';
function rows(url: string, at: string, n: number): InflowRow[] {
  return Array.from({ length: n }, () => ({ sourceUrl: POST + url + '/', createdAt: new Date(at) }));
}
const READ_10_18: InflowRow[] = [
  // last 7d: 4 posts, 80 rows
  ...rows('sims-4-halloween-mods', '2026-10-12T10:35:00Z', 10),
  ...rows('sims-4-halloween-cc-finds-for-2026', '2026-10-14T10:35:00Z', 32),
  ...rows('sims-4-halloween-loading-screens', '2026-10-14T10:35:00Z', 17),
  ...rows('sims-4-cowboy-hat-cc', '2026-10-16T10:36:00Z', 21),
  // prior 7d: 5 posts, 130 rows
  ...rows('sims-4-blanket-cc', '2026-10-07T12:56:00Z', 29),
  ...rows('sims-4-trench-coat-cc', '2026-10-07T12:56:00Z', 26),
  ...rows('sims-4-arm-warmers', '2026-10-07T12:56:00Z', 23),
  ...rows('sims-4-leg-warmers-cc', '2026-10-10T12:07:00Z', 27),
  ...rows('sims-4-y2k-cc-finds-for-2026', '2026-10-10T12:07:00Z', 25),
  // older than 14d: must be ignored
  ...rows('sims-4-fall-furniture-cc', '2026-10-04T10:36:00Z', 1),
  ...rows('sims-4-cottage-houses', '2026-09-26T10:42:00Z', 27),
];

describe('summarizeCatalogInflow (E232)', () => {
  it('reproduces the 2026-10-18 scoreboard counts and adds the post denominator', () => {
    const s = summarizeCatalogInflow(READ_10_18, NOW);
    expect(s.newMods7d).toBe(80);
    expect(s.newModsPrior7d).toBe(130);
    expect(s.posts7d).toBe(4);
    expect(s.postsPrior7d).toBe(5);
    expect(s.perPost7d).toBe(20);
    expect(s.perPostPrior7d).toBe(26);
  });

  it('uses the same window edges as the old prisma counts (gte now-7d; gte now-14d lt now-7d)', () => {
    const edge7 = new Date(NOW.getTime() - 7 * 864e5);
    const edge14 = new Date(NOW.getTime() - 14 * 864e5);
    const s = summarizeCatalogInflow([
      { sourceUrl: 'a', createdAt: edge7 }, // exactly 7d ago → last 7d (gte)
      { sourceUrl: 'b', createdAt: new Date(edge7.getTime() - 1) }, // just before → prior 7d
      { sourceUrl: 'c', createdAt: edge14 }, // exactly 14d ago → prior 7d (gte)
      { sourceUrl: 'd', createdAt: new Date(edge14.getTime() - 1) }, // just before → ignored
      { sourceUrl: 'e', createdAt: NOW }, // now → ignored (createdAt < now)
      { sourceUrl: 'f', createdAt: new Date(NOW.getTime() + 60_000) }, // future → ignored
    ], NOW);
    expect(s.newMods7d).toBe(1);
    expect(s.newModsPrior7d).toBe(2);
  });

  it('counts a null sourceUrl row as a mod but not as a post', () => {
    const s = summarizeCatalogInflow([
      { sourceUrl: null, createdAt: new Date(NOW.getTime() - 864e5) },
      { sourceUrl: POST + 'x/', createdAt: new Date(NOW.getTime() - 864e5) },
      { sourceUrl: POST + 'x/', createdAt: new Date(NOW.getTime() - 2 * 864e5) },
    ], NOW);
    expect(s.newMods7d).toBe(3);
    expect(s.posts7d).toBe(1);
    expect(s.perPost7d).toBe(3);
  });

  it('reports null per-post when a window has no posts (never divides by zero)', () => {
    const s = summarizeCatalogInflow([], NOW);
    expect(s).toEqual({ newMods7d: 0, newModsPrior7d: 0, posts7d: 0, postsPrior7d: 0, perPost7d: null, perPostPrior7d: null });
  });
});

describe('formatCatalogInflow', () => {
  it('prints the 10-18 row with the denominator beside the raw count', () => {
    expect(formatCatalogInflow(summarizeCatalogInflow(READ_10_18, NOW)))
      .toBe('80 from 4 posts, 20.0/post (130 from 5, 26.0/post)');
  });

  it('prints an em dash per post for an empty window and singular "post"', () => {
    expect(formatCatalogInflow({ newMods7d: 0, newModsPrior7d: 7, posts7d: 0, postsPrior7d: 1, perPost7d: null, perPostPrior7d: 7 }))
      .toBe('0 from 0 posts, —/post (7 from 1, 7.0/post)');
  });
});

describe('scoreboard wiring', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8');

  it('prints the New mods row through formatCatalogInflow, not a bare count pair', () => {
    expect(src).toMatch(/import \{[^}]*formatCatalogInflow[^}]*\} from '\.\.\/\.\.\/lib\/funnel\/catalogInflow'/);
    expect(src).toMatch(/\| New mods 7d \(prior 7d\) \| \$\{db\.ok \? formatCatalogInflow\(/);
  });

  it('keeps the newMods7d / newModsPrior7d JSON fields (funnel-history reads them)', () => {
    expect(src).toMatch(/newMods7d: db\.ok \? db\.data\.newMods7d : null/);
    expect(src).toMatch(/newModsPrior7d: db\.ok \? db\.data\.newModsPrior7d : null/);
  });
});
