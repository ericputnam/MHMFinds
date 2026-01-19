/**
 * RPM Analysis Engine
 *
 * Identifies RPM optimization opportunities by analyzing page performance,
 * bounce rates, content quality, and traffic sources.
 */

import { prisma } from '@/lib/prisma';
import {
  actionQueue,
  CreateOpportunityInput,
} from '@/lib/services/actionQueue';
import { agentLearning } from '@/lib/services/agentLearning';
import { OpportunityType, ActionType, AgentRunType, Prisma } from '@prisma/client';

// Page performance data
interface PagePerformance {
  pageUrl: string;
  pageType: string | null;
  totalPageviews: number;
  totalRevenue: number;
  rpm: number;
  avgBounceRate: number;
  avgTimeOnPage: number;
  trafficGoogle: number;
  trafficPinterest: number;
  trafficDirect: number;
  trafficSocial: number;
  trafficOther: number;
}

// Detected RPM opportunity
interface RpmOpportunity {
  type: OpportunityType;
  title: string;
  description: string;
  pageUrl: string;
  confidence: number;
  estimatedImpact: number;
  priority: number;
  suggestedAction: {
    type: ActionType;
    data: Prisma.InputJsonValue;
  };
}

/**
 * RpmAnalyzer class - analyzes and optimizes RPM performance
 */
