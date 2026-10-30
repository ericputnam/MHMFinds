/**
 * Display-only cleanup for scraped catalogue text on the launcher homepage.
 * Nothing here writes to the database — it only decides what a card or chip
 * prints. The underlying rows keep their values (fixing them at the source
 * is a catalogue job, not a render job).
 */
import type { FacetOption } from './useLauncherData';

/**
 * A creator string is a placeholder rather than a name when it is a bare
 * number, a platform user id ("U91904865"), or a scraped phrase glued to a
 * long id ("Random Urban 66056001", "January 2024 Set 96368659").
 * Handles that merely contain digits ("cassie1900", "MommaBear0705") are real.
 */
export function cleanCreator(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return null;
  if (/^U\d{6,}$/.test(s)) return null;
  // "250112 Female": a date/id stamp leading a post heading.
  if (/^\d{6,}\s/.test(s)) return null;
  const glued = s.match(/^(.*\S)\s+\d{6,}$/);
  if (glued) {
    const rest = glued[1].trim();
    // "January 2024 Set" is a post heading, not a person.
    if (/\b(19|20)\d{2}\b/.test(rest)) return null;
    return rest || null;
  }
  return s;
}

/**
 * Titles that carry no words ("2025 81", "#12") read as broken cards. Show
 * the mod's type instead so the card still says what it is.
 */
// Constructor form: tsconfig targets ES5, which rejects the /u literal flag.
const HAS_WORD = new RegExp('\\p{L}{2,}', 'u');

export function displayTitle(title: string | null | undefined, typeLabel?: string | null): string {
  const t = (title ?? '').trim();
  if (t && HAS_WORD.test(t)) return t;
  return typeLabel ? `${typeLabel} CC` : 'Untitled find';
}

/** "builds" → "Builds"; leaves already-cased labels ("UI / Preset", "CAS Background") alone. */
export function labelCase(label: string): string {
  return label.replace(/(^|[\s/&-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

/**
 * The "Every type of mod" cloud. Counts below the floor are mostly mis-tags
 * ("CC Finds 1", "Portraits 1") and make the block read as a tag dump.
 * Types that only exist for Stardew/Minecraft are small by nature, so they get
 * a lower floor rather than vanishing.
 */
export const TYPE_CLOUD_MIN = 10;
const OTHER_GAME_MIN = 5;
/** Never shown: scraper placeholders, not types a visitor would pick. */
const TYPE_CLOUD_EXCLUDE = new Set(['cc-finds']);

export interface TypeGroup {
  key: string;
  title: string;
  types: FacetOption[];
}

const GROUPS: { key: string; title: string; values: string[] }[] = [
  {
    key: 'looks',
    title: 'Hair, face & body',
    values: ['hair', 'skin', 'eyes', 'eyebrows', 'makeup', 'lipstick', 'blush', 'eyeliner', 'lashes', 'nails', 'tattoos', 'beard', 'facial-hair', 'preset'],
  },
  {
    key: 'clothes',
    title: 'Clothes & accessories',
    values: ['full-body', 'tops', 'bottoms', 'dresses', 'shoes', 'hats', 'accessories', 'jewelry', 'glasses', 'workout', 'royals', 'princess', 'infant', 'pregnancy', 'pet-clothing', 'pet-accessories'],
  },
  {
    key: 'build',
    title: 'Build & buy',
    values: ['furniture', 'decor', 'clutter', 'residential', 'lot', 'builds', 'commercial', 'community', 'plants', 'rugs', 'wall-art', 'lighting', 'gym', 'pet-furniture', 'curtains', 'outdoor', 'kitchen', 'bathroom', 'bedroom', 'electronics', 'vehicles', 'food'],
  },
  {
    key: 'play',
    title: 'Gameplay & extras',
    values: ['gameplay-mod', 'script-mod', 'poses', 'holidays', 'easter', 'loading-screen', 'cas-background', 'ui-preset', 'career', 'entertainment', 'trait', 'animations', 'challenge', 'main-menu'],
  },
  {
    key: 'other',
    title: 'Stardew & Minecraft',
    values: ['shaders', 'texture-pack', 'retexture', 'resource-pack', 'modpack', 'data-pack', 'farm-map', 'portraits'],
  },
];

const OTHER_GAME_VALUES = new Set(GROUPS.find((g) => g.key === 'other')!.values);

export function groupTypes(types: FacetOption[]): TypeGroup[] {
  const groupOf = new Map<string, string>();
  for (const g of GROUPS) for (const v of g.values) groupOf.set(v, g.key);

  const buckets = new Map<string, FacetOption[]>(GROUPS.map((g) => [g.key, []]));
  buckets.set('more', []);
  for (const t of types) {
    if (TYPE_CLOUD_EXCLUDE.has(t.value)) continue;
    const floor = OTHER_GAME_VALUES.has(t.value) ? OTHER_GAME_MIN : TYPE_CLOUD_MIN;
    if ((t.count ?? 0) < floor) continue;
    buckets.get(groupOf.get(t.value) ?? 'more')!.push({ ...t, displayName: labelCase(t.displayName) });
  }

  const byCount = (a: FacetOption, b: FacetOption) => (b.count ?? 0) - (a.count ?? 0);
  return [...GROUPS.map((g) => ({ key: g.key, title: g.title })), { key: 'more', title: 'More' }]
    .map((g) => ({ ...g, types: buckets.get(g.key)!.sort(byCount) }))
    .filter((g) => g.types.length > 0);
}
