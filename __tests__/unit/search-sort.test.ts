/**
 * A search ranks by relevance unless the visitor picked a sort. The grid used
 * to default to "Most downloaded" even while searching, and /api/mods skips
 * relevance ranking under that sort, so "center" put Center Stage (an exact
 * title match with 1 download) near the bottom of 418 results.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { defaultSortFor, effectiveSort, sortParamFor } from '../../lib/searchSort';

describe('grid sort defaults', () => {
  it('browsing defaults to most downloaded, searching to best matches', () => {
    expect(effectiveSort(null, '')).toBe('downloads');
    expect(effectiveSort(null, '   ')).toBe('downloads');
    expect(effectiveSort(null, 'center')).toBe('relevance');
    expect(defaultSortFor(undefined)).toBe('downloads');
  });

  it("the visitor's choice always wins", () => {
    expect(effectiveSort('downloads', 'center')).toBe('downloads');
    expect(effectiveSort('newest', '')).toBe('newest');
  });

  it('writes a sort param only when it differs from the default', () => {
    expect(sortParamFor(null, 'center')).toBeNull();
    expect(sortParamFor('relevance', 'center')).toBeNull();
    expect(sortParamFor('downloads', '')).toBeNull();
    expect(sortParamFor('downloads', 'center')).toBe('downloads');
    expect(sortParamFor('relevance', '')).toBe('relevance');
  });
});

describe('/api/mods', () => {
  // The default sort only helps if the API still ranks by relevance when no
  // sortBy is sent. Comments are stripped so a quoted pattern cannot match.
  const src = readFileSync(path.join(__dirname, '../../app/api/mods/route.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('ranks a search by relevance when sortBy is not downloads, rating or title', () => {
    expect(src).toMatch(/useRelevanceScoring\s*=\s*searchTerm\s*&&\s*sortBy !== 'downloadCount'/);
  });
});

describe('HomePageClient', () => {
  const src = readFileSync(path.join(__dirname, '../../app/HomePageClient.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('derives its sort from effectiveSort, with no hard-coded downloads default', () => {
    expect(src).toContain('effectiveSort(chosenSort, searchQuery)');
    expect(src).not.toMatch(/searchParams\.get\('sort'\)\s*\|\|\s*'downloads'/);
  });
});
