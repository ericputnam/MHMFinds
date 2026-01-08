import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// Extend Window interface for Mediavine
declare global {
  interface Window {
    mediavine?: {
      newPageView: () => void;
    };
  }
}

// Session ID stored in sessionStorage for tracking anonymous users
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'SEARCH'
  | 'DOWNLOAD_CLICK'
  | 'AD_VIEW'
  | 'AD_CLICK'
  | 'MOD_VIEW'
  | 'FAVORITE_ADD'
  | 'FAVORITE_REMOVE'
  | 'COLLECTION_ADD';

interface TrackEventParams {
  eventType: AnalyticsEventType;
  page?: string;
  referrer?: string;
  searchQuery?: string;
  modId?: string;
  categoryId?: string;
  adId?: string;
  timeOnPage?: number;
  scrollDepth?: number;
  metadata?: Record<string, any>;
}

/**
 * Track analytics event
 */
export const trackEvent = async (params: TrackEventParams): Promise<void> => {
  try {
    const sessionId = getSessionId();

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        sessionId,
      }),
    });
  } catch (error) {
    // Fail silently - don't disrupt user experience
    console.error('Failed to track analytics event:', error);
  }
};

/**
 * Hook to track page views with time on page
 */
export const usePageTracking = () => {
  const pathname = usePathname();
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const hasTrackedView = useRef<boolean>(false);

  useEffect(() => {
    // Reset on route change
    startTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    hasTrackedView.current = false;

    // Track page view
    trackEvent({
      eventType: 'PAGE_VIEW',
      page: pathname,
      referrer: document.referrer,
    });
    hasTrackedView.current = true;

    // Notify Mediavine of new pageview for SPA navigation
    // This ensures ads refresh and pageviews are counted correctly
    if (typeof window !== 'undefined' && window.mediavine) {
      window.mediavine.newPageView();
    }

    // Track scroll depth
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercentage = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      if (scrollPercentage > scrollDepthRef.current) {
        scrollDepthRef.current = Math.min(scrollPercentage, 100);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Track time on page when user leaves
    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);

      // Use sendBeacon for reliable tracking on page unload
      const data = {
        eventType: 'PAGE_VIEW',
        page: pathname,
        timeOnPage,
        scrollDepth: scrollDepthRef.current,
        sessionId: getSessionId(),
      };

      navigator.sendBeacon(
        '/api/analytics/track',
        JSON.stringify(data)
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);
};

/**
 * Hook to track search events
 */
export const useSearchTracking = () => {
  const trackSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    trackEvent({
      eventType: 'SEARCH',
      searchQuery: searchQuery.trim(),
      page: window.location.pathname,
    });
  }, []);

  return { trackSearch };
};

/**
 * Hook to track download clicks
 */
export const useDownloadTracking = () => {
  const trackDownload = useCallback((modId: string) => {
    trackEvent({
      eventType: 'DOWNLOAD_CLICK',
      modId,
      page: window.location.pathname,
    });
  }, []);

  return { trackDownload };
};

/**
 * Hook to track ad impressions and clicks
 */
export const useAdTracking = () => {
  const trackAdView = useCallback((adId: string) => {
    trackEvent({
      eventType: 'AD_VIEW',
      adId,
      page: window.location.pathname,
    });
  }, []);

  const trackAdClick = useCallback((adId: string) => {
    trackEvent({
      eventType: 'AD_CLICK',
      adId,
      page: window.location.pathname,
    });
  }, []);

  return { trackAdView, trackAdClick };
};

/**
 * Hook to track mod views
 */
export const useModTracking = () => {
  const trackModView = useCallback((modId: string) => {
    trackEvent({
      eventType: 'MOD_VIEW',
      modId,
      page: window.location.pathname,
    });
  }, []);

  return { trackModView };
};

/**
 * Hook to track favorite actions
 */
export const useFavoriteTracking = () => {
  const trackFavoriteAdd = useCallback((modId: string) => {
    trackEvent({
      eventType: 'FAVORITE_ADD',
      modId,
      page: window.location.pathname,
    });
  }, []);

  const trackFavoriteRemove = useCallback((modId: string) => {
    trackEvent({
      eventType: 'FAVORITE_REMOVE',
      modId,
      page: window.location.pathname,
    });
  }, []);

  return { trackFavoriteAdd, trackFavoriteRemove };
};
