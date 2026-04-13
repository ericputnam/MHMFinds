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
  /** Slugs of related collections for internal linking */
  related: string[];
  /** Optional cross-link to the original blog article */
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
    metaTitle: 'Sims 4 Pregnancy Mods — 100+ Maternity CC Finds | MustHaveMods',
    metaDescription:
      'Hand-picked Sims 4 pregnancy mods and maternity CC. Realistic belly overlays, maternity clothes, pregnancy gameplay tweaks, and more.',
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
    related: ['female-clothes', 'poses', 'skin-details'],
  },
  {
    slug: 'holidays-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Holidays & Seasonal CC',
    heading: 'Sims 4 Holiday & Seasonal CC',
    metaTitle: 'Sims 4 Holiday CC — 900+ Seasonal Mods & Decor | MustHaveMods',
    metaDescription:
      'The best Sims 4 holiday and seasonal custom content. Christmas, Halloween, Valentine\'s, Easter, and more decor, clothes, and gameplay for every season.',
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
    related: ['clutter', 'furniture', 'female-clothes'],
  },
  {
    slug: 'clutter',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Clutter & CC Finds',
    heading: 'Sims 4 Clutter CC',
    metaTitle: 'Sims 4 Clutter CC — 140+ Must-Have Finds | MustHaveMods',
    metaDescription:
      'The best Sims 4 clutter CC for builders who love the tiny details. Books, trinkets, kitchen bits, and shelf essentials from top creators.',
    tagline: 'Books, trinkets, and the tiny details that make a build',
    intro:
      'Clutter is what separates a finished build from a staged one. A shelf without stacked books looks empty. A kitchen counter without coffee mugs, a half-eaten bagel, and the one random takeout menu looks like a showroom. Vanilla Sims 4 gives you maybe a dozen usable clutter meshes. The community has made thousands.\n\nWe lean heavily on the usual build suspects here — Felixandre, Pierisim, HeyHarrie, and Severinka\'s sets pop up repeatedly because their clutter reads at the size Sims 4 cameras actually see. But the finds further down the grid are where it gets interesting: single-set releases from creators who built one perfect witch altar or one perfect apothecary shelf and then disappeared for a year.\n\nFilter by theme on the main mod finder if you want clutter that matches the room you\'re already building. Everything in this collection is live-link checked and cleared of the NSFW flag, so you can grab anything from the grid without vetting the link.',
    filter: { contentType: 'clutter' },
    expectedCount: 148,
    related: ['furniture', 'holidays-cc', 'decor'],
  },
  {
    slug: 'hair-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Hair CC',
    heading: 'Sims 4 Hair CC',
    metaTitle: 'Sims 4 Hair CC — 1,700+ Alpha & Maxis Match Styles | MustHaveMods',
    metaDescription:
      'Over 1,700 Sims 4 hair CC picks. Alpha, maxis match, curly, braids, buns, short cuts, and long styles for every sim.',
    tagline: 'Alpha, maxis match, and every style in between',
    intro:
      'Hair is where most Sims 4 CC journeys start, and for good reason — the base game has maybe six hairstyles you can look at without flinching. Everything else gets a recolor pass and that\'s the wardrobe.\n\nThe 1,700+ hair CC picks in this collection split roughly in half between alpha (Simpliciaty, Anto, Stealthic territory — shiny, high-detail, the aesthetic most gameplay YouTubers use) and maxis match (Sentate, SimStrouds, Aharris00britney — matches EA\'s art style without sticking out). We also pulled in the curly and textured hair creators worth knowing by name — NaevysSims and Ebonix come up constantly because they\'re some of the few people shipping hair that actually looks like Black hair instead of a texture slapped on a straight mesh.\n\nSort by downloads for the known quantities and scroll for the less-obvious picks. Every hair in the collection is Sims 4 specifically — no cross-game mixups — and the grid is filtered to verified, SFW mods only.',
    filter: { contentType: 'hair' },
    expectedCount: 1780,
    related: ['skin-details', 'female-clothes', 'male-clothes'],
  },
  {
    slug: 'tattoos',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Tattoos',
    heading: 'Sims 4 Tattoo CC',
    metaTitle: 'Sims 4 Tattoo CC — 100+ Realistic & Alpha Designs | MustHaveMods',
    metaDescription:
      'Sims 4 tattoo CC for every vibe. Sleeves, back pieces, small minimal ink, and full body coverage from alpha creators.',
    tagline: 'Sleeves, back pieces, small ink, and full coverage',
    intro:
      'Sims 4 ships with a handful of tattoos that haven\'t been updated since 2014. They look it. If you want ink that actually reads as a real design at CAS distance — a fine-line flower on the collarbone, a sleeve that wraps properly, a single small piece that doesn\'t pixelate when you zoom in — you need community tattoo CC.\n\nThis collection is smaller than the hair or clothing grids (about a hundred mods) because tattoo CC is a narrower niche, but it\'s one of the categories where the drop in quality between vanilla and community content is most obvious. Creators like Pralinesims, Sims3Melancholic, and remussirion have basically carried the scene for years.\n\nYou\'ll find sleeves, back pieces, small minimalist ink, and a handful of full-body sets. If you build story-heavy sims, tattoos are one of the cheapest character-building details you can add — a single well-chosen piece communicates more about a sim than half the traits panel.',
    filter: { contentType: 'tattoos' },
    expectedCount: 107,
    related: ['skin-details', 'male-clothes', 'female-clothes'],
  },
  {
    slug: 'skin-details',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Skin Details',
    heading: 'Sims 4 Skin Details CC',
    metaTitle: 'Sims 4 Skin Details — 270+ Overlays & Freckles | MustHaveMods',
    metaDescription:
      'Sims 4 skin details, overlays, freckles, moles, and body blush CC. Add realism to any sim with hand-picked skin details.',
    tagline: 'Overlays, freckles, moles, and body blush for realism',
    intro:
      'Skin details are the CAS layer most people skip and then wonder why their sims look slightly uncanny. Vanilla skin is flat. No freckles, no moles, no cheek blush that actually sits on the face, no body hair that looks like anything other than a shadow. Community skin overlays fix all of this with a few CAS clicks.\n\nWe\'ve pulled together about 275 skin detail picks: full skin overlays that replace the base texture, freckle maps, mole placement sets, nose bridge details, cheek blushes, body hair, pregnancy stretch marks, and the specialty stuff like aging details and sunspots. Pralinesims and Obscurus-Sims turn up a lot here because they\'ve been shipping realistic skin overlays for years, but there\'s a long tail of smaller skin creators doing great work on specific features.\n\nMost of these stack — you can layer a skin overlay, freckles, a blush, and a nose detail all on one sim. The trick is stopping before you over-CAS them into looking like a different art style than the hair and clothes you\'re using.',
    filter: { contentType: 'skin' },
    expectedCount: 276,
    related: ['hair-cc', 'tattoos', 'female-clothes'],
  },
  {
    slug: 'male-clothes',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Male Clothes CC',
    heading: 'Sims 4 Male Clothes CC',
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
    related: ['female-clothes', 'hair-cc', 'tattoos'],
  },
  {
    slug: 'female-clothes',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Female Clothes CC',
    heading: 'Sims 4 Female Clothes CC',
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
    related: ['male-clothes', 'hair-cc', 'skin-details'],
  },
  {
    slug: 'furniture-cc',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Furniture CC',
    heading: 'Sims 4 Furniture CC',
    metaTitle: 'Sims 4 Furniture CC — 900+ Build & Buy Finds | MustHaveMods',
    metaDescription:
      'The best Sims 4 furniture CC for every room. Sofas, beds, dining sets, shelves, and statement pieces from top creators.',
    tagline: 'Sofas, beds, shelves, and statement pieces',
    intro:
      'If you\'ve ever tried to build a cohesive living room with just base-game furniture, you already know the problem: every sofa looks like every other sofa, and the "design" options are a color swatch. Furniture CC is what turns Sims 4 Build mode from a chore into the reason people actually play.\n\nThis is a 900+ mod collection covering the full stack: sofas and armchairs, beds, dining sets, shelves, desks, kitchen islands, vanities, outdoor seating, and the statement pieces (clawfoot tubs, chesterfield couches, old-world wardrobes) that anchor a whole room. The heavy hitters here are the build CC creators everyone knows — Felixandre, Pierisim, HarrieCC, Myshunosun, and Syboubou — because they\'ve been shipping cohesive sets for long enough that you can build an entire house from a single creator\'s catalog.\n\nSort by downloads for the already-popular picks, or scroll for smaller sets that pair well with the staples. Everything here is Sims 4 specifically, verified, and SFW — grab what you want and go build.',
    filter: { contentType: 'furniture' },
    expectedCount: 901,
    related: ['clutter', 'holidays-cc', 'decor'],
  },
  {
    slug: 'poses',
    game: 'Sims 4',
    gameSlug: 'sims-4',
    title: 'Pose Packs',
    heading: 'Sims 4 Pose Packs',
    metaTitle: 'Sims 4 Pose Packs — 500+ CAS & In-Game Poses | MustHaveMods',
    metaDescription:
      'The best Sims 4 pose packs for screenshots, CAS, couples, and storytelling. Hand-picked pose packs from top creators.',
    tagline: 'Screenshot-ready poses for CAS, couples, and stories',
    intro:
      'Poses are what Sims 4 storytellers and CAS screenshotters use instead of the default "sim stands awkwardly with hands at sides" loop. If you\'ve ever looked at a Sims Instagram or a machinima YouTube channel and wondered how the sims look like they\'re actually posing, the answer is almost always a pose pack and the Pose Player mod.\n\nWe\'ve pulled together nearly 600 pose picks here, leaning on the creators who basically built the Sims pose community — Katverse, Helgatisha, Natalia Auditore, Ratboysims — along with a long list of smaller pose makers whose single-pack releases are often better than the big comprehensive sets. Expect CAS poses (for the character sheets people love to make), couple poses for story beats, family poses, maternity poses, and individual storytelling poses that cover everything from quiet character moments to dramatic screenshots.\n\nYou\'ll need Pose Player and Teleport Any Sim to actually use these in-game. Once you\'ve got those two mods installed, the rest is just picking which pose pack matches the scene you\'re trying to tell.',
    filter: { contentType: 'poses' },
    expectedCount: 573,
    related: ['female-clothes', 'male-clothes', 'pregnancy-mods'],
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

  // Phase 1 temporary: pregnancy keyword fallback
  if (filter.contentType === '__pregnancy_keyword__') {
    where.OR = [
      { title: { contains: 'pregnan', mode: 'insensitive' } },
      { title: { contains: 'maternity', mode: 'insensitive' } },
      { description: { contains: 'pregnan', mode: 'insensitive' } },
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

  return where;
}
