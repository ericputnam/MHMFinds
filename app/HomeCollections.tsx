import Link from 'next/link';
import Image from 'next/image';
import { SIMS4_COLLECTIONS } from '../lib/collections';
import { Icon } from '../components/launcher/Icon';
import { collectionCovers } from '../lib/collectionCovers';

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

const FEATURED = 12;
/** Hero shortcuts: one per kind of CC people come for, not just the biggest (the top few all overlap clothes). */
const QUICK = ['hair-cc', 'clothes-cc', 'build-cc', 'makeup-cc', 'poses', 'kids-cc'];

/**
 * Server component: collection shortcuts shown in the hero, so a visitor who
 * never scrolls still sees that collections exist. "All" jumps to the full
 * block (#collections) further down the page.
 */
export function HomeCollectionStrip() {
  const links = homeCollectionLinks();
  const bySlug = new Map(links.map((l) => [l.slug, l]));
  const quick = QUICK.map((s) => bySlug.get(s)).filter((l): l is NonNullable<typeof l> => !!l);
  const short = (h: string) => h.replace(/^Sims 4 /, '').replace(/ CC$/, '');
  return (
    <nav className="hero-colls" aria-label="Popular collections">
      <span className="hcl-label">Browse collections</span>
      <div className="hcl-row">
        {quick.map((l) => {
          const cover = collectionCovers(l.slug)[0];
          return (
            <Link key={l.slug} href={l.href} className="hcl-pill">
              <span className="hcl-thumb" aria-hidden="true">
                {cover && <Image src={cover} alt="" fill sizes="26px" unoptimized />}
              </span>
              {short(l.heading)}
            </Link>
          );
        })}
        <a href="#collections" className="hcl-pill hcl-all">
          All {links.length}
          <Icon name="chevron" />
        </a>
      </div>
    </nav>
  );
}

export function HomeCollections() {
  const links = homeCollectionLinks();
  const counts = new Map(SIMS4_COLLECTIONS.map((c) => [c.slug, c.expectedCount]));
  const featured = links.slice(0, FEATURED);
  const rest = links.slice(FEATURED);
  // Big collections overlap (a top in "Sims 4 CC" is also in "Clothes"), so
  // skip covers an earlier card already shows.
  const used = new Set<string>();
  const coversFor = (slug: string) => {
    const all = collectionCovers(slug);
    const fresh = all.filter((src) => !used.has(src));
    const pick = (fresh.length ? fresh : all).slice(0, 3);
    pick.forEach((src) => used.add(src));
    return pick;
  };
  const fmt = (n?: number) => (n ? `${n.toLocaleString('en-US')}+` : null);
  // Styled by components/launcher/launcher.css (.below-sec / .coll-*), which
  // the homepage client imports; this block only renders inside .lx. Covers
  // come from the static lib/collectionCovers.ts so the page stays query-free.
  // The overflow sits in <details>, so all links stay in the served HTML.
  return (
    <section id="collections" aria-labelledby="home-collections-heading" className="below-sec">
      <div className="sec-head">
        <h2 id="home-collections-heading">Browse Sims 4 CC by collection</h2>
      </div>
      <p className="sec-sub">
        Every collection is a filterable grid of Sims 4 finds, sorted by downloads, with each
        download link checked so you are not sent to a dead page.
      </p>
      <div className="coll-grid">
        {featured.map((l) => {
          const covers = coversFor(l.slug);
          return (
            <Link key={l.slug} href={l.href} className="coll-card">
              <span className={`coll-cover n${Math.min(covers.length, 3)}`} aria-hidden="true">
                {covers.length === 0 ? (
                  <span className="coll-ic">
                    <Icon name="folder" />
                  </span>
                ) : (
                  covers.map((src, i) => (
                    <span key={src} className={`cc-img i${i}`}>
                      <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 200px" unoptimized />
                    </span>
                  ))
                )}
              </span>
              <span className="coll-body">
                <h3>{l.heading}</h3>
                {fmt(counts.get(l.slug)) && <span className="coll-cnt tabular">{fmt(counts.get(l.slug))} finds</span>}
              </span>
            </Link>
          );
        })}
      </div>
      {rest.length > 0 && (
        <details className="coll-more">
          <summary>
            Show all {links.length} collections
            <Icon name="chevron" />
          </summary>
          <div className="coll-pills">
            {rest.map((l) => (
              <Link key={l.slug} href={l.href} className="coll-pill">
                {l.heading}
                {fmt(counts.get(l.slug)) && <span className="cnt tabular">{fmt(counts.get(l.slug))}</span>}
              </Link>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
