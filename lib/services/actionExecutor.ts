/**
 * Action Executor Service (PRD-18)
 *
 * Core execution engine for monetization actions.
 * Handles auto-execution of safe actions, manual execution triggers,
 * and rollback functionality.
 */

import { prisma } from '@/lib/prisma';
import { ActionStatus, ActionType, Prisma } from '@prisma/client';
import { actionHandlers, ActionHandler, ExecutionResult } from './actionHandlers';

// Rate limiting configuration
const RATE_LIMITS = {
  maxAutoExecutionsPerHour: 10,
  maxAutoExecutionsPerDay: 50,
  maxFailuresBeforeCircuitBreak: 3,
  circuitBreakFailureRateThreshold: 0.2, // 20%
};

// Minimum thresholds for auto-execution
const AUTO_EXECUTION_THRESHOLDS = {
  minConfidence: 0.7,
  minRevenueImpact: 0.1, // $0.10/month minimum
  pageModificationCooldownHours: 24,
};

/**
 * ActionExecutor class - manages execution of monetization actions
 */
export class ActionExecutor {
  private circuitBreakerOpen = false;
  private recentFailures: Date[] = [];

  /**
   * Execute a single action
   */
  async execute(actionId: string, executedBy = 'manual'): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Get the action with its opportunity
    const action = await prisma.monetizationAction.findUnique({
      where: { id: actionId },
      include: {
        opportunity: true,
      },
    });

    if (!action) {
      return {
        success: false,
        error: 'Action not found',
      };
    }

    // Check if action is in a valid state for execution
    if (action.status !== 'PENDING' && action.status !== 'APPROVED') {
      return {
        success: false,
        error: `Action cannot be executed - status is ${action.status}`,
      };
    }

    // Get the handler for this action type
    const handler = actionHandlers[action.actionType];
    if (!handler) {
      return {
        success: false,
        error: `No handler found for action type: ${action.actionType}`,
      };
    }

