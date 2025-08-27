import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

export interface SearchResult {
  modId: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  score: number;
  reason: string;
}

export interface ModRecommendation {
  modId: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  confidence: number;
  reason: string;
}

export class AISearchService {
  private openai: OpenAI;
  private embeddingModel = 'text-embedding-3-small';
  private maxTokens = 150;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async searchMods(
    query: string,
    filters: {
      category?: string;
      gameVersion?: string;
      isFree?: boolean;
      isNSFW?: boolean;
      tags?: string[];
    } = {},
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build base where clause
      const where: any = {
        isVerified: true,
      };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.gameVersion) {
        where.gameVersion = filters.gameVersion;
      }

      if (filters.isFree !== undefined) {
        where.isFree = filters.isFree;
      }

      if (filters.isNSFW === false) {
        where.isNSFW = false;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      // Get mods with search index
      const mods = await prisma.mod.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
              downloads: true,
            },
          },
        },
        take: limit * 2, // Get more for better ranking
      });

      // Calculate similarity scores
      const scoredMods = await Promise.all(
        mods.map(async (mod) => {
          const modText = `${mod.title} ${mod.description || ''} ${mod.tags.join(' ')}`;
          const modEmbedding = await this.generateEmbedding(modText);
          
          const similarity = this.cosineSimilarity(queryEmbedding, modEmbedding);
          
          // Boost score based on popularity and quality
          const popularityBoost = Math.log10(
            (mod._count.downloads + 1) * (mod._count.favorites + 1) * (Number(mod.rating) || 1)
          ) * 0.1;
          
          const finalScore = similarity + popularityBoost;
          
          return {
            modId: mod.id,
            title: mod.title,
            description: mod.description || undefined,
            category: mod.category,
            tags: mod.tags,
            thumbnail: mod.thumbnail || undefined,
            score: finalScore,
            reason: this.generateSearchReason(query, mod, similarity),
          };
        })
      );

      // Sort by score and return top results
      return scoredMods
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching mods:', error);
      throw new Error('Failed to search mods');
    }
  }

  async getRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<ModRecommendation[]> {
    try {
      // Get user's favorite mods and download history
      const [favorites, downloads] = await Promise.all([
        prisma.favorite.findMany({
          where: { userId },
          include: { mod: true },
          take: 50,
        }),
        prisma.download.findMany({
          where: { userId },
          include: { mod: true },
          take: 50,
        }),
      ]);

      if (favorites.length === 0 && downloads.length === 0) {
        // Return popular mods for new users
        return this.getPopularMods(limit);
      }

      // Create user profile from preferences
      const userProfile = this.createUserProfile(favorites, downloads);
      
      // Find similar mods
      const recommendations = await this.findSimilarMods(userProfile, limit);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return this.getPopularMods(limit);
    }
  }

  async getSimilarMods(
    modId: string,
    limit: number = 8
  ): Promise<ModRecommendation[]> {
    try {
      const mod = await prisma.mod.findUnique({
        where: { id: modId },
        include: {
          creator: true,
          _count: {
            select: {
              reviews: true,
              favorites: true,
              downloads: true,
            },
          },
        },
      });

      if (!mod) {
        throw new Error('Mod not found');
      }

      const modText = `${mod.title} ${mod.description || ''} ${mod.tags.join(' ')}`;
      const modEmbedding = await this.generateEmbedding(modText);

      // Find mods in the same category with similar tags
      const similarMods = await prisma.mod.findMany({
        where: {
          id: { not: modId },
          category: mod.category,
          isVerified: true,
          tags: { hasSome: mod.tags.slice(0, 3) },
        },
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
              downloads: true,
            },
          },
        },
        take: limit * 2,
      });

      // Calculate similarity scores
      const scoredMods = await Promise.all(
        similarMods.map(async (similarMod) => {
          const similarModText = `${similarMod.title} ${similarMod.description || ''} ${similarMod.tags.join(' ')}`;
          const similarModEmbedding = await this.generateEmbedding(similarModText);
          
          const similarity = this.cosineSimilarity(modEmbedding, similarModEmbedding);
          
          return {
            modId: similarMod.id,
            title: similarMod.title,
            description: similarMod.description || undefined,
            category: similarMod.category,
            tags: similarMod.tags,
            thumbnail: similarMod.thumbnail || undefined,
            confidence: similarity,
            reason: `Similar to "${mod.title}"`,
          };
        })
      );

      return scoredMods
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting similar mods:', error);
      return [];
    }
  }

  private async getPopularMods(limit: number): Promise<ModRecommendation[]> {
    const popularMods = await prisma.mod.findMany({
      where: { isVerified: true },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            downloads: true,
          },
        },
      },
      orderBy: [
        { downloadCount: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return popularMods.map((mod) => ({
      modId: mod.id,
      title: mod.title,
      description: mod.description || undefined,
      category: mod.category,
      tags: mod.tags,
      thumbnail: mod.thumbnail || undefined,
      confidence: 0.8,
      reason: 'Popular mod in the community',
    }));
  }

  private createUserProfile(
    favorites: any[],
    downloads: any[]
  ): { categories: string[]; tags: string[]; interests: string } {
    const allMods = [...favorites, ...downloads];
    
    const categories = Array.from(new Set(allMods.map(f => f.mod.category)));
    const tags = Array.from(new Set(allMods.flatMap(f => f.mod.tags)));
    
    const interests = allMods
      .map(f => `${f.mod.title} ${f.mod.description || ''}`)
      .join(' ');
    
    return { categories, tags, interests };
  }

  private async findSimilarMods(
    userProfile: { categories: string[]; tags: string[]; interests: string },
    limit: number
  ): Promise<ModRecommendation[]> {
    const userEmbedding = await this.generateEmbedding(userProfile.interests);
    
    const similarMods = await prisma.mod.findMany({
      where: {
        isVerified: true,
        OR: [
          { category: { in: userProfile.categories } },
          { tags: { hasSome: userProfile.tags.slice(0, 5) } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            downloads: true,
          },
        },
      },
      take: limit * 2,
    });

    const scoredMods = await Promise.all(
      similarMods.map(async (mod) => {
        const modText = `${mod.title} ${mod.description || ''} ${mod.tags.join(' ')}`;
        const modEmbedding = await this.generateEmbedding(modText);
        
        const similarity = this.cosineSimilarity(userEmbedding, modEmbedding);
        
        return {
          modId: mod.id,
          title: mod.title,
          description: mod.description || undefined,
          category: mod.category,
          tags: mod.tags,
          thumbnail: mod.thumbnail || undefined,
          confidence: similarity,
          reason: 'Based on your preferences',
        };
      })
    );

    return scoredMods
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateSearchReason(query: string, mod: any, similarity: number): string {
    const reasons = [];
    
    if (similarity > 0.8) {
      reasons.push('Highly relevant to your search');
    } else if (similarity > 0.6) {
      reasons.push('Relevant to your search');
    }
    
    if (mod.tags.some((tag: string) => query.toLowerCase().includes(tag.toLowerCase()))) {
      reasons.push('Matches your search tags');
    }
    
    if (mod._count.downloads > 1000) {
      reasons.push('Popular in the community');
    }
    
    if (mod.rating && mod.rating > 4.5) {
      reasons.push('Highly rated by users');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Relevant result';
  }

  async updateSearchIndex(modId: string): Promise<void> {
    try {
      const mod = await prisma.mod.findUnique({
        where: { id: modId },
      });

      if (!mod) {
        throw new Error('Mod not found');
      }

      const modText = `${mod.title} ${mod.description || ''} ${mod.tags.join(' ')}`;
      const embedding = await this.generateEmbedding(modText);

      // Update or create search index
      await prisma.searchIndex.upsert({
        where: { modId },
        update: {
          searchVector: modText,
          embedding,
          lastIndexed: new Date(),
        },
        create: {
          modId,
          searchVector: modText,
          embedding,
        },
      });
    } catch (error) {
      console.error('Error updating search index:', error);
    }
  }
}

export const aiSearchService = new AISearchService();
