/**
 * Collection Pages Registry
 *
 * Defines the curated topic-based landing pages at
 * `/games/[game]/[topic]`. Each collection is a pre-filtered view
 * of the mod finder matching a Pinterest-friendly search intent,
 * with editorial intro, related collections, and a structured-data
 * ItemList for AI search surfaces.
 *
 * See tasks/prd-revenue-pivot/PRD-revenue-pivot.md for the full
 * strategic plan. These 10 collections are Initiative 1 of the
 * Revenue Pivot.
 *
 * Topic counts were verified against the prod DB on 2026-04-09 via
 * `scripts/phase0-gate0-facet-counts.ts`. Counts here are the
 * expected floor — actual queries may return more as the database
 * grows.
 */

import type { Prisma } from '@prisma/client';

/**
 * A facet query is a structured Prisma where-clause fragment that
 * will be merged into the base query (`gameVersion: 'Sims 4'` etc.)
 * by the collection page renderer.
 *
 * Using a structured object instead of raw Prisma WhereInput lets
 * us validate it statically and serialize it safely.
 */
export type CollectionFacetQuery = {
  /** Single contentType value (e.g., "hair") */
  contentType?: string;
  /** Multiple contentTypes OR'd together (e.g., ["tops", "bottoms"]) */
  contentTypeIn?: string[];
  /** Visual style (single) */
  visualStyle?: string;
  /** Themes that MUST all be present (AND) */
  themesAll?: string[];
  /** At least one of these themes must be present (OR via hasSome) */
  themesAny?: string[];
  /** At least one of these gender options */
  genderOptionsAny?: string[];
  /** At least one of these age groups */
  ageGroupsAny?: string[];
  /** At least one of these occult types (e.g., ["vampire"]) */
  occultTypesAny?: string[];
};

export type CollectionDefinition = {
  /** URL slug under /games/[game]/ */
  slug: string;
  /** Game this collection belongs to (matches gameVersion in DB) */
  game: string;
  /** Game slug for URL building (matches lib/gameRoutes.ts GAME_SLUGS key) */
  gameSlug: string;
  /** Short title for nav, cards, breadcrumbs */
  title: string;
  /** H1 on the collection page */
  heading: string;
  /** <title> tag / OG title */
  metaTitle: string;
  /** <meta description> */
  metaDescription: string;
  /** One-line tagline shown under the heading */
  tagline: string;
  /**
   * Editorial intro — 200-400 words. Phase 1 ships with a
   * placeholder; Phase 2 replaces with humanizer-generated copy
   * voice-matched to the blog.
   */
  intro: string;
  /** Facet query that filters the mod DB to this topic */
  filter: CollectionFacetQuery;
  /** Expected floor mod count from Phase 0 Gate 0 audit */
  expectedCount: number;
  /**
   * Slugs of related collections for internal linking — exactly three, and
   * this is a *graph*, not a per-page list. `related` is the only topical
   * link between collection pages (the homepage block, the `/games/[game]/`
   * hub and the `/mods/[id]` breadcrumbs link to all of them equally), and
   * until 2026-09-19 it was only ever maintained outbound: `female-clothes`
   * had collected 12 of the 63 edges while `body-presets`, `witch-cc`,
   * `loading-screens` and `jewelry-cc` had **zero** inbound links.
   *
   * When you add a collection or edit this array, add the new page to the
   * `related` of a topically adjacent collection too.
   * `__tests__/unit/collection-link-graph.test.ts` enforces the inbound side
   * (min 2, max 8, no tail hanging off an under-linked source).
   */
  related: string[];
  /**
   * Optional cross-link to the legacy blog article covering the same
   * topic. Part of the legacy-vs-collection differentiation strategy
   * (2026-07-03): the blog article keeps the editorial "best X" list
   * intent, the collection page targets browse/filter intent, and the
   * two cross-link instead of competing. Relative path (same domain —
   * legacy pages are WordPress proxied at the apex by middleware.ts).
   */
  blogUrl?: string;
};

/**
 * Sims 4 collection topics. Finalized 2026-04-09 after Phase 0
 * Gate 0 audit. Three topics swapped from the original list:
 *   - Trait mods → Holidays/Seasonal (trait facet empty in prod)
 *   - Urban tattoos → Tattoos (streetwear theme too thin)
 *   - Woohoo mods → Poses (ad policy risk + thin pool)
 */
