'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-[#05080F] py-16 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0 text-center md:text-left">
                <span className="text-xl font-bold text-white tracking-tight">
                  MustHave<span className="text-sims-pink">Mods</span>
                </span>
                <p className="text-slate-500 text-sm mt-2 max-w-md leading-relaxed">
                    This site is not endorsed by or affiliated with Electronic Arts, or its licensors. Trademarks are the property of their respective owners. Game content and materials are copyright Electronic Arts Inc. and its licensors.
                </p>
                <p className="text-slate-600 text-xs mt-3">
                    <a href="mailto:olivia@musthavemods.com" className="hover:text-sims-blue transition-colors">Contact Us</a> • MustHaveMods.com
                </p>
            </div>

            <div className="flex space-x-8 text-sm font-medium text-slate-400">
              <a href="/about" className="hover:text-sims-blue transition-colors">About</a>
              <a href="/terms" className="hover:text-sims-blue transition-colors">Terms</a>
              <a href="/privacy-policy" className="hover:text-sims-blue transition-colors">Privacy</a>
              <a href="/submit-mod" className="hover:text-sims-blue transition-colors">Submit Mod</a>
            </div>
        </div>
        <div className="border-t border-white/5 mt-12 pt-8 text-center text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} MustHaveMods. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
