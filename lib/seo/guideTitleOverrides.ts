/**
 * E429 (Sage, 2026-11-17) — `<title>` overrides for WordPress guides in
 * Google's striking distance, applied at the proxy (middleware.ts) so no
 * WordPress credential or functions.php change is needed (Tier 0).
 *
 * Why: in GSC 2026-10-18→11-14 the 213 single posts that got a click earned
 * 1,112 clicks on 25,206 impressions. Of those, 19 sat at average position
 * ≤20 with ≥100 impressions and a CTR under 4% — 91 clicks on 4,285
 * impressions, 2.1% — while the site's striking posts as a whole convert at
 * 3.5%. Their titles are the long "32+ Best Sims 4 Hats CC To Elevate Your
 * Sim's Wardrobe" shape, some with a " - Must Have Mods" suffix that pushes
 * them past 85 characters. GA4 10-19→11-15 counted ≈2,317 Google+Bing landing
 * sessions on the 19 pages, so doubling CTR across the pool is worth at most
 * ≈ +2,300 sessions/28d; the treated arm alone is worth at most ≈ +1,160.
 *
 * Design: the 18 highest-impression pages of that pool (the 19th,
 * `/sims-4-male-eyebrows-cc/` at 100 impressions, is dropped to make pairs),
 * sorted by impressions and paired consecutively (1–2, 3–4, …); in each pair
 * sha256('E429:' + first path) even → the first is treated, else the second.
 * The 40 E412 homepage-guide arms, the 6 E311 hair guides and the
 * `/sims-4-male-sim(s)-download/` cannibal pair are excluded from the pool so
 * no page carries two treatments. The hash is precomputed here because the
 * Edge runtime has no node:crypto; __tests__/unit/guide-title-overrides.test.ts
 * recomputes it. (The id was E428 at design time; another agent reserved E428
 * mid-run, so the salt — and the assignment — are E429's.)
 *
 * Treatment: the head term first, a concrete noun phrase, ≤65 characters, no
 * brand suffix (Google appends the site name itself). Only `<title>` changes;
 * `og:title` is untouched (Pinterest reads it for pin titles, SD-10), and an
 * override applies only while the live title still contains `from`, so a
 * writer's edit in WordPress retires it on its own.
 *
 * Read on 2026-12-01 (GSC 11-18→11-29 vs 11-04→11-15, both arms): keep if the
 * treated arm's CTR ratio beats control's by ≥20% relative with treated clicks
 * not below their pre-period, else remove the overrides. Secondary: GA4
 * Google+Bing landings on the two arms, difference-in-differences.
 */

export const E429_SALT = 'E429';

export interface GuideTitleOverride {
  /** Substring the live `<title>` must contain for the override to apply. */
  from: string;
  /** Hand-written replacement. Never derived from the slug. */
  title: string;
}

/** Treated: `<title>` rewritten at the proxy, in pool (impression) order. */
export const GUIDE_TITLE_OVERRIDES: Readonly<Record<string, GuideTitleOverride>> = {
  '/sims-4-hello-kitty-cc/': {
    from: 'Best Sims 4 Hello Kitty CC',
    title: 'Sims 4 Hello Kitty CC: 27+ Adorable Finds to Download',
  },
  '/sims-4-wicked-whims-exception-error/': {
    from: 'Wicked Whims Exception Error',
    title: 'Wicked Whims Exception Error: How to Fix It in Sims 4 (2026)',
  },
  '/sims-4-hats-cc/': {
    from: 'Best Sims 4 Hats CC',
    title: 'Sims 4 Hats CC: 32+ Caps, Beanies and Fedoras to Download',
  },
  '/sims-4-heels-cc/': {
    from: 'Best Sims 4 Heels CC',
    title: 'Sims 4 Heels CC: 40+ Strappy, Stiletto and Platform Heels',
  },
  '/stardew-valley-quality-of-life-mods/': {
    from: 'Stardew Valley Quality of Life Mods',
    title: 'Best Stardew Valley Quality of Life Mods (2026): 10 Essentials',
  },
  '/sims-4-reshade/': {
    from: 'Sims 4 ReShade Presets',
    title: 'Sims 4 ReShade Presets: 21+ Best Picks for Stunning Graphics',
  },
  '/best-sims-4-wedding-cc/': {
    from: 'Sims 4 Wedding Dresses',
    title: 'Sims 4 Wedding CC: 56+ Best Wedding Dresses and More (2026)',
  },
  '/sims-4-jumpsuit-cc/': {
    from: 'Sims 4 Jumpsuit CC',
    title: 'Sims 4 Jumpsuit CC: 29+ Best One-Piece Outfits to Download',
  },
  '/sims-4-halloween-eyes-cc/': {
    from: 'Sims 4 Halloween Eyes CC',
    title: 'Sims 4 Halloween Eyes CC: 40+ Vampire, Demon and Alien Eyes',
  },
};

/** Control: served exactly as WordPress writes them while E429 runs. */
export const E429_CONTROL: readonly string[] = [
  '/best-minecraft-shaders-2026/',
  '/sims-4-jacket-cc/',
  '/sims-4-victorian-cc/',
  '/sims-4-school-uniforms-cc/',
  '/sims-4-gown-cc/',
  '/sims-4-female-suit-cc/',
  '/sims-4-hotel-lots/',
  '/sims-4-blanket-cc/',
  '/sims-4-funeral-mods/',
];

/**
 * The pairs exactly as randomized, [higher-impression, lower-impression]
 * (GSC 2026-10-18→11-14). Lets the test recompute the assignment from the
 * salt instead of trusting the two lists above.
 */
export const E429_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['/sims-4-hello-kitty-cc/', '/best-minecraft-shaders-2026/'],
  ['/sims-4-wicked-whims-exception-error/', '/sims-4-jacket-cc/'],
  ['/sims-4-victorian-cc/', '/sims-4-hats-cc/'],
  ['/sims-4-school-uniforms-cc/', '/sims-4-heels-cc/'],
  ['/sims-4-gown-cc/', '/stardew-valley-quality-of-life-mods/'],
  ['/sims-4-reshade/', '/sims-4-female-suit-cc/'],
  ['/best-sims-4-wedding-cc/', '/sims-4-hotel-lots/'],
  ['/sims-4-jumpsuit-cc/', '/sims-4-blanket-cc/'],
  ['/sims-4-funeral-mods/', '/sims-4-halloween-eyes-cc/'],
];

function escapeTitle(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const HEAD_TITLE_RE = /<title>([^<]*)<\/title>/;

/**
 * Replace the first `<title>` inside `<head>` when `pathname` has an override
 * and the live title still contains the override's `from`. Everything else —
 * og:title, meta description, body — is returned byte-for-byte. Edge-safe:
 * no node imports.
 */
export function applyGuideTitleOverride(pathname: string, html: string): string {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const override = GUIDE_TITLE_OVERRIDES[path];
  if (!override) return html;

  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;
  const head = html.substring(0, headEnd);
  const match = HEAD_TITLE_RE.exec(head);
  if (!match || !match[1].includes(override.from)) return html;

  const start = match.index;
  const end = start + match[0].length;
  return `${html.substring(0, start)}<title>${escapeTitle(override.title)}</title>${html.substring(end)}`;
}
