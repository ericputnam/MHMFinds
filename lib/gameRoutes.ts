// Game slug to display name mapping for SEO-friendly URLs
export const GAME_SLUGS: Record<string, string> = {
  'sims-4': 'Sims 4',
  'stardew-valley': 'Stardew Valley',
  'animal-crossing': 'Animal Crossing',
  'minecraft': 'Minecraft',
};

// Reverse mapping: display name to slug
export const GAME_TO_SLUG: Record<string, string> = {
  'Sims 4': 'sims-4',
  'Stardew Valley': 'stardew-valley',
  'Animal Crossing': 'animal-crossing',
  'Minecraft': 'minecraft',
};

// SEO metadata for each game
export const GAME_METADATA: Record<string, { title: string; description: string }> = {
  'sims-4': {
    title: 'Sims 4 Mods & CC - Browse 10,000+ Custom Content | MustHaveMods',
    description: 'Browse Sims 4 mods and custom content. Filter by hair, clothes, furniture, gameplay mods, and more. Free CC from top creators.',
  },
  'stardew-valley': {
    title: 'Stardew Valley Mods - Browse Custom Content | MustHaveMods',
    description: 'Discover Stardew Valley mods and custom content. Gameplay mods, visual enhancements, new items, and quality-of-life improvements.',
  },
  'animal-crossing': {
    title: 'Best Animal Crossing Mods & Custom Designs | MustHaveMods',
    description: 'Explore Animal Crossing custom designs, patterns, and mods. Transform your island with community-created content.',
  },
  'minecraft': {
    title: 'Minecraft Mods - Browse Mods & Resource Packs | MustHaveMods',
    description: 'Find Minecraft mods, resource packs, and custom content. Gameplay mods, visual overhauls, and adventure maps from top creators.',
  },
};

// Get game name from slug, returns null if not found
export function getGameFromSlug(slug: string): string | null {
  return GAME_SLUGS[slug.toLowerCase()] || null;
}

// Get slug from game name, returns null if not found
export function getSlugFromGame(game: string): string | null {
  return GAME_TO_SLUG[game] || null;
}

// Get all valid game slugs for static generation
export function getAllGameSlugs(): string[] {
  return Object.keys(GAME_SLUGS);
}
