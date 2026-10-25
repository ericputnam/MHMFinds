/**
 * Collection-hub eligibility, pure grading (Sage, E238, 2026-10-19).
 *
 * Before a facet gets a `/games/sims-4/<slug>/` hub the 10-18 rule was applied
 * by hand: the facet must have >= 20 SFW rows, its top 30 by downloads must be
 * on-type, and none of the top 30 may be an adult-themed title that is still
 * SFW-flagged (a Mediavine first-paint exposure). The gameplay family
 * (~570 GSC impr/28d, the biggest no-hub term) failed only the last leg: 8
 * adult-themed titles sat in its top 25 with `isNSFW` unset. Rowan's isNSFW
 * pass (E242) lands 10-19; this module makes the re-read one command and
 * prints the decision rule before the reading (standing rule).
 *
 * The I/O (Prisma, argv) lives in collection-hub-eligibility.ts; this module
 * never touches the database. The selection the script mirrors is the hub
 * page's own: `buildWhereClause(filter)` + `gameVersion` + `isNSFW: false`,
 * ordered `downloadCount desc, createdAt desc` (app/games/[game]/[topic]).
 */

export interface HubRow {
  id: string;
  title: string;
  contentType: string | null;
  isNSFW: boolean | null;
  downloadCount: number;
}

export interface HubRule {
  /** SFW rows the facet must hold (autonomy.md Tier 0: "must have >= 20 mods"). */
  minRows: number;
  /** How many rows from the top of the grid are audited — the above-the-fold unit. */
  topN: number;
}

export const DEFAULT_RULE: HubRule = { minRows: 20, topN: 30 };

/**
 * The 8 gameplay titles named in playbooks/sage.md 2026-10-18, by id, so the
 * post-pass read reports each one's flag instead of trusting a word list.
 * Keep ids, not titles: Rowan's pass may retitle nothing and flip the flag.
 */
export const GAMEPLAY_ADULT_WATCHLIST: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'cmijppd0j0162oxc81yf6k5dz', label: 'MC WooHoo' },
  { id: 'cmim8rrvz002boxy8vcqt0yrg', label: 'Wicked Whims' },
  { id: 'cmijppj1r0166oxc850u0lir1', label: 'Prostitution Mod' },
  { id: 'cmim9dnuf000yoxqwqbhi32f4', label: 'Ho* It Up' },
  { id: 'cmim9jz39002uoxy7z2tbyidh', label: 'Breast Slider' },
  { id: 'cmikk9oj9006tox331c1a2g0g', label: 'Basemental' },
  { id: 'cmim91d7u01l8oxy8mrvijtik', label: 'Wonderful Whims' },
  { id: 'cmim8rs4i002eoxy8enc7gbsp', label: 'Cuddle and Bath' },
];

/**
 * Title words that mark an adult-themed mod regardless of its flag. Measured
 * against the gameplay facet's top 30 on 2026-10-19 (pre-pass): every one of
 * the 8 watchlist titles matches at least one of these, and no clean row does.
 * `\bwhims?\b` is deliberately narrow — "WonderfulWhims" and "WickedWhims" are
 * written as one word by their creators, hence the optional space.
 */
export const ADULT_TITLE_RE =
  /\b(wicked ?whims|wonderful ?whims|woohoo|basemental|prostitut\w*|nsfw|breast slider|ho[e*]? ?it up|strip ?club|sex(?:ual)?|nude|nudity|porn)\b/i;

/**
 * Per-family OFF-type words. Each family's on-type is defined by the ABSENCE
 * of these words — negative definition on purpose: gameplay titles are
 * heterogeneous ("MC Command Center", "UI Cheats", "Slice of Life") and lot
 * titles are proper nouns ("Quant House", "Rivelin Lake"), so a positive list
 * would reject real rows. Every word here was measured against the WHOLE
 * family on prod before it was added; rejections are recorded with counts so
 * nobody re-proposes them.
 *
 * A grade with no family is NOT eligible — leg (c) was not checked, and a
 * probe that did not look returns INCONCLUSIVE, never a verdict (E252: the
 * 10-21 read of lot+residential printed ELIGIBLE on a grid whose first 48
 * rows were 18/48 objects, careers, a save file, an EA pack and a Sim).
 */
