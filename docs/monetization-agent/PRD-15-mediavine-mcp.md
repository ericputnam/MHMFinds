# PRD-15: Mediavine Browser Connector (MCP)

## Overview
Build a Playwright-based browser automation service to fetch ad revenue data from Mediavine's dashboard. Supports TOTP two-factor authentication.

## Priority: P0 (Data Source)
## Dependencies: MON-001 (Database Schema)
## Estimated Implementation: 3 hours

---

## Why Browser Automation?

Mediavine does not provide a public API for fetching revenue data. The only way to access this data programmatically is through browser automation:

1. Log in to the Mediavine dashboard
2. Handle 2FA with TOTP (Time-based One-Time Password)
3. Navigate to reporting pages
4. Extract revenue data from the DOM

---

## Environment Variables

```env
# Mediavine Dashboard Credentials
MEDIAVINE_EMAIL=your-email@example.com
MEDIAVINE_PASSWORD=your-password
MEDIAVINE_TOTP_SECRET=JBSWY3DPEHPK3PXP  # The secret key from your authenticator setup
MEDIAVINE_SITE_ID=your-site-id           # Optional, auto-detected from dashboard
```

**Important**: The `MEDIAVINE_TOTP_SECRET` is the base32-encoded secret shown when you first set up 2FA (the same key you'd enter into Google Authenticator). It's NOT the 6-digit code.

---

## Implementation

### Install Dependencies

```bash
npm install playwright otpauth
npm install -D @types/node
```

### File: `lib/services/mediavineConnector.ts`

```typescript
/**
 * Mediavine Browser Connector
 *
 * Uses Playwright to automate browser login and data extraction from
 * the Mediavine dashboard. Handles TOTP 2FA authentication.
 */

import { chromium, Browser, Page } from 'playwright';
import * as OTPAuth from 'otpauth';
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
}

// Export singleton instance
export const mediavineConnector = new MediavineConnector();
```

### File: `scripts/sync-mediavine-metrics.ts`

```typescript
/**
 * Sync Mediavine Revenue
 *
 * Usage: npm run agent:mediavine-sync [date]
 */

import { mediavineConnector } from '../lib/services/mediavineConnector';

async function main() {
  const dateArg = process.argv[2];
  const targetDate = dateArg ? new Date(dateArg) : new Date();
  targetDate.setDate(targetDate.getDate() - 1); // Default to yesterday

  console.log(`\n=== Mediavine Revenue Sync ===`);
  console.log(`Date: ${targetDate.toISOString().split('T')[0]}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    const result = await mediavineConnector.syncRevenueToDatabase(targetDate);

    console.log(`\n=== Results ===`);
    console.log(`Days updated: ${result.daysUpdated}`);
    console.log(`Pages updated: ${result.pagesUpdated}`);
    console.log(`\nSync complete!`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
```

### Add to package.json

```json
{
  "scripts": {
    "agent:mediavine-sync": "npx tsx scripts/sync-mediavine-metrics.ts"
  }
}
```

### Update Prisma Schema

Add `MEDIAVINE_SYNC` to the `AgentRunType` enum:

```prisma
enum AgentRunType {
  FULL
  GA4_SYNC
  MEDIAVINE_SYNC    // Add this
  AFFILIATE_SCAN
  RPM_ANALYSIS
  FORECAST
  CLEANUP
}
```

### Integrate with Orchestrator

Update `lib/services/agentOrchestrator.ts`:

```typescript
// Add to imports
import { mediavineConnector } from '@/lib/services/mediavineConnector';

// Add new job type
export type JobType =
  | 'full'
  | 'ga4_sync'
  | 'mediavine_sync'  // Add this
  // ... rest

// Add case in runJob switch
case 'mediavine_sync':
  return this.runMediavineSync();

// Add private method
private async runMediavineSync(): Promise<JobResult> {
  const startTime = Date.now();

  if (!process.env.MEDIAVINE_EMAIL || !process.env.MEDIAVINE_PASSWORD) {
    return {
      job: 'mediavine_sync',
      success: true,
      duration: Date.now() - startTime,
      itemsProcessed: 0,
      error: 'Mediavine not configured - skipping',
    };
  }

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await mediavineConnector.syncRevenueToDatabase(yesterday);

    return {
      job: 'mediavine_sync',
      success: true,
      duration: Date.now() - startTime,
      itemsProcessed: result.daysUpdated + result.pagesUpdated,
    };
  } catch (error) {
    return {
      job: 'mediavine_sync',
      success: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

// Update runFullScan to include mediavine_sync
const jobOrder: JobType[] = [
  'ga4_sync',
  'mediavine_sync',  // Add this
  'affiliate_scan',
  'rpm_analysis',
  'cleanup',
];
```

---

## Getting the TOTP Secret

When you set up 2FA on Mediavine:

1. Go to Account Settings → Security
2. Click "Enable 2FA"
3. You'll see a QR code AND a text secret (like `JBSWY3DPEHPK3PXP`)
4. Copy this secret text to `MEDIAVINE_TOTP_SECRET`
5. Also add it to your authenticator app normally

If you already have 2FA set up:
1. You may need to disable and re-enable it to see the secret
2. Or export from your authenticator app if it supports it

---

## Validation Criteria

- [ ] Browser launches and navigates to Mediavine
- [ ] Login with email/password works
- [ ] TOTP generation works
- [ ] 2FA submission works
- [ ] Daily revenue data extracted
- [ ] Page-level revenue extracted
- [ ] Data saved to MonetizationMetric table
- [ ] AgentRun logged correctly
- [ ] Orchestrator integration works
- [ ] `npm run type-check` passes
