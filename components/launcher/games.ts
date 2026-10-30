/**
 * Game list for the launcher homepage. `value` is what /api/mods expects in
 * `gameVersion` (and what the URL carries); `id` keys the accent colour in
 * launcher.css (.lx[data-game=…]); `slug` matches lib/gameRoutes.ts.
 */
export interface LauncherGame {
  value: string;
  id: 'all' | 'sims4' | 'stardew' | 'minecraft';
  name: string;
  short: string;
  icon?: string;
  rgb: string;
  slug?: string;
  tagline?: string;
}

export const GAMES: LauncherGame[] = [
  { value: '', id: 'all', name: 'All games', short: 'All', rgb: '236,72,153' },
  {
    value: 'Sims 4',
    id: 'sims4',
    name: 'The Sims 4',
    short: 'Sims 4',
    icon: '/game-icons/sims-4.jpg',
    rgb: '236,72,153',
    slug: 'sims-4',
    tagline: 'CC hair, clothes, builds & gameplay mods',
  },
  {
    value: 'Stardew Valley',
    id: 'stardew',
    name: 'Stardew Valley',
    short: 'Stardew',
    icon: '/game-icons/stardew-valley.jpg',
    rgb: '34,197,94',
    slug: 'stardew-valley',
    tagline: 'Portraits, farm maps, expansions & QoL',
  },
  {
    value: 'Minecraft',
    id: 'minecraft',
    name: 'Minecraft',
    short: 'Minecraft',
    icon: '/game-icons/minecraft.jpg',
    rgb: '139,92,246',
    slug: 'minecraft',
    tagline: 'Shaders, texture packs & modpacks',
  },
];

export function gameFor(value: string): LauncherGame {
  return GAMES.find((g) => g.value === value) ?? GAMES[0];
}

/**
 * The collection registry (lib/collections.ts) is Sims 4 only, so its blocks
 * show for Sims 4 and "All" and nowhere else. Every launcher surface that
 * renders a collections slot asks this one function.
 */
export function showsSims4Collections(id: LauncherGame['id']): boolean {
  return id === 'all' || id === 'sims4';
}

/** 1234567 → "1.2M", 182000 → "182K", 4300 → "4.3K", 950 → "950". */
export function fmtCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}
