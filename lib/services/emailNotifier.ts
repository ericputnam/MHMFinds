/**
 * Email Notification Service (PRD-19)
 *
 * Sends email notifications for digests and reports.
 * Uses SendGrid if configured, otherwise logs to console.
 */

import { prisma } from '@/lib/prisma';

// Daily digest stats
interface DailyDigestStats {
  date: Date;
  newOpportunities: number;
  approvedOpportunities: number;
  rejectedOpportunities: number;
  implementedOpportunities: number;
  totalEstimatedImpact: number;
  actualRevenueToday: number | null;
  topOpportunities: {
    title: string;
    type: string;
    estimatedImpact: number;
  }[];
}

// Weekly report stats
interface WeeklyReportStats {
  weekStart: Date;
  weekEnd: Date;
  totalOpportunities: number;
  implementedCount: number;
  totalEstimatedImpact: number;
  actualRevenue: number | null;
  predictionAccuracy: number | null;
  topPerformingActions: {
    type: string;
    count: number;
    totalImpact: number;
  }[];
  byDayBreakdown: {
    date: Date;
    opportunities: number;
    implemented: number;
  }[];
}

/**
 * EmailNotifier class - sends email notifications
 */
export class EmailNotifier {
  private sendgridApiKey: string | undefined;
  private fromEmail: string;

  constructor() {
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'noreply@musthavemods.com';
  }

  /**
   * Check if email is configured
   */
  isConfigured(): boolean {
    return !!this.sendgridApiKey;
  }

  /**
   * Send an email
   */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.sendgridApiKey) {
      console.log(`[EmailNotifier] Not configured - would send to ${to}:`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body preview: ${html.slice(0, 200)}...`);
      return false;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sendgridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.fromEmail, name: 'MustHaveMods Agent' },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailNotifier] SendGrid error:', response.status, errorText);
        await this.logNotification('email', 'send_failed', to, subject, html, false, errorText);
        return false;
      }

      await this.logNotification('email', 'sent', to, subject, html, true);
      return true;
    } catch (error) {
      console.error('[EmailNotifier] Error:', error);
      await this.logNotification('email', 'error', to, subject, html, false, String(error));
      return false;
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(to: string, stats: DailyDigestStats): Promise<boolean> {
    const subject = `Daily Monetization Digest - ${stats.date.toLocaleDateString()}`;
    const html = this.buildDailyDigestHtml(stats);
    return this.send(to, subject, html);
  }

  /**
   * Send weekly report email
   */
  async sendWeeklyReport(to: string, stats: WeeklyReportStats): Promise<boolean> {
    const subject = `Weekly Monetization Report - Week of ${stats.weekStart.toLocaleDateString()}`;
    const html = this.buildWeeklyReportHtml(stats);
    return this.send(to, subject, html);
  }

  /**
   * Build HTML for daily digest
   */
  private buildDailyDigestHtml(stats: DailyDigestStats): string {
    const opportunityRows = stats.topOpportunities
      .map(o => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.title}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.type.replace(/_/g, ' ')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #10b981;">+$${o.estimatedImpact.toFixed(2)}</td>
        </tr>
      `)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px;">Daily Monetization Digest</h1>
    <p style="color: #6b7280; margin: 0 0 24px 0;">${stats.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${stats.newOpportunities}</div>
        <div style="color: #166534; font-size: 14px;">New Opportunities</div>
      </div>
      <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #059669;">+$${stats.totalEstimatedImpact.toFixed(2)}</div>
        <div style="color: #065f46; font-size: 14px;">Est. Impact/mo</div>
      </div>
      <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${stats.approvedOpportunities}</div>
        <div style="color: #1e40af; font-size: 14px;">Approved</div>
      </div>
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #d97706;">${stats.implementedOpportunities}</div>
        <div style="color: #92400e; font-size: 14px;">Implemented</div>
      </div>
    </div>

    ${stats.topOpportunities.length > 0 ? `
    <h2 style="color: #374151; font-size: 18px; margin: 24px 0 16px 0;">Top Opportunities</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Title</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Type</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Impact</th>
        </tr>
      </thead>
      <tbody>
        ${opportunityRows}
      </tbody>
    </table>
    ` : ''}

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
      <a href="https://yourdomain.com/admin/monetization" style="display: inline-block; background-color: #ec4899; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">View Dashboard</a>
    </div>
  </div>

  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
    MustHaveMods Monetization Agent • <a href="https://yourdomain.com/admin/monetization/settings" style="color: #9ca3af;">Manage notifications</a>
  </p>
</body>
</html>
    `;
  }

  /**
   * Build HTML for weekly report
   */
  private buildWeeklyReportHtml(stats: WeeklyReportStats): string {
    const dayRows = stats.byDayBreakdown
      .map(d => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.opportunities}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.implemented}</td>
        </tr>
      `)
      .join('');

    const actionRows = stats.topPerformingActions
      .map(a => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.type.replace(/_/g, ' ')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${a.count}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #10b981;">+$${a.totalImpact.toFixed(2)}</td>
        </tr>
      `)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px;">Weekly Monetization Report</h1>
    <p style="color: #6b7280; margin: 0 0 24px 0;">
      ${stats.weekStart.toLocaleDateString()} - ${stats.weekEnd.toLocaleDateString()}
    </p>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${stats.totalOpportunities}</div>
        <div style="color: #166534; font-size: 14px;">Total Opportunities</div>
      </div>
      <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #059669;">+$${stats.totalEstimatedImpact.toFixed(2)}</div>
        <div style="color: #065f46; font-size: 14px;">Est. Impact/mo</div>
      </div>
      <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${stats.implementedCount}</div>
        <div style="color: #1e40af; font-size: 14px;">Implemented</div>
      </div>
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px;">
        <div style="font-size: 28px; font-weight: bold; color: #d97706;">${stats.predictionAccuracy ? `${Math.round(stats.predictionAccuracy * 100)}%` : 'N/A'}</div>
        <div style="color: #92400e; font-size: 14px;">Prediction Accuracy</div>
      </div>
    </div>

    ${stats.byDayBreakdown.length > 0 ? `
    <h2 style="color: #374151; font-size: 18px; margin: 24px 0 16px 0;">Daily Breakdown</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Day</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Opportunities</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Implemented</th>
        </tr>
      </thead>
      <tbody>
        ${dayRows}
      </tbody>
    </table>
    ` : ''}

    ${stats.topPerformingActions.length > 0 ? `
    <h2 style="color: #374151; font-size: 18px; margin: 24px 0 16px 0;">Top Performing Actions</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Action Type</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Count</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Impact</th>
        </tr>
      </thead>
      <tbody>
        ${actionRows}
      </tbody>
    </table>
    ` : ''}

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
      <a href="https://yourdomain.com/admin/monetization" style="display: inline-block; background-color: #ec4899; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">View Full Dashboard</a>
    </div>
  </div>

  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
    MustHaveMods Monetization Agent • <a href="https://yourdomain.com/admin/monetization/settings" style="color: #9ca3af;">Manage notifications</a>
  </p>
</body>
</html>
    `;
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    channel: string,
    event: string,
    recipientEmail: string,
    subject: string,
    body: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          type: 'digest',
          channel,
          event,
          subject,
          body,
          success,
          errorMessage,
          metadata: { recipientEmail },
        },
      });
    } catch (error) {
      console.error('[EmailNotifier] Failed to log notification:', error);
    }
  }
}

// Export singleton instance
export const emailNotifier = new EmailNotifier();
