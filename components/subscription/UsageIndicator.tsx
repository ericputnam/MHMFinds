'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Crown, Download } from 'lucide-react';

const ANONYMOUS_DOWNLOAD_LIMIT = 5;
const STORAGE_KEY = 'mhm_anonymous_downloads';

export function UsageIndicator() {
  const { data: session, status } = useSession();
  const [usage, setUsage] = useState<{
    clicksRemaining: number;
    isPremium: boolean;
  } | null>(null);
  const [anonymousCount, setAnonymousCount] = useState(0);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsage();

      // Listen for usage updates to refresh counter in real-time
      const handleUsageUpdate = () => {
        fetchUsage();
      };

      window.addEventListener('usageUpdated', handleUsageUpdate);

      return () => {
        window.removeEventListener('usageUpdated', handleUsageUpdate);
      };
    } else if (status === 'unauthenticated') {
      // Get anonymous download count from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      setAnonymousCount(stored ? parseInt(stored, 10) : 0);

      // Listen for download events to update counter in real-time
      const handleDownloadUpdate = (event: any) => {
        setAnonymousCount(event.detail.count);
      };

      window.addEventListener('anonymousDownloadUpdated', handleDownloadUpdate);

      return () => {
        window.removeEventListener('anonymousDownloadUpdated', handleDownloadUpdate);
      };
    }
  }, [status]);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/subscription/check-limit', {
        method: 'POST'
      });
      const data = await response.json();

      // Handle invalid session error
      if (response.status === 403 && data.shouldSignOut) {
        console.warn('Invalid session detected:', data.message);
        // Silently fail - don't show usage indicator for invalid sessions
        // User should sign out and sign back in
        return;
      }

      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  // Don't show anything while loading
  if (status === 'loading' || !usage) return null;

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

  // Show premium badge for premium users (reserved for future advanced features)
  if (status === 'authenticated' && usage?.isPremium) {
    return (
      <button
        onClick={handleManageSubscription}
        className="flex items-center gap-2 px-3 py-1.5 bg-sims-pink/20 border border-sims-pink/30 rounded-full text-sm hover:bg-sims-pink/30 transition-all cursor-pointer"
        title="Manage Subscription"
      >
        <Crown className="w-4 h-4 text-sims-pink" />
        <span className="text-white font-medium">Premium</span>
      </button>
    );
  }

  // All users have unlimited downloads now (paywall removed for launch)
  return null;
}
