/**
 * The `bathroom` room theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-09-26, E112)
 * ----------------------------------------------
 * `Mod.themes` gets its room themes from `detectRoomThemes()` in
 * `lib/services/contentTypeDetector.ts`, whose `ROOM_THEME_RULES` ran a bare
 * `String.includes(keyword)` over the title and then over the DESCRIPTION.
 * This repo's scraped `description` is shared by every mod lifted from one
 * blog post, so one "for your sims' bathroom" sentence tagged a whole post's
 * worth of rows. `bathroom` was the last room theme still on that rule, after
 * `bedroom` (09-24, `lib/bedroomThemeRules.ts`) and `kitchen` (09-25,
 * `lib/kitchenThemeRules.ts`) — this file has the bedroom shape: strong words
 * that are never vetoed, plus weak words that a veto list can overrule.
 *
 * Result on 2026-09-26: 456 SFW Sims 4 rows carried `bathroom`; only 154
 * (33.8%) had even the old keywords in the title — and 24 of those were baby
 * and bridal *showers*. Card #1 was Wicked Whims (2,239 downloads, a script
 * mod), #2 "Functional Skincare Mod", then "Love Language Mod", "Pregnancy
 * Test & Birth Control Clutter", a beard, a tube-top dress and whole-house
 * lots ("MM Modern House 155"). The substring `tub` also matched "Tube".
 *
 * The other detector, `THEME_KEYWORDS` in `lib/services/aiFacetExtractor.ts`,
 * cannot emit `bathroom` as a theme: `bathroom` is a *contentType* there, and
 * `validateThemes()` filters AI output to `FACET_VALUES.themes`, which does
 * not contain it. The guard test asserts that stays true.
 *
 * So: titles only, whole words only, prefer *no* tag to a guess.
 *
 * Candidate words measured against the whole SFW Sims 4 catalog (16,478 rows)
 * on 2026-09-26 — title hits, then what they turned out to be. Rejected ones
 * are listed so nobody re-proposes them without new numbers:
 *   STRONG (never vetoed)
 *   - 'bathroom'       92 — every one a bathroom set / clutter / decor; the
 *                     glasses/makeup/tops/lashes rows are bathroom sets with a
 *                     wrong contentType ("Cutie Bathroom" typed glasses, "Sims
 *                     4 Bathroom Furniture Mod" typed lashes is a shower wall)
 *   - 'bathtub' 1, 'washroom' 1, 'restroom' 1 ("Public Restroom Set"),
 *     'powder room' 1 (wallpaper), 'bidet' 2 (both also say bathroom/shower)
 *   - 'toilet'          2 ("Toilet Rug Set 3", "Toilet Door Recolor" = nine
 *                       restroom door signs for community lots)
 *   - 'towel rack'      1 ("Hövolm Wooden Towel Racks"; a bare 'towel' would
 *                       one day catch a beach towel)
 *   WEAK (a veto word overrules them)
 *   - 'shower'         48 — only 21 are showers. 24 are baby/bridal shower
 *                       events, venues, pose packs and decor; the rest are
 *                       "Shower Cap Hat Conversion", "Shower Talk Poses",
 *                       "Shower Tweaks", "Shower Woohoo Tweaks" (gameplay).
 *   - 'bath'            9 — 6 genuine; "Cuddle and Bath Together" (598 dl,
 *                       would have been card #1) and "Quick Shower and Quick
 *                       Bath" are interaction mods, "Bath & Body Works Candle"
 *                       is a brand.
 *   - 'tub'             7 — 3 are hot tubs (outdoor / spa, not bathroom) and
 *                       one is a protein-powder tub.
 *   REJECTED
 *   - 'sink'            3: an outdoor well, "Kuhnå Sink Item" (kitchen or
 *                       bath — the creator does not say, so NULL), and sink
 *                       clutter that already says Bathroom.
 *   - 'vanity'         12: hairstyles ("Vanity Locs"), a Hello Kitty dress,
 *                       bedroom vanities. Not one is bathroom-only.
 *   - 'spa'             9: nail recolors, salons, a pet spa, a hot tub.
 *   - 'laundry' 3 (laundry rooms), 'sauna' 1, 'en-suite' 1 (a bedroom),
 *     'soap' 1 ("Soap Brows"), 'towel' 1 (see 'towel rack'),
 *     'toothbrush' 1 (an interaction mod), 'bathing' 1 ("Men's Bathing Suit
 *     Recolor" — swimwear; also why 'bath' is a whole word, never a prefix).
 *   - 'jacuzzi' 0, 'toiletry' 0, 'shampoo' 0, 'bathrobe' 0, 'basin' 0,
 *     'faucet' 0, 'loo' 0, 'wc' 0, 'hamper' 0, 'medicine cabinet' 0.
 *   VETO (overrules a WEAK word only), read off the shower/bath/tub rows:
 *   - baby, bridal     — shower *events* (all 24 carry one of the two)
 *   - cap, pose        — "Shower Cap Hat Conversion", "Shower Talk Poses"
 *   - tweak, woohoo, cuddle, quick — interaction / gameplay mods
 *   - hot tub, protein, body works
 *
 *   Rows whose DESCRIPTION says bathroom but whose title does not are
 *   stripped on purpose, including skincare clutter and skincare gameplay
 *   mods. Titles only.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest cannot
 * re-poison the theme), `scripts/retag-bathroom-theme.ts`, and
 * `__tests__/unit/bathroom-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const BATHROOM_THEME = 'bathroom' as const;

/** Strong whole-word title evidence: never vetoed. One entry per word; `s?` covers the plural. */
export const BATHROOM_STRONG_TITLE_PATTERN =
  /\b(?:bath[- ]?rooms?|bath[- ]?tubs?|washrooms?|restrooms?|powder rooms?|bidets?|toilets?|towel[- ]?racks?)\b/i;

/** Weak evidence: a bare bath / shower / tub. Enough only without a veto word. */
export const BATHROOM_WEAK_TITLE_PATTERN = /\b(?:baths?|showers?|tubs?)\b/i;

/** Title words that make a weak word mean something other than bathroom CC. */
export const BATHROOM_VETO_TITLE_PATTERN =
  /\b(?:bab(?:y|ies)|bridal|caps?|poses?|tweaks?|woohoo|cuddles?|quick|hot[- ]?tubs?|protein|body works)\b/i;

export function isBathroomTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  if (BATHROOM_STRONG_TITLE_PATTERN.test(title)) return true;
  return BATHROOM_WEAK_TITLE_PATTERN.test(title) && !BATHROOM_VETO_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the bathroom element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyBathroomTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== BATHROOM_THEME);
  return isBathroomTitle(title) ? [...without, BATHROOM_THEME] : without;
}
