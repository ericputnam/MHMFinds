# Analytics System Guide

## Overview

The MustHaveMods analytics system provides comprehensive user behavior tracking including page views, searches, downloads, ad impressions, and engagement metrics. All analytics data is accessible through the admin dashboard.

## Features

### Tracked Events

1. **Page Views** - Automatic tracking with time on page and scroll depth
2. **Searches** - Track search queries and patterns
3. **Download Clicks** - Monitor which mods users download
4. **Ad Views/Clicks** - Measure ad performance and CTR
5. **Mod Views** - Track individual mod page views
6. **Favorites** - Monitor favorite add/remove actions
7. **Collections** - Track when mods are added to collections

### Metrics Dashboard

Access the analytics dashboard at `/admin/analytics` to view:

- **Overview Stats**: Page views, unique visitors, searches, downloads
- **Engagement Metrics**: Average time on page, scroll depth, ad CTR
- **Top Search Queries**: Most popular search terms
- **Device Breakdown**: Mobile vs desktop vs tablet usage
- **Browser Analytics**: Browser distribution
- **Top Pages**: Most visited pages
- **Trending Mods**: Most interacted-with mods

### Time Periods

View analytics for different time periods:
- Last 24 hours
- Last 7 days (default)
- Last 30 days
- Last 90 days

## Implementation Guide

### Automatic Tracking

Page views are automatically tracked on all pages where you use the `usePageTracking()` hook.

```tsx
import { usePageTracking } from '@/lib/hooks/useAnalytics';

function MyPage() {
  // This automatically tracks page views, time on page, and scroll depth
  usePageTracking();

  return <div>My page content</div>;
}
```

### Search Tracking

Track when users perform searches:

```tsx
import { useSearchTracking } from '@/lib/hooks/useAnalytics';

function SearchComponent() {
  const { trackSearch } = useSearchTracking();

  const handleSearch = (query: string) => {
    // Your search logic...

    // Track the search
    trackSearch(query);
  };

  return <input onSubmit={handleSearch} />;
}
```

### Download Tracking

Track when users click download buttons:

```tsx
import { useDownloadTracking } from '@/lib/hooks/useAnalytics';

function DownloadButton({ modId }: { modId: string }) {
  const { trackDownload } = useDownloadTracking();

  const handleDownload = () => {
    // Track the download click
    trackDownload(modId);

    // Your download logic...
  };

  return <button onClick={handleDownload}>Download</button>;
}
```

### Ad Tracking

Track ad impressions and clicks:

```tsx
import { useAdTracking } from '@/lib/hooks/useAnalytics';
import { useEffect } from 'react';

function AdComponent({ adId }: { adId: string }) {
  const { trackAdView, trackAdClick } = useAdTracking();

  // Track impression when ad is rendered
  useEffect(() => {
    trackAdView(adId);
  }, [adId, trackAdView]);

  const handleAdClick = () => {
    trackAdClick(adId);
    // Redirect to ad URL...
  };

  return <div onClick={handleAdClick}>Ad content</div>;
}
```

### Mod View Tracking

Track when users view individual mod pages:

```tsx
import { useModTracking } from '@/lib/hooks/useAnalytics';
import { useEffect } from 'react';

function ModDetailPage({ modId }: { modId: string }) {
  const { trackModView } = useModTracking();

  useEffect(() => {
    trackModView(modId);
  }, [modId, trackModView]);

  return <div>Mod details...</div>;
}
```

### Favorite Tracking

Track favorite actions:

```tsx
import { useFavoriteTracking } from '@/lib/hooks/useAnalytics';

function FavoriteButton({ modId, isFavorited }: Props) {
  const { trackFavoriteAdd, trackFavoriteRemove } = useFavoriteTracking();

  const toggleFavorite = async () => {
    if (isFavorited) {
      trackFavoriteRemove(modId);
      // Remove from favorites...
    } else {
      trackFavoriteAdd(modId);
      // Add to favorites...
    }
  };

  return <button onClick={toggleFavorite}>Favorite</button>;
}
```

## Database Schema

### AnalyticsEvent Model

All events are stored in the `analytics_events` table with the following structure:

