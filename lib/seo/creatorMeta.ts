/**
 * Title + meta description for /creator/[slug] (E267, Sage, 2026-10-25).
 *
 * Measured on GSC 2026-09-25→10-22: 527 creator pages earned 16,170
 * impressions and 179 clicks (CTR 1.11%). In the position 6–10 bucket the
 * 250 creator pages converted 8,117 impressions into 76 clicks (0.94%),
 * while /mods/* pages in the same bucket ran 2.9% — a 3× gap on the same
 * SERP positions. The queries are "<creator> sims 4" / "<creator> sims 4 cc"
 * ("miro sims 4" 115 impr, 2 clicks @ 7.7; orchiona 380 impr, 3 clicks @ 9.6).
 *
 * Two defects this fixes:
 *
 * 1. Every creator page carried the same description — "…hair, clothes,
 *    furniture, gameplay and more, with download links." — which is false
 *    for most of them (a 26-shoe creator has no gameplay mods) and tells a
 *    searcher nothing the other nine results don't. The description now
 *    names the creator's real content types and their most-downloaded mods.
 * 2. The title ended in a bare count, "(9) | MustHaveMods", which reads like
 *    a database row. The count moved into the description as prose and the
 *    title gained the creator's top content types instead.
 *
 * Pure functions, no I/O — `__tests__/unit/creator-meta.test.ts` imports
 * them and `app/creator/[slug]/page.tsx` is the only production caller.
 */

import { META_DESCRIPTION_MAX, SITE_NAME, truncateAtWord } from './modMeta';

/** The subset of a catalog Mod the meta needs. */
export interface CreatorMetaMod {
  title: string;
  contentType?: string | null;
  isFree?: boolean | null;
}

export interface CreatorMetaInput {
  displayName: string;
  totalMods: number;
  /** Ordered by downloads desc, as `getCreatorPageData` returns them. */
  mods: ReadonlyArray<CreatorMetaMod>;
}

/** Title length Google reliably shows in full on desktop. */
export const TITLE_MAX = 65;
/** How many content types the title / description name at most. */
export const MAX_TYPES = 3;
/** How many top mod titles the description tries to fit. */
export const MAX_TOP_MODS = 3;

/**
 * Human labels for `contentType` values, written as the plural noun a
 * searcher would use. A type that is missing here is left out of the prose
 * rather than hyphen-split — "royals" or "cc-finds" are not things a reader
 * asks for, and a wrong word in a title is worse than a shorter title.
 */
export const CONTENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  hair: 'hair',
  'full-body': 'outfits',
  furniture: 'furniture',
  tops: 'tops',
  poses: 'poses',
  decor: 'decor',
  dresses: 'dresses',
  shoes: 'shoes',
  residential: 'houses',
  makeup: 'makeup',
  holidays: 'holiday CC',
  'gameplay-mod': 'gameplay mods',
  bottoms: 'bottoms',
  jewelry: 'jewelry',
  skin: 'skins',
  lot: 'lots',
  preset: 'presets',
  hats: 'hats',
  accessories: 'accessories',
  tattoos: 'tattoos',
  clutter: 'clutter',
  'loading-screen': 'loading screens',
  nails: 'nails',
  eyes: 'eyes',
  eyebrows: 'eyebrows',
  workout: 'activewear',
  glasses: 'glasses',
  'cas-background': 'CAS backgrounds',
  'body-preset': 'body presets',
  plants: 'plants',
  beard: 'beards',
  'script-mod': 'script mods',
  rugs: 'rugs',
  'wall-art': 'wall art',
  gym: 'gym equipment',
  lipstick: 'lipsticks',
  commercial: 'commercial lots',
  eyeliner: 'eyeliner',
  'facial-hair': 'facial hair',
  lighting: 'lighting',
  blush: 'blush',
  'pet-furniture': 'pet furniture',
  lashes: 'lashes',
  watches: 'watches',
  builds: 'builds',
  'pet-accessories': 'pet accessories',
  pregnancy: 'pregnancy mods',
  infant: 'infant CC',
  career: 'career mods',
  vehicles: 'vehicles',
  'pet-clothing': 'pet clothing',
  food: 'food',
  curtains: 'curtains',
};

const GAMEPLAY_TYPES: ReadonlySet<string> = new Set(['gameplay-mod', 'script-mod', 'career', 'pregnancy']);

/**
 * The creator's content types, most frequent first, as human labels.
 * Unlabelled and null types are skipped; ties keep first-seen (download) order.
 */
