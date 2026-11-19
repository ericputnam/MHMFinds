/**
 * Title rules for the `career` content type — custom careers, active careers
 * and career packs (Rowan, E438, 2026-11-19).
 *
 * Pure data + functions, no I/O, so a test can import the real constants.
 * Same shape as `lib/uiPresetRules.ts`: the detector derives the type from
 * the TITLE alone and never from a description. A blog post's description is
 * shared by every mod scraped from it ("…for your Sim's bakery career…"), so
 * a description rule would tag counters and clutter as careers — which is
 * exactly how "Bakery Career", "Nurse Career" and "Banker Career" ended up in
 * `decor`, and "Personal Trainer Career" and "Boxing Career" in `workout`.
 *
 * WHY: `career` has been in FACET_VALUES.contentType since the taxonomy was
 * written and held 8 rows on 2026-11-19, while the keyword detector's
 * `gameplay-mod` rule (priority 15, keyword `career`) had typed 32 career
 * titles `gameplay-mod` and description inference had scattered 15 more
 * across decor / workout / furniture / clutter / full-body / NULL. The legacy
 * article `/sims-4-career-mods/` landed 1,421 sessions in 28d (GA4 organic +
 * AI + referral, 10-22→11-18) with no browse hub behind it. The career-mods
 * collection (`lib/collections.ts`) filters on this one value, and the
 * gameplay-mods hub keeps `career` in its `contentTypeIn`, so a row moving
 * gameplay-mod → career leaves no page.
 *
 * Measured against every SFW Sims 4 title (17,328 rows) on 2026-11-19:
 *   KEPT
 *   - career | careers   56 titles: 32 gameplay-mod, 8 career, 6 decor,
 *     3 workout, 2 furniture, 2 full-body, 1 script-mod, 1 clutter, 1 NULL.
 *     53/56 are career mods by title; the other 3 are vetoed below.
 *   REJECTED as writer words (hits / hits that are a career mod)
 *   - 'job(s)'            12 / 9 — the 9 are teen-job career packs, but 2 are
 *                         decor ("Drop Out of Highschool and Get A Real Job")
 *                         and "Teen Jobs Collection" ×2 are NULL round-up rows
 *                         with nothing to download; 7 of the 9 already say
 *                         "career" too. Not worth the false positives.
 *   - 'active career'     3 / 3, all contain "career" already — a second
 *                         spelling of one word double-counts its evidence.
 *   - 'freelance(r)'      2 / 2, both contain "career" already.
 *   - 'side hustle'       1 / 1, a gameplay-mod rule keyword; left there.
 *   - 'work'              8 / 1 (a work-from-home career tweak that also says
 *                         "career"); the rest are overalls, clutter, a pack.
 *   - 'profession', 'occupation', 'employment', 'salary'   0 titles each.
 *   VETO words (a career-titled row that is CC, by hits among the 56)
 *   - 'uniform'   1 / 1 off-type: "Careers – Police Uniform Male" (full-body)
 *   - 'earrings'  1 / 1 off-type: "Careers – DNA Gold Earrings" (typed
 *                 full-body; really jewelry — a single hand fix, not this rule)
 *   - 'lot'       1 / 1 off-type: "Career Lot: Police Department" (a lot,
 *                 typed furniture — likewise a single hand fix)
 *   - 'outfit', 'dress', 'wear'   0 hits today; kept because the detector's
 *                 gameplay-mod rule already names them as career-themed CC
 *                 negatives ("Doctor Career Outfit", "Career Day Dress").
 *   VETO words REJECTED
 *   - 'set'       3 / 0 off-type: "Ultimate Teen Career Set", "Teen Job
 *                 Career Set", "Sims 4 Teen Jobs Career Set" are all packs of
 *                 eight teen careers (descriptions read 2026-11-19). The
 *                 detector's `'career set'` negative keyword was written on
 *                 the opposite assumption; this rule runs before it.
 *   - 'pose', 'clothes', 'cc', 'hair', 'build', 'clutter', 'decor'   0 hits
 *                 among career titles.
 */

export const CAREER_CONTENT_TYPE = 'career';

/**
 * Whole-word "career" or "careers". No other spelling earns the type — see
 * the rejections above — and the plural is one optional letter, not a second
 * listed keyword.
 */
export const CAREER_TITLE_PATTERN = /\bcareers?\b/i;

/**
 * A career-titled row that is really CC: a uniform, an earring, a lot, or
 * career-themed clothing. Whole words; "Careers – Police Uniform Male" is the
 * row that motivated it.
 */
export const CAREER_OFF_TYPE_PATTERN = /\b(?:uniforms?|earrings?|lots?|outfits?|dress(?:es)?|wear)\b/i;

/** True iff the title alone names a career mod. */
export function isCareerTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return CAREER_TITLE_PATTERN.test(title) && !CAREER_OFF_TYPE_PATTERN.test(title);
}

/**
 * The content type a row should carry given its title and current type.
 * - title names a career (and no CC veto word) → `career`
 * - typed `career` but the title does not say so → `null` (NULL beats a
 *   wrong tag; a row we cannot place drops out of every facet)
 * - otherwise → unchanged (a vetoed title keeps whatever it has — the
 *   uniform stays full-body; the lot's wrong `furniture` is a separate fix)
 */
export function applyCareerContentType(current: string | null, title: string | null | undefined): string | null {
  if (isCareerTitle(title)) return CAREER_CONTENT_TYPE;
  if (current === CAREER_CONTENT_TYPE) return null;
  return current;
}
