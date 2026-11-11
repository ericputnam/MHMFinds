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
import { ShareButton } from '../../../../components/ShareButton';
import { Mod } from '../../../../lib/api';
import { collectionHref, type CollectionDefinition } from '../../../../lib/collections';
import type { CollectionCreator } from '../../../../lib/collectionCreators';
import { creatorHref } from '../../../../lib/creatorSlug';
import type { ModLink } from '../../../../lib/seo/collectionMoreLinks';
import { blogTwinLinkText } from '../../../../lib/seo/blogTwinLabel';
import { GRID_FAVORITE_SOURCES } from '../../../../lib/capture/gridFavorite';
import { useGridFavoriteCapture } from '../../../../lib/capture/useGridFavoriteCapture';
import { useGridFavoriteIds, isAlreadyFavorited } from '../../../../lib/capture/useGridFavoriteIds';
import {
  COLLECTION_ACCOUNT_CTA_EVENT,
  COLLECTION_CAPTURE_SOURCE,
  collectionAccountHref,
} from '../../../../lib/capture/collectionAccountOffer';

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
  useGridFavoriteIds(setFavorites); // signed-in: fill the hearts of mods already saved
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

  // E380: the click side of the hub's account offer (analytics only).
  const handleAccountCtaClick = () => {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      COLLECTION_ACCOUNT_CTA_EVENT,
      { source: COLLECTION_CAPTURE_SOURCE },
    );
  };

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
      // 400 on POST = already saved server-side: keep the optimistic fill.
      if (!response.ok && !isAlreadyFavorited(isFavorited ? 'DELETE' : 'POST', response.status)) {
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

            {/* E352 (Pip, 2026-11-06): reader-to-reader share link
                (`?via=share`). Inside the intro <header>, above the
                grid/sidebar row — never inside .mv-ads or beside
                <aside id="secondary">. */}
            <div style={{ margin: '12px 0' }}>
              <ShareButton
                path={collectionHref(collection)}
                title={collection.heading}
                contentType="collection"
                itemId={collection.slug}
                label="Share this list"
              />
            </div>

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
                  // E367: descriptive anchor from the twin's slug, not
                  // "Full article on the blog" on all 34 hubs.
                  <a href={collection.blogUrl} target="_blank" rel="noopener noreferrer">
                    {blogTwinLinkText(collection.blogUrl)}
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

            {/* Email capture (E323, 2026-11-02): directly under the 48-card
                grid, a sibling of <LauncherGrid> and outside its .mv-ads
                container (siblings do not change ad geometry), never inside
                or beside <aside id="secondary">. Until E323 it rendered
                last, below 60 more-links, related collections and creators:
                2,009 sessions / 4,387 views → 1 newsletter_signup
                (10-25→10-31). Placement only, copy unchanged.
                source="collection-page" keeps attribution per surface. */}
            <section className="below-sec" aria-labelledby="collection-news-heading">
              <div className="coll-news">
                <p className="hero-kicker">New finds by email</p>
                <h2 id="collection-news-heading" className="hc-title">
                  New {collection.title} every two weeks
                </h2>
                <p className="ef-copy">
                  Get the freshest {collection.title.toLowerCase()} drops delivered straight to your inbox — no spam,
                  unsubscribe anytime. Or{' '}
                  {/* E380: the account alternative the home strip already
                      carries (4 clicks → 4 sign-ups 11-02→11-08). */}
                  <Link
                    href={collectionAccountHref(collectionHref(collection))}
                    onClick={handleAccountCtaClick}
                  >
                    create a free account
                  </Link>{' '}
                  to save finds as you browse.
                </p>
                <NewsletterSignup source="collection-page" variant="strip" />
              </div>
            </section>

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
