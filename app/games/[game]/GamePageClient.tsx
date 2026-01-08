'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';

interface GamePageClientProps {
  gameName: string;
  gameSlug: string;
}

export default function GamePageClient({ gameName, gameSlug }: GamePageClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage with game filter pre-selected
    // The SEO metadata is already rendered server-side in the parent component
    router.replace(`/?gameVersion=${encodeURIComponent(gameName)}`);
  }, [gameName, router]);

  // Show a branded loading state while redirecting
  // This appears briefly before redirect completes
  return (
    <div className="min-h-screen bg-mhm-dark">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Best <span className="text-sims-pink">{gameName}</span> Mods
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Loading the best mods and custom content...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-sims-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-sims-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-sims-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
