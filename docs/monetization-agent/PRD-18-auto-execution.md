# PRD-18: Auto-Execution Engine

## Overview
Implement automated execution of low-risk, pre-approved action types without requiring human approval. This enables the monetization agent to operate more autonomously while maintaining safety guardrails.

## Priority: P1 (Post-Admin UI)
## Dependencies: PRD-07 (Action Queue), PRD-17 (Objectives)
## Estimated Implementation: 2-3 days

---

## Problem Statement

Currently, ALL monetization actions require human approval before execution. While this is safe, it creates bottlenecks:
- Low-risk actions (adding affiliate links) wait days for approval
- Admin must review hundreds of similar opportunities
- Value of opportunities decreases with delay (seasonality)

## Solution

Create a tiered execution system where:
1. **Safe actions** execute immediately without approval
2. **Medium-risk actions** require approval but can auto-execute once approved
3. **High-risk actions** require approval AND manual implementation

---

## Action Risk Classification

### Tier 1: Auto-Execute (No Approval Needed)

These actions are completely safe and reversible:

| Action Type | Risk | Rationale |
|-------------|------|-----------|
| `ADD_AFFILIATE_LINK` | Low | Non-destructive, can be removed |
| `UPDATE_META_DESCRIPTION` | Low | SEO improvement, reversible |
| `ADD_TO_COLLECTION` | Low | Organizational, no content change |
| `GENERATE_INTERNAL_LINK_SUGGESTIONS` | Low | Suggestions only, human places |

**Constraints for Auto-Execution:**
- Estimated revenue impact > $0.10/month (avoid spam)
- Confidence score > 0.7
- No more than 10 auto-executions per hour (rate limit)
- Page has not been modified in last 24 hours (avoid conflicts)

### Tier 2: Auto-Execute After Approval

These actions require one-time approval, then execute automatically:

| Action Type | Risk | Rationale |
|-------------|------|-----------|
| `EXPAND_CONTENT` | Medium | Quality must be reviewed |
| `ADD_AD_SLOT` | Medium | UX implications |
| `CREATE_COLLECTION_PAGE` | Medium | SEO implications |

**Execution Triggers:**
- Admin clicks "Approve" in queue
- System executes within 5 minutes
- Notification sent on completion

### Tier 3: Manual Only (Never Auto-Execute)

These actions are logged but never automatically executed:

| Action Type | Risk | Rationale |
|-------------|------|-----------|
| `REMOVE_CONTENT` | Critical | Irreversible |
| `CHANGE_URL` | Critical | SEO disaster |
| `MODIFY_USER_DATA` | Critical | Privacy |
| `EXTERNAL_API_CALL` | High | Rate limits, costs |
| `CHANGE_PRICING` | High | Revenue risk |

---

## Database Schema Changes

### Add to MonetizationAction model

```prisma
model MonetizationAction {
  // ... existing fields ...

  // New fields for auto-execution
  autoExecutable     Boolean   @default(false)
  executionTier      Int       @default(3) // 1=auto, 2=after-approval, 3=manual
  executedAt         DateTime?
  executionResult    Json?     // { success: boolean, output: string, error?: string }
  executionAttempts  Int       @default(0)
  lastAttemptAt      DateTime?

  // Rate limiting
  rateLimitKey       String?   // e.g., "mod:123" to limit per-entity
}
```

### Add ExecutionLog model

```prisma
model ExecutionLog {
  id              String   @id @default(cuid())
  actionId        String
  action          MonetizationAction @relation(fields: [actionId], references: [id])

  executedAt      DateTime @default(now())
  executedBy      String   // "auto" | "approved" | userId

  // Execution details
  inputData       Json
  outputData      Json?

  success         Boolean
  errorMessage    String?
  durationMs      Int

  // Rollback info
  rollbackData    Json?    // Data needed to undo this action
  rolledBackAt    DateTime?
  rolledBackBy    String?

  @@index([actionId])
  @@index([executedAt])
}
```

---

## Implementation

### 1. Action Executor Service

Create `lib/services/actionExecutor.ts`:

```typescript
interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  rollbackData?: any;
}

class ActionExecutor {
  // Execute a single action
  async execute(action: MonetizationAction): Promise<ExecutionResult>;

  // Execute all pending auto-executable actions
  async executeAutoActions(): Promise<ExecutionResult[]>;

  // Rollback a previously executed action
  async rollback(executionLogId: string): Promise<boolean>;

  // Check if action is safe to auto-execute
  canAutoExecute(action: MonetizationAction): boolean;
}
```

