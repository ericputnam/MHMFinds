/**
 * Mediavine Browser Connector
 *
 * Uses Playwright to automate browser login and data extraction from
 * the Mediavine dashboard. Handles TOTP 2FA authentication.
 *
 * Features:
 * - Browser automation for dashboard scraping
 * - TOTP 2FA support
 * - Daily and page-level revenue syncing
 * - Manual CSV import fallback
 *
 * Required Environment Variables:
 * - MEDIAVINE_EMAIL: Dashboard login email
 * - MEDIAVINE_PASSWORD: Dashboard login password
 * - MEDIAVINE_TOTP_SECRET: Base32-encoded TOTP secret for 2FA
 */

import { chromium, Browser, Page } from 'playwright';
import * as OTPAuth from 'otpauth';
import * as fs from 'fs';
import { prisma } from '@/lib/prisma';
import { AgentRunType } from '@prisma/client';

interface DailyRevenue {
  date: Date;
  impressions: number;
  pageviews: number;
  rpm: number;
  adRevenue: number;
}

interface PageRevenue {
  pageUrl: string;
  pageviews: number;
  impressions: number;
  rpm: number;
  revenue: number;
}

export class MediavineConnector {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;

  /**
   * Initialize browser instance
   */
  async init(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    this.page = await context.newPage();
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }

  /**
   * Generate TOTP code from secret
   */
  private generateTOTP(): string {
    const secret = process.env.MEDIAVINE_TOTP_SECRET;
    if (!secret) {
      throw new Error('MEDIAVINE_TOTP_SECRET not configured');
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Mediavine',
      label: process.env.MEDIAVINE_EMAIL || 'account',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    return totp.generate();
  }

  /**
   * Log in to Mediavine dashboard
   */
  async login(): Promise<boolean> {
    if (this.isLoggedIn) return true;
    if (!this.page) await this.init();

    const email = process.env.MEDIAVINE_EMAIL;
    const password = process.env.MEDIAVINE_PASSWORD;

    if (!email || !password) {
      throw new Error('MEDIAVINE_EMAIL and MEDIAVINE_PASSWORD required');
    }

    console.log('Navigating to Mediavine login...');
    await this.page!.goto('https://dashboard.mediavine.com/login', {
      waitUntil: 'networkidle',
    });

    // Fill login form
    await this.page!.fill('input[name="email"], input[type="email"]', email);
    await this.page!.fill('input[name="password"], input[type="password"]', password);

    // Click login button
    await this.page!.click('button[type="submit"]');

    // Wait for either 2FA prompt or dashboard
    await this.page!.waitForTimeout(2000);

    // Check if 2FA is required
    const totpInput = await this.page!.$('input[name="code"], input[placeholder*="code"], input[autocomplete="one-time-code"]');

    if (totpInput) {
      console.log('2FA required, generating TOTP code...');
      const code = this.generateTOTP();
      await totpInput.fill(code);

      // Submit 2FA
      const submitButton = await this.page!.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }

      await this.page!.waitForTimeout(2000);
    }

    // Verify login success
    const dashboardUrl = this.page!.url();
    if (dashboardUrl.includes('dashboard.mediavine.com') && !dashboardUrl.includes('login')) {
      console.log('Login successful!');
      this.isLoggedIn = true;
      return true;
    }

    console.error('Login failed, current URL:', dashboardUrl);
    return false;
  }

  /**
   * Fetch daily revenue for a date range
   */
  async fetchDailyRevenue(startDate: Date, endDate: Date): Promise<DailyRevenue[]> {
    if (!this.isLoggedIn) {
      const success = await this.login();
      if (!success) throw new Error('Failed to log in to Mediavine');
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Navigate to reporting page
    const reportUrl = `https://dashboard.mediavine.com/reporting?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&granularity=day`;
    console.log('Fetching report:', reportUrl);

    await this.page!.goto(reportUrl, { waitUntil: 'networkidle' });
    await this.page!.waitForTimeout(3000); // Wait for data to load

    // Extract data from table
    const rows = await this.page!.$$eval(
      'table tbody tr, [data-testid="report-row"]',
      (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return null;

          return {
            date: cells[0]?.textContent?.trim() || '',
            impressions: parseInt(cells[1]?.textContent?.replace(/,/g, '') || '0'),
            pageviews: parseInt(cells[2]?.textContent?.replace(/,/g, '') || '0'),
            rpm: parseFloat(cells[3]?.textContent?.replace('$', '') || '0'),
            revenue: parseFloat(cells[4]?.textContent?.replace('$', '').replace(',', '') || '0'),
          };
        }).filter(Boolean);
      }
    );

