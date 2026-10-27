/**
 * The catalogue size the site claims in copy: the homepage <title>,
 * descriptions, Open Graph/Twitter cards, WebSite/WebPage JSON-LD, llms.txt,
 * llms-full.txt and the homepage hero.
 *
 * One value everywhere. Until 2026-10-26 the title said 17,000+ (hard-coded,
 * E259) while the hero derived its number from the live /api/mods total
 * (16,985, which rounded down to "16,000+") and served "15,000+" in the SSR
 * HTML before that fetch resolved, so crawlers and visitors saw three numbers.
 * Bump this by hand when the catalogue crosses the next thousand;
 * __tests__/unit/catalog-count.test.ts fails on any other "NN,000+" literal.
 * (Catalogue 17,004 on 10-23; /api/mods public total 16,985 on 10-26.)
 */
export const CATALOG_FINDS = '17,000+';
