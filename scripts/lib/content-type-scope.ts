/**
 * Which rows a `retag-junk-build-facets.ts` run may load, by current
 * contentType (Rowan, 2026-10-12, E193).
 *
 * WHY: `contentType: { in: facets }` can never match a NULL row, so a
 * hand-audited pin on a NULL row (e.g. the 11 untyped rows of
 * /sims-4-leg-warmers-cc/) had no apply path. `retag-null-content-types.ts`
 * is the wrong tool: it has no `--ids=` and re-detects all ~860 NULL rows.
 *
 * The literal token `null` in `--facets=` selects NULL rows too, and ONLY
 * together with `--ids=` — the mode where every id must already carry a
 * hand-audited pin (enforced by the caller). A facet-wide pass over NULL
 * rows from here would be title-only re-detection of the whole NULL
 * population, which is exactly what this file refuses.
 *
 * Data only: no imports, no I/O, so it can be unit-tested.
 */

export const NULL_FACET_TOKEN = 'null';

export type ContentTypeScope =
  | { contentType: { in: string[] } }
  | { OR: Array<{ contentType: { in: string[] } } | { contentType: null }> };

/** Throws if `null` is named without `--ids=`. */
export function assertNullFacetNeedsIds(facets: string[], ids: string[] | null): void {
  if (facets.includes(NULL_FACET_TOKEN) && (!ids || ids.length === 0)) {
    throw new Error(
      '--facets=null is only allowed with --ids= (hand-audited rows). ' +
        'A facet-wide pass over NULL rows would re-detect the whole NULL population.',
    );
  }
}

/** Prisma `where` fragment for the facets named (with `null` meaning contentType IS NULL). */
export function contentTypeScope(facets: string[]): ContentTypeScope {
  const named = facets.filter(f => f !== NULL_FACET_TOKEN);
  if (!facets.includes(NULL_FACET_TOKEN)) return { contentType: { in: named } };
  return { OR: [{ contentType: { in: named } }, { contentType: null }] };
}
