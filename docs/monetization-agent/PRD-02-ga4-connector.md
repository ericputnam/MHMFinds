# PRD-02: GA4 Data Connector

## Overview
Build a connector to pull traffic, engagement, and affiliate click data from Google Analytics 4 into the MonetizationMetric table.

## Priority: P0 (Foundation)
## Dependencies: PRD-01 (Database Schema)
## Estimated Implementation: 3 hours

---

## GA4 Data API Setup

### Prerequisites
1. GA4 property with data collection enabled
2. Google Cloud project with GA4 Data API enabled
3. Service account with "Viewer" role on GA4 property

### Environment Variables
```env
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...  # Base64 encoded
```

---

## Implementation

### File: `lib/services/ga4Connector.ts`

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { prisma } from '../prisma';

interface GA4MetricRow {
  pageUrl: string;
  pageviews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  scrollDepth: number;
  trafficGoogle: number;
  trafficPinterest: number;
  trafficDirect: number;
  trafficSocial: number;
  trafficOther: number;
  affiliateClicks: number;
}

export class GA4Connector {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    const credentials = JSON.parse(
      Buffer.from(process.env.GA4_SERVICE_ACCOUNT_KEY!, 'base64').toString()
    );

    this.client = new BetaAnalyticsDataClient({ credentials });
    this.propertyId = process.env.GA4_PROPERTY_ID!;
  }

  /**
   * Fetch page-level metrics for a date range
   */
  async fetchPageMetrics(startDate: string, endDate: string): Promise<GA4MetricRow[]> {
    const [response] = await this.client.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'scrolledUsers' },
      ],
    });

    // Process and aggregate by page
    const pageMap = new Map<string, GA4MetricRow>();

    for (const row of response.rows || []) {
      const pagePath = row.dimensionValues?.[0]?.value || '/';
      const channel = row.dimensionValues?.[1]?.value || 'Other';

      const existing = pageMap.get(pagePath) || this.emptyMetricRow(pagePath);

      // Add metrics
      existing.pageviews += parseInt(row.metricValues?.[0]?.value || '0');
      existing.uniqueVisitors += parseInt(row.metricValues?.[1]?.value || '0');
      existing.avgSessionDuration = parseFloat(row.metricValues?.[2]?.value || '0');
      existing.bounceRate = parseFloat(row.metricValues?.[3]?.value || '0');

      // Scroll depth approximation (scrolled users / total users * 100)
      const scrolledUsers = parseInt(row.metricValues?.[4]?.value || '0');
      const totalUsers = existing.uniqueVisitors;
      existing.scrollDepth = totalUsers > 0 ? (scrolledUsers / totalUsers) * 100 : 0;

      // Traffic source attribution
      this.attributeTrafficSource(existing, channel, parseInt(row.metricValues?.[0]?.value || '0'));

      pageMap.set(pagePath, existing);
    }

    return Array.from(pageMap.values());
  }

  /**
   * Fetch affiliate click events
   */
  async fetchAffiliateClicks(startDate: string, endDate: string): Promise<Map<string, number>> {
    const [response] = await this.client.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'eventCount' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'affiliate_click',  // Custom event you should track
          },
        },
      },
    });

    const clickMap = new Map<string, number>();

    for (const row of response.rows || []) {
      const pagePath = row.dimensionValues?.[0]?.value || '/';
      const clicks = parseInt(row.metricValues?.[0]?.value || '0');
      clickMap.set(pagePath, (clickMap.get(pagePath) || 0) + clicks);
    }

    return clickMap;
  }

  /**
   * Fetch download click events (track via GA4 events)
   */
  async fetchDownloadClicks(startDate: string, endDate: string): Promise<Map<string, number>> {
    const [response] = await this.client.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'eventCount' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'download_click',
          },
        },
      },
    });

    const downloadMap = new Map<string, number>();

    for (const row of response.rows || []) {
      const pagePath = row.dimensionValues?.[0]?.value || '/';
      const downloads = parseInt(row.metricValues?.[0]?.value || '0');
      downloadMap.set(pagePath, (downloadMap.get(pagePath) || 0) + downloads);
    }

    return downloadMap;
  }

  /**
   * Sync metrics to database for a specific date
   */
  async syncMetricsToDatabase(date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];

    // Fetch all metrics in parallel
    const [pageMetrics, affiliateClicks, downloadClicks] = await Promise.all([
      this.fetchPageMetrics(dateStr, dateStr),
      this.fetchAffiliateClicks(dateStr, dateStr),
      this.fetchDownloadClicks(dateStr, dateStr),
    ]);

    let synced = 0;

    for (const metric of pageMetrics) {
      // Enrich with affiliate and download data
      metric.affiliateClicks = affiliateClicks.get(metric.pageUrl) || 0;
      const downloads = downloadClicks.get(metric.pageUrl) || 0;

      // Determine page type from URL
      const pageType = this.determinePageType(metric.pageUrl);

      // Find associated mod if this is a mod page
      const modId = await this.findModIdFromUrl(metric.pageUrl);

      // Upsert to database
      await prisma.monetizationMetric.upsert({
        where: {
          pageUrl_metricDate: {
            pageUrl: metric.pageUrl,
            metricDate: date,
          },
        },
        create: {
          pageUrl: metric.pageUrl,
          pageType,
          modId,
          metricDate: date,
          pageviews: metric.pageviews,
          uniqueVisitors: metric.uniqueVisitors,
          avgSessionDuration: metric.avgSessionDuration,
          bounceRate: metric.bounceRate,
          scrollDepth: metric.scrollDepth,
          trafficGoogle: metric.trafficGoogle,
          trafficPinterest: metric.trafficPinterest,
          trafficDirect: metric.trafficDirect,
          trafficSocial: metric.trafficSocial,
          trafficOther: metric.trafficOther,
          affiliateClicks: metric.affiliateClicks,
          modDownloads: downloads,
        },
        update: {
          pageviews: metric.pageviews,
          uniqueVisitors: metric.uniqueVisitors,
          avgSessionDuration: metric.avgSessionDuration,
          bounceRate: metric.bounceRate,
          scrollDepth: metric.scrollDepth,
          trafficGoogle: metric.trafficGoogle,
          trafficPinterest: metric.trafficPinterest,
          trafficDirect: metric.trafficDirect,
          trafficSocial: metric.trafficSocial,
          trafficOther: metric.trafficOther,
          affiliateClicks: metric.affiliateClicks,
          modDownloads: downloads,
        },
      });

      synced++;
    }

    return synced;
  }

  // Helper methods
  private emptyMetricRow(pageUrl: string): GA4MetricRow {
    return {
      pageUrl,
      pageviews: 0,
      uniqueVisitors: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      scrollDepth: 0,
      trafficGoogle: 0,
      trafficPinterest: 0,
      trafficDirect: 0,
      trafficSocial: 0,
      trafficOther: 0,
      affiliateClicks: 0,
    };
  }

  private attributeTrafficSource(metric: GA4MetricRow, channel: string, pageviews: number) {
    const channelLower = channel.toLowerCase();

    if (channelLower.includes('organic search') || channelLower.includes('google')) {
      metric.trafficGoogle += pageviews;
    } else if (channelLower.includes('pinterest')) {
      metric.trafficPinterest += pageviews;
    } else if (channelLower.includes('direct')) {
      metric.trafficDirect += pageviews;
    } else if (channelLower.includes('social')) {
      metric.trafficSocial += pageviews;
    } else {
      metric.trafficOther += pageviews;
    }
  }

  private determinePageType(url: string): string {
    if (url.startsWith('/mods/')) return 'mod';
    if (url.startsWith('/category/') || url.startsWith('/c/')) return 'category';
    if (url.startsWith('/search') || url.includes('?search=')) return 'search';
    if (url.startsWith('/creator/')) return 'creator';
    if (url === '/' || url === '') return 'home';
    return 'other';
  }

  private async findModIdFromUrl(url: string): Promise<string | null> {
    // Extract mod ID from URLs like /mods/clxyz123
    const match = url.match(/\/mods\/([a-z0-9]+)/i);
    if (!match) return null;

    const mod = await prisma.mod.findFirst({
      where: { id: match[1] },
      select: { id: true },
    });

    return mod?.id || null;
  }
}
```

---

## Script: `scripts/sync-ga4-metrics.ts`

```typescript
import { GA4Connector } from '../lib/services/ga4Connector';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Starting GA4 metrics sync...');

  const startTime = Date.now();
  const connector = new GA4Connector();

  // Log agent run
  const agentRun = await prisma.agentRun.create({
    data: {
      runType: 'ga4_sync',
      status: 'running',
    },
  });

  try {
    // Sync yesterday's data (GA4 has ~24h delay)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const synced = await connector.syncMetricsToDatabase(yesterday);

    const durationMs = Date.now() - startTime;

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        itemsProcessed: synced,
        logSummary: `Synced ${synced} page metrics for ${yesterday.toISOString().split('T')[0]}`,
      },
    });

    console.log(`Synced ${synced} metrics in ${durationMs}ms`);
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorDetails: { message: String(error) },
      },
    });

    console.error('GA4 sync failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Package.json Script

Add to `package.json`:

```json
{
  "scripts": {
    "agent:ga4-sync": "npx tsx scripts/sync-ga4-metrics.ts"
  }
}
```

---

## Required Package

```bash
npm install @google-analytics/data
```

---

## GA4 Event Tracking Setup

For affiliate click tracking to work, ensure these events are tracked on the frontend:

```typescript
// lib/analytics.ts - Add these event trackers

export function trackAffiliateClick(url: string, affiliateType: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'affiliate_click', {
      affiliate_url: url,
      affiliate_type: affiliateType,  // 'patreon', 'curseforge', 'amazon'
    });
  }
}

export function trackDownloadClick(modId: string, modTitle: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'download_click', {
      mod_id: modId,
      mod_title: modTitle,
    });
  }
}
```

---

## Validation Criteria

- [ ] GA4 service account credentials configured
- [ ] `@google-analytics/data` package installed
- [ ] GA4Connector class fetches page metrics
- [ ] GA4Connector class fetches affiliate click events
- [ ] Metrics synced to MonetizationMetric table
- [ ] AgentRun logged for each sync
- [ ] `npm run agent:ga4-sync` works

---

## Testing

```bash
# Run sync for yesterday's data
npm run agent:ga4-sync

# Verify data in database
npx prisma studio
# Check monetization_metrics table
```

---

## Next Steps
After completing this PRD, proceed to:
- **PRD-03**: Mediavine Connector (to add RPM data)
- **PRD-04**: Affiliate Detection (to analyze the data)
