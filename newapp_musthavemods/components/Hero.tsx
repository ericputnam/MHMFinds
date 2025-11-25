import React, { useState, useRef } from 'react';
import { Search, Sparkles, Image as ImageIcon, Loader2, Filter, TrendingUp, ChevronDown } from 'lucide-react';
import { Category } from '../types';

interface HeroProps {
  onSearch: (query: string, category: Category, imageBase64?: string) => void;
  isLoading: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.ALL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, selectedCategory);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        onSearch("Identify style", selectedCategory, base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const trendingTags = [
    { label: 'Cottage Living', icon: '🏡' },
    { label: 'Y2K Fashion', icon: '👛' },
    { label: 'GShade Presets', icon: '✨' },
    { label: 'Realistic Skin', icon: '🎨' },
    { label: 'UI Cheats', icon: '🛠️' },
    { label: 'Modern Luxe', icon: '💎' }
  ];

  return (
    <div className="relative w-full overflow-hidden flex flex-col justify-center min-h-[90vh] md:min-h-[80vh]">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-sims-purple/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-40 animate-pulse-slow" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-sims-pink/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-30" />

      <div className="container mx-auto px-4 pt-20 pb-28 relative z-10 flex flex-col items-center">
        <div className="max-w-4xl w-full text-center">
          
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sims-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sims-green"></span>
            </span>
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">AI Powered Mod Discovery v2.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight drop-shadow-2xl">
            Curated Mods for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue animate-shimmer bg-[length:200%_100%]">
              Your Perfect Game
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Stop scrolling endlessly. Describe the vibe, upload a screenshot, or search for specific CC. We find the best mods from across the community.
          </p>

          <div className="max-w-3xl mx-auto w-full">
            <form onSubmit={handleSubmit} className="relative group z-20">
              <div className="absolute -inset-1 bg-gradient-to-r from-sims-pink to-sims-blue rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-xl"></div>
              <div className="relative flex items-center bg-mhm-card/90 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-white/10 group-focus-within:border-sims-pink/50 transition-all">
                
                {/* Category Dropdown for Context (Desktop) */}
                <div className="hidden md:flex items-center border-r border-white/10 px-2">
                   <Filter className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                   <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as Category)}
                    className="bg-transparent text-slate-300 text-sm font-semibold px-2 py-3 outline-none cursor-pointer hover:text-white transition-colors appearance-none min-w-[120px]"
                  >
                    {Object.values(Category).map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe a vibe: 'Maxis match cottage kitchen'..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-4 outline-none text-lg font-medium w-full min-w-0"
                />
                
                <div className="flex items-center space-x-2 pr-2 shrink-0">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    title="Search by Image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-sims-pink to-purple-600 hover:brightness-110 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 stroke-[3px]" />}
                  </button>
                </div>
              </div>
            </form>

            {/* Trending Vibes (Discovery) */}
            <div className="mt-8">
              <div className="flex items-center justify-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <TrendingUp className="w-3 h-3" />
                <span>Trending Vibes</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {trendingTags.map((tag) => (
                  <button 
                    key={tag.label}
                    onClick={() => onSearch(tag.label, Category.ALL)}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-sims-pink/30 transition-all hover:-translate-y-0.5"
                  >
                    <span className="text-sm">{tag.icon}</span>
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce opacity-50">
        <ChevronDown className="w-6 h-6 text-slate-400" />
      </div>
    </div>
  );
};