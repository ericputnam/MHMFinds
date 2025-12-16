import { prisma } from '@/lib/prisma';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedMod {
  title: string;
  description?: string;
  shortDescription?: string;
  version?: string;
  gameVersion?: string;
  category?: string;
  tags: string[];
  thumbnail?: string;
  images: string[];
  downloadUrl?: string;
  sourceUrl: string;
  source: string;
  sourceId?: string;
  isFree: boolean;
  price?: number;
  isNSFW: boolean;
  publishedAt?: Date;
}

export class ContentAggregator {
  private rateLimitDelay = 1000; // 1 second between requests

  async scrapePatreon(creatorUrl: string): Promise<ScrapedMod[]> {
    try {
      const response = await axios.get(creatorUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ModVault/1.0; +https://modvault.com)',
        },
      });

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Patreon specific scraping logic
      $('[data-tag="post-card"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h3').text().trim();
        const description = $el.find('.post-card-excerpt').text().trim();
        const thumbnail = $el.find('img').attr('src');
        const postUrl = $el.find('a').attr('href');
        const isFree = !$el.find('.post-card-preview').length; // Preview posts are usually free

        if (title && postUrl) {
          mods.push({
            title,
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description) || 'Other',
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl: postUrl,
            sourceUrl: postUrl,
            source: 'Patreon',
            isFree,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Patreon:', error);
      return [];
    }
  }

  async scrapeCurseForge(gameId: string = '4'): Promise<ScrapedMod[]> {
    try {
      const apiKey = process.env.CURSEFORGE_API_KEY;
      if (!apiKey) {
        throw new Error('CurseForge API key not configured');
      }

      const response = await axios.get(
        `https://api.curseforge.com/v1/mods/search?gameId=${gameId}&sortField=2&sortOrder=desc&pageSize=50`,
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      );

      const mods: ScrapedMod[] = response.data.data.map((mod: any) => ({
        title: mod.name,
        description: mod.summary,
        shortDescription: mod.summary?.substring(0, 150),
        version: mod.latestFiles?.[0]?.displayName,
        gameVersion: mod.latestFiles?.[0]?.gameVersions?.[0],
        category: this.mapCurseForgeCategory(mod.categories?.[0]?.name) || 'Other',
        tags: mod.categories?.map((cat: any) => cat.name) || [],
        thumbnail: mod.logo?.url,
        images: mod.screenshots?.map((s: any) => s.url) || [],
        downloadUrl: mod.latestFiles?.[0]?.downloadUrl,
        sourceUrl: mod.links?.websiteUrl,
        source: 'CurseForge',
        sourceId: mod.id.toString(),
        isFree: true, // CurseForge mods are free
        isNSFW: this.detectNSFW(mod.name, mod.summary),
        publishedAt: new Date(mod.dateCreated),
      }));

      return mods;
    } catch (error) {
      console.error('Error scraping CurseForge:', error);
      return [];
    }
  }

