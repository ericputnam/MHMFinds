/**
 * Notification Service (PRD-19)
 *
 * Central coordinator for all notification channels.
 * Handles routing, batching, and preference checking.
 */

import { prisma } from '@/lib/prisma';
import { slackNotifier } from './slackNotifier';
import { emailNotifier } from './emailNotifier';
import { notificationQueue, NotificationPayload } from './notificationQueue';
import { AgentRunStatus } from '@prisma/client';

// Event types for notifications
export type NotificationEvent =
  | 'opportunity_detected'
  | 'opportunity_approved'
  | 'opportunity_rejected'
  | 'run_complete'
  | 'run_failed'
  | 'execution_success'
  | 'execution_failed'
  | 'critical_error'
  | 'circuit_breaker_tripped'
  | 'daily_digest'
  | 'weekly_report';

// Notification data types
interface OpportunityNotification {
  id: string;
  title: string;
  opportunityType: string;
  estimatedRevenueImpact: number | null;
  confidence: number;
  pageUrl: string | null;
}

interface RunNotification {
  runType: string;
  status: AgentRunStatus;
  duration: number;
  itemsProcessed: number;
  opportunitiesFound: number;
  errorsEncountered: number;
  logSummary: string | null;
}

interface ExecutionNotification {
  actionId: string;
  actionType: string;
  success: boolean;
  error?: string;
}

/**
 * NotificationService class - coordinates all notifications
 */
export class NotificationService {
  /**
   * Notify about new high-impact opportunities
   */
  async notifyOpportunities(opportunities: OpportunityNotification[]): Promise<void> {
    if (opportunities.length === 0) return;

    // Check minimum impact threshold
    const highImpactThreshold = 50; // $50/mo
    const highImpactOpps = opportunities.filter(
      o => (o.estimatedRevenueImpact ?? 0) >= highImpactThreshold
    );

    if (highImpactOpps.length === 0) {
      // Queue for batch notification
      for (const opp of opportunities) {
        notificationQueue.add(
          {
            type: 'opportunity',
            priority: 'standard',
            title: opp.title,
            body: `${opp.opportunityType}: +$${(opp.estimatedRevenueImpact ?? 0).toFixed(2)}/mo`,
            metadata: { opportunityId: opp.id },
            addedAt: new Date(),
          },
          'opportunities_standard'
        );
      }
      return;
    }

    // High-impact opportunities get immediate notification
    await slackNotifier.sendOpportunityAlert(highImpactOpps);
  }

  /**
   * Notify about agent run completion
   */
  async notifyRunComplete(run: RunNotification): Promise<void> {
    // Only notify on failures or successful full runs
    if (run.status === 'FAILED') {
      await slackNotifier.sendRunResult(run);
    } else if (run.runType === 'FULL' && run.opportunitiesFound > 0) {
      await slackNotifier.sendRunResult(run);
    }
  }

  /**
   * Notify about execution result
   */
  async notifyExecutionResult(execution: ExecutionNotification): Promise<void> {
    if (!execution.success) {
      // Queue execution failures for batch
      notificationQueue.add(
        {
          type: 'execution',
          priority: 'standard',
          title: `Execution failed: ${execution.actionType}`,
          body: execution.error || 'Unknown error',
          metadata: { actionId: execution.actionId },
          addedAt: new Date(),
        },
        'executions_failed'
      );
    }
  }

  /**
   * Send critical error notification immediately
   */
  async notifyCriticalError(error: Error | string, context: string): Promise<void> {
    await slackNotifier.sendCriticalError(error, context);
  }

  /**
   * Notify about circuit breaker status change
   */
  async notifyCircuitBreaker(status: 'opened' | 'closed'): Promise<void> {
    const message = status === 'opened'
      ? '🚨 Circuit breaker OPENED - Auto-execution paused due to high failure rate'
      : '✅ Circuit breaker closed - Auto-execution resumed';

    await slackNotifier.sendText(message);
  }

  /**
   * Flush batched notifications
   */
  async flushBatchedNotifications(): Promise<void> {
    const expiredBatches = notificationQueue.flushExpired();
    const entries = Array.from(expiredBatches.entries());

    for (const [batchKey, batch] of entries) {
      if (batch.length === 0) continue;

      if (batchKey === 'opportunities_standard') {
        // Consolidate opportunity notifications
        const opportunities = batch
          .filter((n: NotificationPayload) => n.metadata?.opportunityId)
          .map((n: NotificationPayload) => ({
            id: n.metadata!.opportunityId as string,
            title: n.title,
            opportunityType: n.body.split(':')[0] || 'UNKNOWN',
            estimatedRevenueImpact: parseFloat(n.body.match(/\$(\d+\.?\d*)/)?.[1] || '0'),
            confidence: 0.5,
            pageUrl: null,
          }));

        if (opportunities.length > 0) {
          await slackNotifier.sendOpportunityAlert(opportunities);
        }
      } else if (batchKey === 'executions_failed') {
        // Consolidate execution failure notifications
        const message = batch.length === 1
          ? `Execution failed: ${batch[0].title}\n${batch[0].body}`
          : `${batch.length} execution failures:\n${batch.map((b: NotificationPayload) => `• ${b.title}`).join('\n')}`;

        await slackNotifier.sendText(message);
      }
    }
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(recipientEmail: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get stats for yesterday
    const [newOpps, approvedOpps, rejectedOpps, implementedOpps] = await Promise.all([
      prisma.monetizationOpportunity.count({
        where: { createdAt: { gte: yesterday, lt: today } },
      }),
      prisma.monetizationOpportunity.count({
        where: { approvedAt: { gte: yesterday, lt: today } },
      }),
      prisma.monetizationOpportunity.count({
        where: { rejectedAt: { gte: yesterday, lt: today } },
      }),
      prisma.monetizationOpportunity.count({
        where: { implementedAt: { gte: yesterday, lt: today } },
      }),
    ]);

    // Get total estimated impact
    const impactSum = await prisma.monetizationOpportunity.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
      _sum: { estimatedRevenueImpact: true },
    });

