/**
 * Action Queue System
 *
 * Manages monetization opportunities and actions with human approval workflow.
 * All detected opportunities require human approval before execution.
 */

import { prisma } from '@/lib/prisma';
import {
  OpportunityType,
  OpportunityStatus,
  ActionType,
  ActionStatus,
  Prisma,
} from '@prisma/client';

// Types for creating opportunities
export interface CreateOpportunityInput {
  opportunityType: OpportunityType;
  title: string;
  description: string;
  priority?: number;
  confidence: number;
  pageUrl?: string;
  modId?: string;
  category?: string;
  estimatedRevenueImpact?: number;
  estimatedRpmIncrease?: number;
  expiresAt?: Date;
  actions: CreateActionInput[];
}

export interface CreateActionInput {
  actionType: ActionType;
  actionData: Prisma.InputJsonValue;
}

// Types for queue operations
export interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  implemented: number;
  expired: number;
  totalEstimatedImpact: number;
}

export interface OpportunityWithActions {
  id: string;
  opportunityType: OpportunityType;
  title: string;
  description: string;
  status: OpportunityStatus;
  priority: number;
  confidence: Prisma.Decimal;
  pageUrl: string | null;
  modId: string | null;
  category: string | null;
  estimatedRevenueImpact: Prisma.Decimal | null;
  estimatedRpmIncrease: Prisma.Decimal | null;
  createdAt: Date;
  actions: {
    id: string;
    actionType: ActionType;
    actionData: Prisma.JsonValue;
    status: ActionStatus;
  }[];
}

/**
 * ActionQueue class - manages the monetization opportunity queue
 */
export class ActionQueue {
  /**
   * Create a new opportunity with associated actions
   * Deduplicates based on pageUrl + opportunityType
   */
  async createOpportunity(input: CreateOpportunityInput): Promise<string> {
    // Check for existing pending opportunity with same pageUrl and type
    if (input.pageUrl) {
      const existing = await prisma.monetizationOpportunity.findFirst({
        where: {
          pageUrl: input.pageUrl,
          opportunityType: input.opportunityType,
          status: 'PENDING',
        },
      });

      if (existing) {
        // Update existing opportunity if confidence is higher
        if (input.confidence > Number(existing.confidence)) {
          await prisma.monetizationOpportunity.update({
            where: { id: existing.id },
            data: {
              title: input.title,
              description: input.description,
              priority: input.priority ?? existing.priority,
              confidence: input.confidence,
              estimatedRevenueImpact: input.estimatedRevenueImpact,
              estimatedRpmIncrease: input.estimatedRpmIncrease,
            },
          });
        }
        return existing.id;
      }
    }

    // Create new opportunity with actions
    const opportunity = await prisma.monetizationOpportunity.create({
      data: {
        opportunityType: input.opportunityType,
        title: input.title,
        description: input.description,
        priority: input.priority ?? 5,
        confidence: input.confidence,
        pageUrl: input.pageUrl,
        modId: input.modId,
        category: input.category,
        estimatedRevenueImpact: input.estimatedRevenueImpact,
        estimatedRpmIncrease: input.estimatedRpmIncrease,
        expiresAt: input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        actions: {
          create: input.actions.map((action) => ({
            actionType: action.actionType,
            actionData: action.actionData,
          })),
        },
      },
    });

    return opportunity.id;
  }

