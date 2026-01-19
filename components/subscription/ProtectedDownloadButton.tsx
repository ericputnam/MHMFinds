'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { useDownloadTracking } from '@/lib/hooks/useAnalytics';

interface Props {
  modId: string;
  downloadUrl?: string | null;
  sourceUrl?: string | null;
  children?: React.ReactNode;
  className?: string;
  useInterstitial?: boolean; // Whether to show interstitial page before download
}

export function ProtectedDownloadButton({
  modId,
  downloadUrl,
  sourceUrl,
  children,
  className,
  useInterstitial = true, // Default to using interstitial for affiliate revenue
}: Props) {
  const { data: session, status } = useSession();
  const { trackDownload } = useDownloadTracking();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Track download in analytics for ALL users (authenticated + anonymous)
    trackDownload(modId);

    // Track for subscription rate limiting (authenticated users only)
    if (status === 'authenticated') {
      fetch('/api/subscription/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId })
      }).catch(console.error);
    }

    // Either show interstitial or go directly to download
    if (useInterstitial) {
      // Navigate to interstitial page
      router.push(`/go/${modId}`);
    } else {
      // Direct download (legacy behavior)
      const targetUrl = downloadUrl || sourceUrl;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
    >
      {children || <Download className="w-4 h-4" />}
    </button>
  );
}
