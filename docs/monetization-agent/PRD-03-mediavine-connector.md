# PRD-03: Mediavine Data Connector (Browser Automation)

## Overview
Build a connector to pull ad revenue, impressions, and RPM data from Mediavine's dashboard using Playwright browser automation, since Mediavine doesn't offer a public API.

## Priority: P0 (Foundation)
## Dependencies: PRD-01 (Database Schema)
## Estimated Implementation: 3 hours

---

## Strategy: Browser Automation with Playwright

Since Mediavine doesn't have a public API, we'll use Playwright to:
1. Log into the Mediavine dashboard
2. Navigate to the reporting section
3. Scrape data directly from the dashboard OR trigger CSV export
4. Parse and store the data

### Environment Variables
```env
MEDIAVINE_EMAIL=your-email@example.com
MEDIAVINE_PASSWORD=your-password
MEDIAVINE_SITE_ID=your-site-id  # Found in dashboard URL
```

**Security Note**: Store credentials in `.env.local` only, never commit to git.

---

## Implementation

### Install Playwright

```bash
npm install playwright
npx playwright install chromium  # Install browser binary
```

### File: `lib/services/mediavineConnector.ts`

```typescript
import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../prisma';
import * as fs from 'fs';
import * as path from 'path';

interface MediavineReportRow {
  date: string;
  impressions: number;
  revenue: number;
  rpm: number;
  pageviews: number;
}

interface DailyRevenue {
  date: Date;
  impressions: number;
  revenue: number;
  rpm: number;
  pageviews: number;
}

export class MediavineConnector {
  private email: string;
  private password: string;
  private siteId: string;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    this.email = process.env.MEDIAVINE_EMAIL!;
    this.password = process.env.MEDIAVINE_PASSWORD!;
    this.siteId = process.env.MEDIAVINE_SITE_ID!;

    if (!this.email || !this.password) {
      throw new Error('MEDIAVINE_EMAIL and MEDIAVINE_PASSWORD required');
    }
  }

  /**
   * Initialize browser and log in
   */
  async initialize(): Promise<void> {
    console.log('Launching browser...');
    this.browser = await chromium.launch({
      headless: true,  // Set to false for debugging
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await context.newPage();
    await this.login();
  }

  /**
   * Log into Mediavine dashboard
   */
  private async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('Logging into Mediavine...');

    // Navigate to login page
    await this.page.goto('https://dashboard.mediavine.com/login', {
      waitUntil: 'networkidle',
    });

    // Fill login form
    await this.page.fill('input[name="email"], input[type="email"]', this.email);
    await this.page.fill('input[name="password"], input[type="password"]', this.password);

    // Click login button
    await this.page.click('button[type="submit"]');

    // Wait for dashboard to load
    await this.page.waitForURL('**/dashboard**', { timeout: 30000 });

    console.log('Successfully logged in');
  }

  /**
   * Scrape daily revenue from dashboard
   */
  async scrapeDailyRevenue(days: number = 30): Promise<DailyRevenue[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Scraping ${days} days of revenue data...`);

    // Navigate to reporting page
    // Note: URL structure may vary - adjust based on actual Mediavine dashboard
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Try different possible dashboard URLs
    const reportUrls = [
      `https://dashboard.mediavine.com/reporting?start=${startStr}&end=${endStr}`,
      `https://dashboard.mediavine.com/sites/${this.siteId}/reporting`,
      `https://dashboard.mediavine.com/reporting`,
    ];

    let navigated = false;
    for (const url of reportUrls) {
      try {
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        navigated = true;
        break;
      } catch {
        console.log(`URL ${url} failed, trying next...`);
      }
    }

    if (!navigated) {
      throw new Error('Could not navigate to Mediavine reporting page');
    }

    // Wait for data to load
    await this.page.waitForTimeout(3000);

    // Try to scrape data from the page
    const data = await this.scrapeReportingTable();

    return data;
  }

  /**
   * Scrape data from the reporting table/chart
   */
  private async scrapeReportingTable(): Promise<DailyRevenue[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const results: DailyRevenue[] = [];

    // Strategy 1: Try to find a data table
    const tableData = await this.page.evaluate(() => {
      const rows: any[] = [];

      // Look for table rows with revenue data
      const tableRows = document.querySelectorAll('table tbody tr, [data-testid="report-row"]');

      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td, [data-testid="cell"]');
        if (cells.length >= 4) {
          rows.push({
            date: cells[0]?.textContent?.trim(),
            impressions: cells[1]?.textContent?.trim(),
            revenue: cells[2]?.textContent?.trim(),
            rpm: cells[3]?.textContent?.trim(),
          });
        }
      });

      return rows;
    });

    if (tableData.length > 0) {
      for (const row of tableData) {
        try {
          results.push({
            date: new Date(row.date),
            impressions: this.parseNumber(row.impressions),
            revenue: this.parseRevenue(row.revenue),
            rpm: this.parseRevenue(row.rpm),
            pageviews: 0,
          });
        } catch {
          // Skip malformed rows
        }
      }
      return results;
    }

    // Strategy 2: Try to find summary stats
    const summaryData = await this.page.evaluate(() => {
      const stats: Record<string, string> = {};

      // Look for stat cards/widgets
      const statElements = document.querySelectorAll(
        '[data-testid="stat"], .stat-card, .metric-card, .dashboard-stat'
      );

      statElements.forEach(el => {
        const label = el.querySelector('.label, .stat-label, h3, h4')?.textContent?.trim();
        const value = el.querySelector('.value, .stat-value, .amount')?.textContent?.trim();
        if (label && value) {
          stats[label.toLowerCase()] = value;
        }
      });

      // Also try to find revenue in common locations
      const revenueEl = document.querySelector('[data-testid="revenue"], .total-revenue, .earnings');
      if (revenueEl) {
        stats['revenue'] = revenueEl.textContent?.trim() || '0';
      }

      return stats;
    });

    // If we only got summary data, create a single entry for today
    if (Object.keys(summaryData).length > 0) {
      console.log('Found summary data:', summaryData);

      results.push({
        date: new Date(),
        impressions: this.parseNumber(summaryData['impressions'] || '0'),
        revenue: this.parseRevenue(summaryData['revenue'] || summaryData['earnings'] || '0'),
        rpm: this.parseRevenue(summaryData['rpm'] || summaryData['session rpm'] || '0'),
        pageviews: this.parseNumber(summaryData['pageviews'] || summaryData['sessions'] || '0'),
      });
    }

    return results;
  }

  /**
   * Download CSV export and parse it
   */
  async downloadAndParseCSV(): Promise<DailyRevenue[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('Attempting to download CSV export...');

    // Look for export/download button
    const exportButton = await this.page.$('button:has-text("Export"), button:has-text("Download"), a:has-text("CSV")');

    if (!exportButton) {
      console.log('No export button found, falling back to scraping');
      return this.scrapeDailyRevenue();
    }

    // Set up download listener
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });

    await exportButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join('/tmp', 'mediavine-export.csv');
    await download.saveAs(downloadPath);

    // Parse CSV
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    const results = this.parseCSV(csvContent);

    // Clean up
    fs.unlinkSync(downloadPath);

    return results;
  }

  /**
   * Parse CSV content
   */
  private parseCSV(content: string): DailyRevenue[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

    const results: DailyRevenue[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      try {
        results.push({
          date: new Date(row['date'] || row['day']),
          impressions: this.parseNumber(row['impressions'] || row['imps'] || '0'),
          revenue: this.parseRevenue(row['revenue'] || row['earnings'] || row['est. revenue'] || '0'),
          rpm: this.parseRevenue(row['rpm'] || row['session rpm'] || '0'),
          pageviews: this.parseNumber(row['pageviews'] || row['sessions'] || '0'),
        });
      } catch {
        // Skip malformed rows
      }
    }

    return results;
  }

  /**
   * Sync revenue data to database
   */
  async syncRevenueToDatabase(days: number = 7): Promise<{ daysUpdated: number; totalRevenue: number }> {
    await this.initialize();

    try {
      // Try CSV first, fall back to scraping
      let data: DailyRevenue[];
      try {
        data = await this.downloadAndParseCSV();
      } catch {
        data = await this.scrapeDailyRevenue(days);
      }

      let daysUpdated = 0;
      let totalRevenue = 0;

      for (const day of data) {
        totalRevenue += day.revenue;

        // Upsert site-level metric
        await prisma.monetizationMetric.upsert({
          where: {
            pageUrl_metricDate: {
              pageUrl: '/_site_total',
              metricDate: day.date,
            },
          },
          create: {
            pageUrl: '/_site_total',
            pageType: 'site_total',
            metricDate: day.date,
            impressions: day.impressions,
            adRevenue: day.revenue,
            rpm: day.rpm,
            pageviews: day.pageviews,
          },
          update: {
            impressions: day.impressions,
            adRevenue: day.revenue,
            rpm: day.rpm,
            pageviews: day.pageviews,
          },
        });

        daysUpdated++;
      }

      return { daysUpdated, totalRevenue };
    } finally {
      await this.close();
    }
  }

  /**
   * Get current day's revenue (quick check)
   */
  async getTodayRevenue(): Promise<{ revenue: number; rpm: number; impressions: number }> {
    await this.initialize();

    try {
      // Navigate to dashboard home which usually shows today's stats
      await this.page!.goto('https://dashboard.mediavine.com/', {
        waitUntil: 'networkidle',
      });

      await this.page!.waitForTimeout(2000);

      // Scrape today's stats
      const stats = await this.page!.evaluate(() => {
        const getText = (selectors: string[]): string => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.textContent) return el.textContent.trim();
          }
          return '0';
        };

        return {
          revenue: getText(['.today-revenue', '[data-testid="today-revenue"]', '.earnings-today']),
          rpm: getText(['.today-rpm', '[data-testid="rpm"]', '.session-rpm']),
          impressions: getText(['.today-impressions', '[data-testid="impressions"]', '.imps-today']),
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

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  // Helper methods
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
 * Alternative: Manual CSV import for when automation isn't possible
 */
export class MediavineManualImport {
  /**
   * Import from manually downloaded CSV
   * Usage: Place CSV in /tmp/mediavine.csv and run import
   */
  static async importFromCSV(csvPath: string): Promise<number> {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const date = new Date(row['date'] || row['day']);
      const revenue = parseFloat(row['revenue']?.replace(/[^0-9.]/g, '') || '0');
      const impressions = parseInt(row['impressions']?.replace(/[^0-9]/g, '') || '0');
      const rpm = parseFloat(row['rpm']?.replace(/[^0-9.]/g, '') || '0');

      await prisma.monetizationMetric.upsert({
        where: {
          pageUrl_metricDate: {
            pageUrl: '/_site_total',
            metricDate: date,
          },
        },
        create: {
          pageUrl: '/_site_total',
          pageType: 'site_total',
          metricDate: date,
          impressions,
          adRevenue: revenue,
          rpm,
        },
        update: {
          impressions,
          adRevenue: revenue,
          rpm,
        },
      });

      imported++;
    }

    return imported;
  }
}
```

---

## Script: `scripts/sync-mediavine.ts`

```typescript
import { MediavineConnector, MediavineManualImport } from '../lib/services/mediavineConnector';
import { prisma } from '../lib/prisma';

async function main() {
  const command = process.argv[2] || 'sync';

  console.log('Starting Mediavine sync...');
  const startTime = Date.now();

  const agentRun = await prisma.agentRun.create({
    data: {
      runType: 'mediavine_sync',
      status: 'running',
    },
  });

  try {
    let result: { daysUpdated: number; totalRevenue: number };

    if (command === 'csv') {
      // Manual CSV import
      const csvPath = process.argv[3];
      if (!csvPath) {
        console.error('Usage: npm run agent:mediavine csv <path-to-csv>');
        process.exit(1);
      }
      const imported = await MediavineManualImport.importFromCSV(csvPath);
      result = { daysUpdated: imported, totalRevenue: 0 };
      console.log(`Imported ${imported} days from CSV`);
    } else {
      // Browser automation
      const connector = new MediavineConnector();
      result = await connector.syncRevenueToDatabase(7);
    }

    const durationMs = Date.now() - startTime;

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        itemsProcessed: result.daysUpdated,
        logSummary: `Synced ${result.daysUpdated} days, $${result.totalRevenue.toFixed(2)} total revenue`,
      },
    });

    console.log(`Synced ${result.daysUpdated} days in ${durationMs}ms`);
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorDetails: { message: String(error), stack: (error as Error).stack },
      },
    });

    console.error('Mediavine sync failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "agent:mediavine": "npx tsx scripts/sync-mediavine.ts",
    "agent:mediavine-csv": "npx tsx scripts/sync-mediavine.ts csv"
  }
}
```

---

## Debugging Tips

### Run with visible browser
Set `headless: false` in the connector to watch the automation:

```typescript
this.browser = await chromium.launch({
  headless: false,  // See what's happening
  slowMo: 100,      // Slow down actions
});
```

### Take screenshots on error
Add error handling that captures screenshots:

```typescript
try {
  // ... automation code
} catch (error) {
  await this.page?.screenshot({ path: '/tmp/mediavine-error.png' });
  throw error;
}
```

### Dashboard structure changes
Mediavine may update their dashboard. If scraping breaks:
1. Run with `headless: false` to see the current layout
2. Use browser DevTools to inspect element selectors
3. Update the selectors in `scrapeReportingTable()`

---

## Fallback: Manual CSV Workflow

If automation consistently fails:

1. **Daily manual export** (2 minutes):
   - Log into dashboard.mediavine.com
   - Go to Reporting
   - Click Export/Download CSV
   - Save to `/tmp/mediavine.csv`

2. **Run import**:
   ```bash
   npm run agent:mediavine-csv /tmp/mediavine.csv
   ```

3. **Automate reminder**: Set up a daily Slack/email reminder to do the export

---

## Validation Criteria

- [ ] Playwright installed and browser binary downloaded
- [ ] Can log into Mediavine dashboard
- [ ] Can navigate to reporting page
- [ ] Scrapes or downloads revenue data
- [ ] Data stored in MonetizationMetric table
- [ ] Manual CSV import works as fallback
- [ ] AgentRun logged for each sync
- [ ] `npm run agent:mediavine` works
