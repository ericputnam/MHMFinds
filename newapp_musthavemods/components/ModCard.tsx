import React from 'react';
import { Download, Star, User, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { Mod } from '../types';

interface ModCardProps {
  mod: Mod;
  onClick?: (mod: Mod) => void;
}

export const ModCard: React.FC<ModCardProps> = ({ mod, onClick }) => {
  return (
    <div 
      onClick={() => onClick && onClick(mod)}
      className="group relative bg-mhm-card border border-white/5 rounded-2xl overflow-hidden hover:border-sims-purple/30 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10 flex flex-col h-full hover:-translate-y-1 cursor-pointer"
    >
      
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-mhm-card via-transparent to-transparent z-10 opacity-80" />
        <img 
          src={mod.imageUrl} 
          alt={mod.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        
        {/* Floating Tags */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
           <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
            {mod.category}
          </span>
        </div>

        {/* Maxis Match / Alpha Tag */}
        <div className="absolute top-3 left-3 z-20">
          {mod.isMaxisMatch ? (
             <div className="bg-sims-green/90 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg flex items-center gap-1">
               <Layers className="w-3 h-3" /> Maxis Match
             </div>
          ) : (
            <div className="bg-sims-pink/90 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Alpha CC
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col relative z-20 -mt-4">
        <div className="mb-1">
             {/* Rating Badge - moved here for layout balance */}
            <div className="inline-flex items-center gap-1 text-yellow-400 text-xs font-bold mb-2 bg-yellow-400/10 px-2 py-0.5 rounded">
              <Star className="w-3 h-3 fill-current" />
              {mod.rating.toFixed(1)}
            </div>
        </div>

        <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-sims-blue transition-colors line-clamp-2">
          {mod.title}
        </h3>

        {/* Author Line */}
        <div className="flex items-center text-slate-400 text-xs mb-4 font-medium">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center mr-2 text-[8px] text-white border border-white/10">
             {mod.author.substring(0,2).toUpperCase()}
          </div>
          <span className="hover:text-white cursor-pointer transition-colors">{mod.author}</span>
          <CheckCircle2 className="w-3 h-3 ml-1 text-sims-blue" />
        </div>

        <p className="text-slate-400 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
          {mod.description}
        </p>

        {/* Stats & Action */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
          <div className="flex items-center text-slate-500 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {mod.downloadCount} Downloads
          </div>

          <button className="bg-white/5 hover:bg-white text-white hover:text-black p-2.5 rounded-xl transition-all duration-200 group/btn">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};