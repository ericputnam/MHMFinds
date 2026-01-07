'use client';

import React, { useState } from 'react';
import { Heart, Menu, Sparkles, LogOut, User, Settings, LayoutDashboard } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { UsageIndicator } from './subscription/UsageIndicator';

export const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

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
            <a href="/top-creators" className="hover:text-sims-green transition-colors">Creators</a>
            <a href="https://blog.musthavemods.com/homepage/" className="hover:text-white transition-colors">Blog</a>
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
