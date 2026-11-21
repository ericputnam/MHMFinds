/**
 * Which order the mod grid uses when the visitor has not picked one.
 *
 * Browsing defaults to "Most downloaded". A search defaults to "Best matches"
 * (relevance): /api/mods only ranks by relevance when no sort is sent, so a
 * search sorted by downloads buried exact title matches under popular mods
 * that merely mention the word. "center" put Center Stage (1 download)
 * near the bottom of 418 results (11-11).
 *
 * A sort the visitor picks always wins, with or without a search.
 */
export type GridSort = 'downloads' | 'newest' | 'rating' | 'relevance';

export function defaultSortFor(search: string | null | undefined): GridSort {
  return (search ?? '').trim() ? 'relevance' : 'downloads';
}

/** The sort to apply: the visitor's choice, else the default for the search. */
export function effectiveSort(chosen: string | null | undefined, search: string | null | undefined): string {
  return chosen || defaultSortFor(search);
}

/** The `sort` URL param to write, or null when it is the default anyway. */
export function sortParamFor(chosen: string | null | undefined, search: string | null | undefined): string | null {
  return chosen && chosen !== defaultSortFor(search) ? chosen : null;
}
