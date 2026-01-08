'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { usePageTracking } from '../lib/hooks/useAnalytics';

function AnalyticsProvider({ children }: { children: ReactNode }) {
  usePageTracking(); // Tracks page views and notifies Mediavine on route changes
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </SessionProvider>
  );
}