export const OFF_TYPE_RE: Readonly<Record<string, RegExp>> = {
  // `nails?` → `nails|nail (polish|art|…)` (E252, 10-21): the singular alone
  // matched "Nail Technician" (career mod, #29 of the gameplay top 30). Measured
  // on prod 2026-10-21: singular `nail` outside the nails facet is 10 titles and
  // 0 of them are CAS nails (2 poses, 2 holiday sets, 1 full-body, 3 furniture
  // salons, 1 decor, 1 career); inside the nails facet 120/161 titles use the
  // plural and 23 are singular-only, 9 of those compound (polish/art/set/…).
  // `nails?` across the whole gameplay family (544 rows) hit exactly 1 title —
  // the career — so the singular bought nothing there. On the nails facet the
  // new pattern keeps 136 of the 143 titles `nails?` caught; the 7 it drops
  // are 2 nail SALONS (objects, correctly not CAS) and 5 bare-singular titles
  // ("Colorful Almond Nail") that never appear in a gameplay grid.
  gameplay:
    /\b(hair(?:style)?s?|dress(?:es)?|skirts?|tops?|jeans|shoes?|boots?|heels|skin(?:tone| overlay| detail)?s?|eyes?|eyebrows?|lashes|lipstick|blush|eyeshadow|nails|nail (?:polish|art|set|pack|cc|design|colou?r|tips?|shape|retexture|recolou?r|collection)s?|tattoos?|earrings?|necklace|rings?|sofa|couch|bed(?:room)?|kitchen|bathroom|house|villa|apartment|lot|mansion|cottage|clutter|rug|curtains?|wallpaper|flooring|pose(?: pack)?s?)\b/i,
  // lots = contentType lot | residential | commercial | community. On-type is
  // a downloadable lot (house, venue, apartment). Measured against all 959
  // SFW rows on prod 2026-10-21 — hits / hits that are NOT a lot:
  //   walls 49/49 · sets 34/34 · packs 22/22 · part N 18/18 · doors 17/17 ·
  //   windows 16/16 · collection 7/7 · wallpaper 5/5 · tiles 4/4 · traits 4/4 ·
  //   jobs 3/3 · plants 3/3 · save file 3/3 · career 2/2 · challenge 2/2 ·
  //   build/buy 2/2 · essentials 2/2 · set up 2/2 · mods 2/2 · lamps 2/2 ·
  //   posters 2/2 · paintings 2/2 · swing, pacifier, decals, tvs, bookshelf,
  //   playpen, heels, rugs, furniture, broom, kit, cats & dogs 1/1 each.
  // REJECTED (a real lot would be flagged): `cc` 32 hits, 3 are "(No CC)"
  //   lots and 2 more are venues ("Bridgecreek Police Station CC"); `home` 49,
  //   ~40 lots; `starter` 22, 21 lots; `\w*room` 7, 3 lots ("Ranch 5-Bedroom…",
  //   "Mushroom Fairy House"); `functional` 4, 1 lot ("Tokyo Bar + Restaurant
  //   Multi-functional Lot"); `kiss` 2, 1 lot ("Kiss of Autumn"); `shed` 1,
  //   ambiguous. Known misses in the 10-21 top 48 that no title word can
  //   catch: "Kiss and Grind" (gameplay), "Eva" (a Sim) — hand-grade those.
  lots:
    /\b(careers?|jobs?|challenge|save ?files?|build\/buy|wallpapers?|walls?|doors?|windows?|tiles?|plants?|decals?|tvs?|bookshel(?:f|ves)|playpen|heels|lamps?|rugs?|posters?|paintings?|traits?|swing|pacifier|set ?up|essentials|furniture|collections?|packs?|sets?|part\.? ?\d|mods?|cats & dogs|broom|kits?)\b/i,
  // ui-preset = GShade / ReShade visual presets (E272, 2026-10-25). On-type is
  // a visual preset; off-type is the CAS preset family the rows used to share
  // a facet with (nose / lip / eye / body presets, sliders) and anything
  // wearable or buildable. Measured against the 95 title-matched rows on
  // 2026-10-25: 0 hits. REJECTED: `eyes?` — "Easy on the Eyes GShade Preset"
  // is on-type (1/1 hit on-type); `cas` — "Coffee Jelly GShade for CAS" and
  // "Sims 4 Reshade Angleic CAS" are presets tuned for CAS (2/2 on-type);
  // `presets?` is the on-type word itself.
  'ui-preset':
    /\b(nose|noses|lips?|mouth|chin|jaw|cheeks?|ears?|body|face|sliders?|skin|hair|dress(?:es)?|tops?|shoes?|furniture|clutter|poses?|lot|house|makeup|eyeliner|lashes|eyebrows?|tattoos?|nails?|lighting)\b/i,
};

/** The families leg (c) can grade; the CLI rejects anything else. */
export const OFF_TYPE_FAMILIES: ReadonlyArray<string> = Object.keys(OFF_TYPE_RE);

export type HubVerdict = 'ELIGIBLE' | 'NOT ELIGIBLE' | 'INCONCLUSIVE';

