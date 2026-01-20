import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CACHE_TIERS, getCacheOptions, isAccelerateEnabled } from '@/lib/cache-tiers';

describe('Cache Tiers', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    // Restore original environment
    process.env.DATABASE_URL = originalEnv;
  });

  describe('CACHE_TIERS', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TIERS.NONE).toBeUndefined();
      expect(CACHE_TIERS.HOT).toEqual({ ttl: 60, swr: 120 });
      expect(CACHE_TIERS.WARM).toEqual({ ttl: 300, swr: 600 });
      expect(CACHE_TIERS.COLD).toEqual({ ttl: 900, swr: 1800 });
      expect(CACHE_TIERS.LONG).toEqual({ ttl: 3600, swr: 7200 });
    });
  });

  describe('isAccelerateEnabled', () => {
    it('should return true when DATABASE_URL starts with prisma://', () => {
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=test';
      expect(isAccelerateEnabled()).toBe(true);
    });

    it('should return true when DATABASE_URL starts with prisma+postgres://', () => {
      process.env.DATABASE_URL = 'prisma+postgres://accelerate.prisma-data.net/?api_key=test';
      expect(isAccelerateEnabled()).toBe(true);
    });

    it('should return false when DATABASE_URL starts with postgres://', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
      expect(isAccelerateEnabled()).toBe(false);
    });

    it('should return false when DATABASE_URL starts with postgresql://', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      expect(isAccelerateEnabled()).toBe(false);
    });

    it('should return false when DATABASE_URL is undefined', () => {
      delete process.env.DATABASE_URL;
      expect(isAccelerateEnabled()).toBe(false);
    });

    it('should return false when DATABASE_URL is empty', () => {
      process.env.DATABASE_URL = '';
      expect(isAccelerateEnabled()).toBe(false);
    });
  });

  describe('getCacheOptions', () => {
    describe('when Accelerate is enabled (prisma:// URL)', () => {
      beforeEach(() => {
        process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=test';
      });

      it('should return cacheStrategy for HOT tier', () => {
        expect(getCacheOptions(CACHE_TIERS.HOT)).toEqual({
          cacheStrategy: { ttl: 60, swr: 120 },
        });
      });

      it('should return cacheStrategy for WARM tier', () => {
        expect(getCacheOptions(CACHE_TIERS.WARM)).toEqual({
          cacheStrategy: { ttl: 300, swr: 600 },
        });
      });

      it('should return cacheStrategy for COLD tier', () => {
        expect(getCacheOptions(CACHE_TIERS.COLD)).toEqual({
          cacheStrategy: { ttl: 900, swr: 1800 },
        });
      });

      it('should return cacheStrategy for LONG tier', () => {
        expect(getCacheOptions(CACHE_TIERS.LONG)).toEqual({
          cacheStrategy: { ttl: 3600, swr: 7200 },
        });
      });

      it('should return empty object for NONE tier', () => {
        expect(getCacheOptions(CACHE_TIERS.NONE)).toEqual({});
      });

      it('should return empty object for undefined tier', () => {
        expect(getCacheOptions(undefined)).toEqual({});
      });
    });

    describe('when Accelerate is NOT enabled (postgres:// URL)', () => {
      beforeEach(() => {
        process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
      });

      it('should return empty object for HOT tier', () => {
        expect(getCacheOptions(CACHE_TIERS.HOT)).toEqual({});
      });

      it('should return empty object for WARM tier', () => {
        expect(getCacheOptions(CACHE_TIERS.WARM)).toEqual({});
      });

      it('should return empty object for COLD tier', () => {
        expect(getCacheOptions(CACHE_TIERS.COLD)).toEqual({});
      });

      it('should return empty object for LONG tier', () => {
        expect(getCacheOptions(CACHE_TIERS.LONG)).toEqual({});
      });

      it('should return empty object for NONE tier', () => {
        expect(getCacheOptions(CACHE_TIERS.NONE)).toEqual({});
      });
    });

    describe('edge cases', () => {
      it('should work with db.prisma.io pooler URL (NOT Accelerate)', () => {
        // This is the current production URL - NOT Accelerate, just the pooler
        process.env.DATABASE_URL = 'postgres://user:pass@db.prisma.io:5432/db';
        expect(getCacheOptions(CACHE_TIERS.HOT)).toEqual({});
      });

      it('should work with Prisma Accelerate URL', () => {
        process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=ey123';
        expect(getCacheOptions(CACHE_TIERS.HOT)).toEqual({
          cacheStrategy: { ttl: 60, swr: 120 },
        });
      });

      it('should work with Prisma Accelerate prisma+postgres:// URL', () => {
        process.env.DATABASE_URL = 'prisma+postgres://accelerate.prisma-data.net/?api_key=ey123';
        expect(getCacheOptions(CACHE_TIERS.HOT)).toEqual({
          cacheStrategy: { ttl: 60, swr: 120 },
        });
      });
    });
  });

  describe('spread operator usage', () => {
    it('should allow spreading into query options without Accelerate', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';

      const queryOptions = {
        where: { id: '123' },
        include: { creator: true },
        ...getCacheOptions(CACHE_TIERS.HOT),
      };

      // Should not have cacheStrategy property
      expect(queryOptions).toEqual({
        where: { id: '123' },
        include: { creator: true },
      });
      expect('cacheStrategy' in queryOptions).toBe(false);
    });

    it('should allow spreading into query options with Accelerate', () => {
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=test';

      const queryOptions = {
        where: { id: '123' },
        include: { creator: true },
        ...getCacheOptions(CACHE_TIERS.HOT),
      };

      // Should have cacheStrategy property
      expect(queryOptions).toEqual({
        where: { id: '123' },
        include: { creator: true },
        cacheStrategy: { ttl: 60, swr: 120 },
      });
    });
  });
});
