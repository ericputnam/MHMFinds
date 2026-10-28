/**
 * Creator page search snippet — title + meta description (Nova, E278, 2026-10-28)
 *
 * Why: /creator/[slug]/ pages earn impressions for "<name> sims 4" and
 * "<name> sims 4 cc" (GSC 2026-09-28→10-25: 533 pages, 16,759 impressions,
 * 179 clicks, CTR 1.07%, mean position 12.61), but every one of the ~550
 * pages carried the same template: "N Sims 4 mods ... hair, clothes,
 * furniture, gameplay and more". That list is false for most creators (a
 * hair creator has no furniture) and says nothing a searcher can choose on.
 * The snippet now names what this creator actually makes, from their own
 * rows, and their newest listing when it is recent.
 *
 * Rejected before building (recorded so nobody re-proposes it): lowering
 * MIN_MODS_FOR_PAGE from 5 to 3. Name-query demand for the 322 creators with
 * 3–4 SFW mods was ~0 once junk "authors" were removed (top rows:
 * musthavemods 2,134 impr, sims4cc 2,094, toddler 132, hairstyle 82 — none
 * a creator); the 5–9 bucket alone earned 4,211.
 *
 * Pure, so the copy is unit-tested offline. Labels are an ALLOWLIST: a
 * contentType value not listed here is never printed. Theme values that a
 * backfill wrote into contentType (holidays, workout, gym, royals, princess,
 * easter — see ideas-inbox, Rowan) are deliberately absent, as is null.
 */

/** contentType → plural label for copy. Not listed = never shown. */
export const CREATOR_TYPE_LABELS: Readonly<Record<string, string>> = {
  hair: 'hair',
  'full-body': 'outfits',
  furniture: 'furniture',
  tops: 'tops',
  poses: 'poses',
  decor: 'decor',
  dresses: 'dresses',
  shoes: 'shoes',
  'gameplay-mod': 'gameplay mods',
  'script-mod': 'script mods',
  makeup: 'makeup',
  bottoms: 'bottoms',
  jewelry: 'jewelry',
  skin: 'skins',
  lot: 'lots',
  residential: 'houses',
  commercial: 'community lots',
  hats: 'hats',
  accessories: 'accessories',
  tattoos: 'tattoos',
  clutter: 'clutter',
  'loading-screen': 'loading screens',
  preset: 'presets',
  'body-preset': 'body presets',
  nails: 'nails',
  eyes: 'eyes',
  eyebrows: 'eyebrows',
  glasses: 'glasses',
  'cas-background': 'CAS backgrounds',
  plants: 'plants',
  beard: 'beards',
  'facial-hair': 'facial hair',
  rugs: 'rugs',
  'wall-art': 'wall art',
  lipstick: 'lipstick',
  eyeliner: 'eyeliner',
  lighting: 'lighting',
  blush: 'blush',
  lashes: 'lashes',
  'pet-furniture': 'pet furniture',
  shaders: 'shaders',
};

/** A label needs at least this many of the creator's mods to be named. */
export const MIN_TYPE_COUNT = 2;
/** The newest listing is named only when it is at most this many days old. */
export const NEWEST_MAX_AGE_DAYS = 90;

export interface CreatorTypeCount {
  contentType: string | null;
  count: number;
}

export interface CreatorSnippetInput {
  displayName: string;
  totalMods: number;
  typeCounts: CreatorTypeCount[];
  /** createdAt is an ISO string or a Date. */
  newest: { title: string; createdAt: string | Date } | null;
  now?: Date;
}

/** Top ≤3 allowlisted labels by count (ties: label A–Z), each with ≥ MIN_TYPE_COUNT mods. */
export function topCreatorLabels(typeCounts: CreatorTypeCount[], max = 3): string[] {
  const byLabel = new Map<string, number>();
  for (const t of typeCounts) {
    const label = t.contentType ? CREATOR_TYPE_LABELS[t.contentType] : undefined;
    if (!label) continue;
    byLabel.set(label, (byLabel.get(label) ?? 0) + t.count);
  }
  return Array.from(byLabel.entries())
    .filter(([, n]) => n >= MIN_TYPE_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([label]) => label);
}

/** How many of the creator's mods carry one of `labels`. */
export function labelCoverage(typeCounts: CreatorTypeCount[], labels: string[]): number {
  const set = new Set(labels);
  return typeCounts.reduce((n, t) => {
    const label = t.contentType ? CREATOR_TYPE_LABELS[t.contentType] : undefined;
    return label && set.has(label) ? n + t.count : n;
  }, 0);
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Trim a mod title for the description; titles in this catalog run long. */
function clipTitle(t: string, max = 48): string {
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

const BRAND = ' | MustHaveMods';
/** Google shows ~60 characters of a title; the brand suffix is dropped before the creator's words are. */
export const TITLE_SOFT_MAX = 60;

export function creatorSnippet(input: CreatorSnippetInput): { title: string; description: string } {
  const { displayName, totalMods } = input;
  const now = input.now ?? new Date();
  const labels = topCreatorLabels(input.typeCounts);
  const modsWord = totalMods === 1 ? 'mod' : 'mods';

  // Title: the query is "<name> sims 4 (cc)", so it leads; then what they make.
  let title: string;
  if (labels.length > 0) {
    const two = capitalise(joinLabels(labels.slice(0, 2))).replace(' and ', ' & ');
    const core = `${displayName} Sims 4 CC: ${two} (${totalMods} ${modsWord})`;
    title = core.length + BRAND.length <= TITLE_SOFT_MAX ? core + BRAND : core;
  } else {
    title = `${displayName} Sims 4 CC & Mods (${totalMods})${BRAND}`;
  }

  const parts: string[] = [];
  // "mostly" only when the named labels really are most of the catalog
  // (spot-check 10-28: Softerhaze is 2 gameplay mods of 7 — "mostly" was false).
  const named = labelCoverage(input.typeCounts, labels);
  const lead = named * 2 > totalMods ? 'mostly' : 'including';
  parts.push(
    labels.length > 0
      ? `${totalMods} Sims 4 CC ${modsWord} by ${displayName}, ${lead} ${joinLabels(labels)}.`
      : `${totalMods} Sims 4 CC ${modsWord} by ${displayName}.`,
  );
  if (input.newest) {
    const added = new Date(input.newest.createdAt);
    const ageDays = (now.getTime() - added.getTime()) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= NEWEST_MAX_AGE_DAYS && input.newest.title.trim()) {
      parts.push(`Newest: ${clipTitle(input.newest.title)} (added ${shortDate(added)}).`);
    }
  }
  parts.push('Ranked by downloads, each with its download link.');
  return { title, description: parts.join(' ') };
}
