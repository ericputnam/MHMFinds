/**
 * E412 (Sage, 2026-11-15) — "Popular Sims 4 guides" on the homepage, a
 * randomized internal-link test on WordPress guides in Google's striking
 * distance.
 *
 * Why: in GSC 2026-10-16→11-12, 290 single posts sat at average position
 * 8–20 with 25,555 impressions and 896 clicks (3.5% CTR). Most of them get no
 * link from any Next.js page: the 106 hrefs in lib/collections.ts
 * (`blogUrl` + `guides`, Pip's E375/E376 treated sets among them) cover 43 of
 * the 290. The homepage is the site's strongest page (599 Google clicks and
 * ~1,000 Bing sessions in 28d), and its collections slot is server-rendered,
 * so a link here is in the first-paint HTML a crawler reads.
 *
 * Design: the pool is the 40 highest-impression striking posts that
 * (a) are Sims 4, (b) have no Next.js inbound link from lib/collections.ts, and
 * (c) are suitable for the homepage (adult / Wicked Whims posts excluded, and
 * the near-duplicate `/sims-4-male-sim-download/` + `/sims-4-male-sims-download/`
 * pair excluded because they cannibalize each other). Sorted by impressions and
 * paired consecutively (1–2, 3–4, …); in each pair sha256('E412:' + first
 * path) even → the first is treated, else the second. That stratifies the arms
 * on demand: treatment 4,074 impr / 141 clk / pos 12.5 vs control 3,989 / 129
 * / 12.1 (GSC 10-16→11-12).
 *
 * Only TREATMENT is linked. CONTROL is kept here so the grader reads both arms
 * from one constant; never link a control path from anywhere on the site
 * while E412 runs (asserted by __tests__/unit/home-guides.test.tsx).
 *
 * GA4 organic landing sessions 2026-10-17→11-13 (secondary read): treatment
 * Bing 1,387 + Google 284 = 1,671; control Bing 1,812 + Google 432 = 2,244.
 * Arms were balanced on GSC impressions, not on Bing, so read sessions as
 * difference-in-differences only.
 *
 * Read on 2026-12-01 (GSC 11-16→11-29 vs 11-01→11-14, both arms): keep if the
 * treatment's clicks ratio beats control's by ≥15% relative and its
 * impression-weighted position improves by ≥1.0 more than control's;
 * otherwise remove the block. Homepage session RPM must stay ≥95% of its
 * 7-day baseline throughout (Rio).
 */

export interface HomeGuide {
  /** Relative apex path with a trailing slash (trailingSlash: true). */
  href: string;
  /** Hand-written link text. Never derived from the slug. */
  label: string;
}

export const E412_SALT = 'E412';

/** Treated: linked from the homepage block, in pool (impression) order. */
export const HOME_GUIDES: readonly HomeGuide[] = [
  { href: '/cas-fulleditmode-not-working/', label: 'Fix cas.fulleditmode not working' },
  { href: '/sims-4-magic-mods/', label: 'Magic and witch mods' },
  { href: '/sims-4-social-media-mods/', label: 'Social media mods for influencers' },
  { href: '/sims-4-superhero-cc/', label: 'Superhero CC' },
  { href: '/sims-4-phone-mods/', label: 'Phone mods' },
  { href: '/sims-4-male-cc-creators/', label: 'Male CC creators to follow' },
  { href: '/sims-4-korean-cc/', label: 'Korean CC' },
  { href: '/sims-4-phone-replacements/', label: 'Phone replacements' },
  { href: '/sims-4-braids-cc/', label: 'Braids CC' },
  { href: '/sims-4-gothic-furniture-cc/', label: 'Gothic furniture CC' },
  { href: '/sims-4-gloves-cc/', label: 'Gloves CC' },
  { href: '/sims-4-police-cc/', label: 'Police CC' },
  { href: '/sims-4-freckles-cc/', label: 'Freckles and mole CC' },
  { href: '/sims-4-eye-patch-cc/', label: 'Eye patch CC' },
  { href: '/sims-4-belly-piercing/', label: 'Belly piercing CC' },
  { href: '/sims-4-y2k-cc-finds-for-2025/', label: 'Y2K CC' },
  { href: '/sims-4-horror-mods/', label: 'Horror mods' },
  { href: '/sims-4-travel-mods/', label: 'Travel mods' },
  { href: '/sims-4-prison-cc/', label: 'Prison CC' },
  { href: '/how-to-download-sims-4-house/', label: 'How to download a Sims 4 house' },
];

/** Control: never linked while E412 runs. Same pool, the other member of each pair. */
export const HOME_GUIDES_CONTROL: readonly string[] = [
  '/sims-4-male-skin-details/',
  '/sims-4-animations/',
  '/sims-4-alpha-hair-cc/',
  '/how-to-use-sims-4-sliders/',
  '/sims-4-tennis-cc/',
  '/sims-4-police-mods/',
  '/sims-4-male-shoes-cc/',
  '/sims-4-acne-cc/',
  '/sims-4-masks-cc/',
  '/sims-4-chest-tattoos/',
  '/sims-4-overalls-cc/',
  '/sims-4-map-replacement-mods/',
  '/sims-4-baking-cc/',
  '/sims-4-summer-cc/',
  '/sims-4-off-the-grid-cc/',
  '/sims-4-morning-routine-mods/',
  '/sims-4-lamps-cc/',
  '/sims-4-pixie-cut-cc/',
  '/sims-4-punk-cc/',
  '/sims-4-plastic-surgery-mods/',
];

/**
 * The pairs exactly as randomized, [higher-impression, lower-impression].
 * Lets the test recompute the assignment from the salt instead of trusting
 * the two lists above. Impression ties are ordered by path.
 */
export const E412_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['/sims-4-male-skin-details/', '/cas-fulleditmode-not-working/'],
  ['/sims-4-magic-mods/', '/sims-4-animations/'],
  ['/sims-4-alpha-hair-cc/', '/sims-4-social-media-mods/'],
  ['/sims-4-superhero-cc/', '/how-to-use-sims-4-sliders/'],
  ['/sims-4-phone-mods/', '/sims-4-tennis-cc/'],
  ['/sims-4-police-mods/', '/sims-4-male-cc-creators/'],
  ['/sims-4-korean-cc/', '/sims-4-male-shoes-cc/'],
  ['/sims-4-phone-replacements/', '/sims-4-acne-cc/'],
  ['/sims-4-braids-cc/', '/sims-4-masks-cc/'],
  ['/sims-4-gothic-furniture-cc/', '/sims-4-chest-tattoos/'],
  ['/sims-4-gloves-cc/', '/sims-4-overalls-cc/'],
  ['/sims-4-map-replacement-mods/', '/sims-4-police-cc/'],
  ['/sims-4-freckles-cc/', '/sims-4-baking-cc/'],
  ['/sims-4-summer-cc/', '/sims-4-eye-patch-cc/'],
  ['/sims-4-belly-piercing/', '/sims-4-off-the-grid-cc/'],
  ['/sims-4-morning-routine-mods/', '/sims-4-y2k-cc-finds-for-2025/'],
  ['/sims-4-horror-mods/', '/sims-4-lamps-cc/'],
  ['/sims-4-pixie-cut-cc/', '/sims-4-travel-mods/'],
  ['/sims-4-punk-cc/', '/sims-4-prison-cc/'],
  ['/how-to-download-sims-4-house/', '/sims-4-plastic-surgery-mods/'],
];
