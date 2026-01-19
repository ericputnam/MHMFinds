/**
 * Add Affiliate Link Handler (PRD-18)
 *
 * Handles adding affiliate links to mod pages.
 * This is a Tier 1 (auto-executable) action.
 */

import { prisma } from '@/lib/prisma';
import { ActionType, MonetizationAction } from '@prisma/client';
import { ActionHandler, ExecutionResult, ValidationResult } from './index';

// Valid affiliate URL patterns
const VALID_AFFILIATE_PATTERNS = [
  /amazon\.com.*tag=musthavemods/,
  /patreon\.com/,
  /store\.steampowered\.com/,
  /ea\.com.*store/,
  /thesimsresource\.com/,
  /curseforge\.com/,
];

interface AffiliateActionData {
  modId?: string;
  affiliateUrl?: string;
  affiliateType?: string;
  position?: string;
  targetPrograms?: string[];
  placementType?: string;
  reason?: string;
}

interface AffiliateLink {
  url: string;
  type: string;
  position: string;
  addedAt: string;
  addedBy: string;
}

export class AddAffiliateLinkHandler implements ActionHandler {
  type = ActionType.ADD_AFFILIATE_LINK;
  tier = 1 as const; // Auto-executable

  async validate(action: MonetizationAction): Promise<ValidationResult> {
    const data = action.actionData as AffiliateActionData;

    // Get mod ID from action data or opportunity
    const modId = data.modId;
    if (!modId) {
      // Try to get from opportunity
      const opportunity = await prisma.monetizationOpportunity.findUnique({
        where: { id: action.opportunityId },
        select: { modId: true },
      });

      if (!opportunity?.modId) {
        return { valid: false, reason: 'No mod ID specified' };
      }
    }

    const mod = await prisma.mod.findUnique({
      where: { id: modId || '' },
    });

    if (!mod) {
      return { valid: false, reason: 'Mod not found' };
    }

    // If a specific affiliate URL is provided, validate it
    if (data.affiliateUrl && !this.isValidAffiliateUrl(data.affiliateUrl)) {
      return { valid: false, reason: 'Invalid affiliate URL format' };
    }

    return { valid: true };
  }

  async execute(action: MonetizationAction): Promise<ExecutionResult> {
    const data = action.actionData as AffiliateActionData;

    // Get mod ID from action data or opportunity
    let modId = data.modId;
    if (!modId) {
      const opportunity = await prisma.monetizationOpportunity.findUnique({
        where: { id: action.opportunityId },
        select: { modId: true, pageUrl: true },
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

    // Generate affiliate links based on mod content
    const newLinks = this.generateAffiliateLinks(mod, data);

    if (newLinks.length === 0) {
      return {
        success: true,
        output: { message: 'No new affiliate links to add' },
      };
    }

    // Get existing links
    const existingLinks = (mod.tags || [])
      .filter(t => t.startsWith('affiliate:'))
      .map(t => t.replace('affiliate:', ''));

    // Check for duplicates
    const linksToAdd = newLinks.filter(
      link => !existingLinks.some(existing => existing === link.url)
    );

    if (linksToAdd.length === 0) {
      return {
        success: true,
        output: { message: 'All suggested links already exist' },
      };
    }

    // Store affiliate links as JSON in a description appendix or tags
    // Since there's no dedicated affiliateLinks field, we'll update description
    const affiliateSection = this.formatAffiliateSection(linksToAdd);
    const updatedDescription = mod.description
      ? mod.description.includes('<!-- AFFILIATE_LINKS -->')
        ? mod.description.replace(
            /<!-- AFFILIATE_LINKS -->[\s\S]*<!-- END_AFFILIATE_LINKS -->/,
            affiliateSection
          )
        : `${mod.description}\n\n${affiliateSection}`
      : affiliateSection;

    await prisma.mod.update({
      where: { id: modId },
      data: {
        description: updatedDescription,
        // Also add to tags for tracking
        tags: {
          push: linksToAdd.map(l => `affiliate:${l.type}`),
        },
      },
    });

    return {
      success: true,
      output: {
        addedLinks: linksToAdd,
        modId,
      },
      rollbackData: {
        modId,
        originalDescription: mod.description,
        originalTags: mod.tags,
        addedLinks: linksToAdd,
      },
    };
  }

  async prepareRollback(action: MonetizationAction): Promise<any> {
    const data = action.actionData as AffiliateActionData;

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
      select: { description: true, tags: true },
    });

    return {
      modId,
      originalDescription: mod?.description,
      originalTags: mod?.tags,
    };
  }

  async rollback(rollbackData: {
    modId: string;
    originalDescription: string | null;
    originalTags: string[];
    addedLinks?: AffiliateLink[];
  }): Promise<boolean> {
    try {
      await prisma.mod.update({
        where: { id: rollbackData.modId },
        data: {
          description: rollbackData.originalDescription,
          tags: rollbackData.originalTags,
        },
      });
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  private isValidAffiliateUrl(url: string): boolean {
    return VALID_AFFILIATE_PATTERNS.some(p => p.test(url));
  }

  private generateAffiliateLinks(
    mod: { source: string; sourceUrl: string | null; author: string | null; title: string },
    data: AffiliateActionData
  ): AffiliateLink[] {
    const links: AffiliateLink[] = [];
    const now = new Date().toISOString();

    // If specific URL provided, use it
    if (data.affiliateUrl) {
      links.push({
        url: data.affiliateUrl,
        type: data.affiliateType || 'custom',
        position: data.position || 'sidebar',
        addedAt: now,
        addedBy: 'monetization-agent',
      });
      return links;
    }

    // Generate based on source
    const sourceText = `${mod.source} ${mod.sourceUrl || ''} ${mod.author || ''}`.toLowerCase();

    if (sourceText.includes('patreon')) {
      // Extract Patreon URL if available
      const patreonMatch = mod.sourceUrl?.match(/patreon\.com\/([^\/\?]+)/);
      if (patreonMatch) {
        links.push({
          url: `https://www.patreon.com/${patreonMatch[1]}?utm_source=musthavemods`,
          type: 'patreon',
          position: 'prominent',
          addedAt: now,
          addedBy: 'monetization-agent',
        });
      }
    }

    if (sourceText.includes('thesimsresource') || sourceText.includes('tsr')) {
      links.push({
        url: mod.sourceUrl || 'https://www.thesimsresource.com',
        type: 'tsr',
        position: 'sidebar',
        addedAt: now,
        addedBy: 'monetization-agent',
      });
    }

    if (sourceText.includes('curseforge')) {
      links.push({
        url: mod.sourceUrl || 'https://www.curseforge.com/sims4',
        type: 'curseforge',
        position: 'sidebar',
        addedAt: now,
        addedBy: 'monetization-agent',
      });
    }

    return links;
  }

  private formatAffiliateSection(links: AffiliateLink[]): string {
    if (links.length === 0) return '';

    const linkHtml = links
      .map(l => `<a href="${l.url}" rel="nofollow sponsored" target="_blank">${l.type}</a>`)
      .join(' | ');

    return `<!-- AFFILIATE_LINKS -->
**Support the Creator:** ${linkHtml}
<!-- END_AFFILIATE_LINKS -->`;
  }
}
