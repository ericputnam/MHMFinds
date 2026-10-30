/**
 * Collection links for a creator page (E292, Sage, 2026-10-30).
 *
 * Until this shipped, the ~527 /creator/[slug]/ pages (4,072 GSC impressions
 * and 103 clicks in the 28 days to 10-27, six of them at positions 7–10 with
 * 185–400 impressions each) carried no link to any /games/sims-4/* collection
 * hub. URL Inspection on 10-30 showed the hubs' only referring URLs were other
 * hubs (skin-details ← body-presets; hair-cc ← kids-cc, male-clothes), and the
 * top creator page (/creator/orchiona/) was last crawled 2026-09-24 with the
 * creators sitemap as its only referrer. The four hubs sitting at positions
 * 20–37 with 400–930 impressions (skin-details 22.8, female-clothes 20.6,
 * male-clothes 20.4, hair-cc 37.1) had nothing on the site pointing at them
 * except each other.
 *
 * This resolves, on the server, which collections a creator's mods actually
 * appear in — the same in-memory membership test the mod page uses for its
 * breadcrumb (`getCollectionLinksForMod`, which mirrors `buildWhereClause`),
 * so a creator page only ever links to a hub that lists at least one of that
 * creator's mods. Ranked by how many of the creator's mods the hub holds, so
 * the first link is the hub the creator is best known for.
 *
 * Pure: no I/O. `__tests__/unit/creator-hub-links.test.ts` covers it.
 */

import { getCollectionLinksForMod, type CollectionLink, type ModFacetInput } from './collections';

/** A collection link plus how many of the creator's listed mods sit in it. */
export interface CreatorHubLink extends CollectionLink {
  /** Number of the creator's page mods this collection lists. */
  count: number;
}

/** How many hubs a creator page links to at most — a row, not a directory. */
export const MAX_CREATOR_HUBS = 4;

/**
 * Collections the creator's mods live in, most-populated first.
 *
 * Ties keep the order the first mod produced them (registry order within the
 * mod page's specificity tiers), so the result is deterministic for a given
 * mod list. Mods with no collection contribute nothing; a creator whose mods
 * match no collection gets an empty list and the page renders no row.
 */
export function creatorHubLinks(
  mods: ReadonlyArray<ModFacetInput>,
  max: number = MAX_CREATOR_HUBS,
): CreatorHubLink[] {
  const byHref = new Map<string, CreatorHubLink>();
  for (const mod of mods) {
    for (const link of getCollectionLinksForMod(mod)) {
      const existing = byHref.get(link.href);
      if (existing) {
        existing.count += 1;
      } else {
        byHref.set(link.href, { ...link, count: 1 });
      }
    }
  }
  // Map preserves insertion order, which is the tie-break; sort is stable.
  return Array.from(byHref.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, max));
}