```prisma
model AnalyticsEvent {
  id             String              @id @default(cuid())
  eventType      AnalyticsEventType  // PAGE_VIEW, SEARCH, DOWNLOAD_CLICK, etc.

  // User tracking
  userId         String?             // Authenticated user ID
  sessionId      String?             // Anonymous session ID

  // Event metadata
  page           String?             // Page URL/path
  referrer       String?
  searchQuery    String?
  modId          String?
  categoryId     String?
  adId           String?

  // Engagement metrics
  timeOnPage     Int?                // Seconds
  scrollDepth    Int?                // Percentage (0-100)

  // Technical metadata
  ipAddress      String?
  userAgent      String?
  deviceType     String?             // mobile, tablet, desktop
  browser        String?
  os             String?

  metadata       Json?               // Additional flexible data
  createdAt      DateTime            @default(now())
}
```

## API Endpoints

### Track Event

**POST** `/api/analytics/track`

Public endpoint for tracking any analytics event.

```typescript
// Request body
{
  eventType: 'PAGE_VIEW' | 'SEARCH' | 'DOWNLOAD_CLICK' | 'AD_VIEW' | 'AD_CLICK' | 'MOD_VIEW' | 'FAVORITE_ADD' | 'FAVORITE_REMOVE' | 'COLLECTION_ADD',
  page?: string,
  searchQuery?: string,
  modId?: string,
  adId?: string,
  timeOnPage?: number,
  scrollDepth?: number,
  sessionId?: string,
  metadata?: object
}
```

### Get Analytics Dashboard Data

**GET** `/api/admin/analytics?period=7d`

Admin-only endpoint for retrieving analytics data.

Query parameters:
- `period`: `24h`, `7d`, `30d`, or `90d`

Returns comprehensive analytics including overview stats, top searches, device breakdown, and more.

## Privacy Considerations

- **User Consent**: Ensure compliance with privacy regulations (GDPR, CCPA)
- **IP Anonymization**: Consider anonymizing IP addresses for EU users
- **Data Retention**: Implement a data retention policy for analytics data
- **Opt-out**: Provide users with an option to opt-out of analytics tracking

## Performance

The analytics system is designed for high performance:

- **Non-blocking**: All tracking happens asynchronously
- **Batch Processing**: Consider implementing batch writes for high-traffic sites
- **Indexed Queries**: Database indexes optimize analytics dashboard queries
- **Graceful Degradation**: Failed tracking calls don't impact user experience

## Integration with Microsoft Clarity

This analytics system complements Microsoft Clarity (already integrated):

- **Clarity**: Provides session recordings, heatmaps, and user behavior visualization
- **Custom Analytics**: Provides detailed metrics specific to your platform (searches, downloads, etc.)

Both systems work together to give you complete visibility into user behavior.

## Next Steps

### Recommended Integrations

1. **ModCard Component**: Add download tracking to download buttons
2. **ModDetailsModal**: Add mod view tracking when modal opens
3. **Ad Components**: Add ad view/click tracking to all ad placements
4. **Favorite Buttons**: Add favorite tracking throughout the app
5. **Collection Actions**: Track when users add mods to collections

### Example: Adding Download Tracking to ModCard

```tsx
// In components/ModCard.tsx
import { useDownloadTracking } from '@/lib/hooks/useAnalytics';

export function ModCard({ mod }: Props) {
  const { trackDownload } = useDownloadTracking();

  const handleDownloadClick = () => {
    trackDownload(mod.id);
    // Rest of your download logic...
  };

  return (
    <div>
      {/* Your mod card UI... */}
      <button onClick={handleDownloadClick}>Download</button>
    </div>
  );
}
```

## Troubleshooting

### Events not appearing in dashboard

1. Check browser console for errors
2. Verify database connection
3. Check that Prisma client is generated (`npm run db:generate`)
4. Verify analytics events table exists in database

### High database usage

If you have high traffic, consider:
1. Implementing event batching
2. Using a separate analytics database
3. Archiving old analytics data
4. Using sampling for high-volume events

## Support

For questions or issues with the analytics system, contact the development team or file an issue in the project repository.
