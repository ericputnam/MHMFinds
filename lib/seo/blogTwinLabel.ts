/**
 * Anchor text for a collection hub's link to its WordPress twin (`blogUrl`).
 *
 * E367 (Pip, 2026-11-07). Every hub linked its twin with the same words,
 * "Full article on the blog →", so 34 internal links to the guides that
 * carry most of the site's Bing traffic said nothing about the page they
 * point at. Bing-index sessions on those 34 twins fell 3,449 → 3,174 per
 * 14d (−8.0%, 10-09→10-22 vs 10-23→11-05).
 *
 * The label comes from the twin's own slug, because the slug is the query
 * the article was written for: `/sims-4-skin-overlay/` →
 * "Sims 4 Skin Overlay". No hand-kept label list, so a new hub gets a
 * descriptive anchor the day it ships.
 */

/** Tokens that are not plain capitalised words. */
const TOKEN_CASE: Readonly<Record<string, string>> = {
  cc: 'CC',
  cas: 'CAS',
  y2k: 'Y2K',
  gshade: 'GShade',
  reshade: 'ReShade',
  diy: 'DIY',
};

/** Lower-case joining words, except as the first word. */
const SMALL_WORDS = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/**
 * "/sims-4-kitchen-clutter-cc/" → "Sims 4 Kitchen Clutter CC".
 * Returns '' for anything that is not a one-segment relative path.
 */
export function blogTwinLabel(blogUrl: string): string {
  const m = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/.exec(blogUrl || '');
  if (!m) return '';
  return m[1]
    .split('-')
    .map((t, i) => {
      if (TOKEN_CASE[t]) return TOKEN_CASE[t];
      if (i > 0 && SMALL_WORDS.has(t)) return t;
      return t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join(' ');
}

/** The full link text the hub renders: "Our Sims 4 Skin Overlay guide →". */
export function blogTwinLinkText(blogUrl: string): string {
  const label = blogTwinLabel(blogUrl);
  return label ? `Our ${label} guide →` : 'Full article on the blog →';
}
