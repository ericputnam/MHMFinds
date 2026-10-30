/**
 * Pure slug helpers for creator pages (/creator/[slug]/, Nova E85).
 *
 * Kept free of any server import so client components (ModDetailClient)
 * can link to a creator page without pulling Prisma into the bundle. The
 * data loader lives in lib/creators.ts and re-exports these.
 */

/**
 * Normalise an author string to a URL slug. Must stay in lock-step with
 * the SQL expression in lib/creators.ts `findAuthorVariants` (both fold
 * case and collapse every non-alphanumeric run to one dash).
 */
export function authorSlug(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * One creator, one page (Nova, E293, 2026-10-30). The dash-slug splits one
 * creator whenever their name is stored both spaced and run together:
 * "sixam-cc" (16 mods) and "sixamcc" (11) were two indexed
 * pages competing for one name query ("sixam" sat at position 40), and
 * "Marsmerizing Sims" (4) / "MarsmerizingSims" lost their 3–4-mod spellings
 * to the 5-mod gate. Catalog on 2026-10-30: 108 such groups — 7 with two
 * indexed pages, 14 that clear MIN_MODS_FOR_PAGE only once folded, 151 mods
 * joining an existing page. The creator *key* drops every separator; the
 * SQL twin is `regexp_replace(lower(author), '[^a-z0-9]+', '', 'g')` in
 * lib/creators.ts (listCreators, findAuthorVariants). Keep them in lock-step.
 */
export function creatorKey(slugOrAuthor: string): string {
  return slugOrAuthor.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * The one URL a folded creator lives at: the dash-slug carrying the most
 * mods across its spellings, ties by slug ASC — the same rule as the
 * `slugs` CTE in listCreators, so the sitemap and the page always agree.
 * Picking by mods (not by the single most-used spelling) keeps the URL that
 * already holds most of the creator's catalog — usually the one Google has.
 */
export function canonicalCreatorSlug(variants: ReadonlyArray<{ author: string; mods: number }>, requested: string): string {
  const bySlug = new Map<string, number>();
  for (const v of variants) {
    const s = authorSlug(v.author);
    if (!s) continue;
    bySlug.set(s, (bySlug.get(s) ?? 0) + v.mods);
  }
  let best: string | null = null;
  let bestN = -1;
  bySlug.forEach((n, s) => {
    if (n > bestN || (n === bestN && best !== null && s < best)) {
      best = s;
      bestN = n;
    }
  });
  if (!best || isJunkAuthorSlug(best)) return requested;
  return best;
}

/**
 * Where a creator URL should 308 to, or null to serve it. Never redirects a
 * slug that holds a CreatorProfile (a claimed page keeps its own handle; on
 * 2026-10-30 all 4 profiles inside a split group already held the canonical
 * spelling), never redirects to itself.
 */
export function creatorRedirectSlug(requested: string, canonical: string, requestedHasProfile: boolean): string | null {
  if (requestedHasProfile) return null;
  if (!canonical || canonical === requested) return null;
  return canonical;
}

/**
 * The scraper's author fallback produces strings like
 * "Kobe Sweats 135179830" (a title plus a Patreon post id), "75940181"
 * (a bare id) or "" — none of them is a creator. Reject those slugs so
 * they can never become a page or a link.
 */
export function isJunkAuthorSlug(slug: string): boolean {
  if (slug.length < 3) return true;
  if (/^\d+$/.test(slug)) return true;
  if (/-\d{6,}$/.test(slug)) return true;
  return false;
}

/**
 * Author strings that are platforms, stores or aggregators — not creators —
 * yet clear MIN_MODS_FOR_PAGE on row count alone. Spot-check of the 542
 * hub-eligible slugs on 2026-09-24 (mods / download clicks):
 *   simsfinds 81/747 (simsfinds.com, an aggregator) · amazon 70/168 ·
 *   simfileshare 42/329 (a file host) · curseforge-creator 38/216 (the
 *   scraper's CurseForge fallback) · sims4downloads 5/110 · google 9/8 ·
 *   unknown 9/10.
 * The rest are the same class, listed pre-emptively so the next ingest
 * cannot promote one onto the hub. The /creator/ hub (E97) never lists
 * these. They still get a leaf page and a mod-page author link today —
 * folding this set into isJunkAuthorSlug is a queued E85 follow-up, not
 * part of the hub PR (it would change E85's measured population).
 */
export const NON_CREATOR_SLUGS: ReadonlySet<string> = new Set([
  'simsfinds',
  'amazon',
  'simfileshare',
  'curseforge-creator',
  'curseforge',
  'sims4downloads',
  'google',
  'unknown',
  'patreon',
  'tumblr',
  'the-sims-resource',
  'sims-resource',
  'tsr',
  'mod-the-sims',
  'modthesims',
  'loverslab',
  'lovers-lab',
  'nexusmods',
  'nexus-mods',
  'simsdom',
  'sims-4-studio',
  'mediafire',
  'admin',
]);

export function isNonCreatorSlug(slug: string): boolean {
  return NON_CREATOR_SLUGS.has(slug);
}

export function creatorHref(slug: string): string {
  // Trailing slash: next.config.js sets trailingSlash: true, so a bare
  // path 308s (the canonical-trailing-slash guard scans for slashless hrefs).
  return `/creator/${slug}/`;
}
