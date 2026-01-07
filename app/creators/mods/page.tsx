'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Edit } from 'lucide-react';

export default function MyModsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Mods</h1>
        <p className="text-slate-400">
          View and edit your approved mods
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-8 text-center">
        <Package className="h-16 w-16 text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-slate-400 mb-6">
          The ability to view and edit your live mods is coming soon. For now, you can track your submissions on the{' '}
          <Link href="/creators/submissions" className="text-sims-pink hover:underline">
            submissions page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
