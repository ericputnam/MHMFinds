'use client';

import { useSession } from 'next-auth/react';
import { Download } from 'lucide-react';
import { useDownloadTracking } from '@/lib/hooks/useAnalytics';

interface Props {
  modId: string;
  downloadUrl?: string | null;
  sourceUrl?: string | null;
  children?: React.ReactNode;
  className?: string;
}

export function ProtectedDownloadButton({
  modId,
  downloadUrl,
  sourceUrl,
  children,
  className
}: Props) {
  const { data: session, status } = useSession();
  const { trackDownload } = useDownloadTracking();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetUrl = downloadUrl || sourceUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }

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
