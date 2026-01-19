# PRD-07: Action Queue System

## Overview
Build the recommendation queue system where the agent stores detected opportunities and suggested actions for human review and approval before execution.

## Priority: P0 (Foundation)
## Dependencies: PRD-01 (Database Schema)
## Estimated Implementation: 2 hours

---

## Queue Flow

```
Agent Detection → Create Opportunity → Create Actions → Human Review → Approve/Reject → Execute (if approved)
```

## Implementation

### File: `lib/services/actionQueue.ts`

```typescript
import { prisma } from '../prisma';

export type OpportunityStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'expired';
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'rolled_back';

interface CreateOpportunityInput {
  opportunityType: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  pageUrl?: string;
  modId?: string;
  category?: string;
  title: string;
  description: string;
  reasoning: string;
  estimatedRevenueImpact?: number;
  estimatedRpmIncrease?: number;
  expiresAt?: Date;
  actions: CreateActionInput[];
}

interface CreateActionInput {
  actionType: string;
  title: string;
  description: string;
  actionData: Record<string, any>;
}

interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  implemented: number;
  totalEstimatedImpact: number;
}

interface OpportunityWithActions {
  id: string;
  opportunityType: string;
  priority: string;
  confidence: number;
  pageUrl: string | null;
  modId: string | null;
  title: string;
  description: string;
  reasoning: string;
  estimatedRevenueImpact: number | null;
  status: string;
  detectedAt: Date;
  actions: Array<{
    id: string;
    actionType: string;
    title: string;
    description: string;
    actionData: any;
    status: string;
  }>;
}

export class ActionQueue {
  /**
   * Create a new opportunity with associated actions
   */
  async createOpportunity(input: CreateOpportunityInput): Promise<string> {
    // Check for duplicate
    const existing = await prisma.monetizationOpportunity.findFirst({
      where: {
        pageUrl: input.pageUrl,
        opportunityType: input.opportunityType,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existing) {
      console.log(`Duplicate opportunity exists: ${existing.id}`);
      return existing.id;
    }

    // Create opportunity
    const opportunity = await prisma.monetizationOpportunity.create({
      data: {
        opportunityType: input.opportunityType,
        priority: input.priority,
        confidence: input.confidence,
        pageUrl: input.pageUrl,
        modId: input.modId,
        category: input.category,
        title: input.title,
        description: input.description,
        reasoning: input.reasoning,
        estimatedRevenueImpact: input.estimatedRevenueImpact,
        estimatedRpmIncrease: input.estimatedRpmIncrease,
        expiresAt: input.expiresAt,
        status: 'pending',
      },
    });

    // Create associated actions
    for (const action of input.actions) {
      await prisma.monetizationAction.create({
        data: {
          opportunityId: opportunity.id,
          actionType: action.actionType,
          title: action.title,
          description: action.description,
          actionData: action.actionData,
          status: 'pending',
        },
      });
    }

    return opportunity.id;
  }

  /**
   * Get pending opportunities for review
   */
  async getPendingOpportunities(limit: number = 20): Promise<OpportunityWithActions[]> {
    const opportunities = await prisma.monetizationOpportunity.findMany({
      where: {
        status: 'pending',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        actions: true,
      },
      orderBy: [
        { priority: 'asc' }, // high = 1, medium = 2, low = 3
        { estimatedRevenueImpact: 'desc' },
        { detectedAt: 'desc' },
      ],
      take: limit,
    });

    return opportunities.map(o => ({
      id: o.id,
      opportunityType: o.opportunityType,
      priority: o.priority,
      confidence: o.confidence,
      pageUrl: o.pageUrl,
      modId: o.modId,
      title: o.title,
      description: o.description,
      reasoning: o.reasoning,
      estimatedRevenueImpact: o.estimatedRevenueImpact ? Number(o.estimatedRevenueImpact) : null,
      status: o.status,
      detectedAt: o.detectedAt,
      actions: o.actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        title: a.title,
        description: a.description,
        actionData: a.actionData,
        status: a.status,
      })),
    }));
  }

  /**
   * Approve an opportunity (marks all actions as approved)
   */
  async approveOpportunity(opportunityId: string, approvedBy: string): Promise<void> {
    await prisma.$transaction([
      prisma.monetizationOpportunity.update({
        where: { id: opportunityId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: approvedBy,
        },
      }),
      prisma.monetizationAction.updateMany({
        where: { opportunityId },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy,
        },
      }),
    ]);
  }

  /**
   * Reject an opportunity
   */
  async rejectOpportunity(opportunityId: string, rejectedBy: string): Promise<void> {
    await prisma.$transaction([
      prisma.monetizationOpportunity.update({
        where: { id: opportunityId },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: rejectedBy,
        },
      }),
      prisma.monetizationAction.updateMany({
        where: { opportunityId },
        data: {
          status: 'rejected',
        },
      }),
    ]);
  }

  /**
   * Get approved actions ready for execution
   */
  async getApprovedActions(): Promise<Array<{
    id: string;
    opportunityId: string;
    actionType: string;
    title: string;
    actionData: any;
    opportunity: {
      pageUrl: string | null;
      modId: string | null;
    };
  }>> {
    const actions = await prisma.monetizationAction.findMany({
      where: {
        status: 'approved',
      },
      include: {
        opportunity: {
          select: {
            pageUrl: true,
            modId: true,
          },
        },
      },
    });

    return actions.map(a => ({
      id: a.id,
      opportunityId: a.opportunityId,
      actionType: a.actionType,
      title: a.title,
      actionData: a.actionData,
      opportunity: a.opportunity,
    }));
  }

  /**
   * Mark action as executed
   */
  async markActionExecuted(
    actionId: string,
    preMetrics?: Record<string, any>,
    postMetrics?: Record<string, any>
  ): Promise<void> {
    await prisma.monetizationAction.update({
      where: { id: actionId },
      data: {
        status: 'executed',
        executedAt: new Date(),
        preExecutionMetrics: preMetrics,
        postExecutionMetrics: postMetrics,
      },
    });

    // Check if all actions for opportunity are executed
    const action = await prisma.monetizationAction.findUnique({
      where: { id: actionId },
      select: { opportunityId: true },
    });

    if (action) {
      const pendingActions = await prisma.monetizationAction.count({
        where: {
          opportunityId: action.opportunityId,
          status: { not: 'executed' },
        },
      });

      if (pendingActions === 0) {
        await prisma.monetizationOpportunity.update({
          where: { id: action.opportunityId },
          data: {
            status: 'implemented',
            implementedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [pending, approved, rejected, implemented, impactSum] = await Promise.all([
      prisma.monetizationOpportunity.count({ where: { status: 'pending' } }),
      prisma.monetizationOpportunity.count({ where: { status: 'approved' } }),
      prisma.monetizationOpportunity.count({ where: { status: 'rejected' } }),
      prisma.monetizationOpportunity.count({ where: { status: 'implemented' } }),
      prisma.monetizationOpportunity.aggregate({
        where: { status: 'implemented' },
        _sum: { estimatedRevenueImpact: true },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      implemented,
      totalEstimatedImpact: Number(impactSum._sum.estimatedRevenueImpact) || 0,
    };
  }

  /**
   * Expire old pending opportunities
   */
  async expireOldOpportunities(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await prisma.monetizationOpportunity.updateMany({
      where: {
        status: 'pending',
        detectedAt: { lt: cutoff },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }

  /**
   * Get opportunity history for learning
   */
  async getImplementedOpportunities(limit: number = 100): Promise<Array<{
    opportunityType: string;
    estimatedImpact: number;
    measuredImpact: number;
    accuracy: number;
  }>> {
    const opportunities = await prisma.monetizationOpportunity.findMany({
      where: {
        status: 'implemented',
      },
      include: {
        actions: {
          where: {
            status: 'executed',
            measuredImpact: { not: null },
          },
        },
      },
      orderBy: { implementedAt: 'desc' },
      take: limit,
    });

    return opportunities.map(o => {
      const measuredImpact = o.actions.reduce(
        (sum, a) => sum + (Number(a.measuredImpact) || 0),
        0
      );
      const estimatedImpact = Number(o.estimatedRevenueImpact) || 0;
      const accuracy = estimatedImpact > 0
        ? 1 - Math.abs(measuredImpact - estimatedImpact) / estimatedImpact
        : 0;

      return {
        opportunityType: o.opportunityType,
        estimatedImpact,
        measuredImpact,
        accuracy: Math.max(0, accuracy),
      };
    });
  }
}

// Singleton export
export const actionQueue = new ActionQueue();
```

