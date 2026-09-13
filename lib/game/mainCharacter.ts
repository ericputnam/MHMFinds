// MAIN CHARACTER — the daily styling game (musthavemods.com/play)
// Cast, scenes, deterministic daily rotation, and scoring.
// See docs/PRD-main-character-game.md for the full concept.

export const GAME_LAUNCH_DATE = '2026-07-14'; // Episode 1

export interface CastMember {
  id: string;
  name: string;
  pronouns: string;
  trait: string; // Main Character Energy trait this character personifies
  tagline: string;
  emoji: string;
  /** Lowercase keywords this character personally loves (taste bonus in scoring) */
  tasteKeywords: string[];
  /** Tailwind gradient classes for the character's signature card */
  gradient: string;
  /** In-character reactions by score band: [flop, decent, great, iconic] */
  reactions: [string, string, string, string];
}

export const CAST: CastMember[] = [
  {
    id: 'sol',
    name: 'Sol',
    pronouns: 'they/them',
    trait: 'Main Character',
    tagline: 'The spotlight follows them. They checked.',
    emoji: '🌟',
    tasteKeywords: ['glam', 'gold', 'sparkle', 'satin', 'luxury', 'formal', 'elegant', 'diamond', 'velvet'],
    gradient: 'from-amber-400 via-sims-pink to-sims-purple',
    reactions: [
      '"I have fired stylists for less." — Sol',
      '"Fine. Background-character chic." — Sol',
      '"Now THIS is a season finale." — Sol',
      '"Roll credits. Name in lights. Perfection." — Sol',
    ],
  },
  {
    id: 'bailey',
    name: 'Bailey',
    pronouns: 'he/him',
    trait: 'Golden Retriever Energy',
    tagline: 'Has never had a bad day. Statistically suspicious.',
    emoji: '🐾',
    tasteKeywords: ['bright', 'sporty', 'athletic', 'colorful', 'sneaker', 'hoodie', 'fun', 'rainbow', 'casual'],
    gradient: 'from-sims-green via-sims-blue to-sims-purple',
    reactions: [
      '"I love it!! (I am being polite.)" — Bailey',
      '"Okay okay okay we\'re getting somewhere!!" — Bailey',
      '"DUDE. I look INCREDIBLE?!" — Bailey',
      '"Best. Day. EVER. And I say that every day!!" — Bailey',
    ],
  },
  {
    id: 'dee',
    name: 'Dee',
    pronouns: 'she/her',
    trait: 'Delulu',
    tagline: 'Not famous yet. Unclear on the "yet".',
    emoji: '💅',
    tasteKeywords: ['y2k', 'pink', 'butterfly', 'rhinestone', 'mini', 'platform', 'glitter', 'baby tee', 'chrome'],
    gradient: 'from-sims-pink via-fuchsia-500 to-sims-blue',
    reactions: [
      '"The paparazzi will simply have to be told to delete these." — Dee',
      '"Cute, but I\'ve been photographed in better. (I haven\'t.)" — Dee',
      '"Iconic. As foretold. By me. Just now." — Dee',
      '"This is my Met Gala. Everything before was pre-fame." — Dee',
    ],
  },
  {
    id: 'wren',
    name: 'Wren',
    pronouns: 'she/her',
    trait: 'Cottagecore Dreamer',
    tagline: 'Owns one (1) frying pan and forty-two dried flower bundles.',
    emoji: '🍄',
    tasteKeywords: ['cottage', 'floral', 'linen', 'vintage', 'earthy', 'knit', 'garden', 'prairie', 'mushroom'],
    gradient: 'from-sims-green via-emerald-400 to-amber-300',
    reactions: [
      '"The forest saw this. The forest is upset." — Wren',
      '"Soft... ish. The mushrooms have notes." — Wren',
      '"Oh... it\'s like a poem you can wear." — Wren',
      '"The wildflowers just voted. It\'s unanimous. Perfect." — Wren',
    ],
  },
];

export interface Scene {
  id: string;
  castId: string;
  title: string;
  /** The one-line brief shown to the player */
  prompt: string;
  /** Lowercase keywords matched against item title + themes for on-brief scoring */
  keywords: string[];
}

