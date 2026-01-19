/**
 * Add To Collection Handler (PRD-18)
 *
 * Handles adding mods to curated collections.
 * This is a Tier 1 (auto-executable) action.
 */

import { prisma } from '@/lib/prisma';
import { ActionType, MonetizationAction } from '@prisma/client';
import { ActionHandler, ExecutionResult, ValidationResult } from './index';

interface AddToCollectionActionData {
  modId?: string;
  collectionId?: string;
  collectionName?: string;
  collectionType?: string;
  notes?: string;
  reason?: string;
}

export class AddToCollectionHandler implements ActionHandler {
  type = ActionType.ADD_TO_COLLECTION;
  tier = 1 as const; // Auto-executable

  async validate(action: MonetizationAction): Promise<ValidationResult> {
    const data = action.actionData as AddToCollectionActionData;

    // Get mod ID from action data or opportunity
    let modId = data.modId;
    if (!modId) {
      const opportunity = await prisma.monetizationOpportunity.findUnique({
        where: { id: action.opportunityId },
        select: { modId: true },
      });
      modId = opportunity?.modId || undefined;
    }

    if (!modId) {
      return { valid: false, reason: 'No mod ID specified' };
    }

    const mod = await prisma.mod.findUnique({
      where: { id: modId },
    });

    if (!mod) {
      return { valid: false, reason: 'Mod not found' };
    }

    // Validate collection exists if ID provided
    if (data.collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: data.collectionId },
      });

      if (!collection) {
        return { valid: false, reason: 'Collection not found' };
      }

      // Check if mod is already in collection
      const existing = await prisma.collectionItem.findUnique({
        where: {
          collectionId_modId: {
            collectionId: data.collectionId,
            modId,
          },
        },
      });

      if (existing) {
        return { valid: false, reason: 'Mod is already in this collection' };
      }
    }

    return { valid: true };
  }

  async execute(action: MonetizationAction): Promise<ExecutionResult> {
    const data = action.actionData as AddToCollectionActionData;

    // Get mod ID from action data or opportunity
    let modId = data.modId;
    if (!modId) {
      const opportunity = await prisma.monetizationOpportunity.findUnique({
        where: { id: action.opportunityId },
        select: { modId: true },
      });
      modId = opportunity?.modId || undefined;
    }

    if (!modId) {
      return { success: false, error: 'No mod ID available' };
    }

    const mod = await prisma.mod.findUnique({
      where: { id: modId },
    });

    if (!mod) {
      return { success: false, error: 'Mod not found' };
    }

    // Get or create collection
    let collectionId = data.collectionId;

    if (!collectionId && data.collectionName) {
      // Find or create a system collection
      const systemUser = await this.getSystemUser();

      if (!systemUser) {
        return { success: false, error: 'System user not found' };
      }

      // Look for existing collection with this name
      let collection = await prisma.collection.findFirst({
        where: {
          userId: systemUser.id,
          name: data.collectionName,
        },
      });

      if (!collection) {
        // Create new collection
        collection = await prisma.collection.create({
          data: {
            userId: systemUser.id,
            name: data.collectionName,
            description: this.generateCollectionDescription(data),
            isPublic: true,
            isFeatured: data.collectionType === 'featured',
          },
        });
      }

      collectionId = collection.id;
    }

    if (!collectionId) {
      return { success: false, error: 'No collection specified or could be created' };
    }

    // Check if already in collection
    const existing = await prisma.collectionItem.findUnique({
      where: {
        collectionId_modId: {
          collectionId,
          modId,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        output: { message: 'Mod is already in collection' },
      };
    }

    // Add to collection
    const collectionItem = await prisma.collectionItem.create({
      data: {
        collectionId,
        modId,
        notes: data.notes || `Added by monetization agent: ${data.reason || 'high engagement potential'}`,
      },
    });

    return {
      success: true,
      output: {
        collectionItemId: collectionItem.id,
        collectionId,
        modId,
      },
      rollbackData: {
        collectionItemId: collectionItem.id,
        collectionId,
        modId,
      },
    };
  }

  async prepareRollback(action: MonetizationAction): Promise<any> {
    // No preparation needed - we just need the IDs which we get from execute
    return null;
  }

  async rollback(rollbackData: {
    collectionItemId: string;
    collectionId: string;
    modId: string;
  }): Promise<boolean> {
    try {
      await prisma.collectionItem.delete({
        where: { id: rollbackData.collectionItemId },
      });
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Get or create a system user for automated collections
   */
  private async getSystemUser() {
    // Look for an admin user or create a system user
    let systemUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'system' },
          { isAdmin: true },
        ],
      },
    });

    if (!systemUser) {
      // Create system user
      systemUser = await prisma.user.create({
        data: {
          email: 'system@musthavemods.com',
          username: 'system',
          displayName: 'MustHaveMods',
          isAdmin: false,
        },
      });
    }

    return systemUser;
  }

  /**
   * Generate a description for auto-created collections
   */
  private generateCollectionDescription(data: AddToCollectionActionData): string {
    const type = data.collectionType || 'curated';

    const descriptions: Record<string, string> = {
      featured: 'Hand-picked featured mods selected for quality and popularity.',
      affiliate_featured: 'Top picks from our favorite creators - support them by visiting their pages!',
      seasonal: 'Seasonal content perfect for your current gameplay.',
      trending: 'Currently trending mods that players are loving.',
      curated: 'A carefully curated collection of quality mods.',
    };

    return descriptions[type] || descriptions.curated;
  }
}
