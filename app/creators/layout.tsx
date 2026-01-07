'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Upload,
  UserCircle,
  LogOut,
  Sparkles,
  FileText
} from 'lucide-react';

// Creator navigation - access to creator features only
const creatorNavItems = [
  { href: '/creators', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creators/submit', label: 'Submit Mod', icon: Upload },
  { href: '/creators/submissions', label: 'My Submissions', icon: FileText },
  { href: '/creators/mods', label: 'My Mods', icon: Package },
];

export default function CreatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-sims-pink to-purple-600 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Creator Portal</h1>
              <p className="text-xs text-slate-400">Manage Your Mods</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
                <UserCircle className="h-5 w-5 text-slate-400" />
                <div className="text-sm">
                  <p className="font-semibold text-white">{session.user.username || session.user.email}</p>
                  <p className="text-xs text-purple-400">Creator</p>
                </div>
              </div>
            )}
            <Link
              href="/"
              target="_blank"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              View Site →
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-800/30 hover:border-red-700/50 rounded-lg transition-all text-sm text-red-400 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-2">
            {creatorNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/creators' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sims-pink to-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
