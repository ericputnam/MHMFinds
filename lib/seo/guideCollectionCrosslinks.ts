/**
 * E433 (Sage, 2026-11-19) — "Browse the full collection" crosslink box for
 * WordPress guides, applied at the proxy (middleware.ts) so no WordPress
 * credential or functions.php change is needed (Tier 0).
 *
 * Why: functions.php has carried `mhm_collection_crosslinks` since 2026-07 for
 * 19 legacy listicles, and the hubs' only other referrers are hubs and creator
 * pages (E292). The 95 guides below (97 since 2026-11-26: the career-mods hub, #571,
 * added two companions) are the ones the collection registry
 * (lib/collections.ts `blogUrl` / `guides`) already names as companions of a
 * hub, yet none of them links back. GA4 2026-10-20→11-16 counted ≥20,200
 * Google+Bing+AI landing sessions on the visible top of this set
 * (/new-sims-4-mods-2026/ 2,369, /sims-4-career-mods/ 1,426,
 * /sims-4-build-cheats/ 1,415, /sims-4-gshade-presets/ 1,310 …); the hubs
 * they will link to earned 5,996 organic+AI landings and 337 Google clicks on
 * 8,844 impressions at positions 10–38 in the same window. Q45 asked for this
 * in functions.php (Tier 2) and was dropped unanswered on 11-18; the proxy
 * rewrite is the Tier 0 mechanism E429 already uses.
 *
 * Design: a static map — middleware runs on the Edge and must not bundle the
 * 2,500-line registry — guarded by __tests__/unit/guide-collection-crosslinks.test.ts,
 * which re-derives it from SIMS4_COLLECTIONS and parses the functions.php map
 * so the two lists cannot drift or double a box. Where the registry lists a
 * guide under two hubs, or under a hub a reader would not expect, CROSSLINK_PINS
 * records the choice and why. The box is byte-identical in shape to the
 * functions.php one (same class, same copy) and is inserted at the same place:
 * the end of the entry content, before `</div><!-- .entry-content -->`.
 * Internal links carry no utm (that would break session attribution).
 *
 * Never touches ad anchors: `.mv-ads`, `aside#secondary` and the Mediavine
 * loader are outside .entry-content and are not read or moved.
 *
 * Read on 2026-12-17 (GA4 11-20→12-17 vs 10-20→11-16): keep if /games/*
 * organic+AI landing sessions ≥ 6,596 (+10% on 5,996) and GSC
 * /games/sims-4/* clicks ≥ 371 (+10% on 337); interim read 12-03. Guard: Rio
 * watches session RPM on the treated guides for 7 days, ≥95% of baseline.
 */

export interface GuideCollectionCrosslink {
  /** Collection slug under /games/sims-4/. */
  topic: string;
  /** Collection heading without the "Sims 4 " prefix; the box says "Browse the full Sims 4 <title> collection". */
  title: string;
}

/**
 * Keys of `mhm_collection_crosslink_map()` in
 * staging/wordpress/kadence-child-prod/functions.php — these guides already
 * get the box from WordPress and must not get a second one here. The test
 * parses the PHP and fails if this list drifts.
 */
export const FUNCTIONS_PHP_CROSSLINK_SLUGS: readonly string[] = [
  'sims-4-skin-details',
  'sims-4-skin-overlay',
  'sims-4-poses',
  'sims-4-furniture-cc',
  'sims-4-hairstyles-cc',
  'sims-4-hair-mods',
  'sims-4-clutter',
  'sims-4-clutter-cc',
  'sims-4-holiday-mods',
  'sims-4-holiday-ideas',
  'sims-4-holiday-traditions',
  'sims-4-tattoos',
  'sims-4-vampire-cc',
  'sims-4-body-presets',
  'sims-4-male-body-presets-cc',
  'sims-4-plus-size-body-presets',
  'sims-4-athletic-body-presets',
  'sims-4-pregnancy-mods',
  'sims-4-y2k-cc',
];