### 2. Action Type Handlers

Create handler for each action type:

```typescript
// lib/services/actionHandlers/index.ts

interface ActionHandler {
  type: string;
  tier: 1 | 2 | 3;

  // Validate action can be executed
  validate(action: MonetizationAction): Promise<{ valid: boolean; reason?: string }>;

  // Execute the action
  execute(action: MonetizationAction): Promise<ExecutionResult>;

  // Generate rollback data before execution
  prepareRollback(action: MonetizationAction): Promise<any>;

  // Perform rollback
  rollback(rollbackData: any): Promise<boolean>;
}

// Handlers
export const handlers: Record<string, ActionHandler> = {
  ADD_AFFILIATE_LINK: new AddAffiliateLinkHandler(),
  UPDATE_META_DESCRIPTION: new UpdateMetaDescriptionHandler(),
  ADD_TO_COLLECTION: new AddToCollectionHandler(),
  // ... etc
};
```

### 3. Affiliate Link Handler Example

```typescript
class AddAffiliateLinkHandler implements ActionHandler {
  type = 'ADD_AFFILIATE_LINK';
  tier = 1; // Auto-executable

  async validate(action: MonetizationAction) {
    const { modId, affiliateUrl, affiliateType } = action.actionData as any;

    // Check mod exists
    const mod = await prisma.mod.findUnique({ where: { id: modId } });
    if (!mod) return { valid: false, reason: 'Mod not found' };

    // Check URL is valid affiliate URL
    if (!this.isValidAffiliateUrl(affiliateUrl)) {
      return { valid: false, reason: 'Invalid affiliate URL format' };
    }

    // Check not already added
    const existing = mod.affiliateLinks as any[] || [];
    if (existing.some(l => l.url === affiliateUrl)) {
      return { valid: false, reason: 'Affiliate link already exists' };
    }

    return { valid: true };
  }

  async execute(action: MonetizationAction) {
    const { modId, affiliateUrl, affiliateType, position } = action.actionData as any;

    const mod = await prisma.mod.findUnique({ where: { id: modId } });
    const existingLinks = (mod?.affiliateLinks as any[]) || [];

    // Add new affiliate link
    const newLink = {
      url: affiliateUrl,
      type: affiliateType,
      position: position || 'sidebar',
      addedAt: new Date().toISOString(),
      addedBy: 'monetization-agent'
    };

    await prisma.mod.update({
      where: { id: modId },
      data: {
        affiliateLinks: [...existingLinks, newLink]
      }
    });

    return {
      success: true,
      output: { addedLink: newLink },
      rollbackData: { modId, affiliateUrl }
    };
  }

  async prepareRollback(action: MonetizationAction) {
    const { modId, affiliateUrl } = action.actionData as any;
    return { modId, affiliateUrl };
  }

  async rollback(rollbackData: { modId: string; affiliateUrl: string }) {
    const mod = await prisma.mod.findUnique({
      where: { id: rollbackData.modId }
    });

    const links = (mod?.affiliateLinks as any[]) || [];
    const filtered = links.filter(l => l.url !== rollbackData.affiliateUrl);

    await prisma.mod.update({
      where: { id: rollbackData.modId },
      data: { affiliateLinks: filtered }
    });

    return true;
  }

  private isValidAffiliateUrl(url: string): boolean {
    const patterns = [
      /amazon\.com.*tag=musthavemods/,
      /patreon\.com/,
      /store\.steampowered\.com/,
      /ea\.com.*store/
    ];
    return patterns.some(p => p.test(url));
  }
}
```

### 4. Auto-Execution Scheduler

Add to agentOrchestrator or create standalone:

```typescript
// Run every 15 minutes
async function runAutoExecution() {
  const executor = new ActionExecutor();

  // Get pending Tier 1 actions
  const autoActions = await prisma.monetizationAction.findMany({
    where: {
      status: 'PENDING',
      executionTier: 1,
      autoExecutable: true,
      executionAttempts: { lt: 3 } // Max 3 attempts
    },
    take: 10, // Rate limit: 10 per run
    orderBy: { createdAt: 'asc' }
  });

  for (const action of autoActions) {
    if (executor.canAutoExecute(action)) {
      const result = await executor.execute(action);

      // Log execution
      await prisma.executionLog.create({
        data: {
          actionId: action.id,
          executedBy: 'auto',
          inputData: action.actionData,
          outputData: result.output,
          success: result.success,
          errorMessage: result.error,
          durationMs: 0, // Calculate actual
          rollbackData: result.rollbackData
        }
      });

      // Update action status
      await prisma.monetizationAction.update({
        where: { id: action.id },
        data: {
          status: result.success ? 'EXECUTED' : 'FAILED',
          executedAt: result.success ? new Date() : null,
          executionResult: result,
          executionAttempts: { increment: 1 },
          lastAttemptAt: new Date()
        }
      });
    }
  }

  // Get approved Tier 2 actions
  const approvedActions = await prisma.monetizationAction.findMany({
    where: {
      status: 'APPROVED',
      executionTier: 2,
      executedAt: null
    },
    take: 5
  });

  for (const action of approvedActions) {
    // Similar execution logic
  }
}
```

