import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { CACHE_TIERS, getCacheOptions } from '@/lib/cache-tiers';

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
      // Generate embedding for search query (only 1 OpenAI call per search)
      const queryEmbedding = await this.generateEmbedding(query);

      // Build base where clause - prioritize mods with pre-computed embeddings
      const where: any = {
        isVerified: true,
        searchIndex: { isNot: null }, // Only get mods with pre-computed embeddings
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

      // Get mods with pre-computed embeddings (uses Accelerate cache if enabled)
      // This avoids generating embeddings for each mod on every search
      const mods = await (prisma.mod.findMany as any)({
        where,
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              isVerified: true,
            },
          },
          searchIndex: {
            select: {
              embedding: true,
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
        ...getCacheOptions(CACHE_TIERS.HOT),
      });

      // Type the mods with searchIndex
      type ModWithSearchIndex = typeof mods[number] & {
        searchIndex?: { embedding: number[] } | null;
      };

      // Calculate similarity scores using pre-computed embeddings (no OpenAI calls)
      const scoredMods = (mods as ModWithSearchIndex[])
        .filter((mod) => mod.searchIndex?.embedding?.length) // Only mods with valid embeddings
        .map((mod) => {
          // Use pre-computed embedding (no new OpenAI call!)
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            mod.searchIndex!.embedding
          );

          // Boost score based on popularity and quality
          const popularityBoost =
            Math.log10(
              (mod._count.downloads + 1) *
                (mod._count.favorites + 1) *
                (Number(mod.rating) || 1)
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
        });

      // Sort by score and return top results
      return scoredMods.sort((a, b) => b.score - a.score).slice(0, limit);
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
      // Get source mod with its pre-computed embedding
      const mod = await (prisma.mod.findUnique as any)({
        where: { id: modId },
        include: {
          creator: true,
          searchIndex: {
            select: { embedding: true },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
              downloads: true,
            },
          },
        },
        ...getCacheOptions(CACHE_TIERS.HOT),
      }) as {
        id: string;
        title: string;
        description: string | null;
        category: string;
        tags: string[];
        thumbnail: string | null;
        searchIndex?: { embedding: number[] } | null;
        _count: { reviews: number; favorites: number; downloads: number };
      } | null;

      if (!mod) {
        throw new Error('Mod not found');
      }

      // Use pre-computed embedding if available, otherwise generate
      let modEmbedding: number[];
      if (mod.searchIndex?.embedding?.length) {
        modEmbedding = mod.searchIndex.embedding;
      } else {
        const modText = `${mod.title} ${mod.description || ''} ${mod.tags.join(' ')}`;
        modEmbedding = await this.generateEmbedding(modText);
      }

      // Find mods in the same category with similar tags and pre-computed embeddings
      const similarMods = await (prisma.mod.findMany as any)({
        where: {
          id: { not: modId },
          category: mod.category,
          isVerified: true,
          tags: { hasSome: mod.tags.slice(0, 3) },
          searchIndex: { isNot: null }, // Only get mods with embeddings
        },
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              isVerified: true,
            },
          },
          searchIndex: {
            select: { embedding: true },
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
        ...getCacheOptions(CACHE_TIERS.HOT),
      }) as Array<{
        id: string;
        title: string;
        description: string | null;
        category: string;
        tags: string[];
        thumbnail: string | null;
        searchIndex?: { embedding: number[] } | null;
      }>;

      // Calculate similarity scores using pre-computed embeddings (no OpenAI calls)
      const scoredMods = similarMods
        .filter((m) => m.searchIndex?.embedding?.length)
        .map((similarMod) => {
          const similarity = this.cosineSimilarity(
            modEmbedding,
            similarMod.searchIndex!.embedding
          );

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
        });

      return scoredMods
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting similar mods:', error);
      return [];
    }
  }

  private async getPopularMods(limit: number): Promise<ModRecommendation[]> {
    // Get popular mods with Accelerate caching
    const popularMods = await (prisma.mod.findMany as any)({
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
      ...getCacheOptions(CACHE_TIERS.WARM),
    }) as Array<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      tags: string[];
      thumbnail: string | null;
    }>;

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
    // Generate embedding for user profile (only 1 OpenAI call)
    const userEmbedding = await this.generateEmbedding(userProfile.interests);

    // Get mods with pre-computed embeddings
    const similarMods = await (prisma.mod.findMany as any)({
      where: {
        isVerified: true,
        searchIndex: { isNot: null }, // Only mods with embeddings
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
        searchIndex: {
          select: { embedding: true },
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
      ...getCacheOptions(CACHE_TIERS.HOT),
    }) as Array<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      tags: string[];
      thumbnail: string | null;
      searchIndex?: { embedding: number[] } | null;
    }>;

    // Calculate similarity using pre-computed embeddings (no OpenAI calls)
    const scoredMods = similarMods
      .filter((mod) => mod.searchIndex?.embedding?.length)
      .map((mod) => {
        const similarity = this.cosineSimilarity(
          userEmbedding,
          mod.searchIndex!.embedding
        );

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
      });

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
