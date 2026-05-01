'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { GAME_COLORS } from '../lib/gameColors';

interface HeroProps {
  onSearch: (query: string, category?: string, gameVersion?: string) => void;
  isLoading: boolean;
  initialSearch?: string;
  defaultGame?: string;
}

// Active games — kept in display order. Animal Crossing was removed
// from the discovery surfaces (Apr 2026); the route still resolves but
// it isn't a primary tab here.
const GAMES: Array<{ key: string; label: string; short: string; emoji: string }> = [
  { key: 'Sims 4', label: 'Sims 4', short: 'Sims 4', emoji: '✨' },
  { key: 'Stardew Valley', label: 'Stardew Valley', short: 'Stardew', emoji: '🌾' },
  { key: 'Minecraft', label: 'Minecraft', short: 'Minecraft', emoji: '🟫' },
];

// Game-specific trending searches (SEO-003)
const trendingByGame: Record<string, Array<{ label: string; query: string }>> = {
  'Sims 4': [
    { label: 'Wicked Whims', query: 'wicked whims' },
    { label: 'MCCC', query: 'mccc' },
    { label: 'UI Cheats', query: 'ui cheats' },
    { label: 'Basemental', query: 'basemental' },
    { label: 'Slice of Life', query: 'slice of life' },
    { label: 'Poses', query: 'poses' },
  ],
  'Stardew Valley': [
    { label: 'SVE', query: 'stardew valley expanded' },
    { label: 'SMAPI', query: 'smapi' },
    { label: 'Aesthetic', query: 'aesthetic' },
    { label: 'Farm Maps', query: 'farm map' },
    { label: 'Portraits', query: 'portraits' },
    { label: 'Furniture', query: 'furniture' },
  ],
  'Minecraft': [
    { label: 'Shaders', query: 'shaders' },
    { label: 'Texture Packs', query: 'texture pack' },
    { label: 'Fabric Mods', query: 'fabric' },
    { label: 'Forge Mods', query: 'forge' },
    { label: 'OptiFine', query: 'optifine' },
    { label: 'Skins', query: 'skins' },
  ],
};

const trendingGeneral: Array<{ label: string; query: string }> = [
  { label: 'Wicked Whims', query: 'wicked whims' },
  { label: 'Shaders', query: 'shaders' },
  { label: 'MCCC', query: 'mccc' },
  { label: 'SVE', query: 'stardew valley expanded' },
  { label: 'Aesthetic', query: 'aesthetic' },
  { label: 'Texture Packs', query: 'texture pack' },
];

function getTrendingForGame(game: string): Array<{ label: string; query: string }> {
  if (!game) return trendingGeneral;
  return trendingByGame[game] || trendingGeneral;
}

export const Hero: React.FC<HeroProps> = ({
  onSearch,
  isLoading,
  initialSearch = '',
  defaultGame = '',
}) => {
  const [query, setQuery] = useState(initialSearch);
  const [selectedGame, setSelectedGame] = useState<string>(defaultGame);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Sync query with parent's search state (e.g., when facets clear the search)
  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  // Fetch per-game mod counts once on mount — used as a credibility cue
  // on the game switcher. Best-effort: silently fall back to no count
  // if the request fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          GAMES.map(async ({ key }) => {
            const res = await fetch(
              `/api/mods?gameVersion=${encodeURIComponent(key)}&limit=1`,
            );
            if (!res.ok) return [key, 0] as const;
            const data = await res.json();
            return [key, data?.pagination?.total ?? data?.total ?? 0] as const;
          }),
        );
        if (!cancelled) {
          const next: Record<string, number> = {};
          for (const [k, v] of results) next[k] = v;
          setCounts(next);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  const handleGameSelect = (game: string) => {
    if (selectedGame === game) {
      // Toggle off — clear filter
      setSelectedGame('');
      onSearch('', undefined, '');
      return;
    }
    setSelectedGame(game);
    setQuery('');
    onSearch('', undefined, game);
  };

  const activeColor = selectedGame ? GAME_COLORS[selectedGame] : '#ec4899';
  const placeholder = selectedGame
    ? `Search ${selectedGame} mods, CC, scripts…`
    : 'Search mods, CC, scripts across every game…';

  // Pretty-format mod count: 13,739 → "13.7k", 412 → "412"
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 1 : 1).replace(/\.0$/, '')}k` : `${n}`;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Background ambience — subtly tinted by the active game */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-40 animate-pulse-slow transition-colors duration-700"
        style={{ backgroundColor: `${activeColor}33` }}
      />
      <div
        className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-25 transition-colors duration-700"
        style={{ backgroundColor: `${activeColor}33` }}
      />

      <div className="container mx-auto px-4 pt-6 pb-10 relative z-10">
        {/* Title block — single-line headline that incorporates the game lineup */}
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center mb-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-[1.1]">
            <span className="text-white">The best mods </span>
            <span style={{ color: activeColor }} className="transition-colors duration-500">
              &amp; CC
            </span>
            <span className="text-white"> for Sims 4, Stardew Valley &amp; Minecraft</span>
          </h1>
        </div>

        {/* Game switcher — compact, content-sized pills */}
        <div
          role="tablist"
          aria-label="Filter by game"
          className="max-w-3xl mx-auto px-2 sm:px-4 mb-3 flex items-center justify-center flex-wrap gap-2"
        >
          {GAMES.map(({ key, label, short, emoji }) => {
            const active = selectedGame === key;
            const color = GAME_COLORS[key];
            const count = counts[key];
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => handleGameSelect(key)}
                className={`group inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
                style={
                  active
                    ? {
                        backgroundColor: `${color}1f`,
                        border: `1px solid ${color}66`,
                        boxShadow: `0 0 20px ${color}26`,
                      }
                    : undefined
                }
              >
                <span className="text-[15px] leading-none">{emoji}</span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[11px] font-medium tabular-nums transition-colors ${
                      active ? 'text-white/70' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    · {fmt(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="max-w-3xl mx-auto px-2 sm:px-4">
          <form onSubmit={handleSubmit} className="relative group">
            <div
              className="absolute -inset-1 rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-xl"
              style={{ backgroundColor: `${activeColor}55` }}
            />
            <div
              className="relative flex items-center bg-mhm-card/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-2xl border border-white/10 group-focus-within:border-white/30 transition-all"
              style={{ boxShadow: `0 0 0 1px ${activeColor}11, 0 25px 50px -12px rgba(0,0,0,0.5)` }}
            >
              <Search className="ml-3 sm:ml-4 h-5 w-5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 py-3 sm:py-4 outline-none focus:outline-none focus:ring-0 ring-0 text-sm sm:text-base md:text-lg font-medium min-w-0"
              />

              <div className="flex items-center space-x-1 sm:space-x-2 pr-1 sm:pr-2">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      onSearch('');
                    }}
                    className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all"
                    title="Clear search"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="text-white p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:brightness-110"
                  style={{ backgroundColor: activeColor }}
                  aria-label="Search"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Trending chips */}
        <div className="mt-4 max-w-3xl mx-auto px-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-slate-500 font-medium mr-1">
              {selectedGame ? `Try in ${selectedGame}:` : 'Trending:'}
            </span>
            {getTrendingForGame(selectedGame).map(({ label, query: q }) => (
              <button
                key={label}
                onClick={() => {
                  setQuery(q);
                  onSearch(q);
                }}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[13px] font-medium text-slate-300 hover:text-white transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
