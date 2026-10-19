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
 * Per-family OFF-type words: a gameplay mod is anything that is not a CAS
 * item, an object or a lot, so on-type is defined by the absence of those.
 * Negative definition on purpose — gameplay titles are heterogeneous ("MC
 * Command Center", "UI Cheats", "Slice of Life") and a positive list would
 * reject real mods.
 */
export const OFF_TYPE_RE: Readonly<Record<string, RegExp>> = {
  gameplay:
    /\b(hair(?:style)?s?|dress(?:es)?|skirts?|tops?|jeans|shoes?|boots?|heels|skin(?:tone| overlay| detail)?s?|eyes?|eyebrows?|lashes|lipstick|blush|eyeshadow|nails?|tattoos?|earrings?|necklace|rings?|sofa|couch|bed(?:room)?|kitchen|bathroom|house|villa|apartment|lot|mansion|cottage|clutter|rug|curtains?|wallpaper|flooring|pose(?: pack)?s?)\b/i,
};

export interface HubGrade {
  rule: HubRule;
  totalSfw: number;
  topAudited: number;
  adultInTop: Array<{ id: string; title: string; via: 'watchlist' | 'title' }>;
  offTypeInTop: Array<{ id: string; title: string; word: string }>;
  eligible: boolean;
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

  return {
    rule,
    totalSfw,
    topAudited: audited.length,
    adultInTop,
    offTypeInTop,
    eligible: reasons.length === 0,
    reasons,
  };
}

/** The decision rule as one printable block — printed BEFORE the reading. */
export function formatRule(rule: HubRule, family: string | undefined): string {
  return [
    `RULE (printed before the read): ELIGIBLE iff`,
    `  (a) SFW rows under the page's own where >= ${rule.minRows}`,
    `  (b) 0 adult-themed SFW-flagged titles in the top ${rule.topN} by downloads (watchlist ids OR ADULT_TITLE_RE)`,
    `  (c) 0 off-type titles in the top ${rule.topN}${family ? ` (OFF_TYPE_RE.${family})` : ' (no family given: leg (c) is vacuous)'}`,
  ].join('\n');
}

export function formatGrade(g: HubGrade): string {
  const lines: string[] = [];
  lines.push(`SFW rows: ${g.totalSfw} (need >= ${g.rule.minRows}) · audited top ${g.topAudited} of ${g.rule.topN}`);
  lines.push(`adult-themed SFW-flagged in top ${g.rule.topN}: ${g.adultInTop.length}`);
  for (const a of g.adultInTop) lines.push(`  - [${a.via}] ${a.id} ${a.title}`);
  lines.push(`off-type in top ${g.rule.topN}: ${g.offTypeInTop.length}`);
  for (const o of g.offTypeInTop) lines.push(`  - "${o.word}" ${o.id} ${o.title}`);
  lines.push(`VERDICT: ${g.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}${g.reasons.length ? ' — ' + g.reasons.join('; ') : ''}`);
  return lines.join('\n');
}