export class RpmAnalyzer {
  /**
   * Run all RPM analysis and create opportunities
   */
  async analyzeRpm(): Promise<number> {
    const run = await prisma.agentRun.create({
      data: {
        runType: AgentRunType.RPM_ANALYSIS,
        status: 'RUNNING',
      },
    });

    try {
      const opportunities: RpmOpportunity[] = [];

      // Run all analysis methods
      const [
        underperforming,
        highBounce,
        thinContent,
        trafficSource,
      ] = await Promise.all([
        this.findUnderperformingPages(),
        this.findHighBouncePages(),
        this.findThinContentPages(),
        this.analyzeTrafficSourceRpm(),
      ]);

      opportunities.push(...underperforming);
      opportunities.push(...highBounce);
      opportunities.push(...thinContent);
      opportunities.push(...trafficSource);

      // Deduplicate by pageUrl
      const dedupedMap = new Map<string, RpmOpportunity>();
      for (const opp of opportunities) {
        const existing = dedupedMap.get(opp.pageUrl);
        if (!existing || opp.estimatedImpact > existing.estimatedImpact) {
          dedupedMap.set(opp.pageUrl, opp);
        }
      }

      // Create opportunities
      let createdCount = 0;
      for (const opp of Array.from(dedupedMap.values())) {
        await this.createOpportunity(opp);
        createdCount++;
      }

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsProcessed: opportunities.length,
          opportunitiesFound: createdCount,
          logSummary: `RPM analysis: ${opportunities.length} potential, ${createdCount} created`,
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
   * Calculate site-wide average RPM
   */
  async calculateSiteAverageRpm(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totals = await prisma.monetizationMetric.aggregate({
      where: {
        metricDate: { gte: thirtyDaysAgo },
        pageviews: { gt: 0 },
      },
      _sum: {
        pageviews: true,
        adRevenue: true,
      },
    });

    const pageviews = totals._sum.pageviews ?? 0;
    const revenue = Number(totals._sum.adRevenue ?? 0);

    if (pageviews === 0) return 0;
    return (revenue / pageviews) * 1000;
  }

  /**
   * Get aggregated page performance for last 30 days
   */
  async getPagePerformance(): Promise<PagePerformance[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await prisma.monetizationMetric.groupBy({
      by: ['pageUrl', 'pageType'],
      where: {
        metricDate: { gte: thirtyDaysAgo },
      },
      _sum: {
        pageviews: true,
        adRevenue: true,
        trafficGoogle: true,
        trafficPinterest: true,
        trafficDirect: true,
        trafficSocial: true,
        trafficOther: true,
      },
      _avg: {
        bounceRate: true,
        avgTimeOnPage: true,
      },
    });

    return metrics.map((m) => {
      const pageviews = m._sum.pageviews ?? 0;
      const revenue = Number(m._sum.adRevenue ?? 0);
      const rpm = pageviews > 0 ? (revenue / pageviews) * 1000 : 0;

      return {
        pageUrl: m.pageUrl,
        pageType: m.pageType,
        totalPageviews: pageviews,
        totalRevenue: revenue,
        rpm,
        avgBounceRate: Number(m._avg.bounceRate ?? 0),
        avgTimeOnPage: Number(m._avg.avgTimeOnPage ?? 0),
        trafficGoogle: m._sum.trafficGoogle ?? 0,
        trafficPinterest: m._sum.trafficPinterest ?? 0,
        trafficDirect: m._sum.trafficDirect ?? 0,
        trafficSocial: m._sum.trafficSocial ?? 0,
        trafficOther: m._sum.trafficOther ?? 0,
      };
    });
  }

  /**
   * Find pages with RPM significantly below site average
   */
  async findUnderperformingPages(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];
    const siteAvgRpm = await this.calculateSiteAverageRpm();

    if (siteAvgRpm === 0) return opportunities;

    const pages = await this.getPagePerformance();

    // Filter to pages with significant traffic but low RPM
    const underperforming = pages.filter(
      (p) => p.totalPageviews >= 100 && p.rpm < siteAvgRpm * 0.7
    );

    // Sort by potential impact (pageviews * RPM gap)
    underperforming.sort((a, b) => {
      const impactA = a.totalPageviews * (siteAvgRpm - a.rpm);
      const impactB = b.totalPageviews * (siteAvgRpm - b.rpm);
      return impactB - impactA;
    });

    for (const page of underperforming.slice(0, 20)) {
      const rpmGap = siteAvgRpm - page.rpm;
      const baseEstimate = (page.totalPageviews * rpmGap) / 1000;

      // Apply learning adjustment
      const { adjustedEstimate, learningApplied, adjustmentFactor } =
        await agentLearning.adjustEstimate(ActionType.UPDATE_AD_PLACEMENT, baseEstimate);

      const learningNote = learningApplied
        ? ` (adjusted ${adjustmentFactor.toFixed(2)}x based on historical accuracy)`
        : '';

      opportunities.push({
        type: OpportunityType.AD_LAYOUT_OPTIMIZATION,
        title: `Optimize RPM for "${page.pageUrl}"`,
        description: `This page has RPM of $${page.rpm.toFixed(2)} vs site average of $${siteAvgRpm.toFixed(2)}. Optimizing could recover ~$${adjustedEstimate.toFixed(2)}/month.${learningNote}`,
        pageUrl: page.pageUrl,
        confidence: 0.75,
        estimatedImpact: adjustedEstimate,
        priority: Math.min(9, Math.ceil(adjustedEstimate / 10)),
        suggestedAction: {
          type: ActionType.UPDATE_AD_PLACEMENT,
          data: {
            currentRpm: page.rpm,
            targetRpm: siteAvgRpm,
            suggestions: [
              'Review ad placement density',
              'Consider sticky sidebar ads',
              'Test video ad units',
            ],
            learningApplied,
            adjustmentFactor,
          },
        },
      });
    }

    return opportunities;
  }

  /**
   * Find pages with high bounce rates (poor user experience)
   */
  async findHighBouncePages(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];
    const pages = await this.getPagePerformance();

    // Filter to pages with high traffic and high bounce rate
    const highBounce = pages.filter(
      (p) => p.totalPageviews >= 100 && p.avgBounceRate > 70
    );

    for (const page of highBounce.slice(0, 15)) {
      // High bounce = poor ad viewability
      const baseEstimate = page.totalRevenue * 0.2; // 20% improvement potential

      // Apply learning adjustment
      const { adjustedEstimate, learningApplied, adjustmentFactor } =
        await agentLearning.adjustEstimate(ActionType.EXPAND_CONTENT, baseEstimate);

      const learningNote = learningApplied
        ? ` (adjusted ${adjustmentFactor.toFixed(2)}x)`
        : '';

      opportunities.push({
        type: OpportunityType.CONTENT_EXPANSION,
        title: `Reduce bounce rate on "${page.pageUrl}"`,
        description: `This page has ${page.avgBounceRate.toFixed(0)}% bounce rate. High bounce hurts ad viewability and RPM. Improving engagement could increase revenue by ~$${adjustedEstimate.toFixed(2)}/month.${learningNote}`,
        pageUrl: page.pageUrl,
        confidence: 0.65,
        estimatedImpact: adjustedEstimate,
        priority: Math.min(7, Math.ceil(page.avgBounceRate / 15)),
        suggestedAction: {
          type: ActionType.EXPAND_CONTENT,
          data: {
            currentBounceRate: page.avgBounceRate,
            targetBounceRate: 50,
            suggestions: [
              'Add related content section',
              'Improve above-fold content',
              'Add internal navigation',
              'Check page load speed',
            ],
            learningApplied,
            adjustmentFactor,
          },
        },
      });
    }

    return opportunities;
  }

  /**
   * Find pages with thin content (low time on page)
   */
  async findThinContentPages(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];
    const pages = await this.getPagePerformance();

    // Filter to pages with traffic but very low time on page
    const thinContent = pages.filter(
      (p) =>
        p.totalPageviews >= 50 &&
        p.avgTimeOnPage < 30 && // Less than 30 seconds
        p.pageType === 'mod'
    );

