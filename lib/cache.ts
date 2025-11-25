import { Redis } from '@upstash/redis';

// Initialize Redis client (will be null if env vars not set - graceful degradation)
let redis: Redis | null = null;

if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
  redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  });
}

/**
 * Cache service for MHMFinds
 * Uses Upstash Redis for distributed caching across serverless functions
 * Gracefully degrades if Redis is not configured
 */
export class CacheService {
  // TTL constants (in seconds)
  private static readonly TTL = {
    MODS_LIST: 300, // 5 minutes - mod list queries
    MOD_DETAIL: 600, // 10 minutes - individual mod details
    CREATOR_PROFILE: 1800, // 30 minutes - creator profiles
    TRENDING: 180, // 3 minutes - trending/featured content
    SEARCH_RESULTS: 300, // 5 minutes - search query results
    FACETS: 600, // 10 minutes - category/filter facets
    USER_SESSION: 3600, // 1 hour - user session data
  };

  /**
   * Check if Redis is available
   */
  static isAvailable(): boolean {
    return redis !== null;
  }

  /**
   * Get value from cache
   * Returns null if key doesn't exist or Redis is unavailable
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      return null;
    }

    try {
      const data = await redis.get<T>(key);
      return data;
    } catch (error) {
      console.error('Cache GET error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   * Silently fails if Redis is unavailable
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error('Cache SET error:', error);
    }
  }

  /**
   * Delete key from cache
   */
  static async del(key: string): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache DEL error:', error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * WARNING: Use sparingly as this scans all keys
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      // Note: Upstash Redis may not support SCAN, so we use KEYS (acceptable for small datasets)
      const keys = await redis.keys(pattern);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Cache wrapper for mod list queries
   * Generates cache key from query parameters
   */
  static async getModsList(params: Record<string, any>): Promise<any | null> {
    const cacheKey = `mods:list:${JSON.stringify(params)}`;
    return await this.get(cacheKey);
  }

  static async setModsList(params: Record<string, any>, data: any): Promise<void> {
    const cacheKey = `mods:list:${JSON.stringify(params)}`;
    await this.set(cacheKey, data, this.TTL.MODS_LIST);
  }

  /**
   * Cache wrapper for individual mod details
   */
  static async getModDetail(modId: string): Promise<any | null> {
    const cacheKey = `mod:${modId}`;
    return await this.get(cacheKey);
  }

  static async setModDetail(modId: string, data: any): Promise<void> {
    const cacheKey = `mod:${modId}`;
    await this.set(cacheKey, data, this.TTL.MOD_DETAIL);
  }

  /**
   * Cache wrapper for creator profiles
   */
  static async getCreatorProfile(creatorId: string): Promise<any | null> {
    const cacheKey = `creator:${creatorId}`;
    return await this.get(cacheKey);
  }

  static async setCreatorProfile(creatorId: string, data: any): Promise<void> {
    const cacheKey = `creator:${creatorId}`;
    await this.set(cacheKey, data, this.TTL.CREATOR_PROFILE);
  }

  /**
   * Cache wrapper for search results
   */
  static async getSearchResults(query: string, filters: Record<string, any>): Promise<any | null> {
    const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
    return await this.get(cacheKey);
  }

  static async setSearchResults(query: string, filters: Record<string, any>, data: any): Promise<void> {
    const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
    await this.set(cacheKey, data, this.TTL.SEARCH_RESULTS);
  }

  /**
   * Cache wrapper for facets (categories, tags, etc.)
   */
  static async getFacets(): Promise<any | null> {
    const cacheKey = 'facets:all';
    return await this.get(cacheKey);
  }

  static async setFacets(data: any): Promise<void> {
    const cacheKey = 'facets:all';
    await this.set(cacheKey, data, this.TTL.FACETS);
  }

  /**
   * Invalidate all caches related to a specific mod
   * Call this when a mod is created, updated, or deleted
   */
  static async invalidateMod(modId: string): Promise<void> {
    await this.del(`mod:${modId}`);
    await this.invalidatePattern('mods:list:*');
    await this.invalidatePattern('search:*');
    await this.del('facets:all');
  }

  /**
   * Invalidate all caches related to a creator
   * Call this when a creator profile is updated
   */
  static async invalidateCreator(creatorId: string): Promise<void> {
    await this.del(`creator:${creatorId}`);
    await this.invalidatePattern('mods:list:*');
  }

  /**
   * Clear all cache (use with caution)
   */
  static async clearAll(): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  static async getStats(): Promise<{ isAvailable: boolean; keys?: number }> {
    if (!redis) {
      return { isAvailable: false };
    }

    try {
      const keys = await redis.keys('*');
      return {
        isAvailable: true,
        keys: keys.length,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { isAvailable: false };
    }
  }
}
