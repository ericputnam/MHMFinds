/**
 * Notification Queue Service (PRD-19)
 *
 * Batches notifications to avoid spamming users.
 * Stores pending notifications and flushes them periodically.
 */

// In-memory queue for batching
const pendingNotifications: Map<string, NotificationPayload[]> = new Map();

// Notification payload
export interface NotificationPayload {
  type: 'opportunity' | 'execution' | 'error' | 'digest';
  priority: 'critical' | 'standard';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  addedAt: Date;
}

// Batch configuration
const BATCH_CONFIG = {
  standard: {
    maxBatchSize: 20,
    maxBatchAge: 60 * 60 * 1000, // 1 hour
  },
  critical: {
    maxBatchSize: 1,
    maxBatchAge: 0, // Immediate
  },
};

/**
 * NotificationQueue class - batches notifications
 */
export class NotificationQueue {
  /**
   * Add a notification to the queue
   */
  add(payload: NotificationPayload, batchKey: string): void {
    if (!pendingNotifications.has(batchKey)) {
      pendingNotifications.set(batchKey, []);
    }

    pendingNotifications.get(batchKey)!.push({
      ...payload,
      addedAt: new Date(),
    });

    const config = BATCH_CONFIG[payload.priority];

    // Auto-flush if max batch size reached or critical
    const batch = pendingNotifications.get(batchKey)!;
    if (batch.length >= config.maxBatchSize) {
      // Signal that this batch should be flushed
      // The actual flushing is handled by the caller
    }
  }

  /**
   * Flush notifications for a batch key
   */
  flush(batchKey: string): NotificationPayload[] {
    const batch = pendingNotifications.get(batchKey) || [];
    pendingNotifications.delete(batchKey);
    return batch;
  }

  /**
   * Flush all notifications that have exceeded their max age
   */
  flushExpired(): Map<string, NotificationPayload[]> {
    const now = Date.now();
    const expiredBatches = new Map<string, NotificationPayload[]>();

    const entries = Array.from(pendingNotifications.entries());
    for (const [batchKey, batch] of entries) {
      if (batch.length === 0) continue;

      const oldestNotification = batch[0];
      const age = now - oldestNotification.addedAt.getTime();
      const config = BATCH_CONFIG[oldestNotification.priority as keyof typeof BATCH_CONFIG];

      if (age >= config.maxBatchAge) {
        expiredBatches.set(batchKey, this.flush(batchKey));
      }
    }

    return expiredBatches;
  }

  /**
   * Get pending notification count for a batch key
   */
  getPendingCount(batchKey: string): number {
    return pendingNotifications.get(batchKey)?.length || 0;
  }

  /**
   * Get all batch keys with pending notifications
   */
  getBatchKeys(): string[] {
    return Array.from(pendingNotifications.keys());
  }

  /**
   * Clear all pending notifications
   */
  clear(): void {
    pendingNotifications.clear();
  }

  /**
   * Get total pending notifications across all batches
   */
  getTotalPending(): number {
    let total = 0;
    const values = Array.from(pendingNotifications.values());
    for (const batch of values) {
      total += batch.length;
    }
    return total;
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueue();
