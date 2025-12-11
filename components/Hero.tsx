'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Image as ImageIcon, Loader2, Filter, X } from 'lucide-react';

interface HeroProps {
  onSearch: (query: string, category?: string, gameVersion?: string) => void;
  isLoading: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGame, setSelectedGame] = useState<string>('Sims 4'); // Default to Sims 4
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories when the selected game changes
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch(`/api/categories?gameVersion=${encodeURIComponent(selectedGame)}`);
        const data = await response.json();

        if (data.categories) {
          setCategories(data.categories);
          // Reset category to "All" when game changes
          setSelectedCategory('All');
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(['All']); // Fallback to just "All"
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [selectedGame]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, selectedCategory !== 'All' ? selectedCategory : undefined);
    }
  };

  const handleGameFilter = (game: string) => {
    // Update selected game (this will trigger category fetch via useEffect)
    setSelectedGame(game);
    // Clear search query and filter by game version instead
    setQuery('');
    // For "Other", pass a special value that the API will interpret as NOT IN the main games
    const gameFilter = game === 'Other' ? '__other__' : game;
    onSearch('', undefined, gameFilter);
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-sims-purple/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-40 animate-pulse-slow" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-sims-pink/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-30" />

      <div className="container mx-auto px-4 pt-8 pb-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-4 backdrop-blur-md shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sims-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sims-green"></span>
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-200 tracking-wider">
              <span>Discover</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sims-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sims-green"></span>
              </span>
              <span>Download</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sims-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sims-green"></span>
              </span>
              <span>Play</span>
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tight leading-tight">
            <span className="text-white">Find your next favorite mod</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light">
            Stop scrolling endlessly. Describe the vibe, or search for specific Mods or CC. We find the best mods from across the community.
          </p>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sims-pink to-sims-blue rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-xl"></div>
              <div className="relative flex items-center bg-mhm-card/90 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-white/10 group-focus-within:border-sims-pink/50 transition-all">

                {/* Category Dropdown */}
                <div className="hidden md:flex items-center border-r border-white/10 px-2">
                  <Filter className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setSelectedCategory(newCategory);
                      // Trigger search immediately when category changes
                      const gameFilter = selectedGame === 'Other' ? '__other__' : selectedGame;
                      onSearch(query, newCategory !== 'All' ? newCategory : undefined, gameFilter);
                    }}
                    className="bg-transparent text-slate-300 text-sm font-semibold px-2 py-3 outline-none cursor-pointer hover:text-white transition-colors appearance-none min-w-[120px]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 'Maxis match hair', 'Modern kitchen'..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-4 outline-none text-lg font-medium"
                />

                <div className="flex items-center space-x-2 pr-2">
                  {/* Clear Button - only show when there's a search query */}
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        onSearch('');
                      }}
                      className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                      title="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-sims-pink hover:bg-sims-pink/90 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 stroke-[3px]" />}
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
          </div>
        </div>
      </div>
    </div>
  );
};
