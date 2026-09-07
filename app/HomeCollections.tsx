import Link from 'next/link';
import { SIMS4_COLLECTIONS } from '../lib/collections';

/**
 * Server component: the homepage's "browse by collection" block.
 *
 * Rendered by app/page.tsx and handed to HomePageClient as a node, so the
 * links are in the served HTML for crawlers and answer engines without the
 * registry's editorial intros ending up in the client bundle. Replaces the
 * five hard-coded "Popular:" chips (2026-09-07). Registry order is the
 * source of truth; here the biggest collections come first.
 */
export function homeCollectionLinks() {
  return [...SIMS4_COLLECTIONS]
    .sort((a, b) => b.expectedCount - a.expectedCount)
    .map((c) => ({
      slug: c.slug,
      heading: c.heading,
      href: `/games/${c.gameSlug}/${c.slug}/`,
      url: `https://musthavemods.com/games/${c.gameSlug}/${c.slug}/`,
    }));
}

export function HomeCollections() {
  const links = homeCollectionLinks();
  return (
    <section aria-labelledby="home-collections-heading" className="container mx-auto px-4 pt-6">
      <h2 id="home-collections-heading" className="text-sm font-semibold text-slate-400 mb-2">
        Browse Sims 4 CC by collection
      </h2>
      <p className="text-sm text-slate-500 mb-3 max-w-3xl">
        Every collection is a filterable grid of Sims 4 finds, sorted by downloads, with each
        download link checked so you are not sent to a dead page.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {links.map((l) => (
          <Link
            key={l.slug}
            href={l.href}
            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-sims-pink/40 transition-colors"
          >
            {l.heading}
          </Link>
        ))}
      </div>
    </section>
  );
}
