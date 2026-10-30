'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { FAVORITES_PATH } from '@/lib/favoritesPath';
import { GameSwitch } from './GameSwitch';
import { GAMES } from './games';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';

interface LauncherHeaderProps {
  search: string;
  onSearch: (q: string) => void;
  game: string;
  gameCounts: Record<string, number | undefined>;
  onGame: (value: string) => void;
  /**
   * Search only on Enter, not while typing. For pages where a search leaves
   * the page (collection pages navigate to the game's grid), so a pause
   * mid-word does not navigate away.
   */
  submitOnly?: boolean;
}

/**
 * Launcher top bar: brand, search (debounced, ⌘K), the header copy of the
 * game switcher (≥1280px), nav, and a slide-in menu under 1024px.
 * Sticky at 56px — the only sticky element on the page.
 */
export function LauncherHeader({ search, onSearch, game, gameCounts, onGame, submitOnly = false }: LauncherHeaderProps) {
  const { data: session, status } = useSession();
  const [draft, setDraft] = useState(search);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCommitted = useRef(search);

  // Keep the box in sync when the search is changed from elsewhere (clear).
  useEffect(() => {
    if (search !== lastCommitted.current) {
      lastCommitted.current = search;
      setDraft(search);
    }
  }, [search]);

  // Debounced commit while typing.
  useEffect(() => {
    const q = draft.trim();
    if (submitOnly || q === lastCommitted.current) return;
    const t = setTimeout(() => {
      lastCommitted.current = q;
      onSearch(q);
    }, 450);
    return () => clearTimeout(t);
  }, [draft, onSearch, submitOnly]);

  // ⌘K / Ctrl+K focuses search; Escape closes the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commitNow = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    lastCommitted.current = q;
    onSearch(q);
    inputRef.current?.blur();
  };

  const clear = () => {
    setDraft('');
    lastCommitted.current = '';
    onSearch('');
    inputRef.current?.focus();
  };

  const authed = status === 'authenticated' && !!session?.user;
  const isCreator = authed && !!session?.user?.isCreator;

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a href="/" className="brand" aria-label="MustHaveMods home">
            <BrandMark />
          </a>

          <form className="searchwrap" role="search" onSubmit={commitNow}>
            <label className="searchbox">
              <Icon name="search" />
              <input
                ref={inputRef}
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search mods, CC, creators…"
                aria-label="Search mods"
                autoComplete="off"
                enterKeyHint="search"
              />
              {draft ? (
                <button type="button" className="search-clear" onClick={clear} aria-label="Clear search">
                  <Icon name="close" />
                </button>
              ) : (
                <span className="kbd" aria-hidden="true">⌘K</span>
              )}
            </label>
          </form>

          <div className="hdr-games">
            <GameSwitch value={game} counts={gameCounts} onChange={onGame} label="Choose a game" />
          </div>

          <nav className="hdr-nav" aria-label="Main">
            <a href="/#collections">Collections</a>
            <a href="/creator/">Creators</a>
            <a href="/blog/">Blog</a>
            {isCreator && <a href="/creators/">Creator portal</a>}
            {authed ? (
              <>
                <a href={FAVORITES_PATH}>Favorites</a>
                <button type="button" className="linkish" onClick={() => signOut({ callbackUrl: '/' })}>
                  Sign out
                </button>
              </>
            ) : (
              <a href="/sign-in/" className="hdr-signin">Sign in</a>
            )}
          </nav>

          <button
            type="button"
            className="menubtn"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div
            className="menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <Icon name="close" />
            </button>
            <nav className="menu-nav" aria-label="Menu">
              {GAMES.filter((g) => g.slug).map((g) => (
                <a key={g.id} href={`/games/${g.slug}/`}>{g.name}</a>
              ))}
              <div className="menu-sep" />
              <a href="/#collections">Collections</a>
              <a href="/creator/">Top Creators</a>
              <a href="/blog/">Blog</a>
              <a href="/submit-mod/">Submit a Mod</a>
              <a href="/about/">About</a>
              <div className="menu-sep" />
              {isCreator && <a href="/creators/">Creator portal</a>}
              {authed ? (
                <>
                  <a href={FAVORITES_PATH}>Favorites</a>
                  <button type="button" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
                </>
              ) : (
                <a href="/sign-in/">Sign in</a>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