export interface HubGrade {
  rule: HubRule;
  totalSfw: number;
  topAudited: number;
  adultInTop: Array<{ id: string; title: string; via: 'watchlist' | 'title' }>;
  offTypeInTop: Array<{ id: string; title: string; word: string }>;
  /** False when no `family` was given — leg (c) was not checked. */
  offTypeGraded: boolean;
  /** True only when all three legs were checked AND passed. */
  eligible: boolean;
  /** ELIGIBLE / NOT ELIGIBLE / INCONCLUSIVE (legs a+b pass, leg c ungraded). */
  verdict: HubVerdict;
  reasons: string[];
}

/**
 * Grade a hub candidate. `top` must already be the page's own ordering and
 * selection (SFW only); `totalSfw` is the page's `count` under the same where.
 */
export function gradeHub(
  top: ReadonlyArray<HubRow>,
  totalSfw: number,
  opts: {
    rule?: HubRule;
    family?: keyof typeof OFF_TYPE_RE;
    watchlist?: ReadonlyArray<{ id: string; label: string }>;
  } = {},
): HubGrade {
  const rule = opts.rule ?? DEFAULT_RULE;
  const watch = new Set((opts.watchlist ?? []).map((w) => w.id));
  const offRe = opts.family ? OFF_TYPE_RE[opts.family] : undefined;
  const audited = top.slice(0, rule.topN);

  const adultInTop: HubGrade['adultInTop'] = [];
  const offTypeInTop: HubGrade['offTypeInTop'] = [];
  for (const r of audited) {
    if (watch.has(r.id)) adultInTop.push({ id: r.id, title: r.title, via: 'watchlist' });
    else if (ADULT_TITLE_RE.test(r.title)) adultInTop.push({ id: r.id, title: r.title, via: 'title' });
    const m = offRe ? r.title.match(offRe) : null;
    if (m) offTypeInTop.push({ id: r.id, title: r.title, word: m[0] });
  }

  const reasons: string[] = [];
  if (totalSfw < rule.minRows) reasons.push(`SFW rows ${totalSfw} < ${rule.minRows}`);
  if (adultInTop.length > 0) reasons.push(`adult-themed SFW-flagged in top ${rule.topN}: ${adultInTop.length}`);
  if (offTypeInTop.length > 0) reasons.push(`off-type in top ${rule.topN}: ${offTypeInTop.length}`);

  const offTypeGraded = offRe !== undefined;
  const failed = reasons.length > 0;
  if (!offTypeGraded) {
    reasons.push(`leg (c) NOT graded: no --family= given (one of: ${OFF_TYPE_FAMILIES.join(', ')})`);
  }
  const verdict: HubVerdict = failed ? 'NOT ELIGIBLE' : offTypeGraded ? 'ELIGIBLE' : 'INCONCLUSIVE';

  return {
    rule,
    totalSfw,
    topAudited: audited.length,
    adultInTop,
    offTypeInTop,
    offTypeGraded,
    eligible: verdict === 'ELIGIBLE',
    verdict,
    reasons,
  };
}

/** The decision rule as one printable block — printed BEFORE the reading. */
export function formatRule(rule: HubRule, family: string | undefined): string {
  return [
    `RULE (printed before the read): ELIGIBLE iff`,
    `  (a) SFW rows under the page's own where >= ${rule.minRows}`,
    `  (b) 0 adult-themed SFW-flagged titles in the top ${rule.topN} by downloads (watchlist ids OR ADULT_TITLE_RE)`,
    `  (c) 0 off-type titles in the top ${rule.topN}${
      family
        ? ` (OFF_TYPE_RE.${family})`
        : ` (NO family given: leg (c) will not be graded — the verdict can be at most INCONCLUSIVE; pass --family=${OFF_TYPE_FAMILIES.join('|')})`
    }`,
  ].join('\n');
}

export function formatGrade(g: HubGrade): string {
  const lines: string[] = [];
  lines.push(`SFW rows: ${g.totalSfw} (need >= ${g.rule.minRows}) · audited top ${g.topAudited} of ${g.rule.topN}`);
  lines.push(`adult-themed SFW-flagged in top ${g.rule.topN}: ${g.adultInTop.length}`);
  for (const a of g.adultInTop) lines.push(`  - [${a.via}] ${a.id} ${a.title}`);
  if (g.offTypeGraded) {
    lines.push(`off-type in top ${g.rule.topN}: ${g.offTypeInTop.length}`);
    for (const o of g.offTypeInTop) lines.push(`  - "${o.word}" ${o.id} ${o.title}`);
  } else {
    lines.push(`off-type in top ${g.rule.topN}: NOT GRADED (no family) — read the table above by hand before quoting this grade`);
  }
  lines.push(`VERDICT: ${g.verdict}${g.reasons.length ? ' — ' + g.reasons.join('; ') : ''}`);
  return lines.join('\n');
}
