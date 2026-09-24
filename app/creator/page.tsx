/**
 * Creator hub — /creator/  (Nova, E97, 2026-09-24)
 *
 * The crawlable index for the ~540 /creator/[slug]/ pages (E85). Until this
 * page existed those leaves were reachable only through
 * /sitemap-creators.xml and the author link on each mod page — and
 * /top-creators/ (the Navbar's "Creators" link) is a client-fetched list of
 * the 20 CreatorProfile rows, so it hands Google nothing. Demand for a hub
 * hid in the leaves: /sims-4-cc-creators/ on the blog is a 1,310-session/28d
 * landing page and the "nekoswirl" name cluster alone is 69 GSC clicks/28d.
 *
 * Server component, per request: one grouped query (lib/creators.ts
 * listCreators), every creator as a plain <a> in the served HTML, the
 * Mediavine anchors on first paint. Ranking and A–Z are both here so
 * Google reaches every leaf without the sitemap.
 */

import type { Metadata } from 'next';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { NewsletterSignup } from '../../components/NewsletterSignup';
import { listHubCreators, creatorHref, type CreatorListRow } from '../../lib/creators';
import { TOP_CREATORS, groupByLetter, letterAnchorId, rankByDownloads } from '../../lib/creatorHub';

// The list moves with every ingest; render per request (CDN-free, one query).
export const dynamic = 'force-dynamic';

const SITE = 'https://musthavemods.com';
const CANONICAL = `${SITE}/creator/`;

