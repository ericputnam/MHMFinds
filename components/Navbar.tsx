'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Menu, Sparkles, LogOut, User, Settings, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { UsageIndicator } from './subscription/UsageIndicator';
import { GAME_COLORS, GAME_TAGLINES } from '../lib/gameColors';
import { GAME_TO_SLUG } from '../lib/gameRoutes';

export const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const gamesMenuTimeout = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
    };
  }, []);

  const handleGamesMouseEnter = () => {
    if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
    setShowGamesMenu(true);
  };

  const handleGamesMouseLeave = () => {
    gamesMenuTimeout.current = setTimeout(() => setShowGamesMenu(false), 150);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        console.error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Error opening subscription portal:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-mhm-dark/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">

          {/* Logo Section */}
          <a href="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className="absolute inset-0 bg-sims-pink blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              <div className="relative bg-sims-pink p-2.5 rounded-xl transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                <Sparkles className="text-white h-5 w-5 fill-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-tight leading-none text-white">
                MustHave<span className="text-sims-pink">Mods</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                Community Finds
              </span>
            </div>
          </a>

          {/* Desktop Nav - Centered */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300 absolute left-1/2 -translate-x-1/2">
            <a href="/" className="hover:text-sims-pink transition-colors">Discover</a>

            {/* Games Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleGamesMouseEnter}
              onMouseLeave={handleGamesMouseLeave}
            >
              <button
                onClick={() => setShowGamesMenu(!showGamesMenu)}
                className={`flex items-center gap-1 transition-colors ${showGamesMenu ? 'text-white' : 'hover:text-white'}`}
              >
                Games
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showGamesMenu ? 'rotate-180' : ''}`} />
              </button>

              {showGamesMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-[#0F141F] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden p-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 pt-2 pb-2">
                    Browse by Game
                  </p>
                  {Object.entries(GAME_COLORS).map(([game, color]) => {
                    const slug = GAME_TO_SLUG[game];
                    if (!slug) return null;
                    return (
                      <Link
                        key={game}
                        href={`/games/${slug}`}
                        className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                        onClick={() => setShowGamesMenu(false)}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-white block leading-tight">
                            {game}
                          </span>
                          <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors leading-tight">
                            {GAME_TAGLINES[game]}
                          </span>
                        </div>
                        <svg className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <a href="/top-creators" className="hover:text-sims-green transition-colors">Creators</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
          </div>


          {/* Actions */}
          <div className="flex items-center space-x-3">
          <UsageIndicator />

          {/* Creator Dashboard Button - Only show for creators */}
          {status === 'authenticated' && session?.user?.isCreator && (
            <a
              href="/creators"
              className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-full text-sm font-medium text-white transition-all"
            >
              <LayoutDashboard className="h-4 w-4" />
              Creator Portal
            </a>
          )}

          <button className="p-2.5 text-slate-400 hover:text-sims-pink hover:bg-white/5 rounded-full transition-all">
            <Heart className="h-5 w-5" />
          </button>

          {/* User Menu - Show when authenticated */}
          {status === 'authenticated' && session?.user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-full text-sm font-medium text-white transition-all"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">
                  {session.user.username || session.user.email}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0F141F] border border-white/10 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white truncate">
                      {session.user.username || session.user.email}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    {session.user.isCreator && (
                      <a
                        href="/creators"
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Creator Portal
                      </a>
                    )}
                    {session.user.isPremium && (
                      <button
                        onClick={handleManageSubscription}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Manage Subscription
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sign In Button - Show when not authenticated */
            <a href="/sign-in" className="hidden md:block bg-white text-mhm-dark hover:bg-slate-200 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Sign In
            </a>
          )}

          <button className="md:hidden p-2 text-slate-300">
            <Menu className="h-6 w-6" />
          </button>
        </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};
