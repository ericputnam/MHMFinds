/**
 * Update Meta Description Handler (PRD-18)
 *
 * Handles updating meta descriptions for SEO improvement.
 * This is a Tier 1 (auto-executable) action.
 */

import { prisma } from '@/lib/prisma';
import { ActionType, MonetizationAction } from '@prisma/client';
import { ActionHandler, ExecutionResult, ValidationResult } from './index';

interface MetaDescriptionActionData {
  modId?: string;
  newDescription?: string;
  reason?: string;
}

export class UpdateMetaDescriptionHandler implements ActionHandler {
  type = ActionType.UPDATE_META_DESCRIPTION;
  tier = 1 as const; // Auto-executable

  async validate(action: MonetizationAction): Promise<ValidationResult> {
    const data = action.actionData as MetaDescriptionActionData;

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

    // Validate new description if provided
    if (data.newDescription) {
      if (data.newDescription.length > 160) {
        return { valid: false, reason: 'Meta description too long (max 160 chars)' };
      }
      if (data.newDescription.length < 50) {
        return { valid: false, reason: 'Meta description too short (min 50 chars)' };
      }
    }

    return { valid: true };
  }

  async execute(action: MonetizationAction): Promise<ExecutionResult> {
    const data = action.actionData as MetaDescriptionActionData;

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

    // Store original for rollback
    const originalDescription = mod.shortDescription;

    // Generate new description if not provided
    const newDescription = data.newDescription || this.generateMetaDescription(mod);

    await prisma.mod.update({
      where: { id: modId },
      data: {
        shortDescription: newDescription,
      },
    });

    return {
      success: true,
      output: {
        modId,
        originalDescription,
        newDescription,
      },
      rollbackData: {
        modId,
        originalDescription,
      },
    };
  }

  async prepareRollback(action: MonetizationAction): Promise<any> {
    const data = action.actionData as MetaDescriptionActionData;

    let modId = data.modId;
    if (!modId) {
      const opportunity = await prisma.monetizationOpportunity.findUnique({
        where: { id: action.opportunityId },
        select: { modId: true },
      });
      modId = opportunity?.modId || undefined;
    }

    if (!modId) {
      return null;
    }

    const mod = await prisma.mod.findUnique({
      where: { id: modId },
      select: { shortDescription: true },
    });

    return {
      modId,
      originalDescription: mod?.shortDescription,
    };
  }

  async rollback(rollbackData: {
    modId: string;
    originalDescription: string | null;
  }): Promise<boolean> {
    try {
      await prisma.mod.update({
        where: { id: rollbackData.modId },
        data: {
          shortDescription: rollbackData.originalDescription,
        },
      });
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Generate an SEO-optimized meta description for a mod
   */
  private generateMetaDescription(mod: {
    title: string;
    contentType: string | null;
    visualStyle: string | null;
    themes: string[];
    author: string | null;
    isFree: boolean;
  }): string {
    const parts: string[] = [];

    // Start with what it is
    if (mod.contentType) {
      parts.push(`Download this ${mod.visualStyle || ''} ${mod.contentType}`.trim());
    } else {
      parts.push('Download this custom content');
    }

    // Add title
    parts.push(`- ${mod.title}`);

    // Add themes if available
    if (mod.themes.length > 0) {
      const topThemes = mod.themes.slice(0, 2).join(' & ');
      parts.push(`Perfect for ${topThemes} builds.`);
    }

    // Add creator credit
    if (mod.author) {
      parts.push(`By ${mod.author}.`);
    }

    // Add free indicator
    if (mod.isFree) {
      parts.push('Free download!');
    }

    let description = parts.join(' ');

    // Truncate if too long
    if (description.length > 155) {
      description = description.substring(0, 152) + '...';
    }

    return description;
  }
}
