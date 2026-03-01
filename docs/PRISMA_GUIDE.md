# Prisma Guide

All Prisma-related knowledge for the MHMFinds (ModVault) project in one place.

---

## Connection Pooling in Serverless (Vercel)

**Never modify `lib/prisma.ts` without understanding this section.**

### The Problem

On Vercel (serverless), each function invocation can create a new `PrismaClient` instance. If the client is not cached globally, the database connection pool will be exhausted, causing a site-wide outage.

### Symptoms of Connection Pool Exhaustion

- Intermittent 500 errors (some requests work, others fail)
- Error: `Can't reach database server at db.prisma.io:5432`
- Simple queries succeed while complex queries fail
- Site works briefly then crashes

### The CORRECT Pattern

```typescript
// lib/prisma.ts - THIS PATTERN IS CRITICAL
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// MUST cache in ALL environments including production!
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### What NOT To Do

```typescript
// WRONG - This only caches in development, NOT production!
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

This common mistake means every production request creates a new client, rapidly exhausting the pool.

### Before Refactoring Auth or Database Code

1. **Check import paths** - Adding new files that import `prisma` increases cold start frequency.
2. **Test locally first** - Run `npm run build` to catch issues.
3. **Deploy cautiously** - Watch Vercel logs for connection errors after deploy.
4. **Have rollback ready** - Know the last working deployment.

### Recovery from Pool Exhaustion

1. **Immediately rollback** in Vercel (Deployments -> Previous working deploy -> Promote to Production).
2. Wait 2-3 minutes for connections to timeout.
3. Fix the issue in code.
4. Redeploy carefully.

```bash
# List recent deployments
vercel ls

# Rollback to a specific deployment
vercel rollback <deployment-url> --yes
```

---

## Prisma Accelerate - Query Caching

This project uses Prisma Accelerate for query-level caching. The `@prisma/extension-accelerate` package is installed and configured in `lib/prisma.ts`.

### Environment Variable Setup

```bash
# .env.local (and Vercel Production)

# DATABASE_URL = Prisma Accelerate URL (enables caching)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."

# DIRECT_DATABASE_URL = Direct postgres connection (for migrations)
DIRECT_DATABASE_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"
```

### Common Mistake: Swapped URLs

If URLs are swapped (`DATABASE_URL` has `postgres://` instead of `prisma+postgres://`), caching will be silently disabled. Check the dev server logs for:

```
[Prisma] Accelerate extension enabled (Accelerate URL detected)
```

If you do not see this message, the URLs are likely swapped.

### How It Works

The `lib/prisma.ts` file:

1. Detects if `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`.
2. If yes, enables the Accelerate extension with `withAccelerate()`.
3. Adds slow query logging (>2s dev, >5s prod).
4. Caches the client globally to prevent connection pool exhaustion.

### Using Cache Strategy in Queries

When Accelerate is enabled, use `cacheStrategy` in queries:

```typescript
const mods = await prisma.mod.findMany({
  cacheStrategy: { ttl: 60 }, // Cache for 60 seconds
});
```

### Recovery from Prisma Connection Issues

1. Rollback immediately: `vercel rollback <working-deployment-url> --yes`
2. Check Prisma Dashboard for errors.
3. Verify env vars are not swapped (`DATABASE_URL` should be `prisma+postgres://`).
4. Wait for connections to clear before redeploying.

---

## Decimal Type Handling

Prisma `Decimal(10,2)` fields (like `price`) may arrive as strings, not numbers, depending on the serialization path. Calling `.toFixed()` on a string throws an error.

### The Pattern

```typescript
// WRONG - May fail if price is a Decimal string
const display = product.price.toFixed(2);

// CORRECT - Coerce to Number first
const price = typeof product.price === 'number' ? product.price : Number(product.price);
const display = price.toFixed(2);
```

**Rule:** Always coerce Prisma Decimal values to `Number()` before arithmetic or formatting operations, especially in client components that receive data from API routes.

---

## Raw SQL Enum Casting

When using Prisma raw SQL (`$queryRaw`), PostgreSQL enum values require explicit `::text` casting for string comparisons.

```typescript
// WRONG - Fails with type mismatch
AND ma."actionType" = ${actionType}

// CORRECT - Cast enum to text
AND ma."actionType"::text = ${actionType}
```

**Rule:** When comparing enum columns in raw SQL, always cast to `::text`.

---

## Script Environment Setup

Standalone scripts (in `scripts/`) cannot use Prisma Accelerate URLs (`prisma+postgres://`). They need direct database connections.

### The Fix

Import `scripts/lib/setup-env.ts` at the very top of any script, before other imports:

```typescript
// MUST be the first import in any script that uses Prisma
import '../lib/setup-env';
// or: import './lib/setup-env';
```

This module automatically detects Accelerate URLs and swaps `DATABASE_URL` with `DIRECT_DATABASE_URL`. It also loads `.env.local` for you.

**Rule:** Every new script that touches the database must import `setup-env.ts` first, or it will fail with cryptic Accelerate connection errors.

---

## Cache Invalidation After Admin Mutations

Admin CRUD operations (create, update, delete mods) can have a delay before taking effect because cached data is being served. Always invalidate the cache after mutations.

### Single Mutation

```typescript
await prisma.mod.delete({ where: { id } });
await CacheService.invalidateMod(id); // Clear cached data immediately
```

### Bulk Operations

```typescript
await Promise.all(modIds.map((id: string) => CacheService.invalidateMod(id)));
```

**Rule:** Every admin mutation (create/update/delete) must be followed by cache invalidation.

---

## Schema Notes

Key details about the Prisma schema (`prisma/schema.prisma`):

- **IDs:** All models use `cuid()` IDs.
- **Mod prices:** `Decimal(10,2)` - handle with Prisma's Decimal type (see Decimal Type Handling above).
- **SearchIndex.embedding:** `Float[]` - stores OpenAI embeddings for AI-powered semantic search.
- **Cascade deletes:** All configured. User deletion cascades to all related entities.
- **Unique constraints:** Favorites, reviews, and collection items have unique constraints to prevent duplicates.

---

## Database Commands

```bash
npm run db:generate        # Generate Prisma client from schema
npm run db:push            # Push schema changes to database (no migration)
npm run db:migrate         # Create and apply migration
npm run db:studio          # Open Prisma Studio GUI
npm run db:seed            # Initialize database with seed data
npm run db:reset           # Reset database (WARNING: deletes all data)
npm run db:deploy          # Apply migrations in production
```

### Vercel Build and Migrations

The Vercel build command is: `npx prisma generate && next build`

Do not add `prisma migrate deploy` to the build command unless absolutely necessary. If the database is temporarily unreachable during build, the entire deployment fails. Instead:

- Apply migrations manually before deploying: `npm run db:deploy`
- Or use a CI/CD step separate from the build.
