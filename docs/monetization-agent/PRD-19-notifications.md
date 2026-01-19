# PRD-19: Notifications System

## Overview
Implement a notification system that alerts administrators when the monetization agent detects opportunities, completes executions, encounters errors, or requires attention. Supports Slack and email channels.

## Priority: P2 (Enhancement)
## Dependencies: PRD-08 (Orchestrator), PRD-18 (Auto-Execution)
## Estimated Implementation: 1-2 days

---

## Problem Statement

Currently, administrators must manually check the admin dashboard to see:
- New opportunities requiring approval
- Agent run completions and failures
- Auto-execution results
- Revenue forecast changes

This creates delays in reviewing opportunities and responding to issues.

## Solution

Create a unified notification system that:
1. Sends real-time alerts via Slack webhook
2. Sends daily/weekly digest emails
3. Allows configuration of notification preferences
4. Throttles notifications to prevent spam

---

## Notification Types

### Critical (Immediate)

| Event | Channel | Frequency |
|-------|---------|-----------|
| Agent run failed | Slack + Email | Immediate |
| Circuit breaker triggered | Slack + Email | Immediate |
| High-impact opportunity (>$50/mo) | Slack | Immediate |
| Auto-execution failure rate >20% | Slack + Email | Immediate |

### Standard (Batched)

| Event | Channel | Frequency |
|-------|---------|-----------|
| New opportunities detected | Slack | Hourly batch |
| Auto-executions completed | Slack | Hourly batch |
| Daily summary | Email | Daily @ 9am |
| Weekly report | Email | Monday @ 9am |

### Low Priority (Digest Only)

| Event | Channel | Frequency |
|-------|---------|-----------|
| Forecast updated | Email | Weekly digest |
| Configuration changed | Email | Weekly digest |
| Low-impact opportunities | Email | Weekly digest |

---

## Database Schema

### Add NotificationPreferences model

```prisma
model NotificationPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  // Channel settings
  slackEnabled    Boolean  @default(true)
  emailEnabled    Boolean  @default(true)
  slackWebhook    String?  // User-specific webhook if different from global

  // Notification types
  criticalAlerts  Boolean  @default(true)
  opportunityAlerts Boolean @default(true)
  executionAlerts Boolean  @default(true)
  digestAlerts    Boolean  @default(true)

  // Thresholds
  minImpactForAlert Decimal @default(10) // Only alert if impact > $X/month

  // Quiet hours (no notifications)
  quietHoursStart Int?     // Hour of day (0-23)
  quietHoursEnd   Int?
  timezone        String   @default("America/New_York")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model NotificationLog {
  id              String   @id @default(cuid())
  type            String   // critical, standard, digest
  channel         String   // slack, email
  event           String   // opportunity_detected, run_failed, etc.

  recipientId     String?
  recipient       User?    @relation(fields: [recipientId], references: [id])

  subject         String
  body            String   @db.Text
  metadata        Json?

  sentAt          DateTime @default(now())
  success         Boolean
  errorMessage    String?

  @@index([type, sentAt])
  @@index([recipientId, sentAt])
}
```

---

## Implementation

### 1. Notification Service

Create `lib/services/notificationService.ts`:

```typescript
interface NotificationPayload {
  type: 'critical' | 'standard' | 'digest';
  event: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  channels?: ('slack' | 'email')[];
}

class NotificationService {
  // Send a notification
  async send(payload: NotificationPayload): Promise<void>;

  // Queue notification for batching
  async queue(payload: NotificationPayload): Promise<void>;

  // Process queued notifications
  async processQueue(): Promise<void>;

  // Send daily digest
  async sendDailyDigest(): Promise<void>;

  // Send weekly report
  async sendWeeklyReport(): Promise<void>;
}
```

### 2. Slack Integration

```typescript
// lib/services/slackNotifier.ts

interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

class SlackNotifier {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  }

  async send(message: SlackMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('Slack webhook not configured');
      return false;
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    return response.ok;
  }

  // Format opportunity notification
  formatOpportunityAlert(opportunities: MonetizationOpportunity[]): SlackMessage {
    const totalImpact = opportunities.reduce(
      (sum, o) => sum + Number(o.estimatedRevenueImpact),
      0
    );

    return {
      text: `🎯 ${opportunities.length} new monetization opportunities detected`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎯 ${opportunities.length} New Opportunities`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Est. Impact:*\n$${totalImpact.toFixed(2)}/month`
            },
            {
              type: 'mrkdwn',
              text: `*Highest Priority:*\n${opportunities[0]?.priority || 'N/A'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: opportunities
              .slice(0, 5)
              .map(o => `• ${o.type}: +$${Number(o.estimatedRevenueImpact).toFixed(2)}/mo`)
              .join('\n')
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Review Queue' },
              url: `${process.env.NEXTAUTH_URL}/admin/monetization/queue`,
              style: 'primary'
            }
          ]
        }
      ]
    };
  }

  // Format agent run result
  formatRunResult(run: AgentRun): SlackMessage {
    const emoji = run.status === 'COMPLETED' ? '✅' : '❌';
    const color = run.status === 'COMPLETED' ? '#36a64f' : '#dc3545';

    return {
      text: `${emoji} Agent run ${run.status.toLowerCase()}: ${run.runType}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Job Type', value: run.runType, short: true },
            { title: 'Duration', value: `${run.durationMs || 0}ms`, short: true },
            { title: 'Opportunities', value: String(run.opportunitiesFound), short: true },
            { title: 'Status', value: run.status, short: true }
          ],
          footer: 'MustHaveMods Monetization Agent',
          ts: String(Math.floor(run.startedAt.getTime() / 1000))
        }
      ]
    };
  }

  // Format critical error
  formatCriticalError(error: string, context: Record<string, any>): SlackMessage {
    return {
      text: '🚨 Critical: Monetization Agent Error',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Critical Error' }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${error}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Context:* ${JSON.stringify(context)}`
            }
          ]
        }
      ]
    };
  }
}
```

### 3. Email Integration

```typescript
// lib/services/emailNotifier.ts

