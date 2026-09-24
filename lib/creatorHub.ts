/**
 * Pure helpers for the /creator/ hub (Nova, E97, 2026-09-24). No server
 * imports so the guard test can exercise them without Prisma, and so a
 * page file never has to export anything Next.js does not allow.
 */

/** Cards in the hub's "most downloaded" rail. */
export const TOP_CREATORS = 24;

export interface HubRow {
  slug: string;
  mods: number;
  downloads: number;
}

/** Most downloads first; ties broken by mod count. */
export function rankByDownloads<T extends HubRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.downloads - a.downloads || b.mods - a.mods);
}

/** The DOM id of a letter's section; "#" (digits/other) → "other". */
export function letterAnchorId(letter: string): string {
  return `creators-${letter === '#' ? 'other' : letter.toLowerCase()}`;
}

/**
 * Group by first character of the slug; digits and anything non-alpha go
 * under "#", which sorts last. Rows inside a letter are A→Z by slug.
 */
export function groupByLetter<T extends { slug: string }>(rows: T[]): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const c = r.slug.charAt(0);
    const key = /[a-z]/.test(c) ? c.toUpperCase() : '#';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  // Array.from: tsconfig targets ES5, so Map iterators cannot be for-of'd directly.
  for (const list of Array.from(groups.values())) list.sort((a: T, b: T) => a.slug.localeCompare(b.slug));
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });
}