export function creatorTypeLabels(mods: ReadonlyArray<CreatorMetaMod>, max: number = MAX_TYPES): string[] {
  const counts = new Map<string, number>();
  for (const mod of mods) {
    const type = mod.contentType;
    if (!type || !(type in CONTENT_TYPE_LABELS)) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([type]) => CONTENT_TYPE_LABELS[type]);
}

/** "shoes", "shoes and tops", "shoes, tops and dresses". */
export function joinNatural(items: ReadonlyArray<string>): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "gameplay mods" → "Gameplay Mods"; "CAS backgrounds" → "CAS Backgrounds". */
function titleCase(label: string): string {
  return label
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Whether the creator's catalog is mostly gameplay rather than CC, so the
 * page is called "Sims 4 Mods" rather than "Sims 4 CC & Mods".
 */
export function isGameplayCreator(mods: ReadonlyArray<CreatorMetaMod>): boolean {
  const typed = mods.filter((m) => m.contentType);
  if (typed.length === 0) return false;
  const gameplay = typed.filter((m) => GAMEPLAY_TYPES.has(m.contentType as string)).length;
  return gameplay * 2 > typed.length;
}

/**
 * "<name> Sims 4 CC & Mods — Shoes, Tops & Dresses | MustHaveMods"
 * "<name> Sims 4 Mods — Gameplay Mods | MustHaveMods"      (gameplay creator)
 * "<name> Sims 4 CC & Mods | MustHaveMods"                 (no labelled types / too long)
 *
 * The leading "<name> Sims 4 CC & Mods" is kept verbatim from the previous
 * title: it is the exact-match for the "<creator> sims 4" / "<creator> sims
 * 4 cc" queries these pages already rank for. Types are dropped from the
 * right until the title fits TITLE_MAX; the base title is never cut.
 */
export function creatorPageTitle(input: CreatorMetaInput): string {
  const name = input.displayName.trim();
  const base = isGameplayCreator(input.mods) ? `${name} Sims 4 Mods` : `${name} Sims 4 CC & Mods`;
  const suffix = ` | ${SITE_NAME}`;
  const labels = creatorTypeLabels(input.mods).map(titleCase);
  for (let n = labels.length; n > 0; n--) {
    const types = labels.slice(0, n);
    const typePart =
      types.length > 1 ? `${types.slice(0, -1).join(', ')} & ${types[types.length - 1]}` : types[0];
    const candidate = `${base} — ${typePart}${suffix}`;
    if (candidate.length <= TITLE_MAX) return candidate;
  }
  return `${base}${suffix}`;
}

/**
 * "Madlen's Sims 4 CC: 100 shoes, tops and dresses, ranked by downloads —
 *  8 Allure Shoes Set, Snugg Puff Set, 6 Vault Shoes Set and more. Every
 *  download link checked."
 *
 * Top mod titles are dropped from the right until the whole thing fits in
 * META_DESCRIPTION_MAX so a mod name is never cut mid-word; the sentence
 * still ends cleanly with zero titles. Everything in it is true for this
 * creator: the count, the types, the titles, and "free" only when every
 * listed mod is free.
 */
export function creatorMetaDescription(input: CreatorMetaInput): string {
  const name = input.displayName.trim();
  const n = input.totalMods;
  const gameplay = isGameplayCreator(input.mods);
  const typeLabels = creatorTypeLabels(input.mods);
  const typesPhrase = typeLabels.length > 0 ? joinNatural(typeLabels) : gameplay ? 'mods' : 'mods and custom content';
  const kind = gameplay ? 'Sims 4 mods' : 'Sims 4 CC';
  const allFree = input.mods.length > 0 && input.mods.every((m) => m.isFree === true);
  const freeWord = allFree ? 'free ' : '';
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;

  const lead = `${possessive} ${kind}: ${n} ${freeWord}${typesPhrase}, ranked by downloads`;
  const tail = 'Every download link checked.';
  const titles = input.mods
    .map((m) => m.title.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0)
    .slice(0, MAX_TOP_MODS);

  for (let k = titles.length; k > 0; k--) {
    const list = titles.slice(0, k).join(', ');
    const candidate = `${lead} — ${list} and more. ${tail}`;
    if (candidate.length <= META_DESCRIPTION_MAX) return candidate;
  }
  return truncateAtWord(`${lead}. ${tail}`, META_DESCRIPTION_MAX);
}