// Scenes rotate deterministically by episode number. Keep prompts evergreen
// (no dated references) so the rotation can loop safely.
export const SCENES: Scene[] = [
  {
    id: 'vampire-masquerade',
    castId: 'dee',
    title: 'The Vampire Masquerade',
    prompt: 'Dee swears she\'s on the list for the vampire masquerade. She is not on the list. The outfit needs to BE the list.',
    keywords: ['vampire', 'goth', 'gothic', 'dark', 'black', 'lace', 'velvet', 'masquerade', 'occult', 'red'],
  },
  {
    id: 'farmers-market-feud',
    castId: 'wren',
    title: 'The Farmers Market Feud',
    prompt: 'Wren\'s rival sold out of sourdough first. Today she returns to the farmers market — devastatingly, softly, victoriously dressed.',
    keywords: ['cottage', 'cottagecore', 'floral', 'linen', 'vintage', 'prairie', 'knit', 'garden', 'boho', 'rustic'],
  },
  {
    id: 'red-carpet-rehearsal',
    castId: 'sol',
    title: 'Red Carpet (Rehearsal)',
    prompt: 'Sol is rehearsing their award acceptance walk in the driveway again. The neighbors are watching. Good. Dress them like the award exists.',
    keywords: ['glam', 'formal', 'gown', 'elegant', 'gold', 'sparkle', 'luxury', 'satin', 'evening', 'jewelry'],
  },
  {
    id: 'beach-day-bailey',
    castId: 'bailey',
    title: 'The Beach Day That Would Not End',
    prompt: 'Bailey organized a beach day. Everyone else left four hours ago. He\'s still there, thriving. Dress him for hour nine.',
    keywords: ['beach', 'summer', 'swim', 'tropical', 'shorts', 'sunny', 'sandal', 'surf', 'bright', 'vacation'],
  },
  {
    id: 'dee-goes-corporate',
    castId: 'dee',
    title: 'Dee Goes Corporate',
    prompt: 'Dee got a real office job to "study fame from the inside." It\'s day one. HR is already concerned. Business, but make it delulu.',
    keywords: ['office', 'blazer', 'business', 'work', 'formal', 'suit', 'pencil', 'chic', 'professional', 'heels'],
  },
  {
    id: 'wren-midnight-forage',
    castId: 'wren',
    title: 'The Midnight Forage',
    prompt: 'The mushrooms only bloom under a full moon, and Wren refuses to meet them underdressed. Dark academia meets forest floor.',
    keywords: ['dark', 'academia', 'forest', 'moon', 'witch', 'earthy', 'brown', 'cloak', 'vintage', 'boots'],
  },
  {
    id: 'sol-grocery-run',
    castId: 'sol',
    title: 'The Incognito Grocery Run',
    prompt: 'Sol needs oat milk but cannot risk being "recognized." Nobody knows who they are. Dress them like a celebrity hiding from no one.',
    keywords: ['sunglasses', 'streetwear', 'oversized', 'casual', 'hoodie', 'sneaker', 'athleisure', 'cap', 'chic', 'urban'],
  },
  {
    id: 'bailey-first-date',
    castId: 'bailey',
    title: 'Bailey\'s First Date (Attempt #7)',
    prompt: 'Bailey has a date at the fancy restaurant. The last six ended at the dog park "by accident." Dress him too well to derail.',
    keywords: ['date', 'formal', 'shirt', 'elegant', 'romantic', 'dinner', 'suit', 'classy', 'dressy', 'nice'],
  },
  {
    id: 'dee-music-video',
    castId: 'dee',
    title: 'The Self-Funded Music Video',
    prompt: 'Dee is shooting a music video for a song she has not written. Budget: one gift card. Vision: unlimited. Y2K pop star, now.',
    keywords: ['y2k', 'pink', 'glitter', 'platform', 'rhinestone', 'chrome', 'mini', 'pop', 'butterfly', 'metallic'],
  },
  {
    id: 'wren-city-visit',
    castId: 'wren',
    title: 'Wren vs. The City',
    prompt: 'Wren must go downtown to renew a permit for her bees. She has agreed to wear "city clothes." Her definition is negotiable.',
    keywords: ['city', 'coat', 'urban', 'chic', 'trench', 'boots', 'knit', 'scarf', 'vintage', 'neutral'],
  },
  {
    id: 'sol-villain-era',
    castId: 'sol',
    title: 'The Villain Era Announcement',
    prompt: 'Sol has decided this season they are the villain. It\'s a growth thing. All black everything, devastatingly dramatic.',
    keywords: ['black', 'dark', 'leather', 'goth', 'dramatic', 'edgy', 'villain', 'boots', 'silver', 'sleek'],
  },
  {
    id: 'bailey-winter-morning',
    castId: 'bailey',
    title: 'The 6AM Winter Run',
    prompt: 'It is snowing. It is 6AM. Bailey is going running anyway because "the cold is just spicy air." Layer this man.',
    keywords: ['winter', 'cozy', 'sweater', 'jacket', 'warm', 'snow', 'scarf', 'knit', 'fleece', 'beanie'],
  },
];

export interface EpisodeInfo {
  episode: number;
  date: string; // YYYY-MM-DD in America/New_York
  scene: Scene;
  cast: CastMember;
}