class EmailNotifier {
  private sendgridKey: string;
  private fromEmail: string;

  constructor() {
    this.sendgridKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@musthavemods.com';
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.sendgridKey) {
      console.warn('SendGrid not configured, skipping email');
      return false;
    }

    // SendGrid API call
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.fromEmail },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });

    return response.ok;
  }

  // Generate daily digest email
  async sendDailyDigest(stats: DailyStats): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      include: { notificationPreferences: true }
    });

    const html = this.renderDigestTemplate(stats);

    for (const admin of admins) {
      if (admin.notificationPreferences?.digestAlerts !== false) {
        await this.send(admin.email, 'Daily Monetization Digest', html);
      }
    }
  }

  private renderDigestTemplate(stats: DailyStats): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>📊 Daily Monetization Report</h1>
          <p>Here's what happened yesterday:</p>

          <h2>📈 Key Metrics</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">New Opportunities</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${stats.newOpportunities}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Approved</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${stats.approved}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Auto-Executed</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${stats.autoExecuted}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Est. Revenue Impact</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>$${stats.estimatedImpact.toFixed(2)}/mo</strong></td>
            </tr>
          </table>

          <h2>⚡ Agent Runs</h2>
          <p>${stats.successfulRuns} successful, ${stats.failedRuns} failed</p>

          <h2>📋 Pending Review</h2>
          <p>${stats.pendingApproval} opportunities waiting for approval</p>

          <p style="margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/admin/monetization"
               style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
          </p>
        </body>
      </html>
    `;
  }
}
```

### 4. Notification Queue (Batching)

```typescript
// lib/services/notificationQueue.ts

interface QueuedNotification {
  id: string;
  payload: NotificationPayload;
  queuedAt: Date;
  batchKey: string; // e.g., "opportunities_hourly"
}

class NotificationQueue {
  private queue: Map<string, QueuedNotification[]> = new Map();

  // Add to queue
  add(payload: NotificationPayload, batchKey: string): void {
    const existing = this.queue.get(batchKey) || [];
    existing.push({
      id: crypto.randomUUID(),
      payload,
      queuedAt: new Date(),
      batchKey
    });
    this.queue.set(batchKey, existing);
  }

  // Process and send batched notifications
  async flush(batchKey: string): Promise<void> {
    const items = this.queue.get(batchKey);
    if (!items || items.length === 0) return;

    // Group and send
    if (batchKey === 'opportunities_hourly' && items.length > 0) {
      const slack = new SlackNotifier();
      await slack.send({
        text: `📊 Hourly summary: ${items.length} events`,
        blocks: this.formatBatchedEvents(items)
      });
    }

    // Clear queue
    this.queue.delete(batchKey);
  }

  private formatBatchedEvents(items: QueuedNotification[]): any[] {
    // Format multiple events into single Slack message
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: items.map(i => `• ${i.payload.title}`).join('\n')
        }
      }
    ];
  }
}
```

---

## Environment Variables

Add to `.env`:

```bash
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=noreply@musthavemods.com

# Notification settings
NOTIFICATION_DIGEST_HOUR=9        # Send daily digest at 9am
NOTIFICATION_TIMEZONE=America/New_York
```

---

## Integration Points

### 1. Orchestrator Integration

Update `agentOrchestrator.ts`:

```typescript
class AgentOrchestrator {
  private notificationService = new NotificationService();

  async runJob(type: AgentRunType) {
    try {
      const result = await this.executeJob(type);

      // Notify on completion (standard)
      if (result.opportunitiesFound > 0) {
        await this.notificationService.queue({
          type: 'standard',
          event: 'run_completed',
          title: `${type} completed: ${result.opportunitiesFound} opportunities`,
          body: `Agent found ${result.opportunitiesFound} new opportunities`,
          metadata: { runType: type, ...result }
        });
      }

      return result;
    } catch (error) {
      // Notify on failure (critical)
      await this.notificationService.send({
        type: 'critical',
        event: 'run_failed',
        title: `Agent run failed: ${type}`,
        body: error.message,
        channels: ['slack', 'email']
      });

      throw error;
    }
  }
}
```