---

## API Endpoints

### POST /api/monetization/execute

Manually trigger execution of a specific action:

```typescript
// Request
{
  actionId: string;
  force?: boolean; // Override safety checks (admin only)
}

// Response
{
  success: boolean;
  executionLog?: ExecutionLog;
  error?: string;
}
```

### POST /api/monetization/execute/rollback

Rollback a previously executed action:

```typescript
// Request
{
  executionLogId: string;
  reason: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

### GET /api/monetization/execution/stats

Get execution statistics:

```typescript
// Response
{
  today: {
    autoExecuted: number;
    approvedExecuted: number;
    failed: number;
    rolledBack: number;
  };
  byType: Record<string, { executed: number; success: number; failed: number }>;
  recentExecutions: ExecutionLog[];
}
```

---

## Admin UI Updates

### Queue Page Enhancements

Show execution tier on each action:
- Tier 1: Green badge "Auto" - will execute automatically
- Tier 2: Yellow badge "On Approval" - executes after approve click
- Tier 3: Red badge "Manual" - requires manual implementation

### Execution History Tab

Add to history page:
- Filter by execution type (auto/approved/manual)
- Show execution logs with input/output
- Rollback button for recent executions
- Success/failure rate charts

### Settings Page

Add auto-execution configuration:
- Toggle auto-execution on/off globally
- Set rate limits (executions per hour)
- Set minimum confidence threshold
- Set minimum revenue impact threshold
- Blacklist specific action types from auto-execution

---

## Safety Guardrails

### 1. Rate Limiting
- Max 10 auto-executions per hour
- Max 50 auto-executions per day
- Cool-down after 3 failures in a row

### 2. Circuit Breaker
If more than 20% of recent executions fail:
- Pause all auto-execution
- Alert admin
- Require manual reset

### 3. Audit Trail
- Every execution logged with full input/output
- Rollback data preserved for 90 days
- Admin can see complete execution history

### 4. Dry Run Mode
- Test execution without actual changes
- Validate all handlers work correctly
- Use in staging environment first

---

## Acceptance Criteria

1. [ ] Database schema updated with execution fields
2. [ ] ActionExecutor service created
3. [ ] Handlers implemented for Tier 1 actions:
   - [ ] ADD_AFFILIATE_LINK
   - [ ] UPDATE_META_DESCRIPTION
   - [ ] ADD_TO_COLLECTION
   - [ ] GENERATE_INTERNAL_LINK_SUGGESTIONS
4. [ ] Auto-execution scheduler integrated with orchestrator
5. [ ] Rate limiting enforced
6. [ ] Circuit breaker implemented
7. [ ] Rollback functionality works
8. [ ] Admin UI shows execution tiers
9. [ ] Execution history viewable
10. [ ] Settings page has auto-execution controls
11. [ ] npm run type-check passes
12. [ ] Manual testing confirms safe actions execute correctly

---

## Rollout Plan

### Phase 1: Dry Run (Week 1)
- Deploy with auto-execution disabled
- Run in dry-run mode to validate handlers
- Review what would have been executed

### Phase 2: Limited Auto-Execution (Week 2)
- Enable for ADD_AFFILIATE_LINK only
- Max 5 per day
- Monitor closely

### Phase 3: Expanded Auto-Execution (Week 3+)
- Enable additional Tier 1 actions
- Increase rate limits based on confidence
- Reduce monitoring frequency

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auto-execution success rate | >95% | Successful / Total |
| Time to execute (Tier 1) | <15 min | From detection to execution |
| Time to execute (Tier 2) | <1 hour | From approval to execution |
| Rollback rate | <5% | Rolled back / Total executed |
| Admin review time saved | 50%+ | Compare queue review time |
