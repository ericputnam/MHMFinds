/**
 * GA4 Data Connector
 *
 * Pulls traffic and event data from Google Analytics 4 and stores in MonetizationMetric table.
 *
 * Required Environment Variables:
 * - GA4_PROPERTY_ID: Your GA4 property ID (e.g., "properties/123456789")
 * - GA4_SERVICE_ACCOUNT_KEY: Base64-encoded service account JSON key
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';

// Types for GA4 metrics
export interface GA4MetricRow {
  pageUrl: string;
  pageType: string | null;
  pageviews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgTimeOnPage: number;
  scrollDepth: number;
  trafficGoogle: number;
  trafficPinterest: number;
  trafficDirect: number;
  trafficSocial: number;
  trafficOther: number;
}

// Traffic source channel mapping
const TRAFFIC_CHANNELS = {
  google: ['google', 'organic search'],
  pinterest: ['pinterest'],
  direct: ['direct', '(direct)', '(none)'],
  social: ['facebook', 'twitter', 'instagram', 'tiktok', 'reddit', 'social'],
};

/**
 * GA4Connector class - fetches analytics data from GA4
 */
export class GA4Connector {
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId: string;

  constructor() {
    this.propertyId = process.env.GA4_PROPERTY_ID ?? '';
  }

  /**
   * Initialize the GA4 client with service account credentials
   */
  private async getClient(): Promise<BetaAnalyticsDataClient> {
    if (this.client) return this.client;

    const keyBase64 = process.env.GA4_SERVICE_ACCOUNT_KEY;
    if (!keyBase64) {
      throw new Error('GA4_SERVICE_ACCOUNT_KEY environment variable not set');
    }

    if (!this.propertyId) {
      throw new Error('GA4_PROPERTY_ID environment variable not set');
    }

    // Decode base64 service account key
    const keyJson = Buffer.from(keyBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(keyJson);

    this.client = new BetaAnalyticsDataClient({
      credentials,
    });

    return this.client;
  }

  /**
   * Fetch page metrics for a date range
   */
  async fetchPageMetrics(
    startDate: string,
    endDate: string
  ): Promise<GA4MetricRow[]> {
    const client = await this.getClient();

    // Run report to get page metrics with traffic source
    const [response] = await client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'scrolledUsers' },
      ],
    });

    // Aggregate by page
    const pageMap = new Map<string, GA4MetricRow>();

    for (const row of response.rows ?? []) {
      const pagePath = row.dimensionValues?.[0]?.value ?? '';
      const channel = (row.dimensionValues?.[1]?.value ?? '').toLowerCase();

      const pageviews = parseInt(row.metricValues?.[0]?.value ?? '0');
      const users = parseInt(row.metricValues?.[1]?.value ?? '0');
      const bounceRate = parseFloat(row.metricValues?.[2]?.value ?? '0') * 100;
      const avgTime = parseFloat(row.metricValues?.[3]?.value ?? '0');
      const scrolled = parseInt(row.metricValues?.[4]?.value ?? '0');

      // Get or create page entry
      let entry = pageMap.get(pagePath);
      if (!entry) {
        entry = {
          pageUrl: pagePath,
          pageType: this.inferPageType(pagePath),
          pageviews: 0,
          uniqueVisitors: 0,
          bounceRate: 0,
          avgTimeOnPage: 0,
          scrollDepth: 0,
          trafficGoogle: 0,
          trafficPinterest: 0,
          trafficDirect: 0,
          trafficSocial: 0,
          trafficOther: 0,
        };
        pageMap.set(pagePath, entry);
      }

      // Aggregate metrics
      entry.pageviews += pageviews;
      entry.uniqueVisitors += users;

      // Weight-average bounce rate and time
      const totalPv = entry.pageviews;
      const prevPv = totalPv - pageviews;
      if (totalPv > 0) {
        entry.bounceRate =
          (entry.bounceRate * prevPv + bounceRate * pageviews) / totalPv;
        entry.avgTimeOnPage =
          (entry.avgTimeOnPage * prevPv + avgTime * pageviews) / totalPv;
      }

      // Scroll depth as percentage of users who scrolled
      if (entry.uniqueVisitors > 0) {
        entry.scrollDepth = (scrolled / entry.uniqueVisitors) * 100;
      }

      // Attribute traffic source
      const trafficCount = pageviews;
      if (this.matchesChannel(channel, 'google')) {
        entry.trafficGoogle += trafficCount;
      } else if (this.matchesChannel(channel, 'pinterest')) {
        entry.trafficPinterest += trafficCount;
      } else if (this.matchesChannel(channel, 'direct')) {
        entry.trafficDirect += trafficCount;
      } else if (this.matchesChannel(channel, 'social')) {
        entry.trafficSocial += trafficCount;
      } else {
        entry.trafficOther += trafficCount;
      }
    }

    return Array.from(pageMap.values());
  }

  /**
   * Fetch affiliate click events
   */
  async fetchAffiliateClicks(
    startDate: string,
    endDate: string
  ): Promise<Map<string, number>> {
    const client = await this.getClient();

    const [response] = await client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'affiliate_click' },
        },
      },
    });

    const clickMap = new Map<string, number>();

    for (const row of response.rows ?? []) {
      const pagePath = row.dimensionValues?.[0]?.value ?? '';
      const clicks = parseInt(row.metricValues?.[0]?.value ?? '0');
      clickMap.set(pagePath, (clickMap.get(pagePath) ?? 0) + clicks);
    }

    return clickMap;
  }

  /**
   * Fetch download click events
   */
  async fetchDownloadClicks(
    startDate: string,
    endDate: string
  ): Promise<Map<string, number>> {
    const client = await this.getClient();

    const [response] = await client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'download_click' },
        },
      },
    });

    const downloadMap = new Map<string, number>();

    for (const row of response.rows ?? []) {
      const pagePath = row.dimensionValues?.[0]?.value ?? '';
      const downloads = parseInt(row.metricValues?.[0]?.value ?? '0');
      downloadMap.set(pagePath, (downloadMap.get(pagePath) ?? 0) + downloads);
    }

    return downloadMap;
  }

  /**
   * Sync metrics to database for a specific date
   */
  async syncMetricsToDatabase(date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];

    // Create agent run record
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.GA4_SYNC,
        status: 'RUNNING',
      },
    });

    try {
      // Fetch all data
      const [pageMetrics, affiliateClicks, downloadClicks] = await Promise.all([
        this.fetchPageMetrics(dateStr, dateStr),
        this.fetchAffiliateClicks(dateStr, dateStr),
        this.fetchDownloadClicks(dateStr, dateStr),
      ]);

      let syncedCount = 0;

      // Upsert each page's metrics
      for (const metrics of pageMetrics) {
        const affiliates = affiliateClicks.get(metrics.pageUrl) ?? 0;
        const downloads = downloadClicks.get(metrics.pageUrl) ?? 0;

        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: metrics.pageUrl,
              metricDate: date,
            },
          },
          create: {
            metricDate: date,
            pageUrl: metrics.pageUrl,
            pageType: metrics.pageType,
            pageviews: metrics.pageviews,
            uniqueVisitors: metrics.uniqueVisitors,
            bounceRate: metrics.bounceRate,
            avgTimeOnPage: Math.round(metrics.avgTimeOnPage),
            scrollDepth: metrics.scrollDepth,
            trafficGoogle: metrics.trafficGoogle,
            trafficPinterest: metrics.trafficPinterest,
            trafficDirect: metrics.trafficDirect,
            trafficSocial: metrics.trafficSocial,
            trafficOther: metrics.trafficOther,
            affiliateClicks: affiliates,
            modDownloads: downloads,
          },
          update: {
            pageviews: metrics.pageviews,
            uniqueVisitors: metrics.uniqueVisitors,
            bounceRate: metrics.bounceRate,
            avgTimeOnPage: Math.round(metrics.avgTimeOnPage),
            scrollDepth: metrics.scrollDepth,
            trafficGoogle: metrics.trafficGoogle,
            trafficPinterest: metrics.trafficPinterest,
            trafficDirect: metrics.trafficDirect,
            trafficSocial: metrics.trafficSocial,
            trafficOther: metrics.trafficOther,
            affiliateClicks: affiliates,
            modDownloads: downloads,
          },
        });

        syncedCount++;
      }

      // Update agent run
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: syncedCount,
          logSummary: `Synced ${syncedCount} pages for ${dateStr}`,
        },
      });

      return syncedCount;
    } catch (error) {
      // Update agent run with error
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorsEncountered: 1,
          errorDetails: { error: String(error) },
        },
      });

      throw error;
    }
  }

  /**
   * Infer page type from URL path
   */
  private inferPageType(path: string): string | null {
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/mods/')) return 'mod';
    if (path.startsWith('/category/')) return 'category';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/creator/')) return 'creator';
    if (path.startsWith('/blog/')) return 'blog';
    if (path.startsWith('/collections/')) return 'collection';
    return null;
  }

  /**
   * Check if a channel string matches a traffic source
   */
  private matchesChannel(
    channel: string,
    source: keyof typeof TRAFFIC_CHANNELS
  ): boolean {
    return TRAFFIC_CHANNELS[source].some(
      (keyword) =>
        channel.includes(keyword) || keyword.includes(channel)
    );
  }
}

// Export singleton instance
export const ga4Connector = new GA4Connector();
