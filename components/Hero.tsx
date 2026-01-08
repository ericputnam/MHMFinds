'use client';

import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface HeroProps {
  onSearch: (query: string, category?: string, gameVersion?: string) => void;
  isLoading: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string>('Sims 4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleGameFilter = (game: string) => {
    setSelectedGame(game);
    setQuery('');
    const gameFilter = game === 'Other' ? '__other__' : game;
    onSearch('', undefined, gameFilter);
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-sims-purple/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-40 animate-pulse-slow" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-sims-pink/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-30" />

      <div className="container mx-auto px-4 pt-8 pb-12 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 tracking-tight leading-tight px-2 lg:whitespace-nowrap">
            <span className="text-white">The Search Engine for </span>
            <span className="text-sims-pink">Game Mods & CC</span>
          </h1>

          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-6 backdrop-blur-md shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sims-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sims-green"></span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wider uppercase">
              Indexing 15,000+ Verified Mods & CC
            </span>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-slate-400 w-full max-w-5xl mx-auto mb-6 leading-relaxed font-light px-4">
            Stop scrolling endlessly. Discover curated community finds for{' '}
            <span className="text-sims-pink font-medium">The Sims 4</span>
            {', '}
            <span className="text-sims-purple font-medium">Stardew Valley</span>
            {', and '}
            <span className="text-sims-blue font-medium">Minecraft</span>
            . Describe a vibe, or search for specific scripts, furniture, and aesthetics.
          </p>

          <div className="w-full max-w-5xl mx-auto px-2 sm:px-4">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sims-pink to-sims-blue rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-xl"></div>
              <div className="relative flex items-center bg-mhm-card/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-2xl border border-white/10 group-focus-within:border-sims-pink/50 transition-all">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search mods, CC, scripts..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none text-sm sm:text-base md:text-lg font-medium min-w-0"
                />

                <div className="flex items-center space-x-1 sm:space-x-2 pr-1 sm:pr-2">
                  {/* Clear Button - only show when there's a search query */}
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        onSearch('');
                      }}
                      className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                      title="Clear search"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-sims-pink hover:bg-sims-pink/90 text-white p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Game Filter Tags */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['Sims 4', 'Stardew Valley', 'Animal Crossing', 'Minecraft', 'Other'].map((game) => (
                <button
                  key={game}
                  onClick={() => handleGameFilter(game)}
                  className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-sims-pink/30 text-[0.995rem] font-medium text-slate-400 hover:text-white transition-all"
                >
                  {game}
                </button>
              ))}
            </div>

            {/* Trending Searches - SEO internal linking */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-500 font-medium">Trending:</span>
              {[
                { label: 'Wicked Whims', query: 'wicked whims' },
                { label: 'MCCC', query: 'mccc' },
                { label: 'UI Cheats', query: 'ui cheats' },
                { label: 'Basemental', query: 'basemental' },
                { label: 'Slice of Life', query: 'slice of life' },
                { label: 'Poses', query: 'poses' },
                { label: 'Build Mode', query: 'build mode' },
              ].map(({ label, query: searchQuery }) => (
                <button
                  key={label}
                  onClick={() => {
                    setQuery(searchQuery);
                    onSearch(searchQuery);
                  }}
                  className="text-slate-400 hover:text-sims-pink transition-colors underline-offset-2 hover:underline"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
