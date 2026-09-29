/**
 * Client-safe home of the favorites route (E140). Kept apart from
 * lib/favorites.ts, which imports Prisma and must never reach the client
 * bundle — the Navbar (a client component) imports this file.
 *
 * Trailing slash: `trailingSlash: true` is global in next.config.js.
 */
export const FAVORITES_PATH = '/account/favorites/';
