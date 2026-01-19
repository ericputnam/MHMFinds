/**
 * Action Handlers Index (PRD-18)
 *
 * Central registry of all action type handlers.
 * Each handler knows how to validate, execute, and rollback a specific action type.
 */

import { ActionType, MonetizationAction, Prisma } from '@prisma/client';
import { AddAffiliateLinkHandler } from './addAffiliateLink';
import { UpdateMetaDescriptionHandler } from './updateMetaDescription';
import { AddToCollectionHandler } from './addToCollection';

/**
 * Result of an action execution
 */
export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  rollbackData?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Action handler interface - all handlers must implement this
 */
export interface ActionHandler {
  type: ActionType;
  tier: 1 | 2 | 3; // 1=auto, 2=after-approval, 3=manual

  /**
   * Validate action can be executed
   */
  validate(action: MonetizationAction): Promise<ValidationResult>;

  /**
   * Execute the action
   */
  execute(action: MonetizationAction): Promise<ExecutionResult>;

  /**
   * Generate rollback data before execution
   */
  prepareRollback(action: MonetizationAction): Promise<any>;

  /**
   * Perform rollback
   */
  rollback(rollbackData: any): Promise<boolean>;
}

/**
 * Registry of all action handlers
 */
export const actionHandlers: Partial<Record<ActionType, ActionHandler>> = {
  ADD_AFFILIATE_LINK: new AddAffiliateLinkHandler(),
  UPDATE_META_DESCRIPTION: new UpdateMetaDescriptionHandler(),
  ADD_TO_COLLECTION: new AddToCollectionHandler(),
  // Future handlers:
  // GENERATE_INTERNAL_LINKS: new GenerateInternalLinksHandler(),
  // EXPAND_CONTENT: new ExpandContentHandler(),
  // UPDATE_AD_PLACEMENT: new UpdateAdPlacementHandler(),
};

/**
 * Get execution tier for an action type
 */
export function getExecutionTier(actionType: ActionType): 1 | 2 | 3 {
  const handler = actionHandlers[actionType];
  return handler?.tier ?? 3;
}

/**
 * Check if action type is auto-executable
 */
export function isAutoExecutable(actionType: ActionType): boolean {
  const handler = actionHandlers[actionType];
  return handler?.tier === 1;
}