  async scrapeTumblr(tag: string): Promise<ScrapedMod[]> {
    try {
      const response = await axios.get(
        `https://www.tumblr.com/tagged/${encodeURIComponent(tag)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ModVault/1.0; +https://modvault.com)',
          },
        }
      );

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Tumblr specific scraping logic
      $('.post').each((_, element) => {
        const $el = $(element);
        const title = $el.find('.post-title').text().trim();
        const description = $el.find('.post-body').text().trim();
        const images = $el.find('img').map((_, img) => $(img).attr('src')).get();
        const postUrl = $el.find('a').attr('href');

        if (title && postUrl) {
          mods.push({
            title,
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description),
            tags: this.extractTags(title, description),
            thumbnail: images[0],
            images,
            downloadUrl: postUrl,
            sourceUrl: postUrl,
            source: 'Tumblr',
            isFree: true, // Tumblr posts are usually free
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Tumblr:', error);
      return [];
    }
  }

  async importMods(mods: ScrapedMod[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const mod of mods) {
      try {
        // Check if mod already exists
        const existingMod = await prisma.mod.findFirst({
          where: {
            OR: [
              { sourceUrl: mod.sourceUrl },
              { sourceId: mod.sourceId, source: mod.source },
            ],
          },
        });

        if (existingMod) {
          // Update existing mod
          await prisma.mod.update({
            where: { id: existingMod.id },
            data: {
              title: mod.title,
              description: mod.description,
              shortDescription: mod.shortDescription,
              version: mod.version,
              gameVersion: mod.gameVersion,
              category: mod.category || 'Other',
              tags: mod.tags,
              thumbnail: mod.thumbnail,
              images: mod.images,
              downloadUrl: mod.downloadUrl,
              isFree: mod.isFree,
              price: mod.price,
              isNSFW: mod.isNSFW,
              lastScraped: new Date(),
            },
          });
          imported++;
        } else {
          // Create new mod
          await prisma.mod.create({
            data: {
              title: mod.title,
              description: mod.description,
              shortDescription: mod.shortDescription,
              version: mod.version,
              gameVersion: mod.gameVersion,
              category: mod.category || 'Other',
              tags: mod.tags,
              thumbnail: mod.thumbnail,
              images: mod.images,
              downloadUrl: mod.downloadUrl,
              sourceUrl: mod.sourceUrl,
              source: mod.source,
              sourceId: mod.sourceId,
              isFree: mod.isFree,
              price: mod.price,
              isNSFW: mod.isNSFW,
              publishedAt: mod.publishedAt,
              lastScraped: new Date(),
              isVerified: false, // New scraped mods need verification
            },
          });
          imported++;
        }

        // Rate limiting
        await this.delay(this.rateLimitDelay);
      } catch (error) {
        console.error('Error importing mod:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  private categorizeMod(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Check in order of specificity (most specific first)

    // Hair (very common category)
    if (text.match(/\bhair(style)?s?\b/) || text.includes('hairstyle')) {
      return 'Hair';
    }

    // Poses & Animations
    if (text.match(/\bpose[sd]?\b/) || text.includes('animation') || text.includes('posing')) {
      return 'Poses';
    }

    // CAS - Makeup
    if (text.includes('makeup') || text.includes('blush') || text.includes('lipstick') ||
        text.includes('eyeshadow') || text.includes('eyeliner') || text.includes('cosmetic')) {
      return 'CAS - Makeup';
    }

    // CAS - Accessories
    if (text.includes('accessory') || text.includes('accessories') || text.includes('jewelry') ||
        text.includes('necklace') || text.includes('earring') || text.includes('bracelet') ||
        text.includes('glasses') || text.includes('hat ') || text.includes(' hats')) {
      return 'CAS - Accessories';
    }

    // CAS - Clothing (check before general CAS)
    if (text.includes('clothing') || text.includes('dress') || text.includes('outfit') ||
        text.includes('shirt') || text.includes('pants') || text.includes('shoes') ||
        text.includes('sweater') || text.includes('jacket') || text.includes('skirt') ||
        text.includes('top ') || text.includes(' tops') || text.includes('jeans') ||
        text.includes('bikini') || text.includes('swimwear')) {
      return 'CAS - Clothing';
    }

    // Build/Buy - Clutter
    if (text.includes('clutter') || text.includes('decor object') || text.includes('decoration')) {
      return 'Build/Buy - Clutter';
    }

    // Build/Buy (general)
    if (text.includes('build') || text.includes('buy') || text.includes('furniture') ||
        text.includes('chair') || text.includes('table') || text.includes('sofa') ||
        text.includes('bed ') || text.includes(' beds') || text.includes('kitchen') ||
        text.includes('bathroom') || text.includes('shelf') || text.includes('shelves') ||
        text.includes('cabinet') || text.includes('couch') || text.includes('decor') ||
        text.includes('shed') || text.includes('coop') || text.includes('house ') ||
        text.includes('lot ') || text.includes(' lots')) {
      return 'Build/Buy';
    }

    // Gameplay
    if (text.includes('gameplay') || text.includes('career') || text.includes('skill') ||
        text.includes('aspiration') || text.includes('reward') || text.includes('interaction')) {
      return 'Gameplay';
    }

    // Scripts/Mods
    if (text.includes('script') || text.includes('trait') || text.includes('mod ') ||
        text.match(/\bmods?\b/) && !text.includes('cc')) {
      return 'Scripts';
    }

    // CAS (general Create-a-Sim - last resort for CAS items)
    if (text.includes('cas') || text.includes('create-a-sim') || text.includes('create a sim')) {
      return 'CAS';
    }

    // Default
    return 'Other';
  }

  private extractTags(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const commonTags = [
      'sims4', 'sims3', 'sims2', 'build', 'buy', 'cas', 'gameplay',
      'furniture', 'clothing', 'hair', 'makeup', 'career', 'skill',
      'trait', 'aspiration', 'mod', 'cc', 'custom content'
    ];

    return commonTags.filter(tag => text.includes(tag));
  }

  private detectNSFW(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    const nsfwKeywords = ['nsfw', 'adult', 'mature', 'explicit', 'sexual'];
    return nsfwKeywords.some(keyword => text.includes(keyword));
  }

  private mapCurseForgeCategory(categoryName?: string): string {
    if (!categoryName) return 'Other';
    
    const categoryMap: { [key: string]: string } = {
      'Build and Buy': 'Build/Buy',
      'CAS': 'CAS',
      'Gameplay': 'Gameplay',
      'Scripts': 'Scripts',
      'Other': 'Other',
    };

    return categoryMap[categoryName] || 'Other';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAggregation(): Promise<void> {
    try {
      console.log('Starting content aggregation...');

      // Get active content sources
      const sources = await prisma.contentSource.findMany({
        where: { isActive: true },
      });

      for (const source of sources) {
        try {
          console.log(`Aggregating from ${source.name}...`);

          let mods: ScrapedMod[] = [];

          switch (source.name.toLowerCase()) {
            case 'patreon':
              // Scrape multiple Patreon creators
              const patreonCreators = [
                'https://www.patreon.com/sims4cc',
                'https://www.patreon.com/sims4mods',
                // Add more creators
              ];
              
              for (const creatorUrl of patreonCreators) {
                const creatorMods = await this.scrapePatreon(creatorUrl);
                mods.push(...creatorMods);
                await this.delay(this.rateLimitDelay);
              }
              break;

            case 'curseforge':
              mods = await this.scrapeCurseForge();
              break;

            case 'tumblr':
              const tumblrTags = ['sims4cc', 'sims4mods', 'sims4customcontent'];
              for (const tag of tumblrTags) {
                const tagMods = await this.scrapeTumblr(tag);
                mods.push(...tagMods);
                await this.delay(this.rateLimitDelay);
              }
              break;

            default:
              console.log(`Unknown source: ${source.name}`);
              continue;
          }

          // Import mods
          const { imported, skipped } = await this.importMods(mods);
          console.log(`${source.name}: ${imported} imported, ${skipped} skipped`);

          // Update source last scraped time
          await prisma.contentSource.update({
            where: { id: source.id },
            data: { lastScraped: new Date() },
          });

        } catch (error) {
          console.error(`Error aggregating from ${source.name}:`, error);
        }
      }

      console.log('Content aggregation completed');
    } catch (error) {
      console.error('Error running content aggregation:', error);
    }
  }
}

export const contentAggregator = new ContentAggregator();
