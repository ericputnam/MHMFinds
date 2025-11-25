import React from 'react';
import { Search, Menu, Heart, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-mhm-dark/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <div className="absolute inset-0 bg-sims-pink blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
            <div className="relative bg-gradient-to-br from-sims-pink to-purple-600 p-2.5 rounded-xl transform group-hover:scale-105 transition-all duration-300 shadow-lg">
              <Sparkles className="text-white h-5 w-5 fill-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold tracking-tight leading-none text-white">
              MustHave<span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink to-sims-purple">Mods</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              Community Finds
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center bg-white/5 rounded-full px-6 py-2 backdrop-blur-sm border border-white/5">
          <div className="flex space-x-8 text-sm font-semibold text-slate-300">
            <a href="#" className="hover:text-sims-pink transition-colors">Discover</a>
            <a href="#" className="hover:text-sims-blue transition-colors">Categories</a>
            <a href="#" className="hover:text-sims-green transition-colors">Creators</a>
            <a href="#" className="hover:text-white transition-colors">News</a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button className="p-2.5 text-slate-400 hover:text-sims-pink hover:bg-white/5 rounded-full transition-all">
            <Heart className="h-5 w-5" />
          </button>
          <button className="hidden md:block bg-white text-mhm-dark hover:bg-slate-200 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Sign In
          </button>
          <button className="md:hidden p-2 text-slate-300">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};