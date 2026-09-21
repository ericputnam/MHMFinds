/**
 * Age-group rules, derived from the mod TITLE only.
 *
 * Why this file exists (Nova, 2026-09-21)
 * ---------------------------------------
 * `Mod.ageGroups` was populated by `extractFacetsFromKeywords()` in
 * `lib/services/aiFacetExtractor.ts`, which did a bare `text.includes(keyword)`
 * over `title + description + tags` against a map that contained two- and
 * three-letter keywords. Two of them were catastrophic as substrings:
 *
 *   'ya'  -> young-adult   matches Ra**ya**n, Ken**ya**, ro**ya**l, To**nya**
 *   'tot' -> toddler       matches **tot**al, pho**tot**, **tot**e
 *
 * and `'baby' -> infant` matched the *aesthetic* use of the word ("Baby Face
 * Kit" is an adult lips preset with 2,878 downloads; "Baby Hairs N02" is an
 * adult edges hair). On top of that, this repo's scraped `description` is
 * shared by every mod lifted from one blog post, so any description-derived
 * facet contaminates a whole post's worth of rows at once (the same failure
 * mode cleaned out of `lighting` on 09-08, `gameplay-mod` on 09-10, `jewelry`
 * on 09-18 and `nails` on 09-20).
 *
 * Result on 2026-09-21: of the 752 SFW Sims 4 rows carrying infant / toddler /
 * child, only **45.6 %** had a kid word anywhere in the title — "Nike Af1" was
 * infant+elder, "MC Command Center" was child, "Mid-Century Modern Villa" was
 * child — while **363 rows that plainly say so in the title** ("Functional
 * Infant Cribs", 473 downloads; "Skin CC for Toddlers & Infants", 341; "Aravels
 * Kids Bedroom") carried no kid tag at all.
 *
 * So: titles only, whole words only, and prefer *no* tag to a guess. A missing
 * tag drops a mod out of one facet; a wrong tag pollutes that facet for
 * everyone.
 *
 * This module is the single source of truth for those rules. It is imported by
 * `lib/services/aiFacetExtractor.ts` (so a future run of
 * `scripts/deploy-facets-safely.ts` cannot re-poison the column),
 * `scripts/retag-age-groups.ts`, and `__tests__/unit/age-group-rules.test.ts` —
 * the test imports these constants rather than restating them, so the guard and
 * the behaviour cannot drift apart.
 */

export const AGE_GROUPS = [
  'infant',
  'toddler',
  'child',
  'teen',
  'young-adult',
  'adult',
  'elder',
  'all-ages',
] as const;

export type AgeGroupValue = (typeof AGE_GROUPS)[number];

/**
 * The three ages this module is authoritative for. Everything else
 * (teen / young-adult / adult / elder / all-ages) is listed below for the
 * keyword extractor's benefit but is deliberately *not* rewritten by
 * `scripts/retag-age-groups.ts` — see `applyKidAxis()`.
 */
export const KID_AGE_GROUPS: readonly AgeGroupValue[] = ['infant', 'toddler', 'child'];

/**
 * Titles where a kid word appears but the mod is not kid content. All four are
 * real rows in the catalog on 2026-09-21; "Child Birth Mod" has 1,383 downloads
 * and would otherwise have been the top card of the kids collection page.
 */
export const AGE_NEGATIVE_TITLE_CONTEXTS: RegExp =
  /child\s*birth|birth\s*control|baby\s*shower|try\s*for\s*(?:a\s*)?baby/i;

