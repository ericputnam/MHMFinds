# PRD-04: Affiliate Opportunity Detection Engine

## Overview
Build an intelligent system that analyzes content and traffic patterns to detect affiliate monetization opportunities.

## Priority: P1 (Intelligence)
## Dependencies: PRD-01, PRD-02 (Database + GA4 data)
## Estimated Implementation: 4 hours

---

## Opportunity Types

### 1. Missing Affiliate Links
- High-traffic pages with no affiliate clicks
- Pages with "buyer intent" keywords (pack names, creator names)
- Category/roundup pages without storefronts

### 2. Underperforming Affiliates
- Pages with clicks but no conversions
- Low click-through rate vs similar pages
- Wrong affiliate type for traffic source

### 3. Traffic Source Optimization
- Pinterest traffic = visual/aesthetic affiliates
- Google traffic = functional/utility affiliates
- Adjust affiliate strategy per source

---

## Implementation

### File: `lib/services/affiliateDetector.ts`

```typescript
import { prisma } from '../prisma';
import OpenAI from 'openai';

interface AffiliateOpportunity {
  pageUrl: string;
  modId?: string;
  opportunityType: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  description: string;
  reasoning: string;
  estimatedRevenueImpact: number;
  suggestedActions: SuggestedAction[];
}

interface SuggestedAction {
  actionType: string;
  title: string;
  description: string;
  actionData: Record<string, any>;
}

// Keywords that indicate buyer intent
const BUYER_INTENT_KEYWORDS = [
  // Pack names
  'growing together', 'horse ranch', 'for rent', 'high school years',
  'cottage living', 'snowy escape', 'island living', 'get famous',

  // Creator-related
  'patreon', 'early access', 'supporter', 'exclusive',

  // Purchase-related
  'download', 'get', 'install', 'where to find',

  // Specific CC types that convert well
  'maxis match', 'alpha cc', 'realistic', 'default replacement',
];

// Affiliate programs available
const AFFILIATE_PROGRAMS = {
  patreon: {
    name: 'Patreon Creator Links',
    avgCommission: 0.08,  // 8% recurring
    bestFor: ['creator pages', 'exclusive cc'],
  },
  curseforge: {
    name: 'CurseForge Affiliate',
    avgCommission: 0.05,
    bestFor: ['gameplay mods', 'script mods'],
  },
  amazon: {
    name: 'Amazon Associates',
    avgCommission: 0.04,
    bestFor: ['setup guides', 'pc builds', 'peripherals'],
  },
  simsResource: {
    name: 'The Sims Resource',
    avgCommission: 0.10,
    bestFor: ['cc roundups', 'lookbooks'],
  },
};

export class AffiliateDetector {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Run full affiliate opportunity scan
   */
  async scanForOpportunities(): Promise<AffiliateOpportunity[]> {
    const opportunities: AffiliateOpportunity[] = [];

    // 1. Find high-traffic pages with no affiliate clicks
    const noAffiliatePages = await this.findPagesWithoutAffiliates();
    opportunities.push(...noAffiliatePages);

    // 2. Find pages with buyer intent but low monetization
    const buyerIntentPages = await this.findBuyerIntentPages();
    opportunities.push(...buyerIntentPages);

    // 3. Find traffic source mismatches
    const trafficMismatches = await this.findTrafficSourceMismatches();
    opportunities.push(...trafficMismatches);

    // 4. Find category/collection pages without affiliate blocks
    const collectionPages = await this.findUnmonetizedCollections();
    opportunities.push(...collectionPages);

    return opportunities;
  }

  /**
   * Find high-traffic pages with no affiliate clicks
   */
  private async findPagesWithoutAffiliates(): Promise<AffiliateOpportunity[]> {
    // Get pages with >100 pageviews but 0 affiliate clicks in last 7 days
    const recentMetrics = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'modId', 'pageType'],
      where: {
        metricDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: {
        pageviews: true,
        affiliateClicks: true,
      },
      having: {
        pageviews: {
          _sum: {
            gt: 100,
          },
        },
      },
      orderBy: {
        _sum: {
          pageviews: 'desc',
        },
      },
      take: 50,
    });

    const opportunities: AffiliateOpportunity[] = [];

    for (const metric of recentMetrics) {
      const affiliateClicks = metric._sum.affiliateClicks || 0;
      const pageviews = metric._sum.pageviews || 0;

      if (affiliateClicks === 0 && pageviews > 100) {
        // High traffic, no affiliate clicks - opportunity!
        const estimatedImpact = this.estimateAffiliateImpact(pageviews);

        opportunities.push({
          pageUrl: metric.pageUrl,
          modId: metric.modId || undefined,
          opportunityType: 'missing_affiliate',
          priority: pageviews > 500 ? 'high' : 'medium',
          confidence: 0.85,
          title: `Add affiliate links to high-traffic page`,
          description: `This page has ${pageviews} pageviews but no affiliate clicks. Adding relevant affiliate links could generate ~$${estimatedImpact.toFixed(2)}/month.`,
          reasoning: `High traffic (${pageviews} views/week) with zero affiliate monetization indicates missed opportunity.`,
          estimatedRevenueImpact: estimatedImpact,
          suggestedActions: [
            {
              actionType: 'inject_affiliate',
              title: 'Add contextual affiliate block',
              description: 'Insert affiliate CTA block based on page content',
              actionData: {
                pageUrl: metric.pageUrl,
                placement: 'after_content',
                affiliateType: 'auto_detect',
              },
            },
          ],
        });
      }
    }

    return opportunities;
  }

  /**
   * Find pages with buyer intent keywords
   */
  private async findBuyerIntentPages(): Promise<AffiliateOpportunity[]> {
    const opportunities: AffiliateOpportunity[] = [];

    // Get mods with buyer intent in title/description
    const modsWithIntent = await prisma.mod.findMany({
      where: {
        OR: BUYER_INTENT_KEYWORDS.map(keyword => ({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
            { tags: { has: keyword } },
          ],
        })),
      },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        contentType: true,
        monetizationMetrics: {
          where: {
            metricDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      take: 100,
    });

    for (const mod of modsWithIntent) {
      const totalPageviews = mod.monetizationMetrics.reduce(
        (sum, m) => sum + m.pageviews, 0
      );
      const totalAffiliateClicks = mod.monetizationMetrics.reduce(
        (sum, m) => sum + m.affiliateClicks, 0
      );

      // If has traffic but low affiliate conversion
      if (totalPageviews > 50 && totalAffiliateClicks < totalPageviews * 0.01) {
        const matchedKeywords = BUYER_INTENT_KEYWORDS.filter(kw =>
          mod.title.toLowerCase().includes(kw) ||
          mod.description?.toLowerCase().includes(kw) ||
          mod.tags?.some(t => t.toLowerCase().includes(kw))
        );

        const suggestedAffiliate = this.suggestAffiliateProgram(mod);
        const estimatedImpact = this.estimateAffiliateImpact(totalPageviews, 0.03);

        opportunities.push({
          pageUrl: `/mods/${mod.id}`,
          modId: mod.id,
          opportunityType: 'buyer_intent',
          priority: totalPageviews > 200 ? 'high' : 'medium',
          confidence: 0.75,
          title: `Buyer intent detected: "${mod.title}"`,
          description: `This mod page contains buyer intent keywords (${matchedKeywords.slice(0, 3).join(', ')}) suggesting visitors want to purchase or download.`,
          reasoning: `Keywords [${matchedKeywords.join(', ')}] indicate purchase intent. Current conversion: ${((totalAffiliateClicks / totalPageviews) * 100).toFixed(2)}%`,
          estimatedRevenueImpact: estimatedImpact,
          suggestedActions: [
            {
              actionType: 'inject_affiliate',
              title: `Add ${suggestedAffiliate.name} links`,
              description: suggestedAffiliate.description,
              actionData: {
                modId: mod.id,
                affiliateProgram: suggestedAffiliate.program,
                placement: 'prominent',
              },
            },
          ],
        });
      }
    }

    return opportunities;
  }

  /**
   * Find traffic source mismatches
   */
  private async findTrafficSourceMismatches(): Promise<AffiliateOpportunity[]> {
    const opportunities: AffiliateOpportunity[] = [];

    // Get pages with heavy Pinterest traffic
    const pinterestHeavyPages = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'modId'],
      where: {
        metricDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        trafficPinterest: {
          gt: 50,
        },
      },
      _sum: {
        pageviews: true,
        trafficPinterest: true,
        affiliateClicks: true,
      },
    });

    for (const page of pinterestHeavyPages) {
      const pinterestRatio = (page._sum.trafficPinterest || 0) / (page._sum.pageviews || 1);

      // If >50% Pinterest traffic, suggest visual-focused affiliates
      if (pinterestRatio > 0.5) {
        opportunities.push({
          pageUrl: page.pageUrl,
          modId: page.modId || undefined,
          opportunityType: 'traffic_optimization',
          priority: 'medium',
          confidence: 0.70,
          title: 'Optimize for Pinterest traffic',
          description: `${(pinterestRatio * 100).toFixed(0)}% of traffic is from Pinterest. Pinterest users respond better to visual/aesthetic products.`,
          reasoning: 'Pinterest traffic converts differently than search traffic. Visual products and aesthetic bundles perform better.',
          estimatedRevenueImpact: this.estimateAffiliateImpact(page._sum.pageviews || 0, 0.02),
          suggestedActions: [
            {
              actionType: 'inject_affiliate',
              title: 'Add aesthetic-focused affiliate block',
              description: 'Insert Sims Resource or lookbook CTA for Pinterest visitors',
              actionData: {
                pageUrl: page.pageUrl,
                trafficSource: 'pinterest',
                affiliateType: 'visual_aesthetic',
              },
            },
          ],
        });
      }
    }

    return opportunities;
  }

  /**
   * Find category/collection pages without monetization
   */
  private async findUnmonetizedCollections(): Promise<AffiliateOpportunity[]> {
    const opportunities: AffiliateOpportunity[] = [];

    // Check category and search pages
    const collectionMetrics = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'pageType'],
      where: {
        pageType: { in: ['category', 'search'] },
        metricDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: {
        pageviews: true,
        affiliateClicks: true,
      },
      having: {
        pageviews: {
          _sum: { gt: 200 },
        },
      },
    });

    for (const metric of collectionMetrics) {
      const clickRate = (metric._sum.affiliateClicks || 0) / (metric._sum.pageviews || 1);

      if (clickRate < 0.005) {  // Less than 0.5% click rate
        opportunities.push({
          pageUrl: metric.pageUrl,
          opportunityType: 'collection_monetization',
          priority: 'high',
          confidence: 0.80,
          title: `Monetize ${metric.pageType} page`,
          description: `This ${metric.pageType} page has ${metric._sum.pageviews} views but only ${(clickRate * 100).toFixed(2)}% affiliate click rate.`,
          reasoning: 'Collection pages are ideal for affiliate blocks as users are actively browsing and comparing options.',
          estimatedRevenueImpact: this.estimateAffiliateImpact(metric._sum.pageviews || 0, 0.03),
          suggestedActions: [
            {
              actionType: 'inject_affiliate',
              title: 'Add featured creator section',
              description: 'Add a "Top Creators" or "Premium Packs" section with affiliate links',
              actionData: {
                pageUrl: metric.pageUrl,
                pageType: metric.pageType,
                blockType: 'featured_creators',
              },
            },
          ],
        });
      }
    }

    return opportunities;
  }

  /**
   * Use AI to analyze a page and suggest affiliates
   */
  async analyzePageWithAI(pageUrl: string, content: string): Promise<SuggestedAction[]> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an affiliate marketing expert for a Sims mod website. Analyze the page content and suggest the best affiliate monetization strategy.

Available affiliate programs:
- Patreon: For creator early access, exclusive CC (8% commission)
- CurseForge: For gameplay mods, scripts (5% commission)
- Amazon: For gaming peripherals, setup guides (4% commission)
- The Sims Resource: For CC roundups, lookbooks (10% commission)

Respond with JSON array of suggested actions.`,
        },
        {
          role: 'user',
          content: `Analyze this page for affiliate opportunities:
URL: ${pageUrl}
Content: ${content.slice(0, 2000)}

Suggest 1-3 affiliate actions with reasoning.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    try {
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result.actions || [];
    } catch {
      return [];
    }
  }

  // Helper methods
  private estimateAffiliateImpact(pageviews: number, conversionRate: number = 0.02): number {
    // Estimate monthly revenue impact
    // Assumes: pageviews * clickRate * conversionRate * avgOrderValue * commission
    const monthlyViews = pageviews * 4;  // Weekly to monthly
    const clickRate = 0.03;  // 3% click affiliate links
    const orderValue = 15;   // Avg $15 affiliate sale
    const commission = 0.08; // 8% average commission

    return monthlyViews * clickRate * conversionRate * orderValue * commission;
  }

  private suggestAffiliateProgram(mod: any): { program: string; name: string; description: string } {
    const title = mod.title?.toLowerCase() || '';
    const contentType = mod.contentType?.toLowerCase() || '';

    if (title.includes('patreon') || title.includes('early access')) {
      return {
        program: 'patreon',
        name: 'Patreon',
        description: 'Link to creator Patreon for early access or exclusive content',
      };
    }

    if (contentType.includes('script') || contentType.includes('gameplay')) {
      return {
        program: 'curseforge',
        name: 'CurseForge',
        description: 'Link to CurseForge for mod downloads',
      };
    }

    return {
      program: 'simsResource',
      name: 'The Sims Resource',
      description: 'Link to TSR for premium CC downloads',
    };
  }
}
```

---

## Script: `scripts/scan-affiliate-opportunities.ts`

```typescript
import { AffiliateDetector } from '../lib/services/affiliateDetector';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Scanning for affiliate opportunities...');

  const startTime = Date.now();
  const detector = new AffiliateDetector();

  const agentRun = await prisma.agentRun.create({
    data: {
      runType: 'opportunity_scan',
      status: 'running',
    },
  });

  try {
    const opportunities = await detector.scanForOpportunities();

    // Store opportunities in database
    let created = 0;
    for (const opp of opportunities) {
      // Check if similar opportunity already exists
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
            status: 'pending',
          },
        });

        // Create associated actions
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
        logSummary: `Found ${opportunities.length} opportunities, created ${created} new`,
      },
    });

    console.log(`Found ${opportunities.length} opportunities, created ${created} new in ${durationMs}ms`);
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

    console.error('Affiliate scan failed:', error);
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
    "agent:scan-affiliates": "npx tsx scripts/scan-affiliate-opportunities.ts"
  }
}
```

---

## Validation Criteria

- [ ] Detects pages with high traffic but no affiliate clicks
- [ ] Identifies buyer intent from content
- [ ] Analyzes traffic source composition
- [ ] Creates MonetizationOpportunity records
- [ ] Creates associated MonetizationAction records
- [ ] Deduplicates existing opportunities
- [ ] `npm run agent:scan-affiliates` works

---

## Next Steps
After completing this PRD:
- **PRD-05**: RPM Analysis Engine
- **PRD-06**: Revenue Forecasting
