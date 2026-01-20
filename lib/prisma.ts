import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a Prisma client with optional Accelerate extension and slow query logging.
 *
 * - When DATABASE_URL starts with 'prisma://', enables Accelerate for caching
 * - Otherwise uses standard Prisma client (local dev, direct DB connection)
 * - Adds slow query logging using $extends (Prisma 5+ compatible)
 *
 * Note: We use PrismaClient as the base type for TypeScript compatibility.
 * When Accelerate is enabled, the cacheStrategy option becomes available
 * at runtime but we cast to `any` in queries that use it.
 */
function createPrismaClient(): PrismaClient {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Add slow query logging using $extends (Prisma 5+ compatible)
  const slowThreshold = process.env.NODE_ENV === 'production' ? 5000 : 2000;

  const clientWithLogging = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          if (duration > slowThreshold) {
            console.error(
              `[SLOW QUERY] ${model}.${operation}: ${duration}ms`,
              process.env.NODE_ENV === 'development' ? JSON.stringify(args).slice(0, 200) : ''
            );
          }

          return result;
        },
      },
    },
  });

  // Only extend with Accelerate if using prisma:// or prisma+postgres:// URL (Accelerate connection)
  // This enables query-level caching via cacheStrategy option
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+postgres://')) {
    console.log('[Prisma] Accelerate extension enabled (Accelerate URL detected)');
    // Cast to PrismaClient to maintain consistent types across the codebase
    // The Accelerate extension adds cacheStrategy at runtime but doesn't change the base API
    return clientWithLogging.$extends(withAccelerate()) as unknown as PrismaClient;
  }

  return clientWithLogging as unknown as PrismaClient;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client in ALL environments (including production)
// This prevents connection pool exhaustion in serverless environments
// CRITICAL: Do not add NODE_ENV check here - production MUST cache the client
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