/**
 * Whole-word title patterns per age group.
 *
 * Candidate keywords measured against all 16,418 SFW Sims 4 titles on
 * 2026-09-21 and REJECTED, with their counts, so nobody re-proposes them:
 *
 *   baby      71 titles — mostly adjectival/brand: "Baby Face Kit" (adult lips
 *                         preset, 2,878 dl), "Baby Hairs N02" (adult edges),
 *                         "Baby Brows Set", "Y2K Baby Headphones",
 *                         "Baby Monster Hairstyle", "Less Success for Try for
 *                         Baby" (gameplay). Genuine infant rows in this set all
 *                         also say "infant".
 *   babies     5 titles — 4 are gameplay mods *about* babies ("Ghosts Can Have
 *                         Babies", "Babies for everyone"), not CC for infants.
 *   newborn    3 titles — 2 are pose packs, 1 a headband that also says infant.
 *   tot / tots 1 title  — and as a substring it is the original bug ("total").
 *   ya         —         the young-adult abbreviation; pure substring poison.
 *   girl(s)   99 titles — "Pretty Girl Tattoo Set", "Nova Girls Collection"
 *                         (skin), "Fire Girl Gets a Haircut", "Urban Girl Set".
 *   boy(s)    46 titles — "American Boy Body Preset", "California Boy Pose
 *                         Pack", "Baby Mermaid & The Sailor Boy CC Pack".
 *   nursery   44 titles — all genuine, but a nursery is a *room*, not a sim
 *                         age; this column answers "which ages can use this".
 *   onesie    11 titles — 1 is adult loungewear ("VIP Crewneck Full Onesie").
 *   crib       5 titles — 4 already say infant or toddler; 1 net new row.
 *   junior     2 titles — 1 is "Junior Cheer", a pose pack.
 *   little    38 titles — "Little Darkling House", "Little Vampire Castle".
 *   mini      98 titles — mini dresses and mini skirts.
 *
 * Never list a singular and a plural as two patterns: `(?:s)?` inside one
 * alternation keeps one word from counting as two pieces of evidence (the
 * 09-08 `light`/`lights` double-count).
 */
export const AGE_TITLE_PATTERNS: ReadonlyArray<readonly [AgeGroupValue, RegExp]> = [
  ['infant', /\binfants?\b/i],
  ['toddler', /\btoddlers?\b/i],
  ['child', /\b(?:child|childs|childrens?|kids?|kiddies?)\b/i],
  ['teen', /\b(?:teens?|teenagers?)\b/i],
  ['young-adult', /\byoung[\s-]adults?\b/i],
  // "young adult" must not also score a bare `adult`.
  ['adult', /(?<!young[\s-])\badults?\b/i],
  ['elder', /\b(?:elders?|elderly|seniors?)\b/i],
  ['all-ages', /\ball[\s-]ages\b/i],
];

/** Every age group a title supports, whole-word, negatives applied. */
export function ageGroupsFromTitle(title: string): AgeGroupValue[] {
  if (!title) return [];
  if (AGE_NEGATIVE_TITLE_CONTEXTS.test(title)) return [];
  return AGE_TITLE_PATTERNS.filter(([, re]) => re.test(title)).map(([age]) => age);
}

/** Just the infant / toddler / child subset of the above. */
export function kidAgeGroupsFromTitle(title: string): AgeGroupValue[] {
  return ageGroupsFromTitle(title).filter((a) =>
    (KID_AGE_GROUPS as readonly string[]).includes(a),
  );
}

/**
 * Rewrite ONLY the infant / toddler / child axis of an existing `ageGroups`
 * array, preserving every other value in its original order.
 *
 * Deliberately narrow. The same substring bug also produced 4,897 rows carrying
 * the identical blanket combo `adult,elder,teen,young-adult` and 417 carrying
 * `teen,elder`; those are almost certainly description boilerplate too, but
 * they are a separate population with a separate blast radius and no page
 * depending on them, so they are left alone and recorded here instead of being
 * swept up in a repair nobody asked for.
 */
export function applyKidAxis(existing: readonly string[], title: string): string[] {
  const preserved = existing.filter(
    (a) => !(KID_AGE_GROUPS as readonly string[]).includes(a),
  );
  const kid = kidAgeGroupsFromTitle(title);
  // Keep a stable order: preserved values first (unchanged), then the kid axis
  // in AGE_GROUPS order, so a no-op comparison is a plain array compare.
  return [...preserved, ...kid];
}

/** True when `applyKidAxis` would change the row. Order-insensitive. */
export function kidAxisChanges(existing: readonly string[], title: string): boolean {
  const before = [...existing].filter((a) =>
    (KID_AGE_GROUPS as readonly string[]).includes(a),
  );
  const after = kidAgeGroupsFromTitle(title);
  if (before.length !== after.length) return true;
  const b = [...before].sort();
  const a = [...after].sort();
  return b.some((v, i) => v !== a[i]);
}