    return rows
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map(r => ({
        date: new Date(r.date),
        impressions: r.impressions,
        pageviews: r.pageviews,
        rpm: r.rpm,
        adRevenue: r.revenue,
      }));
  }

  /**
   * Fetch revenue by page URL
   */
  async fetchPageRevenue(startDate: Date, endDate: Date): Promise<PageRevenue[]> {
    if (!this.isLoggedIn) {
      const success = await this.login();
      if (!success) throw new Error('Failed to log in to Mediavine');
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Navigate to page-level reporting
    const reportUrl = `https://dashboard.mediavine.com/reporting/pages?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;
    console.log('Fetching page report:', reportUrl);

    await this.page!.goto(reportUrl, { waitUntil: 'networkidle' });
    await this.page!.waitForTimeout(3000);

    // Extract data
    const rows = await this.page!.$$eval(
      'table tbody tr',
      (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return null;

          const link = cells[0]?.querySelector('a');
          return {
            pageUrl: link?.getAttribute('href') || cells[0]?.textContent?.trim() || '',
            pageviews: parseInt(cells[1]?.textContent?.replace(/,/g, '') || '0'),
            impressions: parseInt(cells[2]?.textContent?.replace(/,/g, '') || '0'),
            rpm: parseFloat(cells[3]?.textContent?.replace('$', '') || '0'),
            revenue: parseFloat(cells[4]?.textContent?.replace('$', '').replace(',', '') || '0'),
          };
        }).filter(Boolean);
      }
    );

    return rows.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /**
   * Sync Mediavine revenue to database
   */
  async syncRevenueToDatabase(date: Date): Promise<{ daysUpdated: number; pagesUpdated: number }> {
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.MEDIAVINE_SYNC,
        status: 'RUNNING',
      },
    });

    try {
      await this.init();

      // Fetch daily revenue
      const dailyRevenue = await this.fetchDailyRevenue(date, date);

      let daysUpdated = 0;
      for (const day of dailyRevenue) {
        // Update or create metric for this date (aggregate level)
        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: 'site_aggregate',
              metricDate: day.date,
            },
          },
          create: {
            pageUrl: 'site_aggregate',
            metricDate: day.date,
            adRevenue: day.adRevenue,
            adImpressions: day.impressions,
            rpm: day.rpm,
          },
          update: {
            adRevenue: day.adRevenue,
            adImpressions: day.impressions,
            rpm: day.rpm,
          },
        });
        daysUpdated++;
      }

      // Fetch page-level revenue
      const pageRevenue = await this.fetchPageRevenue(date, date);

      let pagesUpdated = 0;
      for (const page of pageRevenue) {
        if (!page.pageUrl || page.revenue === 0) continue;

        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: page.pageUrl,
              metricDate: date,
            },
          },
          create: {
            pageUrl: page.pageUrl,
            metricDate: date,
            pageviews: page.pageviews,
            adRevenue: page.revenue,
            adImpressions: page.impressions,
            rpm: page.rpm,
          },
          update: {
            pageviews: page.pageviews,
            adRevenue: page.revenue,
            adImpressions: page.impressions,
            rpm: page.rpm,
          },
        });
        pagesUpdated++;
      }

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: daysUpdated + pagesUpdated,
          logSummary: `Synced ${daysUpdated} days, ${pagesUpdated} pages`,
        },
      });

      return { daysUpdated, pagesUpdated };
    } catch (error) {
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
    } finally {
      await this.close();
    }
  }

  /**
   * Sync multiple days of revenue data
   */
  async syncDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<{ daysUpdated: number; pagesUpdated: number; totalRevenue: number }> {
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.MEDIAVINE_SYNC,
        status: 'RUNNING',
      },
    });

    try {
      await this.init();

      // Fetch daily revenue for range
      const dailyRevenue = await this.fetchDailyRevenue(startDate, endDate);

      let daysUpdated = 0;
      let totalRevenue = 0;

      for (const day of dailyRevenue) {
        totalRevenue += day.adRevenue;

        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: 'site_aggregate',
              metricDate: day.date,
            },
          },
          create: {
            pageUrl: 'site_aggregate',
            pageType: 'site_total',
            metricDate: day.date,
            pageviews: day.pageviews,
            adRevenue: day.adRevenue,
            adImpressions: day.impressions,
            rpm: day.rpm,
          },
          update: {
            pageviews: day.pageviews,
            adRevenue: day.adRevenue,
            adImpressions: day.impressions,
            rpm: day.rpm,
          },
        });
        daysUpdated++;
      }

      // Fetch page-level revenue for range
      const pageRevenue = await this.fetchPageRevenue(startDate, endDate);

      let pagesUpdated = 0;
      for (const page of pageRevenue) {
        if (!page.pageUrl || page.revenue === 0) continue;

        // For page-level data over a range, we store as a single aggregate entry
        // with the end date as the metric date
        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: page.pageUrl,
              metricDate: endDate,
            },
          },
          create: {
            pageUrl: page.pageUrl,
            metricDate: endDate,
            pageviews: page.pageviews,
            adRevenue: page.revenue,
            adImpressions: page.impressions,
            rpm: page.rpm,
          },
          update: {
            pageviews: page.pageviews,
            adRevenue: page.revenue,
            adImpressions: page.impressions,
            rpm: page.rpm,
          },
        });
        pagesUpdated++;
      }

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: daysUpdated + pagesUpdated,
          logSummary: `Synced ${daysUpdated} days, ${pagesUpdated} pages, $${totalRevenue.toFixed(2)} total`,
        },
      });

      return { daysUpdated, pagesUpdated, totalRevenue };
    } catch (error) {
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
    } finally {
      await this.close();
    }
  }

  /**
   * Get today's estimated revenue (quick dashboard check)
   */
  async getTodayRevenue(): Promise<{ revenue: number; rpm: number; impressions: number }> {
    try {
      await this.init();
      const success = await this.login();
      if (!success) throw new Error('Failed to log in to Mediavine');

      // Navigate to dashboard home which shows today's stats
      await this.page!.goto('https://dashboard.mediavine.com/', {
        waitUntil: 'networkidle',
      });
      await this.page!.waitForTimeout(2000);

      // Try to extract today's revenue from dashboard
      const stats = await this.page!.evaluate(() => {
        const getText = (selectors: string[]): string => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.textContent) return el.textContent.trim();
          }
          return '0';
        };

        return {
          revenue: getText(['.today-revenue', '[data-testid="today-revenue"]', '.earnings-today', '.revenue-card .value']),
          rpm: getText(['.today-rpm', '[data-testid="rpm"]', '.session-rpm', '.rpm-card .value']),
          impressions: getText(['.today-impressions', '[data-testid="impressions"]', '.imps-today', '.impressions-card .value']),
        };
      });

      return {
        revenue: this.parseRevenue(stats.revenue),
        rpm: this.parseRevenue(stats.rpm),
        impressions: this.parseNumber(stats.impressions),
      };
    } finally {
      await this.close();
    }
  }

  // Helper methods for parsing scraped values
  private parseNumber(str: string): number {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
  }

  private parseRevenue(str: string): number {
    // Handle "$1,234.56" format
    const cleaned = str.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }
}

/**
 * Manual CSV Import - Fallback when browser automation fails
 *
 * Usage:
 * 1. Log into dashboard.mediavine.com manually
 * 2. Navigate to Reporting
 * 3. Export data as CSV
 * 4. Run: npm run agent:mediavine-csv /path/to/mediavine.csv
 */
export class MediavineManualImport {
  /**
   * Import revenue data from a manually downloaded CSV file
   */
  static async importFromCSV(csvPath: string): Promise<{
    rowsImported: number;
    totalRevenue: number;
  }> {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse headers
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim().replace(/"/g, ''));

    // Find column indices
    const dateIdx = headers.findIndex((h) => h === 'date' || h === 'day');
    const revenueIdx = headers.findIndex(
      (h) => h.includes('revenue') || h.includes('earnings')
    );
    const impressionsIdx = headers.findIndex(
      (h) => h === 'impressions' || h === 'imps'
    );
    const rpmIdx = headers.findIndex(
      (h) => h === 'rpm' || h.includes('session rpm')
    );
    const pageviewsIdx = headers.findIndex(
      (h) => h === 'pageviews' || h === 'sessions'
    );

    if (dateIdx === -1 || revenueIdx === -1) {
      throw new Error(
        'CSV missing required columns (date, revenue). Found columns: ' +
          headers.join(', ')
      );
    }

    let rowsImported = 0;
    let totalRevenue = 0;

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));

      try {
        const dateStr = values[dateIdx];
        const date = new Date(dateStr);

        if (isNaN(date.getTime())) {
          console.warn(`Skipping row ${i}: invalid date "${dateStr}"`);
          continue;
        }

        const revenue = parseFloat(
          values[revenueIdx]?.replace(/[^0-9.]/g, '') || '0'
        );
        const impressions =
          impressionsIdx >= 0
            ? parseInt(values[impressionsIdx]?.replace(/[^0-9]/g, '') || '0')
            : 0;
        const rpm =
          rpmIdx >= 0
            ? parseFloat(values[rpmIdx]?.replace(/[^0-9.]/g, '') || '0')
            : 0;
        const pageviews =
          pageviewsIdx >= 0
            ? parseInt(values[pageviewsIdx]?.replace(/[^0-9]/g, '') || '0')
            : 0;

        totalRevenue += revenue;

        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: 'site_aggregate',
              metricDate: date,
            },
          },
          create: {
            pageUrl: 'site_aggregate',
            pageType: 'site_total',
            metricDate: date,
            pageviews,
            adImpressions: impressions,
            adRevenue: revenue,
            rpm,
          },
          update: {
            pageviews,
            adImpressions: impressions,
            adRevenue: revenue,
            rpm,
          },
        });

        rowsImported++;
      } catch (error) {
        console.warn(`Skipping row ${i}: ${error}`);
      }
    }

    return { rowsImported, totalRevenue };
  }

  /**
   * Import page-level revenue from CSV
   */
  static async importPageRevenueFromCSV(
    csvPath: string,
    metricDate: Date
  ): Promise<{ pagesImported: number }> {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim().replace(/"/g, ''));

    // Find column indices for page-level data
    const urlIdx = headers.findIndex(
      (h) => h === 'url' || h === 'page' || h === 'page url'
    );
    const revenueIdx = headers.findIndex(
      (h) => h.includes('revenue') || h.includes('earnings')
    );
    const impressionsIdx = headers.findIndex(
      (h) => h === 'impressions' || h === 'imps'
    );
    const rpmIdx = headers.findIndex(
      (h) => h === 'rpm' || h.includes('session rpm')
    );
    const pageviewsIdx = headers.findIndex(
      (h) => h === 'pageviews' || h === 'sessions'
    );

    if (urlIdx === -1 || revenueIdx === -1) {
      throw new Error(
        'CSV missing required columns (url, revenue). Found columns: ' +
          headers.join(', ')
      );
    }

    let pagesImported = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));

      try {
        const pageUrl = values[urlIdx];
        if (!pageUrl) continue;

        const revenue = parseFloat(
          values[revenueIdx]?.replace(/[^0-9.]/g, '') || '0'
        );
        const impressions =
          impressionsIdx >= 0
            ? parseInt(values[impressionsIdx]?.replace(/[^0-9]/g, '') || '0')
            : 0;
        const rpm =
          rpmIdx >= 0
            ? parseFloat(values[rpmIdx]?.replace(/[^0-9.]/g, '') || '0')
            : 0;
        const pageviews =
          pageviewsIdx >= 0
            ? parseInt(values[pageviewsIdx]?.replace(/[^0-9]/g, '') || '0')
            : 0;

        // Skip rows with no revenue
        if (revenue === 0) continue;

        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl,
              metricDate,
            },
          },
          create: {
            pageUrl,
            metricDate,
            pageviews,
            adImpressions: impressions,
            adRevenue: revenue,
            rpm,
          },
          update: {
            pageviews,
            adImpressions: impressions,
            adRevenue: revenue,
            rpm,
          },
        });

        pagesImported++;
      } catch (error) {
        console.warn(`Skipping row ${i}: ${error}`);
      }
    }

    return { pagesImported };
  }
}

// Export singleton instance
export const mediavineConnector = new MediavineConnector();