/** Hand-chosen hub where the registry gives two, or an unexpected one. */
export const CROSSLINK_PINS: Readonly<Record<string, { topic: string; why: string }>> = {
  '/sims-4-career-mods/': { topic: 'career-mods', why: 'listed under pregnancy-mods, gameplay-mods and career-mods; it is the Career Mods hub\'s own blogUrl companion (#571), the narrowest hub. Pointed at gameplay-mods from 11-19 until 2026-11-26, before that hub existed' },
  '/sims-4-hospital-lots/': { topic: 'build-cc', why: 'listed under pregnancy-mods and build-cc; hospital builds are build content' },
  '/sims-4-eyebrows/': { topic: 'eyebrows-cc', why: 'listed under eyebrows-cc and eyes-cc; the narrower hub' },
  '/sims-4-nursery-cc/': { topic: 'nursery-cc', why: 'listed under kids-cc and nursery-cc; the narrower hub' },
  '/sims-4-drama-mods/': { topic: 'gameplay-mods', why: 'registry lists it only under pregnancy-mods; a drama-mods reader expects gameplay' },
  '/sims-4-health-mods/': { topic: 'gameplay-mods', why: 'registry lists it only under pregnancy-mods; health mods are gameplay' },
  '/sims-4-romance-mods/': { topic: 'gameplay-mods', why: 'registry lists it only under pregnancy-mods; romance mods are gameplay' },
  '/sims-4-school-mods/': { topic: 'kids-cc', why: 'listed under kids-cc and, since the career-mods hub (#571), career-mods; kept on kids-cc so the E433 treatment it has had since 11-19 does not change mid-read' },
};

