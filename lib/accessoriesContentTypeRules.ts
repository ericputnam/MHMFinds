/**
 * The `accessories` content type, decided from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-10-13, E200)
 * ----------------------------------------------
 * On 2026-10-13 the `accessories` facet held 891 rows, of which 178 (20.0%)
 * carried an accessories word in the title. Its top 24 by downloads included
 * Elf Bar Vape, SimDa Dating App, MC Command Center, Kiddie Pool, Mortem
 * Realistic Deaths, More Traits in CAS, Breakfast Foods and a skinpack.
 *
 * The writer was NOT the detector. Replaying `detectContentType(title,
 * description)` over the 713 untitled rows reproduces `accessories` on 19 of
 * them (`resolveIngestContentType` with the URL category: 21). The rest came
 * from the legacy `category` backfill (deprecated column, code deleted
 * 2026-01-20): 395 untitled rows carry `category = 'CAS - Accessories'`, 204
 * carry `'Other'`, 54 `'Hair'` (real hairstyles), 25 `'CAS - Clothing'`. That
 * writer is dead, so the repair is a one-off data pass
 * (`scripts/retag-junk-build-facets.ts --accessories-untitled`). The rule is
 * also made title-only, so that the 19–21 rows the live detector can still
 * produce from post prose (a blog post's description is shared by every
 * mod scraped from it) stop being produced.
 *
 * Rule: the keywords below are matched against the TITLE only (`titleOnly` on
 * the `KeywordRule`). A row whose title names nothing is decided by the blog
 * post's URL category at ingest (`/sims-4-accessories-cc/` and also
 * `/jewelry/` map to accessories in `mhmScraperUtils.ts`) or is NULL. Pattern:
 * `lib/lotContentTypeRules.ts`, `lib/holidaysContentTypeRules.ts`.
 *
 * KEPT (inherited, unchanged): measured over all 16,833 titles on 2026-10-13
 * as "titles matching / typed accessories / title-only detector answers
 * accessories" — accessory 68/21/37 (the rest are outfit sets the higher
 * clothing rules win: tops 11, full-body 10, hair 8), bag 65/41/58 (poses 8 —
 * "Bag Poses"; the pose rule wins), handbag 3/1/3, purse 6/5/6, backpack
 * 11/7/9, belt 44/6/29 (full-body 13, bottoms 12 — "Belted Dress" style sets
 * the higher rules already win), scarf 41/28/29, scarves 1/1/1, gloves
 * 40/36/38, watch 30/5/27 (23 rows sit in a separate `watches` value no rule
 * emits — left alone, see ideas-inbox), socks 40/12/32, tights 34/13/30.
 * The singular/plural pairs are harmless here: `matchedKeywordsIn` collapses
 * them by stem, so a pair never counts as two pieces of evidence.
 *
 * NOT ADDED — measured, real accessories, but pinned by id rather than turned
 * into rules (title-only detector answer for them today is not accessories):
 *   - 'leg warmer'  28/21 — its own inbox item (E193 pinned the post's rows).
 *   - 'veil'        15/1   — dresses 4, full-body 4 (bridal sets).
 *   - 'stockings'   21/8   — full-body 4, dresses 3, furniture 2 (Christmas stockings).
 *   - 'mask'        56/7   — skin 9, eyes 6, full-body 5 (face masks, skincare, eye masks).
 *   - 'headphones'  14/2   — full-body 8 (outfits shot wearing them).
 *   - 'bonnet' 6/3, 'braces' 3/2, 'earmuff' 10/1, 'garter' 5/2, 'wings' 23/6,
 *     'bow' 49/2, 'tie' 15/1, 'tote' 4/2, 'clutch' 3/1 — too few or mostly
 *     another type; a wrong rule pollutes a facet, a missing one leaves NULL.
 *   - 'umbrella', 'mittens', 'fan', 'cane', 'wallet', 'suspenders': 0 typed accessories.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (the `accessories` rule),
 * `scripts/retag-junk-build-facets.ts --accessories-untitled`, and
 * `__tests__/unit/accessories-content-type-rules.test.ts`.
 */

export const ACCESSORIES_CONTENT_TYPE = 'accessories' as const;

/** Whole-word title evidence for an accessory. Unchanged from the pre-E200 rule. */
export const ACCESSORIES_TITLE_KEYWORDS: string[] = [
  'accessory', 'accessories', 'bag', 'bags', 'handbag', 'purse', 'backpack',
  'belt', 'scarf', 'scarves', 'gloves', 'watch', 'watches', 'socks', 'tights',
];

/** Measured and not added (see header). Tested so none creeps in unmeasured. */
export const ACCESSORIES_NOT_ADDED_TITLE_KEYWORDS: readonly string[] = [
  'leg warmer', 'veil', 'stockings', 'mask', 'headphones', 'bonnet', 'braces',
  'earmuff', 'garter', 'wings', 'bow', 'tie', 'tote', 'clutch',
];

const ACCESSORIES_TITLE_PATTERN = new RegExp(
  `\\b(?:${ACCESSORIES_TITLE_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:s|es)?\\b`,
  'i',
);

/** True iff the title alone carries an accessories word (the same words the detector's rule uses). */
export function isAccessoriesTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return ACCESSORIES_TITLE_PATTERN.test(title);
}
