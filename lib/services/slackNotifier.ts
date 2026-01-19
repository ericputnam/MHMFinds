/**
 * Slack Notification Service (PRD-19)
 *
 * Sends real-time alerts to Slack for monetization agent events.
 */

import { prisma } from '@/lib/prisma';
import { AgentRunStatus } from '@prisma/client';

// Slack block types
interface TextBlock {
  type: 'section' | 'header' | 'divider' | 'context';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
  fields?: { type: 'mrkdwn' | 'plain_text'; text: string }[];
  elements?: { type: 'mrkdwn' | 'plain_text'; text: string }[];
}

interface SlackMessage {
  text: string;
  blocks?: TextBlock[];
}

// Opportunity for alerts
interface OpportunityAlert {
  id: string;
  title: string;
  opportunityType: string;
  estimatedRevenueImpact: number | null;
  confidence: number;
  pageUrl: string | null;
}

// Agent run result for notifications
interface RunResult {
  runType: string;
  status: AgentRunStatus;
  duration: number;
  itemsProcessed: number;
  opportunitiesFound: number;
  errorsEncountered: number;
  logSummary: string | null;
}

/**
 * SlackNotifier class - sends Slack notifications
 */
export class SlackNotifier {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
  }

  /**
   * Check if Slack is configured
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Send a message to Slack
   */
  async send(message: SlackMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      console.log('[SlackNotifier] Not configured - skipping notification');
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('[SlackNotifier] Failed to send:', response.status, await response.text());
        return false;
      }

      // Log the notification
      await this.logNotification('slack', 'sent', message.text, true);

      return true;
    } catch (error) {
      console.error('[SlackNotifier] Error:', error);
      await this.logNotification('slack', 'error', message.text, false, String(error));
      return false;
    }
  }

  /**
   * Format opportunity alert for Slack
   */
  formatOpportunityAlert(opportunities: OpportunityAlert[]): SlackMessage {
    const totalImpact = opportunities.reduce((sum, o) => sum + (o.estimatedRevenueImpact ?? 0), 0);
    const highPriority = opportunities.filter(o => (o.estimatedRevenueImpact ?? 0) > 50);

    const blocks: TextBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `💰 ${opportunities.length} New Monetization Opportunities`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Est. Impact:*\n$${totalImpact.toFixed(2)}/mo`,
          },
          {
            type: 'mrkdwn',
            text: `*High Priority:*\n${highPriority.length} (>$50/mo)`,
          },
        ],
      },
      { type: 'divider' },
    ];

    // Add top opportunities (max 5)
    const topOpps = opportunities
      .sort((a, b) => (b.estimatedRevenueImpact ?? 0) - (a.estimatedRevenueImpact ?? 0))
      .slice(0, 5);

    for (const opp of topOpps) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${opp.title}*\n${opp.opportunityType.replace(/_/g, ' ')} • ${Math.round(opp.confidence * 100)}% confidence`,
        },
        fields: [
          {
            type: 'mrkdwn',
            text: `*Impact:* +$${(opp.estimatedRevenueImpact ?? 0).toFixed(2)}/mo`,
          },
        ],
      });
    }

    if (opportunities.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `+${opportunities.length - 5} more opportunities`,
          },
        ],
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '<https://yourdomain.com/admin/monetization/queue|View Queue →>',
      },
    });

    return {
      text: `${opportunities.length} new monetization opportunities detected ($${totalImpact.toFixed(2)}/mo est.)`,
      blocks,
    };
  }

  /**
   * Format agent run result for Slack
   */
  formatRunResult(run: RunResult): SlackMessage {
    const statusEmoji = run.status === 'COMPLETED' ? '✅' : '❌';
    const durationStr = this.formatDuration(run.duration);

    const blocks: TextBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Agent Run: ${run.runType}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${run.status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${durationStr}`,
          },
          {
            type: 'mrkdwn',
            text: `*Processed:*\n${run.itemsProcessed} items`,
          },
          {
            type: 'mrkdwn',
            text: `*Found:*\n${run.opportunitiesFound} opportunities`,
          },
        ],
      },
    ];

    if (run.errorsEncountered > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *Errors:* ${run.errorsEncountered}`,
        },
      });
    }

    if (run.logSummary) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: run.logSummary,
          },
        ],
      });
    }

    return {
      text: `Agent ${run.runType} ${run.status.toLowerCase()} - ${run.opportunitiesFound} opportunities found`,
      blocks,
    };
  }

  /**
   * Format critical error for Slack
   */
  formatCriticalError(error: Error | string, context: string): SlackMessage {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    const blocks: TextBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Critical Error',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Context:* ${context}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n\`\`\`${errorMessage}\`\`\``,
        },
      },
    ];

    if (errorStack) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Stack: ${errorStack.slice(0, 500)}...`,
          },
        ],
      });
    }

    return {
      text: `🚨 Critical Error in ${context}: ${errorMessage}`,
      blocks,
    };
  }

  /**
   * Send a simple text notification
   */
  async sendText(text: string): Promise<boolean> {
    return this.send({ text });
  }

  /**
   * Send opportunity alert
   */
  async sendOpportunityAlert(opportunities: OpportunityAlert[]): Promise<boolean> {
    if (opportunities.length === 0) return true;

    const message = this.formatOpportunityAlert(opportunities);
    return this.send(message);
  }

  /**
   * Send run result notification
   */
  async sendRunResult(run: RunResult): Promise<boolean> {
    const message = this.formatRunResult(run);
    return this.send(message);
  }

  /**
   * Send critical error notification
   */
  async sendCriticalError(error: Error | string, context: string): Promise<boolean> {
    const message = this.formatCriticalError(error, context);
    return this.send(message);
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    channel: string,
    event: string,
    subject: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          type: 'standard',
          channel,
          event,
          subject,
          body: '',
          success,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('[SlackNotifier] Failed to log notification:', error);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

// Export singleton instance
export const slackNotifier = new SlackNotifier();