export const GUIDE_COLLECTION_CROSSLINKS: Readonly<Record<string, GuideCollectionCrosslink>> = {
  '/afro-hair-sims-4/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/best-sims-4-hair-cc/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/best-sims-4-wedding-cc/': { topic: 'wedding-cc', title: 'Wedding CC' },
  '/black-sims-4-cc/': { topic: 'cc', title: 'CC' },
  '/how-to-change-sims-4-cas-backgrounds/': { topic: 'cas-backgrounds', title: 'CAS Backgrounds' },
  '/new-sims-4-mods-2026/': { topic: 'cc', title: 'CC' },
  '/sims-4-bathroom-cc/': { topic: 'bathroom-cc', title: 'Bathroom CC' },
  '/sims-4-beds/': { topic: 'bedroom-cc', title: 'Bedroom CC' },
  '/sims-4-black-hair/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/sims-4-build-cheats/': { topic: 'build-cc', title: 'Build CC' },
  '/sims-4-career-mods/': { topic: 'career-mods', title: 'Career Mods' },
  '/sims-4-cas-background-cc/': { topic: 'cas-backgrounds', title: 'CAS Backgrounds' },
  '/sims-4-cas-background/': { topic: 'cas-backgrounds', title: 'CAS Backgrounds' },
  '/sims-4-cas-mirror-background/': { topic: 'cas-backgrounds', title: 'CAS Backgrounds' },
  '/sims-4-cas-poses/': { topic: 'gallery-poses', title: 'Gallery Poses' },
  '/sims-4-castles/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-cc-clothes/': { topic: 'clothes-cc', title: 'Clothes CC' },
  '/sims-4-cc-curly-hair/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/sims-4-cc-furniture/': { topic: 'build-cc', title: 'Build CC' },
  '/sims-4-cc/': { topic: 'cc', title: 'CC' },
  '/sims-4-christmas-cas-background/': { topic: 'cas-backgrounds', title: 'CAS Backgrounds' },
  '/sims-4-christmas-cc/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-christmas-clothes-cc/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-christmas-decor-cc/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-christmas-houses/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-christmas-nails-cc/': { topic: 'nails-cc', title: 'Nails CC' },
  '/sims-4-christmas-poses/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-christmas-tree-cc/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-corset-cc/': { topic: 'tops-cc', title: 'Tops, Shirts, Sweaters & Jackets CC' },
  '/sims-4-cottage-houses/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-cowboy-cc/': { topic: 'clothes-cc', title: 'Clothes CC' },
  '/sims-4-custom-active-careers/': { topic: 'career-mods', title: 'Career Mods' },
  '/sims-4-decor-cc/': { topic: 'decor-cc', title: 'Decor CC' },
  '/sims-4-drama-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-dress-cc/': { topic: 'dresses-cc', title: 'Dress CC' },
  '/sims-4-eyebrows-cc/': { topic: 'eyebrows-cc', title: 'Eyebrows CC' },
  '/sims-4-eyebrows/': { topic: 'eyebrows-cc', title: 'Eyebrows CC' },
  '/sims-4-eyelashes-cc/': { topic: 'eyes-cc', title: 'Eyes, Eyebrows & Lashes CC' },
  '/sims-4-eyes-cc/': { topic: 'eyes-cc', title: 'Eyes, Eyebrows & Lashes CC' },
  '/sims-4-facial-hair-cc/': { topic: 'facial-hair-cc', title: 'Beards & Facial Hair CC' },
  '/sims-4-family-house/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-gameplay-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-gown-cc/': { topic: 'dresses-cc', title: 'Dress CC' },
  '/sims-4-gshade-presets/': { topic: 'gshade-presets', title: 'GShade & ReShade Presets' },
  '/sims-4-halloween-cc/': { topic: 'halloween-cc', title: 'Halloween CC' },
  '/sims-4-hats-cc/': { topic: 'hats-cc', title: 'Hats CC' },
  '/sims-4-health-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-heels-cc/': { topic: 'heels-cc', title: 'Heels CC' },
  '/sims-4-hello-kitty-cc/': { topic: 'hello-kitty-cc', title: 'Hello Kitty & Sanrio CC' },
  '/sims-4-hospital-lots/': { topic: 'build-cc', title: 'Build CC' },
  '/sims-4-hotel-lots/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-houses/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-infant-cc/': { topic: 'kids-cc', title: 'Kids CC' },
  '/sims-4-jacket-cc/': { topic: 'tops-cc', title: 'Tops, Shirts, Sweaters & Jackets CC' },
  '/sims-4-jeans-cc-female/': { topic: 'bottoms-cc', title: 'Pants, Jeans, Skirts & Shorts CC' },
  '/sims-4-jewelry-cc/': { topic: 'jewelry-cc', title: 'Jewelry & Piercings CC' },
  '/sims-4-kids-cc/': { topic: 'kids-cc', title: 'Kids CC' },
  '/sims-4-kitchen-clutter-cc/': { topic: 'kitchen-cc', title: 'Kitchen CC' },
  '/sims-4-living-room-cc/': { topic: 'living-room-cc', title: 'Living Room CC' },
  '/sims-4-loading-screen/': { topic: 'loading-screens', title: 'Loading Screens & CAS Backgrounds' },
  '/sims-4-makeup-cc/': { topic: 'makeup-cc', title: 'Makeup CC' },
  '/sims-4-male-eyebrows-cc/': { topic: 'eyebrows-cc', title: 'Eyebrows CC' },
  '/sims-4-male-jeans-cc/': { topic: 'bottoms-cc', title: 'Pants, Jeans, Skirts & Shorts CC' },
  '/sims-4-male-long-hair-cc/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/sims-4-male-shirts-cc/': { topic: 'tops-cc', title: 'Tops, Shirts, Sweaters & Jackets CC' },
  '/sims-4-male-shorts-cc/': { topic: 'bottoms-cc', title: 'Pants, Jeans, Skirts & Shorts CC' },
  '/sims-4-male-urban-facial-hair/': { topic: 'facial-hair-cc', title: 'Beards & Facial Hair CC' },
  '/sims-4-modern-houses/': { topic: 'houses-lots', title: 'Houses & Lots' },
  '/sims-4-mods-for-realistic-relationships/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-nails-cc/': { topic: 'nails-cc', title: 'Nails CC' },
  '/sims-4-nursery-cc/': { topic: 'nursery-cc', title: 'Nursery CC' },
  '/sims-4-piercings/': { topic: 'piercings-cc', title: 'Piercings CC' },
  '/sims-4-plumbob-replacements/': { topic: 'plumbob-overrides', title: 'Plumbob Overrides' },
  '/sims-4-quality-of-life-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-reshade/': { topic: 'gshade-presets', title: 'GShade & ReShade Presets' },
  '/sims-4-romance-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-santa-cc/': { topic: 'christmas-cc', title: 'Christmas CC' },
  '/sims-4-school-mods/': { topic: 'kids-cc', title: 'Kids CC' },
  '/sims-4-school-uniforms-cc/': { topic: 'kids-cc', title: 'Kids CC' },
  '/sims-4-shoes-cc/': { topic: 'shoes-cc', title: 'Shoes CC' },
  '/sims-4-short-hair-cc/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/sims-4-skirt-cc/': { topic: 'bottoms-cc', title: 'Pants, Jeans, Skirts & Shorts CC' },
  '/sims-4-sliders/': { topic: 'body-presets', title: 'Body Presets' },
  '/sims-4-sweater-cc/': { topic: 'tops-cc', title: 'Tops, Shirts, Sweaters & Jackets CC' },
  '/sims-4-teen-jobs/': { topic: 'career-mods', title: 'Career Mods' },
  '/sims-4-teen-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-thanksgiving-cc/': { topic: 'holidays-cc', title: 'Holiday & Seasonal CC' },
  '/sims-4-tops-cc/': { topic: 'tops-cc', title: 'Tops, Shirts, Sweaters & Jackets CC' },
  '/sims-4-trait-mods/': { topic: 'gameplay-mods', title: 'Gameplay Mods' },
  '/sims-4-urban-cc/': { topic: 'clothes-cc', title: 'Clothes CC' },
  '/sims-4-urban-hair-cc/': { topic: 'hair-cc', title: 'Hair CC & Hair Mods' },
  '/sims-4-victorian-cc/': { topic: 'victorian-cc', title: 'Victorian CC' },
  '/sims-4-wedding-cc/': { topic: 'wedding-cc', title: 'Wedding CC' },
  '/sims-4-wedding-dress/': { topic: 'dresses-cc', title: 'Dress CC' },
  '/sims-4-winter-clothes-cc/': { topic: 'clothes-cc', title: 'Clothes CC' },
  '/sims-4-winter-loading-screens/': { topic: 'loading-screens', title: 'Loading Screens & CAS Backgrounds' },
  '/sims-4-witch-cc/': { topic: 'witch-cc', title: 'Witch CC' },
};

