'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UpgradeModal } from './UpgradeModal';
import { Download } from 'lucide-react';

interface Props {
  modId: string;
  downloadUrl?: string;
  sourceUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

const ANONYMOUS_DOWNLOAD_LIMIT = 5;
const STORAGE_KEY = 'mhm_anonymous_downloads';

export function ProtectedDownloadButton({
  modId,
  downloadUrl,
  sourceUrl,
  children,
  className
}: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Get anonymous download count from localStorage
  const getAnonymousDownloadCount = (): number => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  };

  // Increment anonymous download count
  const incrementAnonymousDownloadCount = (): number => {
    if (typeof window === 'undefined') return 0;
    const current = getAnonymousDownloadCount();
    const newCount = current + 1;
    localStorage.setItem(STORAGE_KEY, newCount.toString());
    return newCount;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsChecking(true);

    try {
      // ANONYMOUS USER FLOW
      if (status === 'unauthenticated') {
        const currentCount = getAnonymousDownloadCount();

        // Check if they've exceeded the anonymous limit
        if (currentCount >= ANONYMOUS_DOWNLOAD_LIMIT) {
          setShowSignInModal(true);
          setIsChecking(false);
          return;
        }

        // Allow the download and increment counter
        const targetUrl = downloadUrl || sourceUrl;
        if (targetUrl) {
          window.open(targetUrl, '_blank');
          const newCount = incrementAnonymousDownloadCount();

          // Dispatch custom event to update UsageIndicator
          window.dispatchEvent(new CustomEvent('anonymousDownloadUpdated', {
            detail: { count: newCount }
          }));
        }

        setIsChecking(false);
        return;
      }

      // AUTHENTICATED USER FLOW
      // Check if user can download
      const checkResponse = await fetch('/api/subscription/check-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const canDownload = await checkResponse.json();

      if (!canDownload.allowed) {
        setShowUpgradeModal(true);
        setIsChecking(false);
        return;
      }

      // Open download IMMEDIATELY for better UX
      const targetUrl = downloadUrl || sourceUrl;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      }

      // Track the click asynchronously (don't wait for it)
      fetch('/api/subscription/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId })
      }).then(() => {
        // Trigger a custom event to refresh the usage indicator
        window.dispatchEvent(new CustomEvent('usageUpdated'));
      }).catch(error => {
        console.error('Failed to track download:', error);
      });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isChecking}
        className={className}
      >
        {children || <Download className="w-4 h-4" />}
      </button>

      {/* Show sign-in modal for anonymous users who hit the limit */}
      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}

      {/* Show upgrade modal for authenticated users who hit the limit */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}

// Simple Sign-In Modal for anonymous users
function SignInModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0F141F] w-full max-w-md rounded-3xl border border-white/10 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <span className="text-2xl">×</span>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-sims-pink to-purple-600 rounded-full flex items-center justify-center">
            <Download className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            You've Used Your Free Downloads!
          </h2>

          <p className="text-slate-400 mb-6">
            Create a free account to get 5 more downloads, or upgrade to Premium for unlimited access.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/sign-in?redirect=' + encodeURIComponent(window.location.pathname))}
              className="w-full bg-gradient-to-r from-sims-pink to-purple-600 text-white py-3 px-6 rounded-xl font-bold hover:brightness-110 transition-all"
            >
              Create Free Account
            </button>

            <button
              onClick={onClose}
              className="w-full text-slate-400 hover:text-white transition-colors text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
