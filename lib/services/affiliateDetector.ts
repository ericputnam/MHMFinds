/**
 * Affiliate Opportunity Detection
 *
 * AI-powered system to detect affiliate monetization opportunities.
 * Analyzes traffic patterns, content, and user intent to find high-value pages.
 */

import { prisma } from '@/lib/prisma';
import {
  actionQueue,
  CreateOpportunityInput,
} from '@/lib/services/actionQueue';
import { agentLearning } from '@/lib/services/agentLearning';
import { OpportunityType, ActionType, AgentRunType, Prisma } from '@prisma/client';

// Buyer intent keywords for Sims 4 content
const BUYER_INTENT_KEYWORDS = [
  // Premium content indicators
  'patreon',
  'exclusive',
  'premium',
  'early access',
  'supporter',
  // Purchase-related
  'download',
  'get it',
  'grab it',
  'snag it',
  'available now',
  // Quality indicators
  'maxis match',
  'alpha cc',
  'high quality',
  'hq',
  'detailed',
  // Collection/bundle indicators
  'collection',
  'bundle',
  'pack',
  'set',
  'complete',
  // Creator support
  'support',
  'tip jar',
  'ko-fi',
  'buy me a coffee',
];

// Affiliate program configurations
const AFFILIATE_PROGRAMS = {
  patreon: {
    name: 'Patreon',
    commission: 0.08,
    recurring: true,
    urlPattern: 'patreon.com',
  },
  curseforge: {
    name: 'CurseForge',
    commission: 0.05,
    recurring: false,
    urlPattern: 'curseforge.com',
  },
  amazon: {
    name: 'Amazon',
    commission: 0.04,
    recurring: false,
    urlPattern: 'amazon.com',
  },
  tsr: {
    name: 'The Sims Resource',
    commission: 0.10,
    recurring: false,
    urlPattern: 'thesimsresource.com',
  },
};

// Opportunity detection result
interface DetectedOpportunity {
  type: OpportunityType;
  title: string;
  description: string;
  pageUrl: string;
  modId?: string;
  confidence: number;
  estimatedImpact: number;
  priority: number;
  suggestedAction: {
    type: ActionType;
    data: Prisma.InputJsonValue;
  };
}

/**
 * AffiliateDetector class - finds affiliate monetization opportunities
 */