export const E433_BOX_CLASS = 'mhm-collection-crosslink';
const ENTRY_CONTENT_END = '<!-- .entry-content -->';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Same markup and copy as the functions.php box, plus a data attribute naming the experiment. */
export function guideCollectionCrosslinkHtml(link: GuideCollectionCrosslink): string {
  const url = `https://musthavemods.com/games/sims-4/${link.topic}/`;
  return (
    `<div class="${E433_BOX_CLASS}" data-mhm-e433="${link.topic}" style="margin:2em 0;padding:1.25em 1.5em;border:1px solid rgba(236,72,153,.4);border-radius:12px;background:rgba(236,72,153,.06);">` +
    '<p style="margin:0;font-size:1.05em;">Want more than this list? ' +
    `<a href="${url}" style="font-weight:600;">Browse the full Sims 4 ${escapeHtml(link.title)} collection</a>` +
    ' &mdash; every find in our database, filterable and sorted by downloads.</p>' +
    '</div>'
  );
}

/**
 * Insert the box at the end of the entry content of a mapped guide. A no-op
 * for unmapped paths, for HTML without the Kadence entry-content marker, and
 * for HTML that already carries a crosslink box (functions.php or a second
 * pass). Edge-safe: no node imports.
 */
export function applyGuideCollectionCrosslink(pathname: string, html: string): string {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const link = GUIDE_COLLECTION_CROSSLINKS[path];
  if (!link) return html;
  if (html.includes(E433_BOX_CLASS)) return html;
  const end = html.indexOf(ENTRY_CONTENT_END);
  if (end === -1) return html;
  const close = html.lastIndexOf('</div>', end);
  if (close === -1) return html;
  return `${html.substring(0, close)}${guideCollectionCrosslinkHtml(link)}${html.substring(close)}`;
}