    try {
      // Validate the action
      const validation = await handler.validate(action);
      if (!validation.valid) {
        await this.recordExecution(action.id, executedBy, action.actionData, false, validation.reason, null, Date.now() - startTime);
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Prepare rollback data before execution
      const rollbackData = await handler.prepareRollback(action);

      // Execute the action
      const result = await handler.execute(action);

      // Record the execution
      await this.recordExecution(
        action.id,
        executedBy,
        action.actionData,
        result.success,
        result.error,
        { output: result.output, rollbackData: result.rollbackData || rollbackData },
        Date.now() - startTime
      );

      // Update action status
      await prisma.monetizationAction.update({
        where: { id: action.id },
        data: {
          status: result.success ? 'EXECUTED' : 'FAILED',
          executedAt: result.success ? new Date() : null,
          executionResult: result as unknown as Prisma.InputJsonValue,
          executionAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      // Update opportunity status if action was executed
      if (result.success) {
        await this.checkAndUpdateOpportunityStatus(action.opportunityId);
      }

      // Track for circuit breaker
      if (!result.success) {
        this.recentFailures.push(new Date());
        this.checkCircuitBreaker();
      }

      return result;
    } catch (error) {
      const errorMessage = String(error);

      await this.recordExecution(action.id, executedBy, action.actionData, false, errorMessage, null, Date.now() - startTime);

      await prisma.monetizationAction.update({
        where: { id: action.id },
        data: {
          status: 'FAILED',
          executionResult: { success: false, error: errorMessage },
          executionAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      this.recentFailures.push(new Date());
      this.checkCircuitBreaker();

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute all pending auto-executable actions
   */
  async executeAutoActions(): Promise<{ executed: number; failed: number; skipped: number }> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      console.log('⚠️  Circuit breaker is open - skipping auto-execution');
      return { executed: 0, failed: 0, skipped: 0 };
    }

    // Check rate limits
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentExecutions = await prisma.executionLog.count({
      where: {
        executedBy: 'auto',
        executedAt: { gte: hourAgo },
      },
    });

    if (recentExecutions >= RATE_LIMITS.maxAutoExecutionsPerHour) {
      console.log(`⚠️  Rate limit: ${recentExecutions}/${RATE_LIMITS.maxAutoExecutionsPerHour} executions this hour`);
      return { executed: 0, failed: 0, skipped: 0 };
    }

    const dailyExecutions = await prisma.executionLog.count({
      where: {
        executedBy: 'auto',
        executedAt: { gte: dayAgo },
      },
    });

    if (dailyExecutions >= RATE_LIMITS.maxAutoExecutionsPerDay) {
      console.log(`⚠️  Daily limit reached: ${dailyExecutions}/${RATE_LIMITS.maxAutoExecutionsPerDay}`);
      return { executed: 0, failed: 0, skipped: 0 };
    }

    // Get pending Tier 1 (auto-executable) actions
    const autoActions = await prisma.monetizationAction.findMany({
      where: {
        status: 'PENDING',
        executionTier: 1,
        autoExecutable: true,
        executionAttempts: { lt: 3 },
      },
      include: {
        opportunity: true,
      },
      take: Math.min(10, RATE_LIMITS.maxAutoExecutionsPerHour - recentExecutions),
      orderBy: { createdAt: 'asc' },
    });

    let executed = 0;
    let failed = 0;
    let skipped = 0;

    for (const action of autoActions) {
      if (!this.canAutoExecute(action)) {
        skipped++;
        continue;
      }

      const result = await this.execute(action.id, 'auto');
      if (result.success) {
        executed++;
      } else {
        failed++;
      }

      // Check circuit breaker after each execution
      if (this.circuitBreakerOpen) {
        console.log('⚠️  Circuit breaker tripped - stopping auto-execution');
        break;
      }
    }

    // Also process approved Tier 2 actions
    const approvedActions = await prisma.monetizationAction.findMany({
      where: {
        status: 'APPROVED',
        executionTier: 2,
        executedAt: null,
        executionAttempts: { lt: 3 },
      },
      include: {
        opportunity: true,
      },
      take: 5,
    });

    for (const action of approvedActions) {
      const result = await this.execute(action.id, 'approved');
      if (result.success) {
        executed++;
      } else {
        failed++;
      }
    }

    return { executed, failed, skipped };
  }

  /**
   * Rollback a previously executed action
   */
  async rollback(executionLogId: string, rolledBackBy: string, reason?: string): Promise<boolean> {
    const executionLog = await prisma.executionLog.findUnique({
      where: { id: executionLogId },
      include: {
        action: true,
      },
    });

    if (!executionLog) {
      throw new Error('Execution log not found');
    }

    if (!executionLog.success) {
      throw new Error('Cannot rollback a failed execution');
    }

    if (executionLog.rolledBackAt) {
      throw new Error('Action has already been rolled back');
    }

    const rollbackData = executionLog.rollbackData || (executionLog.outputData as any)?.rollbackData;
    if (!rollbackData) {
      throw new Error('No rollback data available');
    }

    const handler = actionHandlers[executionLog.action.actionType];
    if (!handler) {
      throw new Error(`No handler found for action type: ${executionLog.action.actionType}`);
    }

    try {
      const success = await handler.rollback(rollbackData);

      if (success) {
        // Update execution log
        await prisma.executionLog.update({
          where: { id: executionLogId },
          data: {
            rolledBackAt: new Date(),
            rolledBackBy,
          },
        });

        // Update action status
        await prisma.monetizationAction.update({
          where: { id: executionLog.actionId },
          data: {
            status: 'ROLLED_BACK',
            rolledBackAt: new Date(),
          },
        });
      }

      return success;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Check if action is safe to auto-execute
   */
  canAutoExecute(action: {
    executionTier: number;
    autoExecutable: boolean;
    executionAttempts: number;
    opportunity: {
      confidence: Prisma.Decimal;
      estimatedRevenueImpact: Prisma.Decimal | null;
    };
  }): boolean {
    // Must be Tier 1 and marked as auto-executable
    if (action.executionTier !== 1 || !action.autoExecutable) {
      return false;
    }

    // Max attempts check
    if (action.executionAttempts >= 3) {
      return false;
    }

    // Confidence threshold
    if (Number(action.opportunity.confidence) < AUTO_EXECUTION_THRESHOLDS.minConfidence) {
      return false;
    }

    // Revenue impact threshold
    const impact = Number(action.opportunity.estimatedRevenueImpact ?? 0);
    if (impact < AUTO_EXECUTION_THRESHOLDS.minRevenueImpact) {
      return false;
    }

    return true;
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(): Promise<{
    today: {
      autoExecuted: number;
      approvedExecuted: number;
      failed: number;
      rolledBack: number;
    };
    byType: Record<string, { executed: number; success: number; failed: number }>;
    recentExecutions: {
      id: string;
      actionId: string;
      executedAt: Date;
      executedBy: string;
      success: boolean;
    }[];
    circuitBreakerStatus: 'open' | 'closed';
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [autoExecuted, approvedExecuted, failed, rolledBack] = await Promise.all([
      prisma.executionLog.count({
        where: {
          executedAt: { gte: todayStart },
          executedBy: 'auto',
          success: true,
        },
      }),
      prisma.executionLog.count({
        where: {
          executedAt: { gte: todayStart },
          executedBy: 'approved',
          success: true,
        },
      }),
      prisma.executionLog.count({
        where: {
          executedAt: { gte: todayStart },
          success: false,
        },
      }),
      prisma.executionLog.count({
        where: {
          rolledBackAt: { gte: todayStart },
        },
      }),
    ]);

    // Get stats by action type
    const byTypeRaw = await prisma.executionLog.groupBy({
      by: ['success'],
      where: {
        executedAt: { gte: todayStart },
      },
      _count: true,
    });

    // Get recent executions
    const recentExecutions = await prisma.executionLog.findMany({
      orderBy: { executedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actionId: true,
        executedAt: true,
        executedBy: true,
        success: true,
      },
    });

    return {
      today: {
        autoExecuted,
        approvedExecuted,
        failed,
        rolledBack,
      },
      byType: {}, // Would need more complex query to group by action type
      recentExecutions,
      circuitBreakerStatus: this.circuitBreakerOpen ? 'open' : 'closed',
    };
  }

  /**
   * Reset the circuit breaker (admin action)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.recentFailures = [];
    console.log('✅ Circuit breaker has been reset');
  }

  /**
   * Record execution in the log
   */
  private async recordExecution(
    actionId: string,
    executedBy: string,
    inputData: Prisma.JsonValue,
    success: boolean,
    errorMessage: string | null | undefined,
    outputData: Prisma.InputJsonValue | null,
    durationMs: number
  ): Promise<void> {
    await prisma.executionLog.create({
      data: {
        actionId,
        executedBy,
        inputData: inputData as Prisma.InputJsonValue,
        outputData: outputData ?? undefined,
        success,
        errorMessage: errorMessage ?? null,
        durationMs,
        rollbackData: outputData ? (outputData as any).rollbackData : undefined,
      },
    });
  }

  /**
   * Check and update opportunity status if all actions are executed
   */
  private async checkAndUpdateOpportunityStatus(opportunityId: string): Promise<void> {
    const pendingActions = await prisma.monetizationAction.count({
      where: {
        opportunityId,
        status: { notIn: ['EXECUTED', 'ROLLED_BACK'] },
      },
    });

    if (pendingActions === 0) {
      await prisma.monetizationOpportunity.update({
        where: { id: opportunityId },
        data: {
          status: 'IMPLEMENTED',
          implementedAt: new Date(),
        },
      });
    }
  }

  /**
   * Check if circuit breaker should be tripped
   */
  private checkCircuitBreaker(): void {
    // Clean up old failures (keep last hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.recentFailures = this.recentFailures.filter(f => f > hourAgo);

    // Check consecutive failures
    if (this.recentFailures.length >= RATE_LIMITS.maxFailuresBeforeCircuitBreak) {
      // Check if failure rate exceeds threshold
      // For simplicity, we just check consecutive failures
      this.circuitBreakerOpen = true;
      console.error('🚨 Circuit breaker OPENED due to high failure rate');
    }
  }
}

// Export singleton instance
export const actionExecutor = new ActionExecutor();
