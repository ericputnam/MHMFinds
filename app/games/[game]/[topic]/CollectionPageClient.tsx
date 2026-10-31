'use client';

/**
 * CollectionPageClient — interactive shell for a collection topic.
 *
 * Receives pre-fetched mods from the server component so the first
 * paint already has the grid + schema. Handles:
 *   - Favorites toggle (optimistic, with rollback)
 *   - Breadcrumb nav
 *   - Mediavine sidebar + in-content ad anchors
 *   - Related collections grid
 *
 * 2026-10-28: rendered in the launcher shell (components/launcher/), the same
 * header, game switcher, grid and footer as the homepage and /games/<slug>/.
 * The page stays statically generated, so nothing here reads
 * useSearchParams(): search and the game switcher navigate to the game's grid.
 *
 * Ad-anchor rules (see __tests__/unit/sidebar-sticky-health.test.ts): the
 * aside stays empty, in normal flow and visible at lg:. The grid's .mv-ads
 * container is LauncherGrid's and renders on first paint.
 */

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../../components/launcher/launcher.css';
import { lxFontVars } from '../../../../components/launcher/fonts';
import { gameFor } from '../../../../components/launcher/games';
import { GameSwitch } from '../../../../components/launcher/GameSwitch';
import { Icon } from '../../../../components/launcher/Icon';
import { LauncherHeader } from '../../../../components/launcher/LauncherHeader';
import { LauncherGrid } from '../../../../components/launcher/LauncherGrid';
import { LauncherFooter } from '../../../../components/launcher/LauncherFooter';
import { useGameCounts } from '../../../../components/launcher/useLauncherData';
import { NewsletterSignup } from '../../../../components/NewsletterSignup';
import { CollectionMoreLinks } from '../../../../components/CollectionMoreLinks';
import { Mod } from '../../../../lib/api';
import { collectionHref, type CollectionDefinition } from '../../../../lib/collections';
import type { CollectionCreator } from '../../../../lib/collectionCreators';
import { creatorHref } from '../../../../lib/creatorSlug';
import type { ModLink } from '../../../../lib/seo/collectionMoreLinks';
import { GRID_FAVORITE_SOURCES } from '../../../../lib/capture/gridFavorite';
import { useGridFavoriteCapture } from '../../../../lib/capture/useGridFavoriteCapture';

interface CollectionPageClientProps {
  collection: CollectionDefinition;
  initialMods: Mod[];
  totalCount: number;
  /** Mods ranked just below the grid, rendered as crawlable text links (E84). */
  moreLinks?: ModLink[];
  relatedCollections: CollectionDefinition[];
  /**
   * Hub pages only (E182): a link to every category collection, rendered
   * in the header above the grid. Empty everywhere else (section hidden).
   */
  categoryLinks?: Array<{ href: string; heading: string }>;
  /**
   * Creators with the most mods in this collection (E302), rendered as
   * crawlable links to /creator/[slug]/ below the related collections.
   * Empty hides the section.
   */
  creators?: CollectionCreator[];
}

