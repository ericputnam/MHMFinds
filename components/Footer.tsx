'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-[#05080F] py-16 mt-auto">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="text-xl font-bold text-white tracking-tight">
              MustHave<span className="text-sims-pink">Mods</span>
            </span>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              The search engine for game mods and custom content.
            </p>
          </div>

          {/* Game Mods - SEO Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Game Mods</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/games/sims-4" className="hover:text-sims-pink transition-colors">Sims 4 Mods</Link></li>
              <li><Link href="/games/stardew-valley" className="hover:text-sims-pink transition-colors">Stardew Valley Mods</Link></li>
              <li><Link href="/games/minecraft" className="hover:text-sims-pink transition-colors">Minecraft Mods</Link></li>
              <li><Link href="/games/animal-crossing" className="hover:text-sims-pink transition-colors">Animal Crossing Mods</Link></li>
            </ul>
          </div>

          {/* Blog - Game Landing Pages */}
          <div>
            <h3 className="text-white font-semibold mb-4">Blog</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/blog" className="hover:text-sims-pink transition-colors">All Posts</a></li>
              <li><a href="/sims-4/" className="hover:text-sims-pink transition-colors">Sims 4</a></li>
              <li><a href="/stardew-valley/" className="hover:text-sims-pink transition-colors">Stardew Valley</a></li>
              <li><a href="/minecraft/" className="hover:text-sims-pink transition-colors">Minecraft</a></li>
              <li><Link href="/submit-mod" className="hover:text-sims-pink transition-colors">Submit a Mod</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/about" className="hover:text-sims-pink transition-colors">About</Link></li>
              <li><Link href="/terms" className="hover:text-sims-pink transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-sims-pink transition-colors">Privacy Policy</Link></li>
              <li><a href="mailto:olivia@musthavemods.com" className="hover:text-sims-pink transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/5 pt-8">
          <p className="text-slate-600 text-xs text-center max-w-3xl mx-auto leading-relaxed">
            This site is not endorsed by or affiliated with Electronic Arts, ConcernedApe, Mojang Studios, or their licensors. Trademarks are the property of their respective owners. Game content and materials are copyright their respective publishers.
          </p>
          <p className="text-slate-600 text-xs text-center mt-4">
            &copy; {new Date().getFullYear()} MustHaveMods. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
