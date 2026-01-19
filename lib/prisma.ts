import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Create extended client type for Accelerate
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends(withAccelerate());
};

// Type for the extended Prisma client
type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client in ALL environments (including production)
// This prevents connection pool exhaustion in serverless environments
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

/**
 * Cache strategy presets for common use cases
 * TTL is in seconds, SWR (stale-while-revalidate) allows serving stale data while refreshing
 */
export const cacheStrategies = {
  // For frequently changing data like mod listings on homepage
  // Cache for 30 seconds, serve stale for up to 60 seconds while revalidating
  short: { ttl: 30, swr: 60 },

  // For moderately changing data like category lists, game lists
  // Cache for 5 minutes, serve stale for up to 10 minutes
  medium: { ttl: 300, swr: 600 },

  // For rarely changing data like site configuration
  // Cache for 30 minutes, serve stale for up to 1 hour
  long: { ttl: 1800, swr: 3600 },

  // For admin analytics dashboards - balance freshness with performance
  // Cache for 1 minute, serve stale for up to 2 minutes
  analytics: { ttl: 60, swr: 120 },

  // For individual mod pages - short cache to balance freshness
  // Cache for 15 seconds, serve stale for up to 30 seconds
  modDetail: { ttl: 15, swr: 30 },

  // For search results - very short cache for responsiveness
  // Cache for 10 seconds, serve stale for up to 20 seconds
  search: { ttl: 10, swr: 20 },
} as const;

export default prisma;