/** Today's date string (YYYY-MM-DD) in the game's canonical timezone (ET). */
export function gameDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function daysBetweenUTC(fromISO: string, toISO: string): number {
  const from = Date.UTC(
    Number(fromISO.slice(0, 4)),
    Number(fromISO.slice(5, 7)) - 1,
    Number(fromISO.slice(8, 10))
  );
  const to = Date.UTC(
    Number(toISO.slice(0, 4)),
    Number(toISO.slice(5, 7)) - 1,
    Number(toISO.slice(8, 10))
  );
  return Math.round((to - from) / 86_400_000);
}

/** Deterministic 32-bit hash of a string (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getEpisodeInfo(date: string = gameDateString()): EpisodeInfo {
  const episode = Math.max(1, daysBetweenUTC(GAME_LAUNCH_DATE, date) + 1);
  // Offset the rotation with a date hash so consecutive days don't walk the
  // scene list in a guessable straight line forever.
  const scene = SCENES[(episode - 1) % SCENES.length];
  const cast = CAST.find((c) => c.id === scene.castId) ?? CAST[0];
  return { episode, date, scene, cast };
}

// ---------------------------------------------------------------------------
// Rack slots
// ---------------------------------------------------------------------------

export interface RackSlot {
  slot: string; // stable key
  label: string;
  emoji: string;
  /** Mod.contentType values eligible for this slot */
  contentTypes: string[];
}

export const RACK_SLOTS: RackSlot[] = [
  { slot: 'hair', label: 'Hair', emoji: '💇', contentTypes: ['hair'] },
  {
    slot: 'outfit',
    label: 'Outfit',
    emoji: '👗',
    contentTypes: ['dresses', 'full-body', 'tops', 'bottoms'],
  },
  { slot: 'shoes', label: 'Shoes', emoji: '👟', contentTypes: ['shoes'] },
  {
    slot: 'accessory',
    label: 'Accessory',
    emoji: '💍',
    contentTypes: ['accessories', 'jewelry', 'glasses', 'hats'],
  },
];

export const ITEMS_PER_SLOT = 6;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface RackItem {
  id: string;
  title: string;
  thumbnail: string;
  author: string | null;
  themes: string[];
  visualStyle: string | null;
  contentType: string | null;
  isFree: boolean;
}

export interface ScoreBreakdown {
  total: number;
  onBrief: number; // items matching scene keywords
  taste: number; // items matching the star's personal taste
  cohesion: number; // shared visual style across the look
  base: number;
  reaction: string;
  band: 'flop' | 'decent' | 'great' | 'iconic';
}

function itemMatchesKeywords(item: RackItem, keywords: string[]): boolean {
  const haystack = (item.title + ' ' + item.themes.join(' ')).toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

export function scoreLook(
  picks: RackItem[],
  scene: Scene,
  cast: CastMember
): ScoreBreakdown {
  const base = 22;
  let onBrief = 0;
  let taste = 0;

  for (const item of picks) {
    if (itemMatchesKeywords(item, scene.keywords)) onBrief += 14;
    if (itemMatchesKeywords(item, cast.tasteKeywords)) taste += 4;
  }

  // Cohesion: reward a look that commits to one visual style.
  const styles = picks
    .map((p) => p.visualStyle)
    .filter((s): s is string => Boolean(s));
  const styleCounts = new Map<string, number>();
  for (const s of styles) styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1);
  const maxShared = Math.max(0, ...Array.from(styleCounts.values()));
  const cohesion = maxShared >= 3 ? 10 : maxShared === 2 ? 6 : 0;

  const total = Math.min(100, base + onBrief + taste + cohesion);
  const band: ScoreBreakdown['band'] =
    total >= 85 ? 'iconic' : total >= 65 ? 'great' : total >= 45 ? 'decent' : 'flop';
  const reaction =
    cast.reactions[band === 'flop' ? 0 : band === 'decent' ? 1 : band === 'great' ? 2 : 3];

  return { total, onBrief, taste, cohesion, base, reaction, band };
}

export function buildShareText(info: EpisodeInfo, score: ScoreBreakdown, streak: number): string {
  const stars =
    score.band === 'iconic' ? '🌟🌟🌟🌟' : score.band === 'great' ? '🌟🌟🌟' : score.band === 'decent' ? '🌟🌟' : '🌟';
  const lines = [
    `MAIN CHARACTER — Episode ${info.episode} 🎬`,
    `${info.cast.emoji} ${info.scene.title}`,
    `Director's Score: ${score.total}/100 ${stars}`,
  ];
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`);
  lines.push('musthavemods.com/play');
  return lines.join('\n');
}