  /**
   * Get pending opportunities sorted by priority and estimated impact
   */
  async getPendingOpportunities(limit = 50): Promise<OpportunityWithActions[]> {
    return prisma.monetizationOpportunity.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { estimatedRevenueImpact: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      include: {
        actions: {
          select: {
            id: true,
            actionType: true,
            actionData: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Approve an opportunity and all its actions
   */
  async approveOpportunity(id: string, approvedBy: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update opportunity
      await tx.monetizationOpportunity.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Update all actions
      await tx.monetizationAction.updateMany({
        where: { opportunityId: id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy,
        },
      });
    });
  }

  /**
   * Reject an opportunity and all its actions
   */
  async rejectOpportunity(
    id: string,
    rejectedBy: string,
    reason?: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update opportunity
      await tx.monetizationOpportunity.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedBy,
          rejectionReason: reason,
        },
      });

      // Update all actions
      await tx.monetizationAction.updateMany({
        where: { opportunityId: id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedBy,
        },
      });
    });
  }

  /**
   * Get approved actions ready for execution
   */
  async getApprovedActions(): Promise<
    {
      id: string;
      actionType: ActionType;
      actionData: Prisma.JsonValue;
      opportunity: {
        id: string;
        title: string;
        pageUrl: string | null;
        modId: string | null;
      };
    }[]
  > {
    return prisma.monetizationAction.findMany({
      where: {
        status: 'APPROVED',
        executedAt: null,
      },
      select: {
        id: true,
        actionType: true,
        actionData: true,
        opportunity: {
          select: {
            id: true,
            title: true,
            pageUrl: true,
            modId: true,
          },
        },
      },
    });
  }

  /**
   * Mark an action as executed with pre/post metrics
   */
  async markActionExecuted(
    id: string,
    preMetrics?: Prisma.InputJsonValue,
    postMetrics?: Prisma.InputJsonValue
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update the action
      await tx.monetizationAction.update({
        where: { id },
        data: {
          status: 'EXECUTED',
          executedAt: new Date(),
          preExecutionMetrics: preMetrics,
          postExecutionMetrics: postMetrics,
        },
      });

      // Get the opportunity
      const action = await tx.monetizationAction.findUnique({
        where: { id },
        select: { opportunityId: true },
      });

      if (action) {
        // Check if all actions are executed
        const pendingActions = await tx.monetizationAction.count({
          where: {
            opportunityId: action.opportunityId,
            status: { not: 'EXECUTED' },
          },
        });

        // If all actions executed, mark opportunity as implemented
        if (pendingActions === 0) {
          await tx.monetizationOpportunity.update({
            where: { id: action.opportunityId },
            data: {
              status: 'IMPLEMENTED',
              implementedAt: new Date(),
            },
          });
        }
      }
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [pending, approved, rejected, implemented, expired, impactSum] =
      await Promise.all([
        prisma.monetizationOpportunity.count({ where: { status: 'PENDING' } }),
        prisma.monetizationOpportunity.count({ where: { status: 'APPROVED' } }),
        prisma.monetizationOpportunity.count({ where: { status: 'REJECTED' } }),
        prisma.monetizationOpportunity.count({ where: { status: 'IMPLEMENTED' } }),
        prisma.monetizationOpportunity.count({ where: { status: 'EXPIRED' } }),
        prisma.monetizationOpportunity.aggregate({
          where: { status: 'PENDING' },
          _sum: { estimatedRevenueImpact: true },
        }),
      ]);

    return {
      pending,
      approved,
      rejected,
      implemented,
      expired,
      totalEstimatedImpact: Number(impactSum._sum.estimatedRevenueImpact ?? 0),
    };
  }

  /**
   * Expire old opportunities that have passed their expiration date
   */
  async expireOldOpportunities(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.monetizationOpportunity.updateMany({
      where: {
        status: 'PENDING',
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            expiresAt: null,
            createdAt: { lt: cutoffDate },
          },
        ],
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Get implemented opportunities for learning (compare estimated vs measured impact)
   */
  async getImplementedOpportunities(limit = 100): Promise<
    {
      id: string;
      title: string;
      opportunityType: OpportunityType;
      estimatedRevenueImpact: Prisma.Decimal | null;
      actions: {
        actionType: ActionType;
        measuredImpact: Prisma.Decimal | null;
        preExecutionMetrics: Prisma.JsonValue;
        postExecutionMetrics: Prisma.JsonValue;
      }[];
    }[]
  > {
    return prisma.monetizationOpportunity.findMany({
      where: { status: 'IMPLEMENTED' },
      orderBy: { implementedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        opportunityType: true,
        estimatedRevenueImpact: true,
        actions: {
          select: {
            actionType: true,
            measuredImpact: true,
            preExecutionMetrics: true,
            postExecutionMetrics: true,
          },
        },
      },
    });
  }

  /**
   * Get a single opportunity by ID with all details
   */
  async getOpportunity(id: string): Promise<OpportunityWithActions | null> {
    return prisma.monetizationOpportunity.findUnique({
      where: { id },
      include: {
        actions: {
          select: {
            id: true,
            actionType: true,
            actionData: true,
            status: true,
          },
        },
      },
    });
  }
}

// Export singleton instance
export const actionQueue = new ActionQueue();