---

## API Routes for Dashboard

### File: `app/api/monetization/queue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { actionQueue } from '../../../../lib/services/actionQueue';

// GET: List pending opportunities
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const opportunities = await actionQueue.getPendingOpportunities();
  const stats = await actionQueue.getQueueStats();

  return NextResponse.json({ opportunities, stats });
}

// POST: Approve or reject opportunity
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { opportunityId, action } = body;

  if (!opportunityId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (action === 'approve') {
    await actionQueue.approveOpportunity(opportunityId, session.user.id);
  } else {
    await actionQueue.rejectOpportunity(opportunityId, session.user.id);
  }

  return NextResponse.json({ success: true });
}
```

---

## CLI Script for Queue Management

### File: `scripts/manage-queue.ts`

```typescript
import { actionQueue } from '../lib/services/actionQueue';

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'stats':
      const stats = await actionQueue.getQueueStats();
      console.log('\n=== Action Queue Stats ===');
      console.log(`Pending: ${stats.pending}`);
      console.log(`Approved: ${stats.approved}`);
      console.log(`Rejected: ${stats.rejected}`);
      console.log(`Implemented: ${stats.implemented}`);
      console.log(`Est. Impact: $${stats.totalEstimatedImpact.toFixed(2)}`);
      break;

    case 'list':
      const opportunities = await actionQueue.getPendingOpportunities(10);
      console.log('\n=== Pending Opportunities ===\n');
      for (const opp of opportunities) {
        console.log(`[${opp.priority.toUpperCase()}] ${opp.title}`);
        console.log(`  ID: ${opp.id}`);
        console.log(`  Type: ${opp.opportunityType}`);
        console.log(`  Est. Impact: $${opp.estimatedRevenueImpact?.toFixed(2) || 'N/A'}`);
        console.log(`  Actions: ${opp.actions.length}`);
        console.log('');
      }
      break;

    case 'approve':
      const approveId = process.argv[3];
      if (!approveId) {
        console.error('Usage: npm run queue approve <opportunity-id>');
        process.exit(1);
      }
      await actionQueue.approveOpportunity(approveId, 'cli-admin');
      console.log(`Approved opportunity: ${approveId}`);
      break;

    case 'reject':
      const rejectId = process.argv[3];
      if (!rejectId) {
        console.error('Usage: npm run queue reject <opportunity-id>');
        process.exit(1);
      }
      await actionQueue.rejectOpportunity(rejectId, 'cli-admin');
      console.log(`Rejected opportunity: ${rejectId}`);
      break;

    case 'expire':
      const days = parseInt(process.argv[3] || '30');
      const expired = await actionQueue.expireOldOpportunities(days);
      console.log(`Expired ${expired} opportunities older than ${days} days`);
      break;

    default:
      console.log('Usage: npm run queue <command>');
      console.log('Commands:');
      console.log('  stats    - Show queue statistics');
      console.log('  list     - List pending opportunities');
      console.log('  approve <id> - Approve an opportunity');
      console.log('  reject <id>  - Reject an opportunity');
      console.log('  expire [days] - Expire old opportunities');
  }
}

main();
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "queue": "npx tsx scripts/manage-queue.ts"
  }
}
```

---

## Validation Criteria

- [ ] Can create opportunities with actions
- [ ] Deduplicates existing opportunities
- [ ] Lists pending opportunities sorted by priority/impact
- [ ] Approve/reject workflow works
- [ ] Tracks executed actions
- [ ] Updates opportunity status when all actions complete
- [ ] CLI management commands work
- [ ] API route protected by admin auth