    for (const page of thinContent.slice(0, 15)) {
      const baseEstimate = page.totalRevenue * 0.3; // Content expansion potential

      // Apply learning adjustment
      const { adjustedEstimate, learningApplied, adjustmentFactor } =
        await agentLearning.adjustEstimate(ActionType.EXPAND_CONTENT, baseEstimate);

      const learningNote = learningApplied
        ? ` (adjusted ${adjustmentFactor.toFixed(2)}x)`
        : '';

      opportunities.push({
        type: OpportunityType.CONTENT_EXPANSION,
        title: `Expand content on "${page.pageUrl}"`,
        description: `Users spend only ${page.avgTimeOnPage.toFixed(0)}s on this page. Thin content = fewer ad impressions. Expanding content could increase revenue by ~$${adjustedEstimate.toFixed(2)}/month.${learningNote}`,
        pageUrl: page.pageUrl,
        confidence: 0.6,
        estimatedImpact: adjustedEstimate,
        priority: 5,
        suggestedAction: {
          type: ActionType.EXPAND_CONTENT,
          data: {
            currentTimeOnPage: page.avgTimeOnPage,
            suggestions: [
              'Add detailed mod description',
              'Include installation guide',
              'Add related mods section',
              'Include user reviews/comments',
            ],
            learningApplied,
            adjustmentFactor,
          },
        },
      });
    }

    return opportunities;
  }

  /**
   * Analyze RPM by traffic source
   */
  async analyzeTrafficSourceRpm(): Promise<RpmOpportunity[]> {
    const opportunities: RpmOpportunity[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get aggregate metrics by traffic source
    const totals = await prisma.monetizationMetric.aggregate({
      where: {
        metricDate: { gte: thirtyDaysAgo },
      },
      _sum: {
        trafficGoogle: true,
        trafficPinterest: true,
        trafficDirect: true,
        trafficSocial: true,
        trafficOther: true,
        adRevenue: true,
        pageviews: true,
      },
    });

    // Note: We can't directly calculate RPM per traffic source without more granular data
    // This is a simplified analysis based on known traffic source behaviors

    const totalPv = totals._sum.pageviews ?? 0;
    const pinterestPct =
      ((totals._sum.trafficPinterest ?? 0) / Math.max(1, totalPv)) * 100;
    const googlePct =
      ((totals._sum.trafficGoogle ?? 0) / Math.max(1, totalPv)) * 100;

    // If Pinterest traffic is high, suggest Pinterest-specific optimizations
    if (pinterestPct > 30 && pinterestPct > googlePct) {
      opportunities.push({
        type: OpportunityType.TRAFFIC_SOURCE_OPTIMIZATION,
        title: 'Optimize for Pinterest traffic patterns',
        description: `${pinterestPct.toFixed(0)}% of traffic comes from Pinterest. Pinterest users have different engagement patterns - optimize for visual browsing and longer scroll sessions.`,
        pageUrl: '/_site_total',
        confidence: 0.7,
        estimatedImpact: Number(totals._sum.adRevenue ?? 0) * 0.1,
        priority: 6,
        suggestedAction: {
          type: ActionType.AB_TEST,
          data: {
            testType: 'traffic_source_layout',
            hypothesis:
              'Pinterest users prefer visual layouts with larger images',
            suggestions: [
              'Test larger thumbnail images',
              'Add Pinterest-style infinite scroll',
              'Optimize for mobile (Pinterest is mobile-heavy)',
            ],
          },
        },
      });
    }

    // If Google traffic dominates, suggest SEO-RPM optimizations
    if (googlePct > 50) {
      opportunities.push({
        type: OpportunityType.TRAFFIC_SOURCE_OPTIMIZATION,
        title: 'Optimize for Google search intent',
        description: `${googlePct.toFixed(0)}% of traffic comes from Google search. Search users have specific intent - optimize content to match and extend their journey.`,
        pageUrl: '/_site_total',
        confidence: 0.65,
        estimatedImpact: Number(totals._sum.adRevenue ?? 0) * 0.05,
        priority: 5,
        suggestedAction: {
          type: ActionType.OPTIMIZE_SEO,
          data: {
            optimizationType: 'search_intent',
            suggestions: [
              'Add related searches section',
              'Improve internal linking',
              'Add FAQ schema for featured snippets',
            ],
          },
        },
      });
    }

    return opportunities;
  }

  /**
   * Create opportunity in the action queue
   */
  private async createOpportunity(opp: RpmOpportunity): Promise<void> {
    const input: CreateOpportunityInput = {
      opportunityType: opp.type,
      title: opp.title,
      description: opp.description,
      priority: opp.priority,
      confidence: opp.confidence,
      pageUrl: opp.pageUrl,
      estimatedRevenueImpact: opp.estimatedImpact,
      estimatedRpmIncrease: opp.estimatedImpact * 0.1, // Rough estimate
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
export const rpmAnalyzer = new RpmAnalyzer();