export const SIMS4_COLLECTIONS: CollectionDefinition[] = [
  {
    slug: 'pregnancy-mods',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Pregnancy Mods',
    heading: 'Sims 4 Pregnancy Mods & CC',
    metaTitle: 'Sims 4 Pregnancy Mod Finder — Browse 100+ Maternity CC | MustHaveMods',
    metaDescription:
      'Browse every Sims 4 pregnancy mod and maternity CC find in one place. Filter belly overlays, maternity clothes, and gameplay tweaks, sorted by downloads.',
    tagline: 'Maternity clothes, gameplay tweaks, and realistic belly CC',
    intro:
      'Vanilla Sims 4 pregnancy is fine for five minutes. After that you notice the morning-sickness animation loops twice and the belly overlay is basically a beach ball. If you want your pregnancy storylines to actually feel like something — morning sickness that changes how your sim moves, a maternity wardrobe that doesn\'t cap out at three recolored tees, or a belly mesh that grows in more than two stages — you need mods.\n\nThis collection pulls together the pregnancy and maternity CC we keep coming back to. Gameplay tweaks like Lumpinou\'s RPO expansion and MC Command Center get most of the attention, but the maternity wardrobe picks are where the collection really earns its place. Belly overlays from creators like NoirSims and Elza rework what pregnancy actually looks like on a sim, and the maternity dresses pull from MM and alpha creators so you can stay in whatever art style you already build around.\n\nEverything here is filtered to Sims 4 only, checked for a working download link, and skipped if it\'s flagged NSFW. Sort by downloads if you want the mods everyone already trusts, or scroll for the smaller finds that the big listicles miss.',
    filter: {
      // Pregnancy facet doesn't exist yet — Phase 1a adds it and
      // backfills the ~115 keyword-matching mods. Until then this
      // uses a temporary title/description keyword filter that the
      // server component handles explicitly (see buildWhereClause).
      // The "pregnancy" magic value below is intercepted there.
      contentType: '__pregnancy_keyword__',
    },
    expectedCount: 115,
    // skin-details -> kids-cc (2026-09-21): pregnancy is the one topic whose
    // visitors reliably need the *next* thing, and skin-details was the most
    // linked page in the graph at 7 inbound.
    related: ['body-presets', 'poses', 'kids-cc'],
    // Consolidated 2026-07-03 (legacy article 301'd here), un-redirected
    // 2026-09: Google refused this page as the canonical and indexed the
    // blog-subdomain copy of the article instead (pos 10.95, 93 clicks
    // per 28d) while this page sat at pos 33 with 2 clicks. Same call as
    // body-presets — DIFFERENTIATED pair, reciprocal link below.
    blogUrl: '/sims-4-pregnancy-mods/',
  },
  {
    slug: 'holidays-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Holidays & Seasonal CC',
    heading: 'Sims 4 Holiday & Seasonal CC',
    metaTitle: 'Sims 4 Holiday CC Finder — Browse 900+ Seasonal Mods | MustHaveMods',
    metaDescription:
      'Browse every Sims 4 holiday and seasonal CC find in one filterable grid — Christmas, Halloween, Valentine\'s, and Easter decor, clothes, and gameplay sorted by downloads.',
    tagline: 'Christmas, Halloween, Easter, and every season in between',
    intro:
      'Seasons expansion gave us weather. It did not give us holiday CC. If you want a sim house that actually looks like December — garland on the banister, a tree with presents that aren\'t recolored vanilla meshes, a dining table that reads "Thanksgiving" instead of "generic spread" — you need community CC.\n\nThis collection is the biggest one we run: nearly a thousand mods spanning Christmas decor, Halloween costumes and yard setups, Valentine\'s clutter, Easter decor, and the summer/fall seasonal pieces people forget exist. Creators like Syboubou, Felixandre, and HarrieCC come up a lot here, but the strength of the Sims holiday scene is really the volume of smaller builders shipping one good pumpkin set or one good Hanukkah table a year.\n\nUse it as a seasonal swap — archive half of it in the spring, swap back in October. The grid is sorted by downloads first, so the evergreen picks rise to the top, and seasonal one-offs live further down for the specific occasion you\'re building for.',
    filter: {
      // 'holidays' is a real contentType in the prod DB (926 mods)
      // even though it's not in seed-facet-definitions.ts. Logged
      // in PRD backlog as seed/reality drift to fix later.
      contentType: 'holidays',
    },
    expectedCount: 926,
    // 'furniture' was a dangling slug until 2026-09-07 (the real slug is
    // 'furniture-cc'); the renderer silently dropped it.
    related: ['clutter', 'halloween-cc', 'witch-cc'],
    blogUrl: '/sims-4-holiday-mods/',
  },
  {
    slug: 'clutter',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Clutter & CC Finds',
    heading: 'Sims 4 Clutter CC',
    metaTitle: 'Sims 4 Clutter CC Finder — Browse 140+ Finds | MustHaveMods',
    metaDescription:
      'Browse Sims 4 clutter CC in one filterable grid — books, trinkets, kitchen bits, and shelf essentials sorted by downloads, with verified links only.',
    tagline: 'Books, trinkets, and the tiny details that make a build',
    intro:
      'Clutter is what separates a finished build from a staged one. A shelf without stacked books looks empty. A kitchen counter without coffee mugs, a half-eaten bagel, and the one random takeout menu looks like a showroom. Vanilla Sims 4 gives you maybe a dozen usable clutter meshes. The community has made thousands.\n\nWe lean heavily on the usual build suspects here — Felixandre, Pierisim, HeyHarrie, and Severinka\'s sets pop up repeatedly because their clutter reads at the size Sims 4 cameras actually see. But the finds further down the grid are where it gets interesting: single-set releases from creators who built one perfect witch altar or one perfect apothecary shelf and then disappeared for a year.\n\nFilter by theme on the main mod finder if you want clutter that matches the room you\'re already building. Everything in this collection is live-link checked and cleared of the NSFW flag, so you can grab anything from the grid without vetting the link.',
    filter: { contentType: 'clutter' },
    expectedCount: 148,
    // 'furniture' and 'decor' were dangling slugs until 2026-09-07 — the
    // renderer silently drops related entries that don't resolve, so this
    // page rendered exactly one related collection instead of three.
    // 2026-09-25: 'furniture-cc' → 'kitchen-cc' — kitchen clutter is the
    // second-largest slice of the kitchen grid (furniture-cc keeps 5 inbound:
    // decor-cc, cottagecore-cc, kids-cc, bedroom-cc, kitchen-cc).
    related: ['kitchen-cc', 'holidays-cc', 'decor-cc'],
    blogUrl: '/sims-4-clutter/',
  },
  {
    slug: 'decor-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Decor CC',
    heading: 'Sims 4 Decor CC',
    metaTitle: 'Sims 4 Decor CC Finder — Browse 700+ Finds | MustHaveMods',
    metaDescription:
      'Browse 700+ Sims 4 decor CC finds in one filterable grid — wall art, posters, plants, rugs, and full room decor sets sorted by downloads, links checked.',
    tagline: 'Wall art, posters, plants, and rugs that finish a room',
    intro:
      'There is a specific moment in every Sims 4 build where the walls are up, the furniture is placed, and the room still looks like a showroom nobody has ever walked through. Decor is what fixes it. Not the sofa — the thing above the sofa. The rug under it. The plant in the corner that stops the room reading as a rectangle with objects in it.\n\nBase-game decor is the weakest catalog in Build mode by a distance. There are maybe a dozen paintings worth using, four plants, and rugs that all look like the same rug rotated. This collection pulls together over 700 decor finds across the four categories that actually change how a room reads: wall art and posters (including override sets that replace EA\'s paintings wholesale), plants — the potted, hanging, and oversized-monstera variety that builders lean on constantly — rugs, and general room decor sets that ship as a themed bundle.\n\nThe strongest picks here tend to be the full sets rather than single objects, because decor works by density: one poster looks like a mistake, six posters look like a person lives there. Room-decor bundles from the aesthetic-CC end of the community show up near the top of the grid for exactly that reason, alongside the mural and canvas sets that give kids\' rooms and studios something other than the default landscape print.\n\nDecor sits between the clutter and furniture collections and works best stacked with both — clutter for the small surface details, furniture for the anchor pieces, decor for the walls and floors that tie them together. Everything in the grid is Sims 4 only, link-checked, and filtered to SFW. Sort by downloads for the sets everyone already uses, or scroll for the smaller single-set finds the big roundups never get to.',
    filter: {
      // decor (600) + plants (62) + rugs (39) + wall-art (30) = 731 SFW
      // Sims 4 mods, verified against prod 2026-09-07. 'lighting' and
      // 'curtains' were deliberately left out: both facets are badly
      // mis-tagged (the top 'lighting' rows include a GShade preset, a
      // skin overlay and a police car), so including them would put
      // obvious junk at the top of the grid.
      contentTypeIn: ['decor', 'plants', 'rugs', 'wall-art'],
    },
    expectedCount: 731,
    related: ['clutter', 'furniture-cc', 'holidays-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial
    // "best decor CC" intent, this page owns browse/filter intent.
    // Verified live and not redirected on 2026-09-07.
    blogUrl: '/sims-4-decor-cc/',
  },
  {
    slug: 'hair-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Hair CC',
    heading: 'Sims 4 Hair CC',
    metaTitle: 'Sims 4 Hair CC Finder — Browse 1,700+ Styles | MustHaveMods',
    metaDescription:
      'Browse 1,700+ Sims 4 hair CC picks in one filterable finder — alpha, maxis match, curly, braids, buns, and short cuts sorted by downloads.',
    tagline: 'Alpha, maxis match, and every style in between',
    intro:
      'Hair is where most Sims 4 CC journeys start, and for good reason — the base game has maybe six hairstyles you can look at without flinching. Everything else gets a recolor pass and that\'s the wardrobe.\n\nThe 1,700+ hair CC picks in this collection split roughly in half between alpha (Simpliciaty, Anto, Stealthic territory — shiny, high-detail, the aesthetic most gameplay YouTubers use) and maxis match (Sentate, SimStrouds, Aharris00britney — matches EA\'s art style without sticking out). We also pulled in the curly and textured hair creators worth knowing by name — NaevysSims and Ebonix come up constantly because they\'re some of the few people shipping hair that actually looks like Black hair instead of a texture slapped on a straight mesh.\n\nSort by downloads for the known quantities and scroll for the less-obvious picks. Every hair in the collection is Sims 4 specifically — no cross-game mixups — and the grid is filtered to verified, SFW mods only.',
    filter: { contentType: 'hair' },
    expectedCount: 1780,
    // skin-details -> kids-cc (2026-09-21): hair is the biggest category
    // inside the kids grid (164 of 686), so this is the strongest topical
    // edge available, and skin-details keeps 5 inbound without it.
    related: ['kids-cc', 'female-clothes', 'male-clothes'],
    blogUrl: '/sims-4-hairstyles-cc/',
  },
  {
    slug: 'tattoos',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Tattoos',
    heading: 'Sims 4 Tattoo CC',
    metaTitle: 'Sims 4 Tattoo CC Finder — Browse 100+ Designs | MustHaveMods',
    metaDescription:
      'Browse Sims 4 tattoo CC in one filterable grid — sleeves, back pieces, small minimal ink, and full body coverage sorted by downloads.',
    tagline: 'Sleeves, back pieces, small ink, and full coverage',
    intro:
      'Sims 4 ships with a handful of tattoos that haven\'t been updated since 2014. They look it. If you want ink that actually reads as a real design at CAS distance — a fine-line flower on the collarbone, a sleeve that wraps properly, a single small piece that doesn\'t pixelate when you zoom in — you need community tattoo CC.\n\nThis collection is smaller than the hair or clothing grids (about a hundred mods) because tattoo CC is a narrower niche, but it\'s one of the categories where the drop in quality between vanilla and community content is most obvious. Creators like Pralinesims, Sims3Melancholic, and remussirion have basically carried the scene for years.\n\nYou\'ll find sleeves, back pieces, small minimalist ink, and a handful of full-body sets. If you build story-heavy sims, tattoos are one of the cheapest character-building details you can add — a single well-chosen piece communicates more about a sim than half the traits panel.',
    filter: { contentType: 'tattoos' },
    expectedCount: 107,
    related: ['skin-details', 'jewelry-cc', 'female-clothes'],
    blogUrl: '/sims-4-tattoos/',
  },
  {
    slug: 'skin-details',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Skin Details',
    heading: 'Sims 4 Skin Details CC',
    // Head-term title: the legacy article /sims-4-cc-skin-details/
    // 301s here (2026-07-03), so this page owns the query.
    metaTitle: 'Sims 4 Skin Details CC — 270+ Overlays & Freckles | MustHaveMods',
    metaDescription:
      'Browse Sims 4 skin details, overlays, freckles, moles, and body blush CC in one filterable grid — sorted by downloads, link-checked, no dead pages.',
    tagline: 'Overlays, freckles, moles, and body blush for realism',
    intro:
      'Skin details are the CAS layer most people skip and then wonder why their sims look slightly uncanny. Vanilla skin is flat. No freckles, no moles, no cheek blush that actually sits on the face, no body hair that looks like anything other than a shadow. Community skin overlays fix all of this with a few CAS clicks.\n\nWe\'ve pulled together about 275 skin detail picks: full skin overlays that replace the base texture, freckle maps, mole placement sets, nose bridge details, cheek blushes, body hair, pregnancy stretch marks, and the specialty stuff like aging details and sunspots. Pralinesims and Obscurus-Sims turn up a lot here because they\'ve been shipping realistic skin overlays for years, but there\'s a long tail of smaller skin creators doing great work on specific features.\n\nMost of these stack — you can layer a skin overlay, freckles, a blush, and a nose detail all on one sim. The trick is stopping before you over-CAS them into looking like a different art style than the hair and clothes you\'re using.',
    filter: { contentType: 'skin' },
    expectedCount: 276,
    related: ['hair-cc', 'tattoos', 'body-presets'],
    // NOT /sims-4-cc-skin-details/ — that article 301s here. The
    // skin-overlay article is the still-live editorial companion.
    blogUrl: '/sims-4-skin-overlay/',
  },
  {
    // Deliberately placed BEFORE male-clothes / female-clothes. Both of
    // those are composite `contentTypeIn` filters that already include
    // `shoes`, and `filterSpecificity()` scores all three the same, so
    // registry order decides which collection a shoe mod gets as its
    // primary breadcrumb. "Shoes CC" is the more accurate crumb for a
    // pair of boots than "Female Clothes CC", and it gives the new page
    // ~633 inbound internal links from mod detail pages on day one.
    slug: 'shoes-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Shoes CC',
    heading: 'Sims 4 Shoes CC',
    metaTitle: 'Sims 4 Shoes CC Finder — Browse 600+ Heels, Sneakers & Boots | MustHaveMods',
    metaDescription:
      'Browse 600+ Sims 4 shoes CC in one filterable grid — heels, sneakers, boots, sandals, and kids\' shoes sorted by downloads, with verified download links.',
    tagline: 'Heels, sneakers, boots, and sandals for every sim',
    intro:
      'Shoes are the last thing you pick in CAS and the first thing that ruins an outfit. Base-game Sims 4 footwear is a short list of chunky sandals, two pairs of sneakers that look like the same sneaker, and heels with a mesh that clips through half the community pants CC people actually wear. Once you have a wardrobe built out of downloaded tops and bottoms, EA shoes stop matching anything.\n\nThis collection is every pair of Sims 4 shoes CC in our catalog in one filterable grid — 633 finds as of today. The split is roughly 137 boots, 71 heels, 66 sneakers, and 47 sandals, plus slides, loafers, slippers, and a surprisingly deep bench of toddler and child shoes (86 pairs tagged for kids, which is more than the base game gives you across every age).\n\nThe creators who show up most are the ones who have basically specialised in footwear: Madlen, whose heels and boots are the reason half the Sims fashion screenshots on Tumblr look the way they do, Mermalade for sneakers and everyday shoes, Arltos, Jius-sims, LVNDRCC, and Dissia. Streetwear sneakers — Jordans, Air Force 1s, Converse Run Star Hikes, ASICS Gel-1130s — are their own micro-scene here and consistently sit near the top of the download counts.\n\nA practical note: shoes are the CC category most likely to clip. Alpha-style heels rarely sit right on a maxis-match body preset, and platform boots and wide-leg pants argue with each other constantly. Use the main finder\'s visual-style filter to stay inside one art style, and check the creator\'s notes for a required slider or HQ mod before you install a set.\n\nEverything in this grid is Sims 4 only, checked for a working download link, and filtered to SFW. Sort by downloads for the pairs everyone already has installed, or scroll for the single-set releases the big roundups never reach.',
    filter: {
      // 633 SFW Sims 4 mods on the `shoes` facet, verified against prod
      // 2026-09-13. Spot-checked: the top 15 by downloads and a 15-row
      // sample from the middle of the grid are all genuinely footwear —
      // unlike `hats` / `glasses` / `accessories`, which are badly
      // mis-tagged (top `hats` rows include a Coach bag, two hairstyles
      // and a kitchen set) and are deliberately not paged yet.
      contentType: 'shoes',
    },
    expectedCount: 633,
    related: ['y2k-cc', 'male-clothes', 'hair-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial
    // "best shoes CC" intent, this page owns browse/filter intent.
    // /sims-4-shoes-cc/ is live and does not 301 (verified 2026-09-13);
    // it holds 445 impressions / 1 click at position 37.7 over the 28d
    // to 2026-09-10, so it is not a page this collection can cannibalise.
    blogUrl: '/sims-4-shoes-cc/',
  },
  {
    slug: 'male-clothes',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Male Clothes CC',
    heading: 'Sims 4 Male Clothes CC',
    // Head-term title: the legacy article /sims-4-male-clothes-cc/
    // 301s here (2026-07-03), so this page owns the query.
    metaTitle: 'Sims 4 Male Clothes CC — 400+ Outfits & Streetwear | MustHaveMods',
    metaDescription:
      'The best Sims 4 male clothes CC. Streetwear, formal, casual, and everyday outfits for male sims from top creators.',
    tagline: 'Streetwear, formal, casual, and everything in between',
    intro:
      'Male Sims 4 CC has a reputation problem that isn\'t really its fault: the creator scene skews toward feminine fashion because that\'s where the download counts are, so the male side ends up feeling thinner. It\'s not thinner so much as harder to find. This collection does the hunting.\n\nThe 400+ picks here pull from the creators who actually take male CAS seriously — Darte77, Rona Sims, Sentate\'s male lines, Magnolia-C, and Aharris00britney\'s menswear pieces. Expect streetwear (hoodies, oversized tees, cargo shorts, chunky sneakers), tailored formalwear that doesn\'t look like it was clipped out of the base game, and casual sets built around real outfits instead of "shirt tucked into jeans" for the hundredth time.\n\nThe filter here is composite: any tops, bottoms, dresses, full-body outfits, or shoes tagged for masculine sims. Because gender options in Sims 4 CC are frequently mis-tagged, a handful of "unisex" pieces show up too — which is honestly where some of the best menswear lives.',
    filter: {
      contentTypeIn: ['tops', 'bottoms', 'dresses', 'full-body', 'shoes'],
      genderOptionsAny: ['masculine'],
    },
    expectedCount: 420,
    related: ['female-clothes', 'shoes-cc', 'hair-cc'],
    // No blogUrl: /sims-4-male-clothes-cc/ 301s here (2026-07-03).
  },
  {
    slug: 'female-clothes',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Female Clothes CC',
    heading: 'Sims 4 Female Clothes CC',
    // Head-term title: the legacy article /sims-4-female-clothes-cc/
    // 301s here (2026-07-03), so this page owns the query.
    metaTitle: 'Sims 4 Female Clothes CC — 1,600+ Outfits & Dresses | MustHaveMods',
    metaDescription:
      'Over 1,600 Sims 4 female clothes CC picks. Dresses, tops, bottoms, full outfits, and shoes for every style.',
    tagline: 'Dresses, tops, bottoms, outfits, and shoes',
    intro:
      'Female Sims 4 CC is the deepest category in the whole community. There\'s more of it than anyone could ever install, which means the real problem isn\'t "is there CC for this?" — it\'s "which of the 400 options for a cropped cardigan is actually worth downloading?"\n\nThis collection runs past 1,600 picks and still feels curated, because we sort by what people are actually downloading and filter out the mis-tagged, the broken-link, and the NSFW-flagged submissions. You\'ll find the big creators — Rimings, Trillyke, Sentate, Pipco, Simstrouds, Madlen for shoes — plus a lot of mid-tier names whose dresses and tops stack up with anything in the top downloads list.\n\nThe filter is composite: tops, bottoms, dresses, full-body outfits, and shoes tagged feminine. Use this as a starting surface and lean on the main mod finder\'s visual-style and theme filters if you want to narrow to alpha CC, maxis match, goth, streetwear, or whatever aesthetic you\'re building toward.',
    filter: {
      contentTypeIn: ['tops', 'bottoms', 'dresses', 'full-body', 'shoes'],
      genderOptionsAny: ['feminine'],
    },
    expectedCount: 1601,
    related: ['male-clothes', 'shoes-cc', 'hair-cc'],
    // No blogUrl: /sims-4-female-clothes-cc/ 301s here (2026-07-03).
  },
  {
    slug: 'furniture-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Furniture CC',
    heading: 'Sims 4 Furniture CC',
    metaTitle: 'Sims 4 Furniture CC Finder — Browse 900+ Build & Buy Finds | MustHaveMods',
    metaDescription:
      'Browse 900+ Sims 4 furniture CC finds in one filterable grid — sofas, beds, dining sets, shelves, and statement pieces sorted by downloads.',
    tagline: 'Sofas, beds, shelves, and statement pieces',
    intro:
      'If you\'ve ever tried to build a cohesive living room with just base-game furniture, you already know the problem: every sofa looks like every other sofa, and the "design" options are a color swatch. Furniture CC is what turns Sims 4 Build mode from a chore into the reason people actually play.\n\nThis is a 900+ mod collection covering the full stack: sofas and armchairs, beds, dining sets, shelves, desks, kitchen islands, vanities, outdoor seating, and the statement pieces (clawfoot tubs, chesterfield couches, old-world wardrobes) that anchor a whole room. The heavy hitters here are the build CC creators everyone knows — Felixandre, Pierisim, HarrieCC, Myshunosun, and Syboubou — because they\'ve been shipping cohesive sets for long enough that you can build an entire house from a single creator\'s catalog.\n\nSort by downloads for the already-popular picks, or scroll for smaller sets that pair well with the staples. Everything here is Sims 4 specifically, verified, and SFW — grab what you want and go build.',
    filter: { contentType: 'furniture' },
    expectedCount: 901,
    // holidays-cc -> kids-cc (2026-09-21): nurseries, cribs and kid bedrooms
    // are 39 of the kids grid and 58 of it is furniture. holidays-cc keeps 2
    // inbound (clutter, decor-cc), the floor.
    // 2026-09-24: 'clutter' → 'bedroom-cc' so the new page has an anchored
    // inbound source (clutter keeps 2 inbound: decor-cc, holidays-cc).
    // 2026-09-25: 'kids-cc' → 'kitchen-cc' so the new page has an anchored
    // inbound source (kids-cc keeps 3 inbound: pregnancy-mods, hair-cc,
    // bedroom-cc).
    related: ['bedroom-cc', 'kitchen-cc', 'decor-cc'],
    blogUrl: '/sims-4-furniture-cc/',
  },
  {
    slug: 'body-presets',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Body Presets',
    heading: 'Sims 4 Body Presets',
    metaTitle: 'Sims 4 Body Preset Finder — Browse 130+ CAS Presets | MustHaveMods',
    metaDescription:
      'Browse every Sims 4 body preset in one place. Filter 130+ realistic, curvy, plus-size, athletic, and male presets by style and sort by downloads.',
    tagline: 'Curvy, plus-size, athletic, and male presets for realistic sims',
    intro:
      'CAS sliders will only take a sim\'s body so far. Vanilla Sims 4 bodies converge on the same two or three silhouettes no matter how long you drag, because the sliders move a handful of regions and leave the rest alone. Body presets fix this at the mesh level: one click in CAS and the whole body shape changes — hip-to-waist ratios the sliders can\'t reach, shoulders that actually vary, soft bodies that look like people instead of mannequins.\n\nThis collection pulls together 130+ body presets across the full range: curvy and plus-size presets (consistently the most-downloaded category), athletic and muscular builds, male body presets — chronically under-served in CAS content — and the subtle "slightly more realistic than vanilla" presets that you\'ll end up applying to half your saves. Presets are also the cheapest diversity tool in the game: a household where every sim shares the same body reads as generated; one where bodies actually vary reads as written.\n\nTwo tips before you download: presets stack with skin details (a body preset plus a skin overlay is the standard realism combo — see the skin details collection), and most presets are found under the body type icons in CAS, not in a catalog category, so check the creator\'s install note if you can\'t find one in-game.',
    filter: { contentType: 'body-preset' },
    expectedCount: 139,
    related: ['skin-details', 'pregnancy-mods', 'male-clothes'],
    // The four legacy body-preset listicles were un-redirected (2026-07
    // revert — they outrank this page) and are now DIFFERENTIATED pairs.
    blogUrl: '/sims-4-body-presets/',
  },
  {
    slug: 'goth-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Goth CC',
    heading: 'Sims 4 Goth CC',
    metaTitle: 'Sims 4 Goth CC — 150+ Dark & Alt Finds | MustHaveMods',
    metaDescription:
      'The best Sims 4 goth CC. Dark clothing, alt hair, dramatic makeup, and gothic decor for your alternative sims.',
    tagline: 'Dark clothing, alt hair, and dramatic makeup for alternative sims',
    intro:
      'EA\'s idea of goth is one black dress and the Goth family. If your sim\'s whole personality is dark eyeliner, silver jewelry, and a wardrobe with no colors in it, base-game CAS runs out of options in about ninety seconds. The community\'s alt scene, on the other hand, has been dressing goth sims properly for a decade.\n\nThis collection rounds up 150+ goth picks across the full look: black-heavy clothing from fishnets to platform boots, dramatic makeup (dark lips, heavy liner, pale skin overlays), alt hairstyles, chokers and silver jewelry, and the darker build/buy pieces — candelabras, ouija coffee tables, the works — that turn a build from "modern farmhouse" into something with actual atmosphere.\n\nGoth CC overlaps heavily with the tattoo and skin-detail categories, so if you\'re building a full alt sim, hit those collections next. Everything here is filtered to Sims 4, link-checked, and SFW.',
    filter: { themesAny: ['goth'] },
    expectedCount: 157,
    // 'nails-cc' takes 'hair-cc''s slot here 2026-09-20 rather than being
    // appended: #120 fixed outbound degree at exactly 3, so a new page is
    // wired in by *repointing* an edge that led to a hub, never by growing an
    // array. 'hair-cc' is one of the two 7-inbound hubs and loses nothing;
    // 5 of the 145 nail sets carry the goth theme tag and the goth-nails
    // article is the best-positioned page in the nail cluster (position 6.3).
    related: ['vampire-cc', 'halloween-cc', 'nails-cc'],
  },
  {
    slug: 'cottagecore-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Cottagecore CC',
    heading: 'Sims 4 Cottagecore CC',
    metaTitle: 'Sims 4 Cottagecore CC — 270+ Cozy Cottage Finds | MustHaveMods',
    metaDescription:
      'The best Sims 4 cottagecore CC. Cozy cottage furniture, prairie dresses, kitchen clutter, and garden decor for soft rural builds.',
    tagline: 'Prairie dresses, cozy kitchens, and garden clutter for soft rural sims',
    intro:
      'Cottage Living gave us the setting; it didn\'t give us nearly enough stuff. If your sim\'s aesthetic is linen dresses, a kitchen full of dried herbs, and a garden that looks lived-in rather than landscaped, you burn through the pack\'s catalog fast. Cottagecore is one of the biggest CC aesthetics in the community, and it shows in the depth available.\n\nThe 270+ picks here cover both halves of the aesthetic: CAS (prairie and milkmaid dresses, knit cardigans, braided hair, soft floral everything) and build/buy (farmhouse kitchens, quilted bedding, canned-goods clutter, cottage garden decor). It pairs naturally with the clutter and furniture collections — most cottagecore builds are really clutter-density projects wearing a floral apron.\n\nEverything is Sims 4 only, link-checked, and SFW. Sort by downloads for the staples, or dig into the long tail where single-set creators do some of the best cottage clutter in the community.',
    filter: { themesAny: ['cottagecore'] },
    expectedCount: 276,
    related: ['witch-cc', 'furniture-cc', 'female-clothes'],
  },
  {
    slug: 'y2k-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Y2K CC',
    heading: 'Sims 4 Y2K CC',
    metaTitle: 'Sims 4 Y2K CC Finder — Browse 140+ 2000s Fashion Finds | MustHaveMods',
    metaDescription:
      'Browse every Sims 4 Y2K CC find in one place. Filter low-rise jeans, baby tees, butterfly clips, and 2000s-era fashion, sorted by downloads.',
    tagline: 'Low-rise jeans, baby tees, and butterfly clips for 2000s sims',
    intro:
      'Y2K came back everywhere at once — TikTok, the runways, and the Sims CC scene, where creators had been quietly making low-rise jeans and baby tees for years before the revival made them cool again. Base-game Sims 4 has essentially nothing from this era; the game skipped from generic-modern to generic-modern.\n\nThis collection pulls together 140+ Y2K picks: the fashion staples (low-rise everything, cropped baby tees, velour sets, cargo skirts, platform sandals), the accessories that sell the look (butterfly clips, tinted sunglasses, chunky rings, shoulder bags), and the hair — face-framing highlights, crimped textures, and the tiny-clips-everywhere styles that scream 2003.\n\nY2K works best layered with the female-clothes and hair collections for the full wardrobe rebuild. As always: Sims 4 only, links checked, NSFW filtered out.',
    filter: { themesAny: ['y2k'] },
    expectedCount: 147,
    related: ['loading-screens', 'hair-cc', 'makeup-cc'],
    // Un-redirected 2026-09 alongside pregnancy-mods: the legacy article
    // ranks pos 10.2 on the blog subdomain (20 clicks/28d) vs this page
    // at pos 29.8 (4 clicks). DIFFERENTIATED pair.
    blogUrl: '/sims-4-y2k-cc/',
  },
  {
    slug: 'vampire-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Vampire CC',
    heading: 'Sims 4 Vampire CC',
    // Browse-intent title: the legacy article /sims-4-vampire-cc/
    // stays live (differentiated pair — it ranks ~pos 10 for the head
    // term) and cross-links here via blogUrl.
    metaTitle: 'Sims 4 Vampire CC Finder — Browse 55+ Occult Finds | MustHaveMods',
    metaDescription:
      'Browse Sims 4 vampire CC in one filterable grid — vampire eyes, fangs, coffins, lair decor, and dark clothing sorted by downloads.',
    tagline: 'Eyes, fangs, coffins, and lair decor for your creatures of the night',
    intro:
      'The Vampires game pack gave us the occult itself — the powers, the dark form, Vladislaus showing up uninvited — but the CAS and build catalog runs out fast. Two coffin styles, a handful of gothic pieces, and eyes that don\'t glow quite right. If your vampire looks like a regular sim with pale skin, the community has been fixing that for years.\n\nThis collection pulls together the vampire CC we\'ve tagged so far: glowing and blood-red default eye replacements, fang sets for every age (yes, including toddler vampires), coffins and coffin recolors, full lair decor, CAS background rooms styled like a vampire\'s study, victim and couple pose packs for storytelling, and the dramatic clothing — capes, gowns, and high-collared shirts — that separates a proper vampire from a sim in a black hoodie. A few pop-culture picks made the cut too, from Twilight-inspired hair to a Dracula\'s Castle build.\n\nVampire CC overlaps heavily with the goth collection — most vampire wardrobes are goth wardrobes with better teeth — so hit that next if you\'re building a full creature of the night. Everything here is filtered to Sims 4, link-checked, and SFW. Sort by downloads for the staples, or scroll for the single-set finds the big listicles miss.',
    filter: { occultTypesAny: ['vampire'] },
    expectedCount: 57,
    related: ['goth-cc', 'skin-details', 'poses'],
    blogUrl: '/sims-4-vampire-cc/',
  },
  {
    slug: 'witch-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Witch CC',
    heading: 'Sims 4 Witch CC',
    metaTitle: 'Sims 4 Witch CC — Browse Spellcaster & Occult Finds | MustHaveMods',
    metaDescription:
      'Browse Sims 4 witch and spellcaster CC in one filterable grid — witchy clothes, broomsticks, cauldrons, potion clutter, and dark magic decor sorted by downloads.',
    tagline: 'Broomsticks, cauldrons, spell books, and spellcaster fashion',
    intro:
      'Realm of Magic gave us spellcasters. It did not give us nearly enough stuff. The cauldron is a prop. The wand is the same wand in three colors. The spellcaster outfit options run out before you finish one sim. If you want a witch save that actually feels like a witch save — shelves of potion bottles, a wardrobe that reads dark-academia without being goth cosplay, a cottage that smells like herbs and old books — you need community CC.\n\nThis collection pulls together the witch and spellcaster CC we\'ve tagged so far: cauldrons and spell-book clutter that make a build feel inhabited, broomstick recolors and broom CC for the ones who like the travel option, witchy clothing from flowing robes to modern dark-academia cardigans, hat CC that isn\'t the same pointed cone, and potion-shelf deco sets that build out a proper apothecary. A few creators have built entire witchy room sets — Syboubou and Felixandre come up in the build-mode picks, while the CAS side leans on creators who work the dark-academic and cottagecore overlap.\n\nWitch CC sits right at the intersection of goth, cottagecore, and fantasy — so if this collection runs short for what you\'re building, those three collections extend it. Everything here is Sims 4, link-checked, and SFW.',
    // The `witch` theme tag is sparse (0 verified mods on 2026-09-02), so
    // this uses the same temporary keyword-fallback pattern as pregnancy
    // until a witch/spellcaster facet backfill lands (~344 keyword matches).
    filter: { contentType: '__witch_keyword__' },
    expectedCount: 60,
    related: ['goth-cc', 'cottagecore-cc', 'vampire-cc'],
    blogUrl: '/sims-4-witch-cc/',
  },
  {
    slug: 'poses',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Pose Packs',
    heading: 'Sims 4 Pose Packs',
    // Head-term title: the legacy article /sims-4-gallery-poses/
    // 301s here (2026-07-03), so this page owns the query.
    metaTitle: 'Sims 4 Gallery Poses & Pose Packs — 570+ Poses | MustHaveMods',
    metaDescription:
      'Browse 570+ Sims 4 pose packs and gallery poses for CAS, couples, and storytelling — sorted by downloads, hand-picked from top creators.',
    tagline: 'Screenshot-ready poses for CAS, couples, and stories',
    intro:
      'Poses are what Sims 4 storytellers and CAS screenshotters use instead of the default "sim stands awkwardly with hands at sides" loop. If you\'ve ever looked at a Sims Instagram or a machinima YouTube channel and wondered how the sims look like they\'re actually posing, the answer is almost always a pose pack and the Pose Player mod.\n\nWe\'ve pulled together nearly 600 pose picks here, leaning on the creators who basically built the Sims pose community — Katverse, Helgatisha, Natalia Auditore, Ratboysims — along with a long list of smaller pose makers whose single-pack releases are often better than the big comprehensive sets. Expect CAS poses (for the character sheets people love to make), couple poses for story beats, family poses, maternity poses, and individual storytelling poses that cover everything from quiet character moments to dramatic screenshots.\n\nYou\'ll need Pose Player and Teleport Any Sim to actually use these in-game. Once you\'ve got those two mods installed, the rest is just picking which pose pack matches the scene you\'re trying to tell.',
    filter: { contentType: 'poses' },
    expectedCount: 573,
    related: ['female-clothes', 'loading-screens', 'pregnancy-mods'],
    // NOT /sims-4-gallery-poses/ — that article 301s here. The
    // general poses article is the still-live editorial companion.
    blogUrl: '/sims-4-poses/',
  },
  {
    slug: 'makeup-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Makeup CC',
    heading: 'Sims 4 Makeup CC',
    metaTitle: 'Sims 4 Makeup CC Finder — Browse 900+ Looks | MustHaveMods',
    metaDescription:
      'Browse 900+ Sims 4 makeup CC picks in one filterable grid — lashes, eyeshadow, lipstick, blush, and full makeup sets sorted by downloads.',
    tagline: 'Lashes, eyeshadow, lipstick, and full sets for every look',
    intro:
      'Base-game Sims 4 makeup has not kept up with the rest of CAS. The lipstick options reuse the same two shine levels. The eyeshadow palette runs out of interesting choices in about three swatches. The lashes are a single flat mesh that looks like a crescent moon pasted to the eyelid. Community makeup CC fixes all of this — and the Sims makeup creator scene is one of the deepest in the whole CC ecosystem.\n\nThis collection pulls together over 900 makeup picks across every category: 3D lash sets (the most-downloaded single item on this site is a lash CC), eyeshadow and full eye looks, lipstick and lipgloss, blush, and full skin-detail-adjacent eye CC including default eye replacements and colored contacts. Creators like Pralinesims and Nords-Sims show up in the blush and skin-overlay end of the spectrum; the lash and makeup-specific end has its own ecosystem of creators — Moonflower-cc, Kiara24, and Okruee among them — building CAS-ready looks that stack cleanly on top of skin overlays.\n\nThe filter here is composite: makeup, eyebrows, eyeliner, blush, lipstick, and eyes content types together. Use the main finder\'s visual-style filter if you want to narrow to alpha-style or maxis-match makeup specifically. Everything here is Sims 4 only, link-checked, and SFW.',
    filter: {
      contentTypeIn: ['makeup', 'eyebrows', 'eyeliner', 'blush', 'lipstick', 'eyes'],
    },
    expectedCount: 922,
    // 'nails-cc' takes 'skin-details''s slot here 2026-09-20 — makeup is the
    // nearest neighbour to nails in CAS, and 'skin-details' is the other
    // 7-inbound hub, so the edge is worth more pointed at the new page. With
    // goth-cc that gives nails-cc the two inbound links #120's graph test
    // requires, from sources that are themselves linked.
    related: ['nails-cc', 'hair-cc', 'jewelry-cc'],
    // Missing since this collection shipped (PR #32, 2026-09-04) — the
    // legacy article is live and does not 301 here, so the differentiated
    // pair was simply never wired up. Added 2026-09-07.
    blogUrl: '/sims-4-makeup-cc/',
  },
  {
    // Placement is free here: neither `loading-screen` nor `cas-background`
    // appears in any other entry's `contentType` / `contentTypeIn`, so
    // `filterSpecificity()` has nothing to tie-break and all 269 mod detail
    // pages get a first-ever collection breadcrumb. Appended at the end.
    slug: 'loading-screens',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Loading Screens & CAS Backgrounds',
    heading: 'Sims 4 Loading Screens & CAS Backgrounds',
    // "Finder — Browse" is the house browse-intent signal for a differentiated
    // pair; the legacy listicle keeps the "best loading screens" head term.
    // Asserted by canonical-trailing-slash.test.ts:278.
    metaTitle: 'Sims 4 Loading Screen Finder — Browse 260+ Screens & CAS Backgrounds | MustHaveMods',
    metaDescription:
      'Browse 260+ Sims 4 loading screens and CAS background replacements in one filterable grid — aesthetic, seasonal, and minimalist, sorted by downloads.',
    tagline: 'Replace the two screens you stare at most',
    intro:
      'The loading screen and the CAS background are the two screens you look at more than any build you will ever make, and both of them ship as the same washed-out default you have been staring at since 2014. Every time you travel to a lot, switch households, or open Create-A-Sim, there it is again. Swapping them is a five-minute drop-in that changes the whole feel of a playthrough — no gameplay risk, no conflicts, nothing to update after a patch.\n\nThis collection pulls together 269 picks across both: 169 loading screens and 100 CAS background replacements. The loading screen side runs from clean minimalist gradients and pastel plumbob art to full illustrated scenes, anime-styled panels, and a deep seasonal bench — Halloween, fall, winter, Christmas, and Valentine\'s sets that a lot of people swap in and out through the year. The CAS background side is mostly the two things people actually want: a plain neutral studio backdrop that does not fight the sim you are building, or a properly styled room — bedroom, café, bathroom, greenhouse — that makes CAS screenshots look composed instead of floating in grey.\n\nThe names that come up most on loading screens are cassie1900, ghostlycc, Simmerciara, StarrySimsie, TiniSimsCC and Katverse; on CAS backgrounds it is Ellcrze, Shasims, PILARLEON23 and Katverse again. Most of these are single-file drops: one package into Mods, no script mod required, no CC manager needed.\n\nTwo practical notes. Loading screens and CAS backgrounds both override the same game assets, so pick one of each rather than installing five and wondering which won. And if you use a CAS background with a busy room, keep your sim-preview lighting in mind — the busier backdrops look great in screenshots and make it harder to judge a skin overlay while you are building.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link. Sort by downloads for the ones half the community already has installed, or scroll for the seasonal and one-off sets the big roundups never get to.',
    filter: {
      // 269 SFW Sims 4 mods: 169 `loading-screen` + 100 `cas-background`,
      // verified against prod 2026-09-14. Audited before ranking, per the
      // 09-13 rule: top 15 by downloads + 15 mid-grid rows on each facet
      // = 29/30 on loading-screen and 29/30 on cas-background. Rejected
      // alternatives the same day: the builds cluster (`residential` +
      // `lot` + `commercial` + `builds`, 957 rows) fails at ~53% — the
      // `lot` top 15 holds five CAS clothing packs and the `residential`
      // top 15 holds a UI mod, a career mod and an Amazon retail listing;
      // `nails` (149) passes the audit at 90% but carries only 174 GSC
      // impressions / 1 click, against 1,609 / 26 for this cluster.
      contentTypeIn: ['loading-screen', 'cas-background'],
    },
    expectedCount: 269,
    related: ['poses', 'cottagecore-cc', 'y2k-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial
    // "best loading screens" intent, this page owns browse/filter intent.
    // /sims-4-loading-screen/ is live and appears in neither
    // mhm_consolidated_post_map() nor vercel.json (verified 2026-09-14).
    // It holds 620 impressions / 2 clicks at position 55.7 over the 28d
    // to 2026-09-11, so there is nothing here to cannibalise.
    blogUrl: '/sims-4-loading-screen/',
  },
  {
    // Placement is free: neither `jewelry` nor `watches` appears in any other
    // entry's `contentType` / `contentTypeIn`, so `filterSpecificity()` has
    // nothing to tie-break and all 439 mod detail pages get a first-ever
    // collection breadcrumb. Appended at the end.
    slug: 'jewelry-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Jewelry & Piercings',
    heading: 'Sims 4 Jewelry & Piercings CC',
    // "Finder — Browse" is the house browse-intent signal for a differentiated
    // pair; the legacy listicle keeps the "best jewelry cc" head term.
    metaTitle: 'Sims 4 Jewelry CC Finder — Browse 430+ Piercings, Earrings & Necklaces | MustHaveMods',
    metaDescription:
      'Browse 430+ Sims 4 jewelry and piercing CC picks in one filterable grid — septums, nose rings, earrings, necklaces, rings, bracelets and watches, sorted by downloads.',
    tagline: 'Piercings, earrings, necklaces, rings — the details that finish a sim',
    intro:
      'Jewelry is the last five percent of a sim, and the base game is close to useless at it. There are a handful of earrings, one necklace that reads as a necklace, and no piercings at all beyond what a couple of packs added. So the first thing most people do after installing a hair and a skin overlay is go looking for a septum ring.\n\nThis collection pulls together 439 jewelry and piercing picks in one grid: roughly 95 necklaces, pendants and chokers, 92 earring sets from tiny studs to the chunky hoops that turn up in every lookbook, 82 piercing packs — septums, nostril and bridge piercings, lip studs, ear gauges and stretched lobes, belly bars, back dermals — 66 bracelets, bangles and anklets, 56 rings including a deep bench of engagement and wedding sets, and 24 watches.\n\nThe creators who show up most here are the ones who specialise: Feyona has the largest single shelf (43 pieces across two spellings of the name) and owns the fine-jewelry end — diamond settings, pearl duos, engagement rings; Glitterberryfly, Suzue, WisteriaSims and Pitted0live cover the everyday CAS pieces; Pralinesims and Taüve are the names to look for on piercings specifically, and Kosmokhaos\'s Grillz Collection is the single most-downloaded item in this whole grid.\n\nTwo practical notes. Most piercings occupy CAS accessory slots that other CC also wants — a septum and a pair of glasses can fight over the same slot, and the usual symptom is one of them vanishing in-game rather than an error. And jewelry is one of the few CC categories where a mesh with a bad LOD is genuinely noticeable, because the camera spends so much time near the face; if a piece looks blocky at normal zoom, it will look worse in a screenshot.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link. Sort by downloads for the pieces half the community already has, or scroll for the small single-set releases the big roundups never reach.',
    filter: {
      // 439 SFW Sims 4 mods: 415 `jewelry` + 24 `watches`, verified against
      // production on 2026-09-18 *after* the same-PR facet repair. Audited
      // before ranking, per the 09-13 rule: top 20 by downloads is 20/20 real
      // jewelry, and four 10-row samples at 25/50/75/100% of the grid are
      // 40/40. Only 6 of 439 titles lack a jewelry word and all six are
      // hand-audited entries in scripts/lib/hand-audited-content-types.ts
      // (Goth is Rock, Van Cleef Set, Elara Petite, Circle Of Life, Jayla,
      // Sacred Metal) — every one verified against its own description.
      //
      // Before the repair the facet was 77.0% keyword-clean and would have
      // shipped a page whose grid held a dining room, a set of walls, a
      // Samsung TV and "Funeral Home CC". Rejected the same day: `accessories`
      // (863) is worse — its top rows are 100 Base Game Traits, SimDa Dating
      // App and MC Command Center, and its mid-grid is freckles and moles;
      // `nails` (149) passes the audit at ~92% but carries 167 GSC
      // impressions / 2 clicks against 1,293 / 6 for this cluster.
      contentTypeIn: ['jewelry', 'watches'],
    },
    expectedCount: 439,
    related: ['tattoos', 'goth-cc', 'makeup-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial "best
    // jewelry cc" intent, this page owns browse/filter intent.
    // /sims-4-jewelry-cc/ is live (HTTP 200, no redirect, verified
    // 2026-09-18) and appears in neither mhm_consolidated_post_map() nor
    // vercel.json. It holds 61 impressions / 1 click at position 47.3 over
    // the 28d to 2026-09-15, so there is nothing here to cannibalise.
    blogUrl: '/sims-4-jewelry-cc/',
  },
  {
    // Placement is free: `nails` appears in no other entry's `contentType` /
    // `contentTypeIn`, so `filterSpecificity()` has nothing to tie-break and
    // all 145 mod detail pages get a first-ever collection breadcrumb.
    // Appended at the end.
    slug: 'nails-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Nails CC',
    heading: 'Sims 4 Nails CC',
    // "Finder — Browse" is the house browse-intent signal for a differentiated
    // pair; the legacy listicle keeps the "best nails cc" head term.
    metaTitle: 'Sims 4 Nails CC Finder — Browse 140+ Nail Sets | MustHaveMods',
    metaDescription:
      'Browse 140+ Sims 4 nails CC sets in one filterable grid — stiletto, coffin, almond, french, and press-on nail packs sorted by downloads, links checked.',
    tagline: 'Stiletto, coffin, almond, and french sets for every hand',
    intro:
      'Nails are the CAS slot nobody thinks about until they zoom in. The base game gives you a handful of flat polish swatches painted onto the default hand mesh — no length, no shape, no art — so the moment you install a good skin overlay and a decent hair, the hands are the thing that still looks like 2014.\n\nThis collection is every Sims 4 nail set in our catalog in one grid: 145 finds, sorted by downloads. Shape is the thing most people filter for and it is well covered here — long stiletto, coffin and ballerina, almond, square, and the shorter natural sets for sims who are not supposed to look like they just left a salon. Around a dozen sets are built specifically around an aesthetic (y2k, goth, coquette), there is a small bench of french-tip and solid-polish packs for the ones you want to be invisible, and a handful of seasonal sets — Valentine\'s, Christmas, summer — that people swap in and out through the year.\n\nThe creators who show up most are the ones who basically only make nails: LVNDRCC has the biggest single shelf here, Feyona covers the fine, realistic end, and VICCS, WisteriaSims, VELYSEA, Joliebean and frenchiesimgirl fill in the everyday CAS sets. The single most-downloaded item in the grid is a striped Hello Kitty set, which tells you roughly everything about what this category is for.\n\nTwo practical notes. Nail CC is split between sets that live in the nail-polish slot and sets that ship as a glove or ring accessory to get the length — the accessory kind will fight with bracelets and with some gloves, and the usual symptom is one of them disappearing in-game. And long nails clip through a lot of animations and hand poses; if you are shooting screenshots with a pose pack, a shorter set almost always renders cleaner than the XL claws.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link. Sort by downloads for the sets half the community already has installed, or scroll for the single-pack releases the big roundups never reach.',
    filter: {
      // 145 SFW Sims 4 mods on the `nails` facet, verified against production
      // 2026-09-20 *after* the same-PR repair of six junk rows. Audited before
      // ranking, per the 09-13 rule: the top 12 by downloads are 12/12 real
      // nail sets and two 8-row mid-grid samples are 16/16; 141 of 145 titles
      // carry a nail word (97.2%), up from 92.7% before the repair, and the
      // four that do not were each read against their own description.
      //
      // Before the repair the second card on this grid was "Feet 1V Remaster",
      // a feet body mod with 121 downloads; two villas, a pair of wedge
      // sandals and two ring sets sat further down. All six are now on their
      // right facet (see scripts/lib/hand-audited-content-types.ts, 09-20).
      //
      // Rejected the same day, with reasons, so they are not re-proposed:
      // `gameplay-mod` + `script-mod` + `career` (511 rows, by far the biggest
      // un-paged cluster and the biggest head term) — the top 20 by downloads
      // includes WickedWhims, MC WooHoo, a prostitution mod, Basemental Drugs
      // and two body sliders, and Phase 0 already dropped "Woohoo mods" from
      // the topic list for ad-policy risk; kids/toddler/infant via
      // `ageGroupsAny` (752 rows, and the best demand left at 1,795 GSC
      // impressions across 22 articles) — only 45.9% of titles carry a kid
      // word and the age tags are visibly blanket-applied ("Nike Af1" tagged
      // infant+elder, a vampire choker tagged toddler), so it needs an
      // ageGroups repair first; `hats` (202) at 51.5% and `workout` + `gym`
      // (194) at 42.8% are junk-tagged the same way.
      contentType: 'nails',
    },
    expectedCount: 145,
    related: ['makeup-cc', 'jewelry-cc', 'skin-details'],
    // Differentiated pair: the legacy listicle keeps the editorial "best nails
    // cc" intent, this page owns browse/filter intent. /sims-4-nails-cc/ is
    // live (HTTP 200, no redirect, verified 2026-09-20) and appears in neither
    // mhm_consolidated_post_map() nor vercel.json. It holds 66 impressions /
    // 0 clicks at position 40.5 over the 28d to 2026-09-17, so there is
    // nothing here to cannibalise. (/sims-4-cc-nails/, 72 impressions at
    // position 36.1, is the second article in the cluster and also live.)
    blogUrl: '/sims-4-nails-cc/',
  },
  {
    // Appended last on purpose. This is the registry's first `ageGroupsAny`
    // entry, so `filterSpecificity()` scores it 1 (a style/axis, not a thing
    // the mod *is*) — it sorts behind every contentType collection and, on the
    // `i` tie-break, behind every existing specificity-1 entry too. No mod
    // loses the breadcrumb it has today; 686 mods gain a second one.
    slug: 'kids-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Kids CC',
    heading: 'Sims 4 Kids CC',
    metaTitle: 'Sims 4 Kids CC Finder — Browse 680+ Toddler, Child & Infant Finds | MustHaveMods',
    metaDescription:
      'Browse 680+ Sims 4 kids CC finds in one filterable grid — toddler, child and infant hair, clothes, shoes, furniture and poses, sorted by downloads, links checked.',
    tagline: 'Toddler, child, and infant finds in one grid',
    intro:
      "Kid sims age out of the base game fast. Toddlers get a handful of outfits and about four hairstyles, children get hand-me-down meshes that look like shrunken adult clothes, and infants — added years after launch — got almost nothing at all. So the moment you play a household with children in it, the kids are the ones who look unfinished while the adults look great.\n\nThis collection is every kid find in our catalog in one grid: 686 mods across all three young ages, sorted by downloads. Toddlers are the deepest shelf by a wide margin (362), children next (266), and infants the thinnest (81) for the obvious reason — that age is the newest and creators are still catching up. Hair is the single biggest category here at 164 sets, which tracks: it is the slot with the worst base-game coverage and the one people notice first. After that it is everyday clothing (92 full outfits, 61 tops, 31 dresses, 17 bottoms), 46 pairs of shoes, 58 furniture pieces, and 59 pose packs — the poses being mostly family and sibling shots, which is what people actually photograph kids for.\n\nA few creators basically live in this category. casteru has the largest single shelf (toddler swimwear, formalwear and CAS poses), PowLuna makes matched toddler outfit sets, RavenSim and Lewbertsn00tles do the hair — including child and infant conversions of hairs you already have for adults — Flystone covers child shoes, and Madlen and Talarian fill in the school-uniform-and-tee end of the wardrobe.\n\nTwo things worth knowing before you download. Ages are separate meshes in this game, so a set made for children is not automatically available to toddlers, and a lot of the packs here say so in the title (\"Child and Toddler\") precisely because converting takes extra work. And infant CC needs the infant update installed; if a download looks empty in CAS, check the age it was actually built for before assuming the file is broken.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link — 562 of the 686 are free. Sort by downloads for the sets most households already run, or scroll for the single releases the big roundups skip.",
    filter: {
      // 686 SFW Sims 4 mods on infant / toddler / child, verified against
      // production 2026-09-21 *after* the same-PR repair of the column.
      //
      // The 09-20 entry rejected this cluster: 752 rows, only 45.6% of titles
      // carrying a kid word, "Nike Af1" tagged infant+elder. The cause was a
      // single class bug, not heterogeneous junk — `extractFacetsFromKeywords`
      // matched `'ya' -> young-adult` and `'tot' -> toddler` as bare
      // substrings over title + description + tags. That is now fixed at the
      // source (`lib/ageGroupRules.ts`, imported by the extractor) and the
      // column re-derived from titles only: 362 added, 428 stripped, 35
      // rewritten. 686 of 686 titles now support their tag.
      //
      // Audited before ranking, per the 09-13 rule: the top 40 by downloads
      // are 40/40 real kid content, four 12-row mid-grid samples are 48/48,
      // and the 90 rows whose only evidence is the bare word "child" are
      // 90/90. Two rows were caught in the simulation and excluded by name:
      // "Baby Face Kit" (2,878 downloads, an adult lips preset) and "Child
      // Birth Mod" (1,383) would each have been card #1.
      ageGroupsAny: ['infant', 'toddler', 'child'],
    },
    expectedCount: 686,
    // 2026-09-24: 'hair-cc' → 'bedroom-cc' (kids/toddler/teen bedroom sets
    // are the second-largest slice of that page; hair-cc keeps 6 inbound).
    related: ['bedroom-cc', 'pregnancy-mods', 'furniture-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial "best kids
    // cc" intent, this page owns browse/filter intent. /sims-4-kids-cc/ is
    // live (HTTP 200, no redirect, verified 2026-09-21) and appears in neither
    // mhm_consolidated_post_map() nor vercel.json. It holds 153 impressions /
    // 0 clicks at position 43.3 over the 28d to 2026-09-18 — the cluster's 23
    // articles together take ~1,836 impressions and 12 clicks at positions
    // 21.9-52.3, so there is demand and nothing here to cannibalise.
    blogUrl: '/sims-4-kids-cc/',
  },
  {
    // Appended last on purpose: a `themesAny` entry scores specificity 1 in
    // `filterSpecificity()`, so it sorts behind every contentType collection
    // (125 of its 190 mods keep `holidays-cc` as their first breadcrumb) and
    // gains a second one. Seasonal page shipped five weeks before its peak.
    slug: 'halloween-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Halloween CC',
    heading: 'Sims 4 Halloween CC',
    metaTitle: 'Sims 4 Halloween CC Finder — Browse 190 Spooky Finds | MustHaveMods',
    metaDescription:
      'Browse 190 Sims 4 Halloween CC finds in one filterable grid — costumes, spooky makeup, haunted houses, Simblreen gifts, decor and loading screens, links checked.',
    tagline: 'Costumes, haunted houses, and Simblreen gifts in one grid',
    intro:
      "Spooky Day is the one holiday the base game actually commits to, and it still runs out of ideas by the second October. You get a handful of costumes, a few pumpkins to carve and a party that looks the same every year — so the moment your households start celebrating it more than once, everything Halloween in your game is coming from custom content.\n\nThis collection is every Halloween find in our catalog in one grid: 190 mods, sorted by downloads, and every one of them says Halloween (or spooky, haunted, zombie, trick-or-treat, Simblreen) in its own title. That last part is deliberate. Seasonal tags are the easiest facet to get wrong — a generic witch mod or a pair of sneakers that happened to appear in a Halloween roundup is not Halloween CC — so this grid only holds items whose creator called them that.\n\nThe shelf splits roughly three ways. Costumes and CAS: full Halloween outfits (adult and toddler), face paint and zombie makeup, Halloween eyes, lashes and nails, and a stack of Simblreen gifts — the fandom's October gift-exchange event, which is where a lot of the best free sets come from. Build and decor: carved pumpkins, porch clutter, candles, framed posters and full decor sets, plus more than a dozen haunted-house lots ready to drop into a world. And the finishing touches: Halloween loading screens and CAS backgrounds, trick-or-treat and zombie pose packs for the screenshots.\n\nTwo practical notes. Plenty of these are dated sets (\"Halloween 2022\", \"Halloween 2025\") that creators re-release every year — the older ones generally still work, but check the creator page for a newer version before you install both. And costume sets marked for toddlers or children are separate meshes, so an adult costume will not show up on a kid sim.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link — 182 of the 190 are free. Sort by downloads for the sets everyone already runs, or scroll for the one-off Simblreen gifts the big roundups never reach.",
    filter: {
      // 190 SFW Sims 4 mods on the `halloween` theme, verified against
      // production 2026-09-23 *after* the same-PR repair of the theme.
      //
      // Before the repair the theme had 547 rows and only 190 said Halloween
      // in the title (34.7%): the top two cards would have been "Infatuated
      // Pose Pack" and "Cannibalism", with "Nike Air Force 1s" and "Vince
      // T-shirt" in the top 25. Cause: THEME_KEYWORDS mapped witch / vampire /
      // ghost / pumpkin to `halloween` over title + description. Fixed at the
      // source (`lib/halloweenThemeRules.ts`, imported by the extractor) and
      // re-derived from titles only: 53 added, 410 stripped
      // (`scripts/retag-halloween-theme.ts`, backup in
      // reports/catalog/halloween-theme-retag-2026-09-23.csv).
      //
      // Audited before ranking: 190 of 190 titles carry Halloween evidence;
      // the top 40 by downloads read 38/40 as Halloween content, the two
      // arguable ones being a zombie-survival gameplay mod and a "Horror
      // Games Override".
      themesAny: ['halloween'],
    },
    expectedCount: 190,
    related: ['holidays-cc', 'witch-cc', 'goth-cc'],
    // Differentiated pair: the legacy listicle keeps the editorial "best
    // halloween cc" intent, this page owns browse/filter intent.
    // /sims-4-halloween-cc/ is live (HTTP 200, no redirect, verified
    // 2026-09-23) and is not in vercel.json. It holds 180 impressions / 0
    // clicks at position 39.3 over the 28d to 2026-09-20; the nine Halloween
    // articles together take ~519 impressions and 4 clicks (eyes 138 at 21.9,
    // makeup 50 at 23.4) — before the October peak.
    blogUrl: '/sims-4-halloween-cc/',
  },
  {
    // Rowan, 2026-09-24 (E100). Second `themesAny` page; appended last
    // because themesAny scores specificity 1. Demand: GSC 28d to 09-21 puts
    // the bedroom cluster of legacy listicles (/sims-4-beds/, toddler /
    // teen / kids bedroom, bedroom clutter) at ~394 impressions / 7 clicks,
    // and the query set ("sims 4 bed frame cc" pos 16.8, "sims 4 teen
    // bedroom cc" pos 21.9, "sims 4 bed cc", "sims 4 beds cc") lands on
    // no browse page at all. /games/sims-4/furniture-cc/ is the busiest
    // build/buy collection (911 landing sessions 28d) and gains a sibling.
    slug: 'bedroom-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Bedroom CC',
    heading: 'Sims 4 Bedroom CC',
    metaTitle: 'Sims 4 Bedroom CC Finder — Browse 250 Beds & Bedroom Sets | MustHaveMods',
    metaDescription:
      'Browse 250 Sims 4 bedroom CC finds in one filterable grid — full bedroom sets, beds and bed frames, kids, toddler and teen rooms, dressers, nightstands and bedroom clutter, links checked.',
    tagline: 'Full bedroom sets, beds, and kids’ rooms in one grid',
    intro:
      "The bedroom is the room every household actually uses, and it is the one Maxis furnishes worst: a handful of bed frames that all sit at the same height, mattresses that clip through them, and a teen room that looks exactly like the adult one with a poster on the wall. Most builders replace the whole lot within a week of starting a save — so bedroom CC is the largest build/buy category on the site after generic furniture, and this grid is all of it in one place.\n\nEvery item here says bedroom, bed, bed frame, mattress, dresser or nightstand in its own title. That is deliberate. Room tags are easy to get wrong when a whole blog post shares one description — a pyjama set or a pose pack that appeared in a bedroom roundup is not bedroom furniture — so this collection only holds items whose creator called them that. When we repaired the tag, more than half the rows it used to carry were whole-house lots, sleep animations and a lingerie collection; none of those are here.\n\nWhat is here splits three ways. Full bedroom sets are the bulk of it: bed, dresser, nightstand and clutter in one download, in every style the community builds — Y2K and 2000s rooms, coquette and boho, goth and Victorian gothic, punk, cozy cottage, modern, hotel suites and a Christmas bedroom for December saves. Standalone beds and frames: bunk beds, a TV bed, Murphy beds, a sofa bed, king-size and double frames, functional mattresses, and mid-century and Scandinavian bedframes that come in eight or more swatches. And rooms for the rest of the household: infant and toddler bedrooms, kids' rooms from castles to meadows, and teen rooms — all separate meshes, so check the age group before you download a bed for a toddler.\n\nTwo practical notes. Many sets ship as one large package; if you only want the bed, most creators list the individual pieces on their download page. And a lot of these are older uploads that creators re-release with new swatches — the original still works, but look for a newer version before installing both.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link. Sort by downloads for the sets everyone already runs, or scroll for the one-off bedframes the big roundups never reach.",
    filter: {
      // 250 SFW Sims 4 mods on the `bedroom` theme, verified against
      // production 2026-09-24 *after* the same-PR repair of the theme.
      //
      // Before the repair the theme had 523 rows and only 195 said bedroom
      // in the title (37.3%): 133 were whole-house lots/builds, 26 pose
      // packs; card #3 was "Victoria's Secret Sleepwear Collection" and
      // "Wake Up Animation" / "Sleeping Animation Pack" sat in the top 20.
      // Cause: ROOM_THEME_RULES in contentTypeDetector.ts matched
      // 'bedroom' / 'sleeping' by substring over title + DESCRIPTION, and the
      // description is shared by every mod scraped from one blog post.
      // Fixed at the source (`lib/bedroomThemeRules.ts`, imported by the
      // detector) and re-derived from titles only: 39 added, 312 stripped
      // (`scripts/retag-bedroom-theme.ts`, backup in
      // reports/catalog/bedroom-theme-retag-2026-09-24.csv).
      //
      // Audited before ranking: 250 of 250 titles carry bedroom evidence;
      // the top 40 by downloads read 40/40 as bedroom content. Two rows
      // whose description says bedroom but whose title does not ("Teen
      // Space", 7,998 downloads; "Set Shaggy") were stripped on purpose —
      // titles only.
      themesAny: ['bedroom'],
    },
    expectedCount: 250,
    related: ['furniture-cc', 'decor-cc', 'kids-cc'],
    // Differentiated pair: /sims-4-beds/ keeps the editorial "best beds"
    // intent, this page owns browse/filter intent. It is live (HTTP 200,
    // no redirect, verified 2026-09-24) and not in vercel.json; 204
    // impressions / 5 clicks at position 36.8 over the 28d to 2026-09-21.
    blogUrl: '/sims-4-beds/',
  },
  {
    // Rowan, 2026-09-25 (E109). Third `themesAny` page; appended last
    // because themesAny scores specificity 1. Demand: GSC 28d to 09-22 puts
    // the kitchen cluster of legacy listicles (/sims-4-fridge-cc/ 111,
    // /sims-4-kitchen-clutter-cc/ 46, /best-sims-4-appliance-cc/ 37) at 194
    // impressions / 2 clicks at positions 33.9-45.7, and the query set
    // ("sims 4 fridge cc" pos 21.5, "sims 4 kitchen stuff cc", "sims 4
    // kitchen appliances" pos 24, "kitchen cc") lands on no browse page.
    // /sims-4-kitchen-cc/ does not exist (404, checked 2026-09-25).
    slug: 'kitchen-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Kitchen CC',
    heading: 'Sims 4 Kitchen CC',
    metaTitle: 'Sims 4 Kitchen CC Finder — Browse 160 Kitchen Sets & Appliances | MustHaveMods',
    metaDescription:
      'Browse 160 Sims 4 kitchen CC finds in one filterable grid — full kitchen sets, fridges and appliances, pantry shelves and kitchen clutter, links checked.',
    tagline: 'Full kitchen sets, fridges, appliances, and clutter in one grid',
    intro:
      "The kitchen is the room your sims use more than any other — every meal, every party, every 3 a.m. cereal run goes through it — and it is the room where the base game's catalog runs thinnest. A few counter styles, fridges that all share one silhouette and a stove that looks the same in a farmhouse as it does in a penthouse. Kitchen CC is how builders make that room look like somebody actually cooks in it, and this grid is all of it in one place.\n\nEvery item here says kitchen, kitchenware, fridge, refrigerator, appliance, dishwasher or pantry in its own title. That is deliberate. Room tags are easy to get wrong when a whole blog post shares one description — a recipe mod, a breakfast-food clutter pack or an apron that appeared in a kitchen roundup is not kitchen build CC — so this collection only holds items whose creator called them that. When we repaired the tag, more than half of the rows it used to carry turned out not to be kitchen CC at all — cooking gameplay mods, custom food, aprons and whole-house lots; none of those are here.\n\nWhat is here splits three ways. Full kitchen sets are the bulk of it: counters, cabinets, islands and the clutter to match, in every style the community builds — modern and minimalist, farmhouse and cottage, pink and pastel, 1950s retro, mid-century, grunge, medieval and Japandi. Fridges and appliances: stand-alone refrigerators (built-in, mini, retro and wine fridges), functional appliance sets with stoves, dishwashers and coffee makers, and a rice cooker. And the finishing layer: pantry shelves and pantry food, backsplashes, and kitchen clutter packs that fill a counter without a single placement cheat.\n\nTwo practical notes. Functional appliances can depend on a specific pack, so check the requirements on the download page before you build a kitchen around one. And big sets often ship as several parts (\"Part 1\", \"Part 3\"); the parts are separate downloads, so grab them together if you want the full look.\n\nEverything in this grid is Sims 4 only, filtered to SFW, and checked for a working download link — 134 of the 160 are free. Sort by downloads for the sets everyone already runs, or scroll for the one-off fridges and pantry packs the big roundups never reach.",
    filter: {
      // 160 SFW Sims 4 mods on the `kitchen` theme, verified against
      // production 2026-09-25 *after* the same-PR repair of the theme.
      //
      // Before the repair the theme had 345 rows and only 118 said kitchen
      // in the title (34.2%): "Realistic Cooking Mod" (a gameplay mod) was
      // card #2, "Soul food", "Breakfast Foods", "Kellogg's Set" and a
      // freelance-chef career sat in the top 20, and 47 rows were lots.
      // Cause: ROOM_THEME_RULES in contentTypeDetector.ts matched 'kitchen'
      // / 'cooking' / 'chef' / 'culinary' by substring over title +
      // DESCRIPTION, and the description is shared by every mod scraped from
      // one blog post. Fixed at the source (`lib/kitchenThemeRules.ts`,
      // imported by the detector) and re-derived from titles only: 31 added
      // (all fridges / appliance sets), 216 stripped
      // (`scripts/retag-kitchen-theme.ts`, backup in
      // reports/funnel/kitchen-theme-retag-2026-09-25.csv).
      //
      // Audited before ranking: 160 of 160 titles carry kitchen evidence;
      // the top 40 by downloads read 40/40 as kitchen content.
      themesAny: ['kitchen'],
    },
    expectedCount: 160,
    related: ['furniture-cc', 'clutter', 'decor-cc'],
    // Differentiated pair: /sims-4-kitchen-clutter-cc/ keeps the editorial
    // "best kitchen clutter" intent, this page owns browse/filter intent. It
    // is live (HTTP 200, no redirect, checked 2026-09-25) and not in
    // vercel.json; 46 impressions / 0 clicks at position 45.7 over the 28d
    // to 2026-09-22.
    blogUrl: '/sims-4-kitchen-clutter-cc/',
  },
];

/**
 * Lookup a collection by slug for a given game.
 * Returns null if not found (server should 404).
 */
export function getCollection(gameSlug: string, topicSlug: string): CollectionDefinition | null {
  const allCollections: CollectionDefinition[] = [...SIMS4_COLLECTIONS];
  return (
    allCollections.find((c) => c.gameSlug === gameSlug && c.slug === topicSlug) || null
  );
}

/**
 * Get all collections for a game. Used by sitemap generation and
 * the games page to build collection navigation.
 */
export function getCollectionsForGame(gameSlug: string): CollectionDefinition[] {
  if (gameSlug === 'sims-4') return SIMS4_COLLECTIONS;
  return [];
}

/**
 * Get all collection slugs across all games for static param
 * generation and sitemap building.
 */
export function getAllCollectionRoutes(): Array<{ gameSlug: string; topicSlug: string }> {
  return SIMS4_COLLECTIONS.map((c) => ({
    gameSlug: c.gameSlug,
    topicSlug: c.slug,
  }));
}

/**
 * Convert a CollectionFacetQuery into a Prisma `where` fragment.
 * Returns a where clause to be merged with `gameVersion` + safety
 * filters (isVerified, isNSFW) by the caller.
 *
 * The magic value `__pregnancy_keyword__` is intercepted here
 * during Phase 1 before the pregnancy facet is backfilled. Phase
 * 1a will replace it with `contentType: 'pregnancy'` after the
 * facet is added and mods are retagged.
 */
export function buildWhereClause(filter: CollectionFacetQuery): Prisma.ModWhereInput {
  const where: Prisma.ModWhereInput = {};

  // Phase 1 temporary: pregnancy keyword fallback. The real facet
  // (`contentType: 'pregnancy'`) is included in the OR so the page
  // automatically picks up mods as the Phase 1a backfill lands —
  // no code change needed when the facet goes live.
  if (filter.contentType === '__pregnancy_keyword__') {
    where.OR = [
      { contentType: 'pregnancy' },
      { title: { contains: 'pregnan', mode: 'insensitive' } },
      { title: { contains: 'maternity', mode: 'insensitive' } },
      { description: { contains: 'pregnan', mode: 'insensitive' } },
    ];
    return where;
  }

  // Phase 1 temporary: witch keyword fallback (same pattern as pregnancy).
  // The real facets (witch theme / spellcaster occult) are in the OR so the
  // page picks up backfilled mods automatically with no code change.
  if (filter.contentType === '__witch_keyword__') {
    where.OR = [
      { themes: { hasSome: ['witch'] } },
      { occultTypes: { hasSome: ['witch', 'spellcaster'] } },
      { title: { contains: 'witch', mode: 'insensitive' } },
      { title: { contains: 'spellcaster', mode: 'insensitive' } },
      { title: { contains: 'cauldron', mode: 'insensitive' } },
      { title: { contains: 'broomstick', mode: 'insensitive' } },
      { description: { contains: 'witch', mode: 'insensitive' } },
    ];
    return where;
  }

  if (filter.contentType) {
    where.contentType = filter.contentType;
  }
  if (filter.contentTypeIn?.length) {
    where.contentType = { in: filter.contentTypeIn };
  }
  if (filter.visualStyle) {
    where.visualStyle = filter.visualStyle;
  }
  if (filter.themesAll?.length) {
    where.themes = { hasEvery: filter.themesAll };
  }
  if (filter.themesAny?.length) {
    where.themes = { hasSome: filter.themesAny };
  }
  if (filter.genderOptionsAny?.length) {
    where.genderOptions = { hasSome: filter.genderOptionsAny };
  }
  if (filter.ageGroupsAny?.length) {
    where.ageGroups = { hasSome: filter.ageGroupsAny };
  }
  if (filter.occultTypesAny?.length) {
    where.occultTypes = { hasSome: filter.occultTypesAny };
  }

  return where;
}

// ============================================================
// Reverse lookup: which collection(s) does a single mod belong to?
//
// Used by /mods/[id] to link each mod-detail page to its collection
// page(s) — visible breadcrumb + BreadcrumbList JSON-LD (E32,
// 2026-09-10). Pure, no DB: it mirrors buildWhereClause() in memory
// so the two never disagree about membership. If you change a filter
// or a keyword fallback above, change the matching branch here.
// ============================================================

/** The subset of Mod fields the reverse lookup reads. */
export type ModFacetInput = {
  gameVersion?: string | null;
  isNSFW?: boolean | null;
  contentType?: string | null;
  visualStyle?: string | null;
  themes?: string[] | null;
  genderOptions?: string[] | null;
  ageGroups?: string[] | null;
  occultTypes?: string[] | null;
  title?: string | null;
  description?: string | null;
};

/** A minimal, client-safe link to a collection page. */
export type CollectionLink = {
  /** Trailing-slash path, e.g. `/games/sims-4/hair-cc/` */
  href: string;
  /** Short title for breadcrumbs / chips, e.g. `Hair CC` */
  title: string;
  slug: string;
  gameSlug: string;
};

/** Canonical relative path for a collection (trailing slash, see next.config.js). */
export function collectionHref(c: Pick<CollectionDefinition, 'gameSlug' | 'slug'>): string {
  return `/games/${c.gameSlug}/${c.slug}/`;
}

function hasSome(values: string[] | null | undefined, wanted: string[]): boolean {
  if (!values?.length) return false;
  return wanted.some((w) => values.includes(w));
}

function hasEvery(values: string[] | null | undefined, wanted: string[]): boolean {
  if (!values?.length) return false;
  return wanted.every((w) => values.includes(w));
}

function containsCI(haystack: string | null | undefined, needle: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * In-memory equivalent of `buildWhereClause(filter)` applied to one mod.
 * Exported for tests; most callers want `getCollectionsForMod`.
 */
export function modMatchesFilter(mod: ModFacetInput, filter: CollectionFacetQuery): boolean {
  if (filter.contentType === '__pregnancy_keyword__') {
    return (
      mod.contentType === 'pregnancy' ||
      containsCI(mod.title, 'pregnan') ||
      containsCI(mod.title, 'maternity') ||
      containsCI(mod.description, 'pregnan')
    );
  }

  if (filter.contentType === '__witch_keyword__') {
    return (
      hasSome(mod.themes, ['witch']) ||
      hasSome(mod.occultTypes, ['witch', 'spellcaster']) ||
      containsCI(mod.title, 'witch') ||
      containsCI(mod.title, 'spellcaster') ||
      containsCI(mod.title, 'cauldron') ||
      containsCI(mod.title, 'broomstick') ||
      containsCI(mod.description, 'witch')
    );
  }

  // Same precedence as buildWhereClause: contentTypeIn overwrites contentType.
  if (filter.contentTypeIn?.length) {
    if (!mod.contentType || !filter.contentTypeIn.includes(mod.contentType)) return false;
  } else if (filter.contentType) {
    if (mod.contentType !== filter.contentType) return false;
  }
  if (filter.visualStyle && mod.visualStyle !== filter.visualStyle) return false;
  // themesAny overwrites themesAll in buildWhereClause; mirror that.
  if (filter.themesAny?.length) {
    if (!hasSome(mod.themes, filter.themesAny)) return false;
  } else if (filter.themesAll?.length) {
    if (!hasEvery(mod.themes, filter.themesAll)) return false;
  }
  if (filter.genderOptionsAny?.length && !hasSome(mod.genderOptions, filter.genderOptionsAny)) {
    return false;
  }
  if (filter.ageGroupsAny?.length && !hasSome(mod.ageGroups, filter.ageGroupsAny)) return false;
  if (filter.occultTypesAny?.length && !hasSome(mod.occultTypes, filter.occultTypesAny)) {
    return false;
  }
  return true;
}

/**
 * Specificity used to pick the *primary* collection for a breadcrumb:
 * a contentType-based collection ("Hair CC") describes what the mod
 * *is*; a theme/occult collection ("Goth CC") describes a style it
 * carries. Lower sorts first.
 */
function filterSpecificity(filter: CollectionFacetQuery): number {
  if (filter.contentType === '__pregnancy_keyword__' || filter.contentType === '__witch_keyword__') {
    return 2; // keyword fallbacks are the loosest match
  }
  if (filter.contentType || filter.contentTypeIn?.length) return 0;
  return 1;
}

/**
 * Every collection this mod would appear in, primary first.
 *
 * Applies the same safety gates as the collection page
 * (`gameVersion` must equal the collection's game, `isNSFW` false), so a
 * mod is only linked to a page that actually lists it. Registry order is
 * preserved within the same specificity tier.
 */
export function getCollectionsForMod(mod: ModFacetInput): CollectionDefinition[] {
  if (mod.isNSFW) return [];
  const matches = SIMS4_COLLECTIONS.filter(
    (c) => c.game === mod.gameVersion && modMatchesFilter(mod, c.filter),
  );
  return matches
    .map((c, i) => ({ c, i, s: filterSpecificity(c.filter) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.c);
}

/** Client-safe projection of `getCollectionsForMod` (no intro text in the bundle). */
export function getCollectionLinksForMod(mod: ModFacetInput): CollectionLink[] {
  return getCollectionsForMod(mod).map((c) => ({
    href: collectionHref(c),
    title: c.title,
    slug: c.slug,
    gameSlug: c.gameSlug,
  }));
}