### 2. Auto-Execution Integration

Update `actionExecutor.ts`:

```typescript
class ActionExecutor {
  private notificationService = new NotificationService();

  async executeAutoActions() {
    const results = await this.runAutoExecution();

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      // Alert on failures
      await this.notificationService.send({
        type: 'critical',
        event: 'execution_failures',
        title: `${failed.length} auto-executions failed`,
        body: failed.map(f => f.error).join('\n'),
        channels: ['slack']
      });
    }

    // Batch successful executions
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      await this.notificationService.queue({
        type: 'standard',
        event: 'executions_completed',
        title: `${successful.length} actions auto-executed`,
        body: `Successfully executed ${successful.length} monetization actions`,
        metadata: { count: successful.length }
      });
    }
  }
}
```

### 3. Opportunity Detection Integration

When new high-value opportunities detected:

```typescript
// In affiliate detector, RPM analyzer, etc.

async detectOpportunities() {
  const opportunities = await this.analyze();

  // Check for high-impact opportunities
  const highImpact = opportunities.filter(
    o => Number(o.estimatedRevenueImpact) > 50
  );

  if (highImpact.length > 0) {
    await notificationService.send({
      type: 'critical',
      event: 'high_impact_opportunity',
      title: `💰 High-value opportunity: +$${highImpact[0].estimatedRevenueImpact}/mo`,
      body: `${highImpact.length} high-impact opportunities detected`,
      channels: ['slack']
    });
  }

  // Queue standard opportunities for hourly batch
  if (opportunities.length > 0) {
    await notificationService.queue({
      type: 'standard',
      event: 'opportunities_detected',
      title: `${opportunities.length} opportunities detected`,
      body: '',
      metadata: { opportunities }
    });
  }
}
```

---

## Admin UI

### Settings Page Addition

Add notification preferences to `/admin/monetization/settings`:

```tsx
// Notification Settings Card
<Card>
  <CardHeader>
    <CardTitle>Notification Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Slack */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Slack Notifications</Label>
          <p className="text-sm text-gray-500">Receive alerts in Slack</p>
        </div>
        <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
      </div>

      {/* Email */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Email Digest</Label>
          <p className="text-sm text-gray-500">Daily summary email</p>
        </div>
        <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
      </div>

      {/* Threshold */}
      <div>
        <Label>Alert Threshold</Label>
        <p className="text-sm text-gray-500">
          Only notify for opportunities above this impact
        </p>
        <Input
          type="number"
          value={minImpact}
          onChange={(e) => setMinImpact(e.target.value)}
          placeholder="$10"
        />
      </div>

      {/* Quiet Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quiet Hours Start</Label>
          <Select value={quietStart} onValueChange={setQuietStart}>
            {/* Hour options */}
          </Select>
        </div>
        <div>
          <Label>Quiet Hours End</Label>
          <Select value={quietEnd} onValueChange={setQuietEnd}>
            {/* Hour options */}
          </Select>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Scheduled Jobs

Add to orchestrator or cron:

```typescript
// Hourly: Process batched notifications
schedule('0 * * * *', async () => {
  await notificationQueue.flush('opportunities_hourly');
  await notificationQueue.flush('executions_hourly');
});

// Daily at 9am: Send digest
schedule('0 9 * * *', async () => {
  await emailNotifier.sendDailyDigest(await getYesterdayStats());
});

// Weekly Monday 9am: Send report
schedule('0 9 * * 1', async () => {
  await emailNotifier.sendWeeklyReport(await getLastWeekStats());
});
```

---

## Acceptance Criteria

1. [ ] NotificationService created with Slack and email support
2. [ ] SlackNotifier sends formatted messages
3. [ ] EmailNotifier sends daily/weekly digests
4. [ ] Notification queue batches standard events
5. [ ] Critical alerts sent immediately
6. [ ] Integration with orchestrator (run complete/failed)
7. [ ] Integration with auto-executor (execution results)
8. [ ] Integration with opportunity detection (high-impact alerts)
9. [ ] Admin UI for notification preferences
10. [ ] Quiet hours respected
11. [ ] Notification log stored in database
12. [ ] npm run type-check passes

---

## Testing

### Manual Testing
1. Configure Slack webhook in env
2. Trigger agent run manually
3. Verify Slack notification received
4. Verify notification logged to database

### Slack Webhook Setup
1. Go to Slack API: https://api.slack.com/apps
2. Create new app or select existing
3. Add "Incoming Webhooks" feature
4. Create webhook for target channel
5. Copy webhook URL to SLACK_WEBHOOK_URL env var

---

## Future Enhancements

- **Discord integration**: Add Discord webhook support
- **Mobile push**: Push notifications to mobile app
- **Custom webhooks**: Allow arbitrary webhook endpoints
- **Escalation rules**: Escalate unreviewed critical alerts
- **Acknowledgment**: Track which alerts have been seen