export async function generateMetadata(): Promise<Metadata> {
  const creators = await listHubCreators();
  const n = creators.length;
  const mods = creators.reduce((s, c) => s + c.mods, 0);
  const title = n
    ? `Sims 4 CC Creators A–Z: ${n} Creators, ${mods.toLocaleString()} Mods | MustHaveMods`
    : 'Sims 4 CC Creators A–Z | MustHaveMods';
  const description = n
    ? `Browse ${n} Sims 4 custom content creators and modders A–Z — ${mods.toLocaleString()} mods with download links, ranked by downloads. Find every CC creator's hair, clothes, furniture and gameplay mods in one place.`
    : 'Browse Sims 4 custom content creators and modders A–Z, with every creator’s mods and download links in one place.';
  return {
    title,
    description,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, url: CANONICAL, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function buildJsonLd(top: CreatorListRow[], total: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': CANONICAL,
    url: CANONICAL,
    name: 'Sims 4 CC Creators A–Z',
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'MustHaveMods', url: SITE },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: top.slice(0, 20).map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${SITE}${creatorHref(c.slug)}`,
        name: c.displayName,
      })),
    },
  };
}

export default async function CreatorHubPage() {
  const creators = await listHubCreators();
  const totalMods = creators.reduce((s, c) => s + c.mods, 0);
  const totalDownloads = creators.reduce((s, c) => s + c.downloads, 0);
  const top = rankByDownloads(creators).slice(0, TOP_CREATORS);
  const groups = groupByLetter(creators);
  const jsonLd = buildJsonLd(top, creators.length);

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      <main className="flex-grow">
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-6">
          <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <a href="/" className="hover:text-sims-pink transition-colors">Home</a>
            <span className="text-slate-600" aria-hidden="true">›</span>
            <span className="text-white font-medium">Creators</span>
          </nav>
        </div>

        {/* Hero */}
        <header className="container mx-auto px-4 pt-6 pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sims-pink mb-2">Creators</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Sims 4 CC Creators A–Z
            </h1>
            <p className="text-lg text-slate-400 mb-4">
              {creators.length > 0 ? (
                <>
                  {creators.length.toLocaleString()} creators · {totalMods.toLocaleString()} mods ·{' '}
                  {totalDownloads.toLocaleString()} downloads on MustHaveMods
                </>
              ) : (
                <>The creator index is loading slowly right now — every creator page is still reachable from its mods.</>
              )}
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              Every Sims 4 custom content creator and modder in the catalog, each with their own page listing
              their hair, clothes, furniture, build/buy and gameplay mods with working download links. Ranked by
              downloads first, then the full list A–Z.
            </p>
            <p className="text-sm text-slate-500">
              Are you a creator?{' '}
              <a href="/submit-mod/" className="text-sims-pink hover:underline">Submit your mods</a> to claim
              your page · See the{' '}
              <a href="/top-creators/" className="text-sims-pink hover:underline">verified creator leaderboard</a>
            </p>
          </div>
        </header>

        {/* Main + Sidebar layout — mirrors /creator/[slug] and /games/[game]/[topic] */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 min-w-0">
              {/* Two sections inside .mv-ads: Mediavine injects BETWEEN children, so a
                  single-child wrapper would stay empty. The newsletter block below is a
                  sibling, never a child, of the ad anchor. */}
              <div className="mv-ads">
                <section aria-labelledby="top-creators-heading">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <h2 id="top-creators-heading" className="text-2xl font-bold text-white">
                      Most downloaded creators
                    </h2>
                    <span className="text-sm text-slate-400">by downloads on MustHaveMods</span>
                  </div>
                  <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 list-none p-0 m-0">
                    {top.map((c, idx) => (
                      <li key={c.slug}>
                        <a
                          href={creatorHref(c.slug)}
                          className="block bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-sims-pink/40 hover:bg-white/[0.07] transition-colors"
                        >
                          <span className="text-xs text-slate-500 mr-2">#{idx + 1}</span>
                          <span className="text-white font-semibold">{c.displayName}</span>
                          <span className="block text-xs text-slate-400 mt-1">
                            {c.mods.toLocaleString()} {c.mods === 1 ? 'mod' : 'mods'} ·{' '}
                            {c.downloads.toLocaleString()} downloads
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>

                <section aria-labelledby="all-creators-heading" className="mt-14">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <h2 id="all-creators-heading" className="text-2xl font-bold text-white">
                      All creators A–Z
                    </h2>
                    <span className="text-sm text-slate-400">{creators.length.toLocaleString()} creators</span>
                  </div>
                  {groups.length > 0 && (
                    <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5 mb-8">
                      {groups.map(([letter]) => (
                        <a
                          key={letter}
                          href={`#${letterAnchorId(letter)}`}
                          className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-sims-pink/40"
                        >
                          {letter}
                        </a>
                      ))}
                    </nav>
                  )}
                  {groups.map(([letter, rows]) => (
                    <div key={letter} id={letterAnchorId(letter)} className="mb-10">
                      <h3 className="text-lg font-bold text-sims-pink mb-3">{letter === '#' ? '0–9 & other' : letter}</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5 list-none p-0 m-0">
                        {rows.map((c) => (
                          <li key={c.slug} className="text-sm">
                            <a href={creatorHref(c.slug)} className="text-slate-200 hover:text-sims-pink hover:underline">
                              {c.displayName}
                            </a>
                            <span className="text-slate-500"> · {c.mods.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              </div>

              {/* Email capture — sibling of .mv-ads, never inside or adjacent to the
                  <aside id="secondary"> ad anchor. source="creator-hub" so the
                  scoreboard can attribute adds to this surface. */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sims-pink mb-2">Weekly finds</p>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                    New mods from these creators, every week
                  </h2>
                  <p className="text-sm text-slate-400 mb-5">
                    The best new Sims 4 CC drops delivered to your inbox — no spam, unsubscribe anytime.
                  </p>
                  <NewsletterSignup source="creator-hub" />
                </div>
              </div>
            </div>

            {/* Sidebar column: Mediavine ad anchor.
                MUST NOT add position:sticky/fixed — Mediavine Script
                Wrapper handles stickiness itself. Keep overflow:visible
                and use <aside id="secondary"> so Mediavine auto-detects. */}
            <aside
              id="secondary"
              className="widget-area primary-sidebar hidden lg:block overflow-visible"
              role="complementary"
              aria-label="Sidebar ads"
            >
              {/* Empty — Mediavine auto-fills with its own stacked ad containers. */}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
