# PRD-05: RPM Analysis Engine

## Overview
Build an analysis engine that identifies RPM optimization opportunities by comparing page performance, detecting underperformers, and suggesting layout/content improvements.

## Priority: P1 (Intelligence)
## Dependencies: PRD-01, PRD-02, PRD-03 (Database + GA4 + Mediavine data)
## Estimated Implementation: 3 hours

---

## RPM Optimization Opportunities

### 1. Underperforming Pages
- Pages with RPM significantly below site average
- High traffic, low revenue pages

### 2. Ad Layout Issues
- Pages with high bounce rate (poor ad experience)
- Pages with low viewability scores
- Content length mismatches

### 3. Content Optimization
- Thin content pages (not enough ad inventory)
- Pages that could support additional ad units

---

## Implementation

### File: `lib/services/rpmAnalyzer.ts`

```typescript
import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface RpmOpportunity {
  pageUrl: string;
  modId?: string;
  opportunityType: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  description: string;
  reasoning: string;
  currentRpm: number;
  targetRpm: number;
  estimatedRevenueImpact: number;
  suggestedActions: RpmAction[];
}

interface RpmAction {
  actionType: string;
  title: string;
  description: string;
  actionData: Record<string, any>;
}

interface PagePerformance {
  pageUrl: string;
  modId?: string;
  pageType: string;
  avgRpm: number;
  totalPageviews: number;
  totalRevenue: number;
  avgBounceRate: number;
  avgSessionDuration: number;
}

export class RpmAnalyzer {
  /**
   * Run full RPM analysis
   */
  async analyzeRpm(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];

    // Get baseline metrics
    const siteAvgRpm = await this.calculateSiteAverageRpm();
    const pagePerformance = await this.getPagePerformance();

    // 1. Find underperforming pages
    const underperformers = this.findUnderperformingPages(pagePerformance, siteAvgRpm);
    opportunities.push(...underperformers);

    // 2. Find high bounce rate pages
    const highBouncers = this.findHighBouncePages(pagePerformance);
    opportunities.push(...highBouncers);

    // 3. Find thin content opportunities
    const thinContent = await this.findThinContentPages();
    opportunities.push(...thinContent);

    // 4. Find traffic source RPM variations
    const trafficVariations = await this.analyzeTrafficSourceRpm();
    opportunities.push(...trafficVariations);

    return opportunities;
  }

  /**
   * Calculate site-wide average RPM
   */
  private async calculateSiteAverageRpm(): Promise<number> {
    const result = await prisma.monetizationMetric.aggregate({
      where: {
        metricDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        rpm: { gt: 0 },
      },
      _avg: {
        rpm: true,
      },
    });

    return Number(result._avg.rpm) || 10; // Default $10 RPM
  }

  /**
   * Get aggregated page performance
   */
  private async getPagePerformance(): Promise<PagePerformance[]> {
    const metrics = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'modId', 'pageType'],
      where: {
        metricDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _avg: {
        rpm: true,
        bounceRate: true,
        avgSessionDuration: true,
      },
      _sum: {
        pageviews: true,
        adRevenue: true,
      },
    });

    return metrics.map(m => ({
      pageUrl: m.pageUrl,
      modId: m.modId || undefined,
      pageType: m.pageType,
      avgRpm: Number(m._avg.rpm) || 0,
      totalPageviews: m._sum.pageviews || 0,
      totalRevenue: Number(m._sum.adRevenue) || 0,
      avgBounceRate: Number(m._avg.bounceRate) || 0,
      avgSessionDuration: Number(m._avg.avgSessionDuration) || 0,
    }));
  }

  /**
   * Find pages with RPM below site average
   */
  private findUnderperformingPages(
    pages: PagePerformance[],
    siteAvgRpm: number
  ): RpmOpportunity[] {
    const opportunities: RpmOpportunity[] = [];

    // Filter to pages with meaningful traffic and below-average RPM
    const underperformers = pages.filter(p =>
      p.totalPageviews > 200 &&
      p.avgRpm > 0 &&
      p.avgRpm < siteAvgRpm * 0.7  // More than 30% below average
    );

    // Sort by potential impact (pageviews * rpm gap)
    underperformers.sort((a, b) => {
      const impactA = a.totalPageviews * (siteAvgRpm - a.avgRpm);
      const impactB = b.totalPageviews * (siteAvgRpm - b.avgRpm);
      return impactB - impactA;
    });

    for (const page of underperformers.slice(0, 20)) {
      const rpmGap = siteAvgRpm - page.avgRpm;
      const potentialRevenue = (page.totalPageviews / 1000) * rpmGap;

      opportunities.push({
        pageUrl: page.pageUrl,
        modId: page.modId,
        opportunityType: 'rpm_underperformer',
        priority: rpmGap > siteAvgRpm * 0.5 ? 'high' : 'medium',
        confidence: 0.75,
        title: `Low RPM: $${page.avgRpm.toFixed(2)} vs $${siteAvgRpm.toFixed(2)} average`,
        description: `This page has ${page.totalPageviews.toLocaleString()} pageviews but RPM is ${((1 - page.avgRpm / siteAvgRpm) * 100).toFixed(0)}% below site average.`,
        reasoning: `RPM of $${page.avgRpm.toFixed(2)} compared to site average of $${siteAvgRpm.toFixed(2)} suggests ad placement or content issues.`,
        currentRpm: page.avgRpm,
        targetRpm: siteAvgRpm,
        estimatedRevenueImpact: potentialRevenue,
        suggestedActions: this.suggestRpmActions(page, siteAvgRpm),
      });
    }

    return opportunities;
  }

  /**
   * Find pages with high bounce rate (may indicate poor ad experience)
   */
  private findHighBouncePages(pages: PagePerformance[]): RpmOpportunity[] {
    const opportunities: RpmOpportunity[] = [];

    const highBounce = pages.filter(p =>
      p.totalPageviews > 100 &&
      p.avgBounceRate > 0.7  // More than 70% bounce
    );

    for (const page of highBounce.slice(0, 10)) {
      opportunities.push({
        pageUrl: page.pageUrl,
        modId: page.modId,
        opportunityType: 'high_bounce_rate',
        priority: page.avgBounceRate > 0.85 ? 'high' : 'medium',
        confidence: 0.65,
        title: `High bounce rate: ${(page.avgBounceRate * 100).toFixed(0)}%`,
        description: `Users are leaving quickly, possibly due to ad overload or poor content match.`,
        reasoning: `Bounce rate of ${(page.avgBounceRate * 100).toFixed(0)}% is above acceptable threshold. Could indicate intrusive ads or content-user mismatch.`,
        currentRpm: page.avgRpm,
        targetRpm: page.avgRpm * 1.2,
        estimatedRevenueImpact: page.totalRevenue * 0.15,
        suggestedActions: [
          {
            actionType: 'optimize_layout',
            title: 'Reduce ad density',
            description: 'Consider reducing above-fold ads to improve user experience',
            actionData: {
              pageUrl: page.pageUrl,
              change: 'reduce_ad_density',
            },
          },
          {
            actionType: 'content_improvement',
            title: 'Improve content relevance',
            description: 'Enhance meta description and intro to better match user intent',
            actionData: {
              pageUrl: page.pageUrl,
              change: 'improve_relevance',
            },
          },
        ],
      });
    }

    return opportunities;
  }

  /**
   * Find thin content pages that could support more ads
   */
  private async findThinContentPages(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];

    // Get pages with very short session duration but decent traffic
    const thinPages = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'modId', 'pageType'],
      where: {
        metricDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        avgSessionDuration: {
          lt: 30, // Less than 30 seconds
        },
      },
      _sum: {
        pageviews: true,
      },
      having: {
        pageviews: {
          _sum: { gt: 100 },
        },
      },
    });

    for (const page of thinPages.slice(0, 10)) {
      opportunities.push({
        pageUrl: page.pageUrl,
        modId: page.modId || undefined,
        opportunityType: 'thin_content',
        priority: 'medium',
        confidence: 0.60,
        title: 'Short session duration - content expansion opportunity',
        description: `Users spend <30 seconds on this page. Expanding content could increase ad inventory and engagement.`,
        reasoning: 'Thin content limits ad inventory. More substantial content = more ad slots + better engagement.',
        currentRpm: 0,
        targetRpm: 0,
        estimatedRevenueImpact: (page._sum.pageviews || 0) * 0.005,
        suggestedActions: [
          {
            actionType: 'content_expansion',
            title: 'Add related content section',
            description: 'Add "Similar Mods" or "From This Creator" sections to increase time on page',
            actionData: {
              pageUrl: page.pageUrl,
              expansion: 'related_content',
            },
          },
        ],
      });
    }

    return opportunities;
  }

  /**
   * Analyze RPM variations by traffic source
   */
  private async analyzeTrafficSourceRpm(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];

    // Get RPM by dominant traffic source
    const trafficMetrics = await prisma.monetizationMetric.findMany({
      where: {
        metricDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        rpm: { gt: 0 },
      },
      select: {
        pageUrl: true,
        rpm: true,
        trafficGoogle: true,
        trafficPinterest: true,
        trafficDirect: true,
        pageviews: true,
      },
    });

    // Calculate RPM by traffic source
    let googleRpm = 0, googleViews = 0;
    let pinterestRpm = 0, pinterestViews = 0;

    for (const m of trafficMetrics) {
      const rpm = Number(m.rpm);
      if (m.trafficGoogle > m.trafficPinterest) {
        googleRpm += rpm * m.pageviews;
        googleViews += m.pageviews;
      } else if (m.trafficPinterest > m.trafficGoogle) {
        pinterestRpm += rpm * m.pageviews;
        pinterestViews += m.pageviews;
      }
    }

    const avgGoogleRpm = googleViews > 0 ? googleRpm / googleViews : 0;
    const avgPinterestRpm = pinterestViews > 0 ? pinterestRpm / pinterestViews : 0;

    // If significant RPM difference, suggest optimization
    if (Math.abs(avgGoogleRpm - avgPinterestRpm) > 3) {
      const higherSource = avgGoogleRpm > avgPinterestRpm ? 'Google' : 'Pinterest';
      const lowerSource = avgGoogleRpm > avgPinterestRpm ? 'Pinterest' : 'Google';
      const difference = Math.abs(avgGoogleRpm - avgPinterestRpm);

      opportunities.push({
        pageUrl: '/_site_wide',
        opportunityType: 'traffic_source_optimization',
        priority: 'medium',
        confidence: 0.70,
        title: `${higherSource} traffic has $${difference.toFixed(2)} higher RPM`,
        description: `${higherSource} traffic earns $${Math.max(avgGoogleRpm, avgPinterestRpm).toFixed(2)} RPM vs ${lowerSource}'s $${Math.min(avgGoogleRpm, avgPinterestRpm).toFixed(2)}`,
        reasoning: `Traffic source affects RPM due to user intent and ad targeting. Consider traffic acquisition strategy.`,
        currentRpm: Math.min(avgGoogleRpm, avgPinterestRpm),
        targetRpm: Math.max(avgGoogleRpm, avgPinterestRpm),
        estimatedRevenueImpact: difference * (Math.min(googleViews, pinterestViews) / 1000),
        suggestedActions: [
          {
            actionType: 'traffic_strategy',
            title: `Prioritize ${higherSource} traffic`,
            description: `Focus SEO/content efforts on ${higherSource} to maximize RPM`,
            actionData: {
              recommendedSource: higherSource.toLowerCase(),
              rpmDifference: difference,
            },
          },
        ],
      });
    }

    return opportunities;
  }

  /**
   * Suggest actions based on page characteristics
   */
  private suggestRpmActions(page: PagePerformance, targetRpm: number): RpmAction[] {
    const actions: RpmAction[] = [];

    // If bounce rate is high, suggest layout optimization
    if (page.avgBounceRate > 0.6) {
      actions.push({
        actionType: 'optimize_layout',
        title: 'Improve ad placement',
        description: 'Reposition ads to reduce bounce while maintaining visibility',
        actionData: {
          pageUrl: page.pageUrl,
          currentBounceRate: page.avgBounceRate,
        },
      });
    }

    // If session duration is low, suggest content enhancement
    if (page.avgSessionDuration < 60) {
      actions.push({
        actionType: 'content_enhancement',
        title: 'Extend content depth',
        description: 'Add more valuable content to increase time on page',
        actionData: {
          pageUrl: page.pageUrl,
          currentDuration: page.avgSessionDuration,
        },
      });
    }

    // Default: suggest A/B testing
    actions.push({
      actionType: 'ab_test',
      title: 'Test ad configuration',
      description: `Test different ad layouts to improve RPM from $${page.avgRpm.toFixed(2)} to $${targetRpm.toFixed(2)}`,
      actionData: {
        pageUrl: page.pageUrl,
        targetRpm,
      },
    });

    return actions;
  }
}
```

---

## Script: `scripts/analyze-rpm.ts`

```typescript
import { RpmAnalyzer } from '../lib/services/rpmAnalyzer';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Analyzing RPM opportunities...');

  const startTime = Date.now();
  const analyzer = new RpmAnalyzer();

  const agentRun = await prisma.agentRun.create({
    data: {
      runType: 'rpm_analysis',
      status: 'running',
    },
  });

  try {
    const opportunities = await analyzer.analyzeRpm();

    let created = 0;
    for (const opp of opportunities) {
      const existing = await prisma.monetizationOpportunity.findFirst({
        where: {
          pageUrl: opp.pageUrl,
          opportunityType: opp.opportunityType,
          status: { in: ['pending', 'approved'] },
        },
      });

      if (!existing) {
        const newOpp = await prisma.monetizationOpportunity.create({
          data: {
            opportunityType: opp.opportunityType,
            priority: opp.priority,
            confidence: opp.confidence,
            pageUrl: opp.pageUrl,
            modId: opp.modId,
            title: opp.title,
            description: opp.description,
            reasoning: opp.reasoning,
            estimatedRevenueImpact: opp.estimatedRevenueImpact,
            estimatedRpmIncrease: ((opp.targetRpm - opp.currentRpm) / opp.currentRpm) * 100 || null,
            status: 'pending',
          },
        });

        for (const action of opp.suggestedActions) {
          await prisma.monetizationAction.create({
            data: {
              opportunityId: newOpp.id,
              actionType: action.actionType,
              title: action.title,
              description: action.description,
              actionData: action.actionData,
              status: 'pending',
            },
          });
        }

        created++;
      }
    }

    const durationMs = Date.now() - startTime;

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        opportunitiesFound: created,
        itemsProcessed: opportunities.length,
        logSummary: `Analyzed RPM, found ${opportunities.length} opportunities, created ${created} new`,
      },
    });

    console.log(`Found ${opportunities.length} RPM opportunities, created ${created} new in ${durationMs}ms`);
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorDetails: { message: String(error) },
      },
    });

    console.error('RPM analysis failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Package.json Script

```json
{
  "scripts": {
    "agent:analyze-rpm": "npx tsx scripts/analyze-rpm.ts"
  }
}
```

---

## Validation Criteria

- [ ] Calculates site-wide average RPM
- [ ] Identifies underperforming pages
- [ ] Detects high bounce rate issues
- [ ] Analyzes traffic source RPM variations
- [ ] Creates opportunities with action suggestions
- [ ] `npm run agent:analyze-rpm` works