export class AffiliateDetector {
  /**
   * Run all detection methods and create opportunities
   */
  async scanForOpportunities(): Promise<number> {
    // Create agent run record
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.AFFILIATE_SCAN,
        status: 'RUNNING',
      },
    });

    try {
      const opportunities: DetectedOpportunity[] = [];

      // Run all detection methods
      const [
        noAffiliatePages,
        buyerIntentPages,
        trafficMismatches,
        unmonetizedCollections,
      ] = await Promise.all([
        this.findPagesWithoutAffiliates(),
        this.findBuyerIntentPages(),
        this.findTrafficSourceMismatches(),
        this.findUnmonetizedCollections(),
      ]);

      opportunities.push(...noAffiliatePages);
      opportunities.push(...buyerIntentPages);
      opportunities.push(...trafficMismatches);
      opportunities.push(...unmonetizedCollections);

      // Deduplicate by pageUrl and keep highest confidence
      const dedupedMap = new Map<string, DetectedOpportunity>();
      for (const opp of opportunities) {
        const existing = dedupedMap.get(opp.pageUrl);
        if (!existing || opp.confidence > existing.confidence) {
          dedupedMap.set(opp.pageUrl, opp);
        }
      }

      // Create opportunities in the queue
      let createdCount = 0;
      for (const opp of Array.from(dedupedMap.values())) {
        await this.createOpportunity(opp);
        createdCount++;
      }

      // Update agent run
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: opportunities.length,
          opportunitiesFound: createdCount,
          logSummary: `Scanned ${opportunities.length} potential opportunities, created ${createdCount}`,
        },
      });

      return createdCount;
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
    }
  }

  /**
   * Find high-traffic pages with no affiliate clicks
   */
  async findPagesWithoutAffiliates(): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    // Get pages with high traffic but no affiliate clicks in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl'],
      where: {
        metricDate: { gte: thirtyDaysAgo },
        pageType: 'mod',
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
    });

    for (const metric of metrics) {
      const totalPv = metric._sum.pageviews ?? 0;
      const totalClicks = metric._sum.affiliateClicks ?? 0;

      // Only target pages with significant traffic but no/low affiliate activity
      if (totalPv >= 100 && totalClicks < 5) {
        // Extract mod ID from URL
        const modIdMatch = metric.pageUrl.match(/\/mods\/([^/]+)/);
        const modId = modIdMatch?.[1];

        // Get mod info if available
        let modTitle = metric.pageUrl;
        if (modId) {
          const mod = await prisma.mod.findUnique({
            where: { id: modId },
            select: { title: true, author: true, source: true },
          });
          if (mod) {
            modTitle = mod.title;
          }
        }

        // Use learning-adjusted estimate
        const { estimate: estimatedImpact, learningApplied, adjustmentFactor } =
          await this.estimateAffiliateRevenueWithLearning(totalPv, ActionType.ADD_AFFILIATE_LINK);

        const learningNote = learningApplied
          ? ` (estimate adjusted ${adjustmentFactor.toFixed(2)}x based on historical accuracy)`
          : '';

        opportunities.push({
          type: OpportunityType.AFFILIATE_PLACEMENT,
          title: `Add affiliate links to "${modTitle}"`,
          description: `This page has ${totalPv} pageviews in the last 30 days but only ${totalClicks} affiliate clicks. Adding strategic affiliate links could generate ~$${estimatedImpact.toFixed(2)}/month.${learningNote}`,
          pageUrl: metric.pageUrl,
          modId,
          confidence: Math.min(0.9, 0.5 + (totalPv / 1000) * 0.1),
          estimatedImpact,
          priority: Math.min(10, Math.ceil(totalPv / 100)),
          suggestedAction: {
            type: ActionType.ADD_AFFILIATE_LINK,
            data: {
              targetPrograms: ['patreon', 'curseforge'],
              placementType: 'inline',
              reason: 'High traffic, low affiliate engagement',
              learningApplied,
              adjustmentFactor,
            },
          },
        });
      }
    }

    return opportunities;
  }

  /**
   * Find pages with buyer intent keywords
   */
  async findBuyerIntentPages(): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    // Get mod pages that might have buyer intent
    const mods = await prisma.mod.findMany({
      where: {
        OR: [
          { source: { contains: 'patreon', mode: 'insensitive' } },
          { author: { contains: 'patreon', mode: 'insensitive' } },
          { isFree: false },
          {
            description: {
              contains: 'exclusive',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'premium',
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        source: true,
        sourceUrl: true,
        author: true,
        isFree: true,
      },
      take: 100,
    });

    for (const mod of mods) {
      const pageUrl = `/mods/${mod.id}`;

      // Check if this page already has good affiliate performance
      const recentMetrics = await prisma.monetizationMetric.aggregate({
        where: {
          pageUrl,
          metricDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          pageviews: true,
          affiliateClicks: true,
        },
      });

      const clicks = recentMetrics._sum.affiliateClicks ?? 0;
      const views = recentMetrics._sum.pageviews ?? 0;

      // Skip if already has good conversion
      if (views > 0 && clicks / views > 0.05) continue;

      // Count buyer intent indicators
      const text =
        `${mod.title} ${mod.description ?? ''} ${mod.source}`.toLowerCase();
      const intentScore = BUYER_INTENT_KEYWORDS.filter((kw) =>
        text.includes(kw)
      ).length;

      if (intentScore >= 2) {
        // Use learning-adjusted estimate
        const { estimate: estimatedImpact, learningApplied, adjustmentFactor } =
          await this.estimateAffiliateRevenueWithLearning(views || 50, ActionType.ADD_AFFILIATE_LINK);

        const learningNote = learningApplied
          ? ` Estimate adjusted ${adjustmentFactor.toFixed(2)}x based on historical data.`
          : '';

        opportunities.push({
          type: OpportunityType.AFFILIATE_PLACEMENT,
          title: `Optimize affiliate placement for "${mod.title}"`,
          description: `This mod shows ${intentScore} buyer intent signals (premium content, patreon, etc.). Better affiliate placement could improve conversion.${learningNote}`,
          pageUrl,
          modId: mod.id,
          confidence: Math.min(0.85, 0.4 + intentScore * 0.1),
          estimatedImpact,
          priority: Math.min(8, intentScore + 3),
          suggestedAction: {
            type: ActionType.ADD_AFFILIATE_LINK,
            data: {
              targetPrograms: this.suggestAffiliatePrograms(mod),
              placementType: 'prominent',
              reason: 'High buyer intent content',
              intentIndicators: BUYER_INTENT_KEYWORDS.filter((kw) =>
                text.includes(kw)
              ),
              learningApplied,
              adjustmentFactor,
            },
          },
        });
      }
    }

    return opportunities;
  }

  /**
   * Find pages with traffic source mismatches (Pinterest traffic needs different optimization)
   */
  async findTrafficSourceMismatches(): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get pages with high Pinterest traffic
    const pinterestHeavyPages = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl'],
      where: {
        metricDate: { gte: thirtyDaysAgo },
        pageType: 'mod',
      },
      _sum: {
        trafficGoogle: true,
        trafficPinterest: true,
        pageviews: true,
        affiliateClicks: true,
      },
      having: {
        trafficPinterest: {
          _sum: {
            gt: 50,
          },
        },
      },
    });

    for (const page of pinterestHeavyPages) {
      const pinterestPct =
        ((page._sum.trafficPinterest ?? 0) /
          Math.max(1, page._sum.pageviews ?? 1)) *
        100;

      // Pages with >40% Pinterest traffic may need visual-focused optimization
      if (pinterestPct > 40) {
        const modIdMatch = page.pageUrl.match(/\/mods\/([^/]+)/);
        const modId = modIdMatch?.[1];

        let modTitle = page.pageUrl;
        if (modId) {
          const mod = await prisma.mod.findUnique({
            where: { id: modId },
            select: { title: true },
          });
          if (mod) modTitle = mod.title;
        }

        opportunities.push({
          type: OpportunityType.TRAFFIC_SOURCE_OPTIMIZATION,
          title: `Optimize "${modTitle}" for Pinterest traffic`,
          description: `${pinterestPct.toFixed(0)}% of traffic comes from Pinterest. Pinterest users respond better to visual affiliate placements and aesthetic-focused recommendations.`,
          pageUrl: page.pageUrl,
          modId,
          confidence: 0.7,
          estimatedImpact:
            this.estimateAffiliateRevenue(page._sum.pageviews ?? 0) * 0.3,
          priority: 6,
          suggestedAction: {
            type: ActionType.OPTIMIZE_SEO,
            data: {
              optimizationType: 'pinterest',
              suggestions: [
                'Add visually prominent affiliate buttons',
                'Include aesthetic/style-focused affiliate recommendations',
                'Consider collection-style layouts',
              ],
            },
          },
        });
      }
    }

    return opportunities;
  }

  /**
   * Find category/collection pages without affiliate monetization
   */
  async findUnmonetizedCollections(): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get category/search pages
    const categoryPages = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl'],
      where: {
        metricDate: { gte: thirtyDaysAgo },
        pageType: { in: ['category', 'search'] },
      },
      _sum: {
        pageviews: true,
        affiliateClicks: true,
      },
      having: {
        pageviews: {
          _sum: {
            gt: 200,
          },
        },
      },
    });

    for (const page of categoryPages) {
      const clickRate =
        (page._sum.affiliateClicks ?? 0) / Math.max(1, page._sum.pageviews ?? 1);

      // Low click rate on collection pages
      if (clickRate < 0.02) {
        const estimatedImpact =
          this.estimateAffiliateRevenue(page._sum.pageviews ?? 0) * 0.5;

        opportunities.push({
          type: OpportunityType.AFFILIATE_PLACEMENT,
          title: `Add affiliate recommendations to collection page`,
          description: `This collection/category page has ${page._sum.pageviews} pageviews but only ${(clickRate * 100).toFixed(1)}% click rate. Adding curated affiliate sections could improve monetization.`,
          pageUrl: page.pageUrl,
          confidence: 0.65,
          estimatedImpact,
          priority: 5,
          suggestedAction: {
            type: ActionType.CREATE_COLLECTION,
            data: {
              collectionType: 'affiliate_featured',
              placement: 'sidebar_or_banner',
              reason: 'High traffic collection page',
            },
          },
        });
      }
    }

    return opportunities;
  }

  /**
   * Estimate monthly affiliate revenue from pageviews
   * Uses historical learning data to adjust estimates
   */
  private async estimateAffiliateRevenueWithLearning(
    pageviews: number,
    actionType: ActionType = ActionType.ADD_AFFILIATE_LINK
  ): Promise<{ estimate: number; learningApplied: boolean; adjustmentFactor: number }> {
    // Base estimate using standard assumptions
    const baseEstimate = this.estimateAffiliateRevenue(pageviews);

    // Apply learning adjustment
    const { adjustedEstimate, adjustmentFactor, learningApplied } =
      await agentLearning.adjustEstimate(actionType, baseEstimate);

    return {
      estimate: adjustedEstimate,
      learningApplied,
      adjustmentFactor,
    };
  }

  /**
   * Estimate monthly affiliate revenue from pageviews (base calculation)
   */
  private estimateAffiliateRevenue(pageviews: number): number {
    // Assumptions:
    // - 3% click-through rate on affiliate links
    // - 5% conversion rate on clicks
    // - $20 average order value
    // - 7% average commission
    const ctr = 0.03;
    const conversionRate = 0.05;
    const aov = 20;
    const commission = 0.07;

    return pageviews * ctr * conversionRate * aov * commission;
  }

  /**
   * Suggest affiliate programs based on mod metadata
   */
  private suggestAffiliatePrograms(mod: {
    source: string;
    sourceUrl?: string | null;
    author?: string | null;
  }): string[] {
    const programs: string[] = [];
    const text =
      `${mod.source} ${mod.sourceUrl ?? ''} ${mod.author ?? ''}`.toLowerCase();

    if (text.includes('patreon')) programs.push('patreon');
    if (text.includes('curseforge')) programs.push('curseforge');
    if (text.includes('thesimsresource') || text.includes('tsr'))
      programs.push('tsr');

    // Default to common programs if none detected
    if (programs.length === 0) {
      programs.push('patreon', 'curseforge');
    }

    return programs;
  }

  /**
   * Create opportunity in the action queue
   */
  private async createOpportunity(opp: DetectedOpportunity): Promise<void> {
    const input: CreateOpportunityInput = {
      opportunityType: opp.type,
      title: opp.title,
      description: opp.description,
      priority: opp.priority,
      confidence: opp.confidence,
      pageUrl: opp.pageUrl,
      modId: opp.modId,
      estimatedRevenueImpact: opp.estimatedImpact,
      actions: [
        {
          actionType: opp.suggestedAction.type,
          actionData: opp.suggestedAction.data,
        },
      ],
    };

    await actionQueue.createOpportunity(input);
  }
}

// Export singleton instance
export const affiliateDetector = new AffiliateDetector();