export default function CollectionPageClient({
  collection,
  initialMods,
  totalCount,
  moreLinks = [],
  relatedCollections,
  categoryLinks = [],
  creators = [],
}: CollectionPageClientProps) {
  const router = useRouter();
  const game = gameFor(collection.game);
  const gamePath = `/games/${collection.gameSlug}/`;
  const gameCounts = useGameCounts();
  const [mods] = useState<Mod[]>(initialMods);
  const [favorites, setFavorites] = useState<string[]>([]);
  // E279: a signed-out heart tap goes to the save-intent sign-up and the
  // save completes on return (lib/capture/gridFavorite.ts).
  const { onUnauthorized } = useGridFavoriteCapture(GRID_FAVORITE_SOURCES.collection, (savedId) =>
    setFavorites((prev) => (prev.includes(savedId) ? prev : [...prev, savedId])),
  );

  // Search leaves the collection for the game's grid, which reads ?search=.
  const handleSearch = useCallback(
    (q: string) => {
      if (q) router.push(`${gamePath}?${new URLSearchParams({ search: q })}`);
    },
    [router, gamePath],
  );

  const handleGame = useCallback(
    (value: string) => {
      const next = gameFor(value);
      router.push(next.slug ? `/games/${next.slug}/` : '/');
    },
    [router],
  );

  const goToGame = useCallback(() => router.push(gamePath), [router, gamePath]);

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);

    // Optimistic toggle
    setFavorites((prev) =>
      isFavorited ? prev.filter((id) => id !== modId) : [...prev, modId],
    );

    try {
      const response = await fetch(`/api/mods/${modId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        // Rollback
        setFavorites((prev) =>
          isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
        );
        if (response.status === 401) {
          onUnauthorized(modId); // E279: save-intent sign-up, not a dead-end alert
        }
      }
    } catch {
      setFavorites((prev) =>
        isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
      );
    }
  };

  return (
    <div className={`lx ${lxFontVars}`} data-game={game.id}>
      <LauncherHeader
        search=""
        onSearch={handleSearch}
        game={game.value}
        gameCounts={gameCounts}
        onGame={handleGame}
        submitOnly
      />

      <div className="gameband">
        <div className="wrap">
          <GameSwitch value={game.value} counts={gameCounts} onChange={handleGame} label="Choose a game" />
        </div>
      </div>

      <main>
        {/* Collection intro. Sibling of the grid/sidebar row below — never
            inside .mv-ads or beside <aside id="secondary">. */}
        <header className="hero coll-hero">
          <div className="wrap coll-hero-in">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <Icon name="chevron" />
              <Link href={gamePath}>{collection.game}</Link>
              <Icon name="chevron" />
              <span aria-current="page">{collection.title}</span>
            </nav>

            <h1 className="hero-h1">{collection.heading}</h1>
            <p className="hero-sub">{collection.tagline}</p>

            <div className="coll-intro">
              {/* Split the intro into paragraphs so humanizer-generated
                  copy renders cleanly in Phase 2 */}
              {collection.intro.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {(collection.blogUrl || (collection.guides?.length ?? 0) > 0) && (
              <p className="coll-reading">
                Related reading:{' '}
                {collection.blogUrl && (
                  <a href={collection.blogUrl} target="_blank" rel="noopener noreferrer">
                    Full article on the blog →
                  </a>
                )}
                {/* E203: adjacent guides with no hub of their own (first
                    use: the host-split hospital-lots article). Plain <a>
                    in the first-paint HTML, same paragraph as the
                    companion link, never inside .mv-ads. */}
                {collection.guides?.map((g) => (
                  <span key={g.href}>
                    {' · '}
                    <a href={g.href}>{g.label}</a>
                  </span>
                ))}
              </p>
            )}

            {/* Hub category links (E182). Inside the header, above the
                main/aside split. Plain <Link>s so they are in the
                first-paint HTML for crawlers. */}
            {categoryLinks.length > 0 && (
              <nav aria-labelledby="hub-categories-heading" className="hub-cats">
                <h2 id="hub-categories-heading" className="hcl-label">
                  Browse {collection.game} CC by category
                </h2>
                <div className="type-cloud">
                  {categoryLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="chip">
                      {l.heading}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Main content row: results column + right ad sidebar. */}
        <div className="wrap row">
          <div className="main">
            <div className="toolbar">
              <div className="tb-head">
                <h2 className="tb-title">Most downloaded</h2>
                <div className="tb-meta">
                  <span className="cnt tabular">{totalCount.toLocaleString()}</span>
                  {totalCount === 1 ? 'mod' : 'mods'} in this collection
                </div>
              </div>
            </div>

            <LauncherGrid
              mods={mods}
              loading={false}
              error={null}
              pageSize={mods.length}
              rankFrom={1}
              favorites={favorites}
              onFavorite={handleFavorite}
              onRetry={goToGame}
              onClear={goToGame}
            />

            {/* Crawlable links to the next 60 mods of this collection
                (E84). Sibling of the grid inside the main column —
                never inside or beside <aside id="secondary">. */}
            <CollectionMoreLinks title={collection.title} links={moreLinks} />

            {/* Related collections — internal linking for SEO + scroll depth */}
            {relatedCollections.length > 0 && (
              <section className="below-sec" aria-labelledby="related-collections-heading">
                <div className="sec-head">
                  <h2 id="related-collections-heading">Related collections</h2>
                </div>
                <div className="rel-grid">
                  {/* collectionHref() keeps the trailing slash —
                      next.config.js sets trailingSlash: true, so a bare
                      path 308s and the internal link stops pointing at
                      the canonical URL. */}
                  {relatedCollections.map((rel) => (
                    <Link key={rel.slug} href={collectionHref(rel)} className="rel-card">
                      <h3>{rel.title}</h3>
                      <p>{rel.tagline}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Creators in this collection (E302) — the hub's only links
                down to /creator/[slug]/. Sibling of the grid inside the
                main column, never inside or beside <aside id="secondary">.
                creatorHref() keeps the trailing slash. */}
            {creators.length > 0 && (
              <section className="below-sec" aria-labelledby="collection-creators-heading">
                <div className="sec-head">
                  <h2 id="collection-creators-heading">Creators in this collection</h2>
                </div>
                <div className="rel-grid">
                  {creators.map((c) => (
                    <Link key={c.slug} href={creatorHref(c.slug)} className="rel-card">
                      <h3>{c.displayName}</h3>
                      <p>
                        {c.count} {c.count === 1 ? 'mod' : 'mods'} here · browse all their CC
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Email capture — sibling of the mod grid, never inside or
                adjacent to the <aside id="secondary"> ad anchor.
                source="collection-page" so the scoreboard attributes
                net adds to this surface separately from footer/go. */}
            <section className="below-sec" aria-labelledby="collection-news-heading">
              <div className="coll-news">
                <p className="hero-kicker">Weekly finds</p>
                <h2 id="collection-news-heading" className="hc-title">
                  New {collection.title} every week
                </h2>
                <p className="ef-copy">
                  Get the freshest {collection.title.toLowerCase()} drops delivered straight to your inbox — no spam,
                  unsubscribe anytime.
                </p>
                <NewsletterSignup source="collection-page" variant="strip" />
              </div>
            </section>
          </div>

          {/* Right Ad Sidebar — in normal document flow so Mediavine Script Wrapper
              can apply sticky scroll behavior and auto-refresh ads as user scrolls.
              Mediavine auto-detects <aside id="secondary"> for Sidebar Sticky.
              IMPORTANT: Do NOT add position:sticky/fixed — Mediavine handles stickiness.
              overflow must be visible on this element and all ancestors. */}
          <aside
            id="secondary"
            className="widget-area primary-sidebar hidden lg:block flex-shrink-0 w-[300px] overflow-visible"
            role="complementary"
            aria-label="Sidebar"
          >
            {/* Empty — Mediavine auto-fills with its own stacked ad containers. */}
          </aside>
        </div>
      </main>

      <LauncherFooter />
    </div>
  );
}
