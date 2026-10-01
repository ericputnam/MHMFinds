/**
 * `dateModified` for the site-wide WebPage node in `app/layout.tsx`
 * (E150, 2026-10-01, Sage).
 *
 * That node is `@id: https://musthavemods.com/#webpage` — the homepage
 * entity — and the root layout emits it on every Next.js page. Until E150
 * its `dateModified` was `new Date()`: whatever day the page happened to be
 * rendered (live 2026-10-01: "2026-10-01" on `/` and on
 * `/games/sims-4/hair-cc/`, a page built that morning). A date that is
 * always "today" carries no information, and it disagreed with the
 * homepage's own sitemap entry.
 *
 * The honest value is the date the homepage shell last changed, which is
 * `APP_LASTMOD` in `lib/sitemapLastmod.ts` — the floor of the homepage
 * `<lastmod>` in /sitemap-nextjs.xml. It is restated here rather than
 * imported because that module imports Prisma and the collection registry,
 * and the root layout must not pull a DB client into every route.
 * `__tests__/unit/mod-jsonld-datemodified.test.ts` imports both constants
 * and fails if they drift — bump them together.
 */
export const HOME_SHELL_LASTMOD = '2026-09-08';
