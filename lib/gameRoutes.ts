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
    title: 'Best Sims 4 Mods & CC | MustHaveMods',
    description: 'Discover the best Sims 4 mods and custom content. From gameplay mods like MCCC and Wicked Whims to CAS items, build mode objects, and more.',
  },
  'stardew-valley': {
    title: 'Best Stardew Valley Mods | MustHaveMods',
    description: 'Find the best Stardew Valley mods to enhance your farming experience. Quality of life improvements, visual mods, new content, and more.',
  },
  'animal-crossing': {
    title: 'Best Animal Crossing Mods & Custom Designs | MustHaveMods',
    description: 'Explore Animal Crossing custom designs, patterns, and mods. Transform your island with community-created content.',
  },
  'minecraft': {
    title: 'Best Minecraft Mods & Resource Packs | MustHaveMods',
    description: 'Discover top Minecraft mods, texture packs, and shaders. From Optifine to modpacks, find everything to enhance your Minecraft experience.',
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