    // Get top opportunities
    const topOpportunities = await prisma.monetizationOpportunity.findMany({
      where: { createdAt: { gte: yesterday, lt: today } },
      orderBy: { estimatedRevenueImpact: 'desc' },
      take: 5,
      select: {
        title: true,
        opportunityType: true,
        estimatedRevenueImpact: true,
      },
    });

    await emailNotifier.sendDailyDigest(recipientEmail, {
      date: yesterday,
      newOpportunities: newOpps,
      approvedOpportunities: approvedOpps,
      rejectedOpportunities: rejectedOpps,
      implementedOpportunities: implementedOpps,
      totalEstimatedImpact: Number(impactSum._sum.estimatedRevenueImpact ?? 0),
      actualRevenueToday: null, // Would need actual revenue data
      topOpportunities: topOpportunities.map(o => ({
        title: o.title,
        type: o.opportunityType,
        estimatedImpact: Number(o.estimatedRevenueImpact ?? 0),
      })),
    });
  }

  /**
   * Send weekly report
   */
  async sendWeeklyReport(recipientEmail: string): Promise<void> {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setHours(0, 0, 0, 0);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get weekly stats
    const [totalOpps, implementedOpps] = await Promise.all([
      prisma.monetizationOpportunity.count({
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
      }),
      prisma.monetizationOpportunity.count({
        where: { implementedAt: { gte: weekStart, lt: weekEnd } },
      }),
    ]);

    const impactSum = await prisma.monetizationOpportunity.aggregate({
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
      _sum: { estimatedRevenueImpact: true },
    });

    // Get daily breakdown
    const byDayBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [dayOpps, dayImplemented] = await Promise.all([
        prisma.monetizationOpportunity.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.monetizationOpportunity.count({
          where: { implementedAt: { gte: dayStart, lt: dayEnd } },
        }),
      ]);

      byDayBreakdown.push({
        date: dayStart,
        opportunities: dayOpps,
        implemented: dayImplemented,
      });
    }

    // Get top performing action types
    const actionStats = await prisma.monetizationAction.groupBy({
      by: ['actionType'],
      where: {
        executedAt: { gte: weekStart, lt: weekEnd },
        status: 'EXECUTED',
      },
      _count: true,
      _sum: { measuredImpact: true },
    });

    await emailNotifier.sendWeeklyReport(recipientEmail, {
      weekStart,
      weekEnd,
      totalOpportunities: totalOpps,
      implementedCount: implementedOpps,
      totalEstimatedImpact: Number(impactSum._sum.estimatedRevenueImpact ?? 0),
      actualRevenue: null,
      predictionAccuracy: null,
      topPerformingActions: actionStats.map(a => ({
        type: a.actionType,
        count: a._count,
        totalImpact: Number(a._sum.measuredImpact ?? 0),
      })),
      byDayBreakdown,
    });
  }

  /**
   * Check if user has notifications enabled for an event
   */
  async checkUserPreferences(userId: string, event: NotificationEvent): Promise<{
    slack: boolean;
    email: boolean;
  }> {
    const prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Default: all enabled
      return { slack: true, email: true };
    }

    // Check quiet hours
    const now = new Date();
    const currentHour = now.getHours();
    if (prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null) {
      if (prefs.quietHoursStart < prefs.quietHoursEnd) {
        // Simple range (e.g., 22:00 to 08:00 doesn't wrap)
        if (currentHour >= prefs.quietHoursStart && currentHour < prefs.quietHoursEnd) {
          return { slack: false, email: false };
        }
      } else {
        // Wraps around midnight (e.g., 22:00 to 08:00)
        if (currentHour >= prefs.quietHoursStart || currentHour < prefs.quietHoursEnd) {
          return { slack: false, email: false };
        }
      }
    }

    // Check event type preferences
    const isEnabled = (eventType: NotificationEvent): boolean => {
      switch (eventType) {
        case 'critical_error':
        case 'circuit_breaker_tripped':
          return prefs.criticalAlerts;
        case 'opportunity_detected':
        case 'opportunity_approved':
        case 'opportunity_rejected':
          return prefs.opportunityAlerts;
        case 'execution_success':
        case 'execution_failed':
        case 'run_complete':
        case 'run_failed':
          return prefs.executionAlerts;
        case 'daily_digest':
        case 'weekly_report':
          return prefs.digestAlerts;
        default:
          return true;
      }
    };

    return {
      slack: prefs.slackEnabled && isEnabled(event),
      email: prefs.emailEnabled && isEnabled(event),
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
