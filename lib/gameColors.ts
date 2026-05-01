// Game accent color mapping — used by Navbar dropdown and game pages
//
// Note: Animal Crossing was removed from the active discovery surfaces
// (Apr 2026). It still exists in `gameRoutes.ts` so /games/animal-crossing
// continues to resolve and historical mods stay reachable, but we don't
// surface it in the navbar or hero pills.
export const GAME_COLORS: Record<string, string> = {
  'Sims 4': '#ec4899',
  'Stardew Valley': '#22c55e',
  'Minecraft': '#8b5cf6',
};

export const GAME_TAGLINES: Record<string, string> = {
  'Sims 4': 'CC, mods & custom content',
  'Stardew Valley': 'Farm mods & visual packs',
  'Minecraft': 'Shaders, mods & resource packs',
};
